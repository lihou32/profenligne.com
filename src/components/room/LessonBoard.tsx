// Tableau du cours : Excalidraw (libre, licence MIT), partagé en direct par le
// canal privé de la salle et enregistré dans la base (lesson_boards).
// Chargé à la demande : il ne pèse rien tant qu'on n'ouvre pas une salle.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaptureUpdateAction, Excalidraw, reconcileElements,
} from "@excalidraw/excalidraw";
import type {
  AppState, BinaryFileData, BinaryFiles, Collaborator, ExcalidrawImperativeAPI, SocketId,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";
import type { RoomMessage, RoomTransport } from "@/lib/room/transport";
import { toast } from "sonner";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}
// Polices servies par le site (pas de dépendance à un CDN extérieur)
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

type Element = OrderedExcalidrawElement;
type RemoteElements = Parameters<typeof reconcileElements>[1];

interface Props {
  lessonId: string;
  transport: RoomTransport | null;
  selfName: string;
  /** Cours terminé : on montre le tableau sans pouvoir le modifier. */
  readOnly?: boolean;
  /** Tests locaux : pas de base de données. */
  offline?: boolean;
}

const BROADCAST_EVERY_MS = 60;
const SAVE_AFTER_MS = 1500;
const POINTER_EVERY_MS = 50;
const PEER_COLOR = { background: "#FF6F59", stroke: "#E24B36" };

