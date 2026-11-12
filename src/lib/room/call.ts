// Visio en direct élève ↔ prof, en pair à pair (WebRTC), sans service tiers.
// Signalisation : le canal privé de la salle (voir transport.ts).
// Schéma « perfect negotiation » (W3C) :
//  - celui qui arrive envoie "hello" ; celui qui est déjà là répond "hello-ack" ;
//  - chacun (re)crée alors sa connexion ; le côté « impoli » fait l'offre,
//    le côté « poli » ajoute ses pistes en répondant (pas de lignes en double) ;
//  - en cas de coupure réseau, le côté impoli relance la connexion (ICE restart).
import type { RoomMessage, RoomTransport } from "./transport";

export type CallState =
  | "waiting"       // seul dans la salle
  | "connecting"    // l'autre est là, connexion en cours
  | "connected"
  | "reconnecting"  // coupure, on essaie de rétablir
  | "left"          // l'autre a quitté la salle
  | "failed";       // impossible d'établir la connexion

export interface MediaFlags {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export interface CallSnapshot {
  state: CallState;
  remoteStream: MediaStream | null;
  peerName: string | null;
  peerMedia: MediaFlags;
  local: MediaFlags;
  relayed: boolean | null; // true si la connexion passe par un relais (TURN)
}

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

interface Options {
  name: string;
  iceServers?: RTCIceServer[];
  onChange: (s: CallSnapshot) => void;
  log?: (...args: unknown[]) => void;
}

const FAIL_AFTER_MS = 25_000;
const DISCONNECT_GRACE_MS = 4_000;

export class LessonCall {
  private pc: RTCPeerConnection | null = null;
  private peerId: string | null = null;
  private polite = false;
  private makingOffer = false;
  private ignoreOffer = false;
  private settingAnswer = false;
  private tracksAdded = false;
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private remoteStream: MediaStream | null = null;
  private iceServers: RTCIceServer[];
  private unsubs: (() => void)[] = [];
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private failTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private snap: CallSnapshot = {
    state: "waiting",
    remoteStream: null,
    peerName: null,
    peerMedia: { audio: false, video: false, screen: false },
    local: { audio: false, video: false, screen: false },
    relayed: null,
  };

  constructor(private t: RoomTransport, private opts: Options) {
    this.iceServers = opts.iceServers?.length ? opts.iceServers : DEFAULT_ICE_SERVERS;
    this.unsubs.push(
      t.on("hello", (m) => this.onHello(m, true)),
      t.on("hello-ack", (m) => this.onHello(m, false)),
      t.on("description", (m) => void this.onDescription(m)),
      t.on("candidate", (m) => void this.onCandidate(m)),
      t.on("media", (m) => this.onMedia(m)),
      t.on("bye", (m) => this.onBye(m)),
      // Le canal se rouvre après une coupure : on se signale à nouveau
      t.onStatus((s) => {
        if (s === "open" && !this.closed && this.snap.state !== "connected") this.announce();
      }),
    );
  }

  get snapshot() {
    return this.snap;
  }

  /** Entre dans la salle avec ses pistes locales (ou sans, en simple réception). */
  async join(stream: MediaStream | null) {
    this.setLocalStream(stream);
    await this.t.ready;
    this.announce();
  }

  private announce() {
    this.t.send({ type: "hello", name: this.opts.name, media: this.snap.local });
  }

  /** Raccroche et prévient l'autre participant. */
  leave() {
    if (this.closed) return;
    this.closed = true;
    this.t.send({ type: "bye" });
    this.unsubs.forEach((u) => u());
    this.teardown();
    this.screenTrack?.stop();
    this.localStream?.getTracks().forEach((tr) => tr.stop());
  }

  /** Nouvelle tentative complète (bouton « Réessayer »). */
  retry() {
    if (this.closed) return;
    this.teardown();
    this.update({ state: "waiting" });
    this.announce();
  }

  // ── Micro, caméra, partage d'écran ──────────────────────────────
  setMicEnabled(on: boolean) {
    this.localStream?.getAudioTracks().forEach((tr) => (tr.enabled = on));
    this.updateLocal();
  }

  setCameraEnabled(on: boolean) {
    if (this.cameraTrack) this.cameraTrack.enabled = on;
    this.updateLocal();
  }

  /** Ajoute une caméra/un micro arrivés après coup (ex. autorisation donnée plus tard). */
  setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    this.cameraTrack = stream?.getVideoTracks()[0] ?? null;
    if (this.pc && this.tracksAdded && stream) {
      for (const track of stream.getTracks()) this.attachTrack(track);
    }
    this.updateLocal();
  }

  async startScreenShare() {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
    const track = display.getVideoTracks()[0];
    if (!track) return;
    track.contentHint = "detail";
    this.screenTrack = track;
    track.addEventListener("ended", () => void this.stopScreenShare());
    if (this.pc && this.tracksAdded) this.attachTrack(track, true);
    this.updateLocal();
  }

