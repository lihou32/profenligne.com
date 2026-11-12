// Canal de la salle de cours : un seul canal temps réel PRIVÉ « lesson:<id> »
// (réservé à l'élève et au prof par la base) qui transporte la visio
// (signalisation WebRTC), le tableau et les curseurs.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type RoomMessage = { type: string; from: string; to?: string } & Record<string, unknown>;
type Handler = (msg: RoomMessage) => void;

export interface RoomTransport {
  readonly selfId: string;
  send(msg: Omit<RoomMessage, "from">): void;
  on(type: string, handler: Handler): () => void;
  /** Résolu quand le canal est ouvert ; rejeté si l'accès est refusé. */
  ready: Promise<void>;
  onStatus(handler: (status: "open" | "closed" | "error") => void): () => void;
  close(): void;
}

/** Base commune : distribution des messages aux abonnés par type. */
abstract class BaseTransport implements RoomTransport {
  private handlers = new Map<string, Set<Handler>>();
  private statusHandlers = new Set<(s: "open" | "closed" | "error") => void>();
  abstract ready: Promise<void>;
  constructor(readonly selfId: string) {}
  abstract send(msg: Omit<RoomMessage, "from">): void;
  abstract close(): void;

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }
  onStatus(handler: (s: "open" | "closed" | "error") => void) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }
  protected dispatch(msg: RoomMessage) {
    if (!msg || msg.from === this.selfId) return;
    if (msg.to && msg.to !== this.selfId) return;
    this.handlers.get(msg.type)?.forEach((h) => h(msg));
    this.handlers.get("*")?.forEach((h) => h(msg));
  }
  protected emitStatus(s: "open" | "closed" | "error") {
    this.statusHandlers.forEach((h) => h(s));
  }
}

/** Transport réel : Supabase Realtime, canal privé. */
export class SupabaseRoomTransport extends BaseTransport {
  private channel: RealtimeChannel;
  private queue: Omit<RoomMessage, "from">[] = [];
  private open = false;
  ready: Promise<void>;

  constructor(lessonId: string, selfId: string) {
    super(selfId);
    this.channel = supabase.channel(`lesson:${lessonId}`, {
      config: { private: true, broadcast: { self: false, ack: false } },
    });
    this.channel.on("broadcast", { event: "room" }, ({ payload }) => this.dispatch(payload as RoomMessage));
    this.ready = new Promise((resolve, reject) => {
      this.channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          this.open = true;
          const pending = this.queue.splice(0);
          pending.forEach((m) => this.send(m));
          this.emitStatus("open");
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.open = false;
          this.emitStatus("error");
          reject(err ?? new Error(status));
        } else if (status === "CLOSED") {
          this.open = false;
          this.emitStatus("closed");
        }
      });
    });
    this.ready.catch(() => undefined);
  }

  send(msg: Omit<RoomMessage, "from">) {
    if (!this.open) {
      this.queue.push(msg);
      return;
    }
    void this.channel.send({ type: "broadcast", event: "room", payload: { ...msg, from: this.selfId } });
  }

  close() {
    this.open = false;
    void supabase.removeChannel(this.channel);
  }
}

/** Transport de test : deux onglets du même navigateur (BroadcastChannel). */
export class LocalRoomTransport extends BaseTransport {
  private bc: BroadcastChannel;
  ready = Promise.resolve();
  constructor(name: string, selfId: string) {
    super(selfId);
    this.bc = new BroadcastChannel(`room-test:${name}`);
    this.bc.onmessage = (e) => this.dispatch(e.data as RoomMessage);
    queueMicrotask(() => this.emitStatus("open"));
  }
  send(msg: Omit<RoomMessage, "from">) {
    this.bc.postMessage({ ...msg, from: this.selfId });
  }
  close() {
    this.bc.close();
  }
}
