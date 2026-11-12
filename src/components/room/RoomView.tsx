import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useLessonCall } from "@/hooks/useLessonRoom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { RoomTransport } from "@/lib/room/transport";
import { cn } from "@/lib/utils";
import { CallControls } from "./CallControls";
import { LessonChat, useLessonChat } from "./LessonChat";
import { PreJoin } from "./PreJoin";
import { VideoStage } from "./VideoStage";

const LessonBoard = lazy(() => import("./LessonBoard"));

export interface RoomViewProps {
  lessonId: string;
  userId: string;
  selfName: string;
  /** « Votre prof » / « Votre élève », en attendant que l'autre se présente. */
  peerLabel: string;
  names: Record<string, string>;
  title: string;
  subtitle?: string | null;
  transport: RoomTransport | null;
  joinLabel: string;
  helper: string;
  /** Appelé avant d'entrer (démarre le cours côté base). false = on n'entre pas. */
  beforeJoin?: () => Promise<boolean>;
  onLeave: () => void;
  preJoinExtra?: React.ReactNode;
  /** Mode test local : pas d'appel à la base ni au serveur de connexion. */
  offline?: boolean;
}

export function RoomView(p: RoomViewProps) {
  const isMobile = useIsMobile();
  const call = useLessonCall({ transport: p.transport, lessonId: p.lessonId, name: p.selfName, skipIceFetch: p.offline });
  const [inCall, setInCall] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { requestMedia } = call;

  // Aperçu caméra dès l'arrivée dans la salle (et au retour après avoir raccroché)
  useEffect(() => {
    if (!inCall) void requestMedia();
  }, [inCall, requestMedia]);

  const handleJoin = async () => {
    if (p.beforeJoin && !(await p.beforeJoin())) return;
    try {
      await call.join();
      setInCall(true);
    } catch {
      toast.error("Impossible d'entrer dans la salle. Vérifiez votre connexion et réessayez.");
    }
  };

  const handleLeave = () => {
    call.leave();
    setInCall(false);
    p.onLeave();
  };

  const toggleChat = useCallback(() => {
    setChatOpen((o) => !o);
    setUnread(0);
  }, []);

  const onIncoming = useCallback(() => {
    setChatOpen((open) => {
      if (!open) setUnread((n) => n + 1);
      return open;
    });
  }, []);
  const chatData = useLessonChat(p.lessonId, p.userId, inCall && !p.offline, onIncoming);

  if (!inCall || !call.snap) {
    return (
      <PreJoin
        title={p.title}
        subtitle={p.subtitle}
        selfName={p.selfName}
        stream={call.preview}
        flags={call.localFlags}
        problem={call.problem}
        requesting={call.requesting}
        joining={call.joining}
        joinLabel={p.joinLabel}
        helper={p.helper}
        onRetryMedia={() => void call.requestMedia()}
        onMic={() => call.setMic(!call.localFlags.audio)}
        onCamera={() => call.setCamera(!call.localFlags.video)}
        onJoin={() => void handleJoin()}
        extra={p.preJoinExtra}
      />
    );
  }

  const stream = call.localPreview;
  const hasMic = !!call.preview?.getAudioTracks().length;
  const hasCamera = !!call.preview?.getVideoTracks().length;
  const canShareScreen = !isMobile && !!navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices;

  const stage = (compact: boolean, className?: string) => (
    <VideoStage
      snap={call.snap!}
      localStream={stream}
      localFlags={call.localFlags}
      selfName={p.selfName}
      peerLabel={p.peerLabel}
      onRetry={() => call.retry()}
      compact={compact}
      className={className}
    />
  );

  const chat = !p.offline && (
    <LessonChat
      userId={p.userId}
      names={p.names}
      messages={chatData.messages}
      onSend={chatData.send}
      className="h-full"
    />
  );

  const board = (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-peri" />
        </div>
      }
    >
      <LessonBoard lessonId={p.lessonId} transport={p.transport} selfName={p.selfName} offline={p.offline} />
    </Suspense>
  );

  const panel = "overflow-hidden rounded-2xl border-2 border-ink-2 bg-white shadow-hard";

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col gap-3 lg:h-[calc(100vh-8rem)]">
      {/* Bandeau du cours */}
      <div className="flex items-center gap-2 text-sm">
        <span className="truncate font-display font-semibold">{p.title}</span>
        {p.subtitle && <span className="truncate text-muted-foreground">· {p.subtitle}</span>}
        <span
          className={cn(
            "ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink-2 px-2.5 py-0.5 text-xs font-medium",
            call.snap.state === "connected" ? "bg-mint-soft" : "bg-sun-soft",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", call.snap.state === "connected" ? "bg-mint" : "animate-pulse bg-sun")} />
          {call.snap.state === "connected" ? "En direct" : call.snap.state === "waiting" || call.snap.state === "left" ? "En attente" : "Connexion"}
        </span>
      </div>

      {/* Zone principale */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        {boardOpen ? (
          <>
            {isMobile && stage(false, "h-32 shrink-0")}
            <div className={cn(panel, "min-h-0 flex-1")}>{board}</div>
            {!isMobile && (
              <div className="flex w-72 shrink-0 flex-col gap-3 xl:w-80">
                {stage(true)}
                {chatOpen && <div className={cn(panel, "min-h-0 flex-1")}>{chat}</div>}
              </div>
            )}
          </>
        ) : (
          <>
            {stage(false, "min-h-0 flex-1")}
            {chatOpen && !isMobile && <div className={cn(panel, "w-80 shrink-0")}>{chat}</div>}
          </>
        )}
      </div>

      <CallControls
        flags={call.localFlags}
        hasMic={hasMic}
        hasCamera={hasCamera}
        canShareScreen={canShareScreen}
        boardOpen={boardOpen}
        chatOpen={chatOpen}
        unread={unread}
        onMic={() => call.setMic(!call.localFlags.audio)}
        onCamera={() => call.setCamera(!call.localFlags.video)}
        onScreen={() =>
          void call.toggleScreen().catch(() => toast.error("Partage d'écran annulé ou refusé par le navigateur"))
        }
        onBoard={() => setBoardOpen((o) => !o)}
        onChat={toggleChat}
        onHangUp={handleLeave}
      />

      {/* Chat en panneau du bas sur téléphone */}
      {isMobile && chatOpen && !p.offline && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[65dvh] flex-col rounded-t-3xl border-2 border-b-0 border-ink-2 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b-2 border-ink-2 px-4 py-2">
            <span className="font-display font-semibold">Chat du cours</span>
            <button type="button" onClick={toggleChat} aria-label="Fermer le chat" className="rounded-full p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1">{chat}</div>
        </div>
      )}
    </div>
  );
}