  async stopScreenShare() {
    const track = this.screenTrack;
    if (!track) return;
    this.screenTrack = null;
    track.stop();
    if (this.pc) {
      const sender = this.videoSender();
      if (sender) await sender.replaceTrack(this.cameraTrack ?? null);
    }
    this.updateLocal();
  }

  /** Flux vidéo affiché dans la vignette locale (écran partagé ou caméra). */
  get localPreview(): MediaStream | null {
    if (this.screenTrack) return new MediaStream([this.screenTrack]);
    return this.localStream;
  }

  // ── Signalisation ───────────────────────────────────────────────
  private onHello(m: RoomMessage, isHello: boolean) {
    if (this.closed) return;
    if (isHello) this.t.send({ type: "hello-ack", to: m.from, name: this.opts.name, media: this.snap.local });
    this.update({
      peerName: typeof m.name === "string" ? m.name : this.snap.peerName,
      peerMedia: parseFlags(m.media) ?? this.snap.peerMedia,
    });
    // Un "hello" veut dire que l'autre (re)démarre : on repart de zéro.
    // Un "hello-ack" alors qu'on est déjà en train de se connecter à lui
    // (arrivées simultanées) ne doit pas tout recommencer.
    if (!isHello && this.pc && this.peerId === m.from) return;
    this.connectTo(m.from);
  }

