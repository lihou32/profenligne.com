import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { LocalRoomTransport, SupabaseRoomTransport, type RoomTransport } from "@/lib/room/transport";
import {
  DEFAULT_ICE_SERVERS, LessonCall, getLocalMedia,
  type CallSnapshot, type MediaProblem,
} from "@/lib/room/call";

/** Canal privé de la salle, partagé par la visio et le tableau. */
export function useRoomTransport(lessonId: string | undefined, userId: string | undefined, localTest = false) {
  const [transport, setTransport] = useState<RoomTransport | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed" | "error">("connecting");

  useEffect(() => {
    if (!lessonId || !userId) return;
    // Identifiant par onglet : deux onglets du même compte restent distincts
    const selfId = `${userId}:${Math.random().toString(36).slice(2, 8)}`;
    const t: RoomTransport = localTest
      ? new LocalRoomTransport(lessonId, selfId)
      : new SupabaseRoomTransport(lessonId, selfId);
    const off = t.onStatus((s) => setStatus(s));
    setTransport(t);
    return () => {
      off();
      t.close();
      setTransport(null);
    };
  }, [lessonId, userId, localTest]);

  return { transport, status };
}

async function fetchIceServers(lessonId: string): Promise<RTCIceServer[]> {
  try {
    const res = await Promise.race([
      supabase.functions.invoke("lesson-ice", { body: { lessonId } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    const servers = (res as { data?: { iceServers?: RTCIceServer[] } }).data?.iceServers;
    if (Array.isArray(servers) && servers.length) return servers;
  } catch (e) {
    logger.debug("lesson-ice indisponible, STUN seul", { error: String(e) });
  }
  return DEFAULT_ICE_SERVERS;
}

/** Aperçu caméra avant d'entrer, puis la visio elle-même. */
export function useLessonCall(opts: {
  transport: RoomTransport | null;
  lessonId: string | undefined;
  name: string;
  skipIceFetch?: boolean;
}) {
  const { transport, lessonId, name, skipIceFetch } = opts;
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [problem, setProblem] = useState<MediaProblem | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [snap, setSnap] = useState<CallSnapshot | null>(null);
  const [joining, setJoining] = useState(false);
  const [, rerender] = useState(0);
  const callRef = useRef<LessonCall | null>(null);
  const previewRef = useRef<MediaStream | null>(null);

  const requestMedia = useCallback(async () => {
    setRequesting(true);
    previewRef.current?.getTracks().forEach((t) => t.stop());
    const { stream, problem: p } = await getLocalMedia();
    previewRef.current = stream;
    setPreview(stream);
    setProblem(p);
    setRequesting(false);
    return stream;
  }, []);

  const join = useCallback(async () => {
    if (!transport || !lessonId || callRef.current) return;
    setJoining(true);
    try {
      const iceServers = skipIceFetch ? DEFAULT_ICE_SERVERS : await fetchIceServers(lessonId);
      const call = new LessonCall(transport, {
        name,
        iceServers,
        onChange: (s) => setSnap({ ...s }),
        log: (...a) => logger.debug("[visio]", { detail: a.map(String).join(" ") }),
      });
      callRef.current = call;
      setSnap({ ...call.snapshot });
      await call.join(previewRef.current);
    } catch (e) {
      logger.error("Entrée dans la visio impossible", e);
      throw e;
    } finally {
      setJoining(false);
    }
  }, [transport, lessonId, name, skipIceFetch]);

  const leave = useCallback(() => {
    callRef.current?.leave();
    callRef.current = null;
    previewRef.current = null;
    setPreview(null);
    setSnap(null);
  }, []);

  // Fermeture de l'onglet : on prévient l'autre participant
  useEffect(() => {
    const onUnload = () => callRef.current?.leave();
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);

  // Quitter la page : tout couper (caméra comprise)
  useEffect(() => () => {
    callRef.current?.leave();
    callRef.current = null;
    previewRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Le canal change (reconnexion complète) : on sort proprement
  useEffect(() => {
    if (!transport && callRef.current) leave();
  }, [transport, leave]);

  const setMic = useCallback((on: boolean) => {
    if (callRef.current) callRef.current.setMicEnabled(on);
    else previewRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    rerender((n) => n + 1);
  }, []);

  const setCamera = useCallback((on: boolean) => {
    if (callRef.current) callRef.current.setCameraEnabled(on);
    else previewRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
    rerender((n) => n + 1);
  }, []);

  const toggleScreen = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    if (call.snapshot.local.screen) await call.stopScreenShare();
    else await call.startScreenShare();
  }, []);

  /** Autorisation donnée après être entré : on ajoute caméra/micro à la visio. */
  const enableMediaLater = useCallback(async () => {
    const stream = await requestMedia();
    if (stream && callRef.current) callRef.current.setLocalStream(stream);
  }, [requestMedia]);

  const localFlags = snap?.local ?? {
    audio: !!preview?.getAudioTracks().some((t) => t.enabled),
    video: !!preview?.getVideoTracks().some((t) => t.enabled),
    screen: false,
  };

  return {
    localFlags,
    preview, problem, requesting, requestMedia, enableMediaLater,
    snap, joining, join, leave, retry: () => callRef.current?.retry(),
    setMic, setCamera, toggleScreen,
    localPreview: callRef.current?.localPreview ?? preview,
  };
}