export default function LessonBoard({ lessonId, transport, selfName, readOnly, offline }: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [initial, setInitial] = useState<{ elements: Element[]; files: BinaryFiles } | null>(offline ? { elements: [], files: {} } : null);
  const [loadError, setLoadError] = useState(false);

  // Versions déjà connues de l'autre participant et déjà enregistrées
  const shared = useRef(new Map<string, number>());
  const saved = useRef(new Map<string, number>());
  const knownFiles = useRef(new Set<string>());
  const outbox = useRef(new Map<string, Element>());
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointer = useRef(0);
  const collaborators = useRef(new Map<SocketId, Collaborator>());

  // Tests locaux : accès au tableau depuis la console
  useEffect(() => {
    if (import.meta.env.DEV && api) (window as unknown as { __board?: ExcalidrawImperativeAPI }).__board = api;
  }, [api]);

  // ── Chargement du tableau enregistré ──
  useEffect(() => {
    if (offline) return;
    let active = true;
    supabase
      .from("lesson_boards")
      .select("elements, files")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          logger.error("Tableau : chargement impossible", error);
          setLoadError(true);
        }
        const elements = (Array.isArray(data?.elements) ? data.elements : []) as unknown as Element[];
        const files = (data?.files && typeof data.files === "object" ? data.files : {}) as unknown as BinaryFiles;
        elements.forEach((e) => {
          shared.current.set(e.id, e.version);
          saved.current.set(e.id, e.version);
        });
        Object.keys(files).forEach((id) => knownFiles.current.add(id));
        setInitial({ elements, files });
      });
    return () => {
      active = false;
    };
  }, [lessonId, offline]);

  // ── Enregistrement (fusion côté base) ──
  const flushSave = useCallback(async () => {
    if (offline || readOnly || !api) return;
    const changed = api
      .getSceneElementsIncludingDeleted()
      .filter((e) => (saved.current.get(e.id) ?? -1) < e.version);
    if (!changed.length) return;
    const versions = changed.map((e) => [e.id, e.version] as const);
    const { error } = await supabase.rpc("save_lesson_board", {
      p_lesson: lessonId,
      p_elements: changed as unknown as Json,
    });
    if (error) {
      logger.error("Tableau : enregistrement impossible", error);
      if (/trop/i.test(error.message)) toast.error(error.message);
      return;
    }
    versions.forEach(([id, v]) => saved.current.set(id, Math.max(saved.current.get(id) ?? -1, v)));
  }, [api, lessonId, offline, readOnly]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushSave(), SAVE_AFTER_MS);
  }, [flushSave]);

  // Enregistre avant de quitter la page / de fermer le tableau
  useEffect(() => {
    const onHide = () => void flushSave();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flushSave();
    };
  }, [flushSave]);

  // ── Envoi en direct ──
  const flushOutbox = useCallback(() => {
    sendTimer.current = null;
    if (!transport || !outbox.current.size) return;
    const elements = [...outbox.current.values()];
    outbox.current.clear();
    transport.send({ type: "board", elements });
  }, [transport]);

  const uploadFiles = useCallback(async (files: BinaryFiles) => {
    const fresh = Object.values(files).filter((f) => !knownFiles.current.has(f.id));
    if (!fresh.length) return;
    fresh.forEach((f) => knownFiles.current.add(f.id));
    if (offline) return;
    const payload = Object.fromEntries(fresh.map((f) => [f.id, f]));
    const { error } = await supabase.rpc("save_lesson_board", {
      p_lesson: lessonId,
      p_elements: [] as unknown as Json,
      p_files: payload as unknown as Json,
    });
    if (error) {
      fresh.forEach((f) => knownFiles.current.delete(f.id));
      toast.error(/trop/i.test(error.message) ? error.message : "Image non partagée");
      return;
    }
    transport?.send({ type: "board-files", ids: fresh.map((f) => f.id) });
  }, [lessonId, offline, transport]);

  const onChange = useCallback(
    (elements: readonly Element[], _state: AppState, files: BinaryFiles) => {
      if (readOnly) return;
      let dirty = false;
      for (const e of elements) {
        if ((shared.current.get(e.id) ?? -1) < e.version) {
          shared.current.set(e.id, e.version);
          outbox.current.set(e.id, e);
          dirty = true;
        }
      }
      if (dirty) {
        if (!sendTimer.current) sendTimer.current = setTimeout(flushOutbox, BROADCAST_EVERY_MS);
        scheduleSave();
      }
      if (Object.keys(files).some((id) => !knownFiles.current.has(id))) void uploadFiles(files);
    },
    [flushOutbox, scheduleSave, uploadFiles, readOnly],
  );

  // ── Réception ──
  useEffect(() => {
    if (!transport || !api) return;
    const applyRemote = (remote: Element[]) => {
      if (!Array.isArray(remote) || !remote.length) return;
      remote.forEach((e) => shared.current.set(e.id, Math.max(shared.current.get(e.id) ?? -1, e.version)));
      const merged = reconcileElements(
        api.getSceneElementsIncludingDeleted(),
        remote as unknown as RemoteElements,
        api.getAppState(),
      );
      api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
      // On enregistre aussi : si l'autre perd sa connexion, rien n'est perdu
      if (!readOnly) scheduleSave();
    };
    const offs = [
      transport.on("board", (m: RoomMessage) => applyRemote(m.elements as Element[])),
      transport.on("board-files", async (m: RoomMessage) => {
        const ids = (Array.isArray(m.ids) ? m.ids : []).filter((id): id is string => typeof id === "string");
        const missing = ids.filter((id) => !knownFiles.current.has(id));
        if (!missing.length || offline) return;
        const { data } = await supabase.from("lesson_boards").select("files").eq("lesson_id", lessonId).maybeSingle();
        const all = (data?.files ?? {}) as unknown as Record<string, BinaryFileData>;
        const add = missing.map((id) => all[id]).filter(Boolean);
        add.forEach((f) => knownFiles.current.add(f.id));
        if (add.length) api.addFiles(add);
      }),
      // L'autre vient d'arriver : on lui envoie tout le tableau (même ce qui n'est pas encore enregistré)
      transport.on("board-hello", (m: RoomMessage) => {
        const elements = api.getSceneElementsIncludingDeleted();
        if (elements.length) transport.send({ type: "board", to: m.from, elements });
      }),
      transport.on("pointer", (m: RoomMessage) => {
        const pointer = m.pointer as Collaborator["pointer"];
        if (!pointer) return;
        collaborators.current.set(m.from as SocketId, {
          pointer,
          button: m.button === "down" ? "down" : "up",
          username: typeof m.name === "string" ? m.name : "Participant",
          color: PEER_COLOR,
          id: m.from,
          socketId: m.from as SocketId,
        });
        api.updateScene({ collaborators: new Map(collaborators.current) });
      }),
      transport.on("bye", (m: RoomMessage) => {
        if (collaborators.current.delete(m.from as SocketId)) api.updateScene({ collaborators: new Map(collaborators.current) });
      }),
    ];
    transport.send({ type: "board-hello" });
    return () => offs.forEach((off) => off());
  }, [transport, api, lessonId, offline, readOnly, scheduleSave]);

  const onPointerUpdate = useCallback(
    ({ pointer, button }: { pointer: { x: number; y: number; tool: "pointer" | "laser" }; button: "down" | "up" }) => {
      const now = Date.now();
      if (!transport || now - lastPointer.current < POINTER_EVERY_MS) return;
      lastPointer.current = now;
      transport.send({ type: "pointer", pointer, button, name: selfName });
    },
    [transport, selfName],
  );

  if (!initial) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-peri" />
      </div>
    );
  }

  return (
    <div className="lesson-board relative h-full w-full">
      {loadError && (
        <p className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-sun-soft px-3 py-1 text-xs">
          Tableau enregistré indisponible : ce que vous dessinez reste partagé en direct.
        </p>
      )}
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={{
          elements: initial.elements,
          files: initial.files,
          appState: { viewBackgroundColor: "#ffffff", currentItemRoughness: 0, currentItemStrokeWidth: 2 },
          scrollToContent: initial.elements.length > 0,
        }}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        isCollaborating={!!transport}
        viewModeEnabled={readOnly}
        langCode="fr-FR"
        name="Tableau du cours"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            export: false,
            saveAsImage: true,
            clearCanvas: !readOnly,
            changeViewBackgroundColor: true,
          },
        }}
      />
    </div>
  );
}