  private connectTo(peerId: string) {
    this.teardown();
    this.peerId = peerId;
    this.polite = this.t.selfId < peerId;
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.pc = pc;
    this.remoteStream = new MediaStream();
    this.update({ state: "connecting", remoteStream: this.remoteStream, relayed: null });
    this.armFailTimer();

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.pc === pc) this.t.send({ type: "candidate", to: peerId, candidate: candidate.toJSON() });
    };
    pc.ontrack = ({ track }) => {
      if (this.pc !== pc || !this.remoteStream) return;
      this.remoteStream.getTracks().filter((t) => t.kind === track.kind).forEach((t) => this.remoteStream!.removeTrack(t));
      this.remoteStream.addTrack(track);
      // Nouvel objet pour que l'affichage se mette à jour
      this.remoteStream = new MediaStream(this.remoteStream.getTracks());
      this.update({ remoteStream: this.remoteStream });
    };
    pc.onnegotiationneeded = async () => {
      if (this.pc !== pc) return;
      try {
        this.makingOffer = true;
        await pc.setLocalDescription();
        this.t.send({ type: "description", to: peerId, description: pc.localDescription?.toJSON() });
      } catch (e) {
        this.opts.log?.("offer error", e);
      } finally {
        this.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => this.onConnectionState(pc);
    pc.oniceconnectionstatechange = () => {
      if (this.pc === pc && pc.iceConnectionState === "failed" && !this.polite) pc.restartIce();
    };

    if (!this.polite) this.addLocalTracks(pc, true);
  }

  private async onDescription(m: RoomMessage) {
    const pc = this.pc;
    if (!pc || m.from !== this.peerId || this.closed) return;
    const description = m.description as RTCSessionDescriptionInit;
    if (!description?.type) return;
    try {
      const readyForOffer = !this.makingOffer && (pc.signalingState === "stable" || this.settingAnswer);
      const offerCollision = description.type === "offer" && !readyForOffer;
      this.ignoreOffer = !this.polite && offerCollision;
      if (this.ignoreOffer) return;
      this.settingAnswer = description.type === "answer";
      await pc.setRemoteDescription(description);
      this.settingAnswer = false;
      if (description.type === "offer") {
        if (!this.tracksAdded) this.addLocalTracks(pc, false);
        await pc.setLocalDescription();
        this.t.send({ type: "description", to: m.from, description: pc.localDescription?.toJSON() });
      }
    } catch (e) {
      this.settingAnswer = false;
      this.opts.log?.("description error", e);
    }
  }

  private async onCandidate(m: RoomMessage) {
    const pc = this.pc;
    if (!pc || m.from !== this.peerId) return;
    try {
      await pc.addIceCandidate(m.candidate as RTCIceCandidateInit);
    } catch (e) {
      if (!this.ignoreOffer) this.opts.log?.("candidate error", e);
    }
  }

  private onMedia(m: RoomMessage) {
    if (m.from !== this.peerId) return;
    this.update({
      peerMedia: parseFlags(m.media) ?? this.snap.peerMedia,
      peerName: typeof m.name === "string" ? m.name : this.snap.peerName,
    });
  }

  private onBye(m: RoomMessage) {
    if (m.from !== this.peerId) return;
    this.teardown();
    this.update({ state: "left", remoteStream: null, peerMedia: { audio: false, video: false, screen: false } });
  }

  // ── Pistes ──────────────────────────────────────────────────────
  /** Impoli : ajoute ses pistes (ou des emplacements en réception) pour lancer l'offre.
   *  Poli : ajoute ses pistes en répondant à la première offre (réutilise ses lignes). */
  private addLocalTracks(pc: RTCPeerConnection, offering: boolean) {
    this.tracksAdded = true;
    const stream = this.localStream;
    const audio = stream?.getAudioTracks()[0] ?? null;
    const video = this.screenTrack ?? this.cameraTrack;
    if (audio && stream) pc.addTrack(audio, stream);
    else if (offering) pc.addTransceiver("audio", { direction: "recvonly" });
    if (video) pc.addTrack(video, stream ?? new MediaStream([video]));
    else if (offering) pc.addTransceiver("video", { direction: "recvonly" });
  }

  private videoSender(): RTCRtpSender | null {
    return this.pc?.getSenders().find((s) => s.track?.kind === "video") ??
      this.pc?.getTransceivers().find((t) => t.receiver.track.kind === "video")?.sender ?? null;
  }

  private attachTrack(track: MediaStreamTrack, replaceVideo = false) {
    const pc = this.pc;
    if (!pc) return;
    const existing = pc.getSenders().find((s) => s.track?.kind === track.kind);
    if (existing) {
      if (track.kind !== "video" || replaceVideo || existing.track !== this.screenTrack) void existing.replaceTrack(track);
      return;
    }
    const free = pc.getTransceivers().find((t) => t.receiver.track.kind === track.kind && !t.sender.track);
    if (free) {
      void free.sender.replaceTrack(track);
      if (free.direction === "recvonly" || free.direction === "inactive") free.direction = "sendrecv";
      return;
    }
    pc.addTrack(track, this.localStream ?? new MediaStream([track]));
  }

  // ── État de la connexion ────────────────────────────────────────
  private onConnectionState(pc: RTCPeerConnection) {
    if (this.pc !== pc) return;
    const s = pc.connectionState;
    if (s === "connected") {
      this.clearTimers();
      this.update({ state: "connected" });
      this.t.send({ type: "media", to: this.peerId ?? undefined, media: this.snap.local, name: this.opts.name });
      void this.detectRelay(pc);
    } else if (s === "disconnected") {
      this.update({ state: "reconnecting" });
      if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
      this.disconnectTimer = setTimeout(() => {
        if (this.pc === pc && pc.connectionState !== "connected" && !this.polite) pc.restartIce();
      }, DISCONNECT_GRACE_MS);
      this.armFailTimer();
    } else if (s === "failed") {
      this.update({ state: "reconnecting" });
      if (!this.polite) pc.restartIce();
      this.armFailTimer();
    }
  }

  private armFailTimer() {
    if (this.failTimer) clearTimeout(this.failTimer);
    const pc = this.pc;
    this.failTimer = setTimeout(() => {
      if (this.pc === pc && pc && pc.connectionState !== "connected") this.update({ state: "failed" });
    }, FAIL_AFTER_MS);
  }

  private async detectRelay(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats();
      let relayed: boolean | null = null;
      stats.forEach((r) => {
        if (r.type === "transport" && r.selectedCandidatePairId) {
          const pair = stats.get(r.selectedCandidatePairId);
          const local = pair && stats.get(pair.localCandidateId);
          if (local) relayed = local.candidateType === "relay";
        }
      });
      this.update({ relayed });
    } catch {
      /* statistiques indisponibles : sans importance */
    }
  }

  private clearTimers() {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    if (this.failTimer) clearTimeout(this.failTimer);
    this.disconnectTimer = this.failTimer = null;
  }

  private teardown() {
    this.clearTimers();
    const pc = this.pc;
    this.pc = null;
    this.tracksAdded = false;
    this.makingOffer = this.ignoreOffer = this.settingAnswer = false;
    if (pc) {
      pc.onicecandidate = pc.ontrack = pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = pc.oniceconnectionstatechange = null;
      pc.close();
    }
  }

  private updateLocal() {
    const local: MediaFlags = {
      audio: !!this.localStream?.getAudioTracks().some((t) => t.enabled && t.readyState === "live"),
      video: !!this.screenTrack || !!(this.cameraTrack && this.cameraTrack.enabled && this.cameraTrack.readyState === "live"),
      screen: !!this.screenTrack,
    };
    this.update({ local });
    if (this.peerId && !this.closed) this.t.send({ type: "media", to: this.peerId, media: local, name: this.opts.name });
  }

  private update(patch: Partial<CallSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    if (!this.closed || patch.state) this.opts.onChange(this.snap);
  }
}

function parseFlags(v: unknown): MediaFlags | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return { audio: !!o.audio, video: !!o.video, screen: !!o.screen };
}

export type MediaProblem = "permission" | "no-device" | "in-use" | "insecure" | "unknown";

/** Caméra + micro, avec repli : audio seul, puis rien (simple réception). */
export async function getLocalMedia(): Promise<{ stream: MediaStream | null; problem: MediaProblem | null }> {
  if (!navigator.mediaDevices?.getUserMedia) return { stream: null, problem: "insecure" };
  const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio, video }), problem: null };
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") return { stream: null, problem: "permission" };
    try {
      return { stream: await navigator.mediaDevices.getUserMedia({ audio }), problem: name === "NotReadableError" ? "in-use" : "no-device" };
    } catch {
      return { stream: null, problem: name === "NotReadableError" ? "in-use" : "no-device" };
    }
  }
}
