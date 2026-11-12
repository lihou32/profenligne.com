import { MessageSquare, Mic, MicOff, MonitorUp, MonitorX, PenLine, PhoneOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFlags } from "@/lib/room/call";

interface Props {
  flags: MediaFlags;
  hasMic: boolean;
  hasCamera: boolean;
  canShareScreen: boolean;
  boardOpen: boolean;
  chatOpen: boolean;
  unread: number;
  onMic: () => void;
  onCamera: () => void;
  onScreen: () => void;
  onBoard: () => void;
  onChat: () => void;
  onHangUp: () => void;
}

function Round({
  active, danger, label, onClick, children, disabled, badge,
}: {
  active?: boolean; danger?: boolean; label: string; onClick: () => void;
  children: React.ReactNode; disabled?: boolean; badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink-2 transition-transform active:translate-y-px disabled:opacity-40 sm:h-12 sm:w-12",
        danger ? "bg-destructive text-white shadow-hard" : active ? "bg-peri text-white shadow-hard" : "bg-white text-ink-2 shadow-hard",
      )}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink-2 bg-sun px-1 text-[10px] font-bold text-ink-2">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function CallControls(p: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <Round label={p.flags.audio ? "Couper le micro" : "Activer le micro"} onClick={p.onMic} disabled={!p.hasMic} danger={p.hasMic && !p.flags.audio}>
        {p.flags.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Round>
      <Round
        label={p.flags.video && !p.flags.screen ? "Couper la caméra" : "Activer la caméra"}
        onClick={p.onCamera}
        disabled={!p.hasCamera || p.flags.screen}
        danger={p.hasCamera && !p.flags.video && !p.flags.screen}
      >
        {p.flags.video || p.flags.screen ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Round>
      {p.canShareScreen && (
        <Round label={p.flags.screen ? "Arrêter le partage d'écran" : "Partager mon écran"} onClick={p.onScreen} active={p.flags.screen}>
          {p.flags.screen ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
        </Round>
      )}
      <Round label={p.boardOpen ? "Masquer le tableau" : "Ouvrir le tableau"} onClick={p.onBoard} active={p.boardOpen}>
        <PenLine className="h-5 w-5" />
      </Round>
      <Round label={p.chatOpen ? "Masquer le chat" : "Ouvrir le chat"} onClick={p.onChat} active={p.chatOpen} badge={p.chatOpen ? 0 : p.unread}>
        <MessageSquare className="h-5 w-5" />
      </Round>
      <Round label="Quitter la visio" onClick={p.onHangUp} danger>
        <PhoneOff className="h-5 w-5" />
      </Round>
    </div>
  );
}
