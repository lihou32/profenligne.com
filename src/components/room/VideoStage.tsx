import { Loader2, RefreshCw, UserRoundX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CallSnapshot, MediaFlags } from "@/lib/room/call";
import { VideoTile } from "./VideoTile";

interface Props {
  snap: CallSnapshot;
  localStream: MediaStream | null;
  localFlags: MediaFlags;
  selfName: string;
  peerLabel: string;
  onRetry: () => void;
  /** Colonne étroite à côté du tableau : les deux vignettes l'une sous l'autre. */
  compact?: boolean;
  className?: string;
}

const STATUS: Record<string, { text: string; spin?: boolean }> = {
  waiting: { text: "En attente de l'autre participant…", spin: true },
  connecting: { text: "Connexion en cours…", spin: true },
  reconnecting: { text: "Connexion perdue, on la rétablit…", spin: true },
};

export function VideoStage({ snap, localStream, localFlags, selfName, peerLabel, onRetry, compact, className }: Props) {
  const peerName = snap.peerName || peerLabel;
  const status = STATUS[snap.state];
  const remote = (
    <VideoTile
      stream={snap.state === "connected" || snap.state === "reconnecting" ? snap.remoteStream : null}
      name={peerName}
      videoOn={snap.peerMedia.video}
      audioOn={snap.peerMedia.audio}
      contain={snap.peerMedia.screen}
      small={compact}
      className="h-full w-full"
    />
  );
  const overlay = (status || snap.state === "left" || snap.state === "failed") && (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-2/80 p-4 text-center text-white">
      {status && (
        <>
          {snap.state === "reconnecting" ? <WifiOff className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
          <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{status.text}</p>
          {snap.state === "waiting" && !compact && (
            <p className="max-w-xs text-xs text-white/70">
              {peerLabel} a reçu une notification. Le tableau et le chat marchent déjà.
            </p>
          )}
        </>
      )}
      {snap.state === "left" && (
        <>
          <UserRoundX className="h-7 w-7" />
          <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{peerName} a quitté la salle.</p>
          {!compact && <p className="text-xs text-white/70">La visio reprendra toute seule s'il revient.</p>}
        </>
      )}
      {snap.state === "failed" && (
        <>
          <WifiOff className="h-7 w-7" />
          <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>Impossible de relier les deux appareils.</p>
          {!compact && (
            <p className="max-w-xs text-xs text-white/70">
              Un réseau trop fermé (Wi-Fi d'école, VPN) peut bloquer la visio. Essayez un autre réseau ou le partage de connexion.
            </p>
          )}
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Réessayer
          </Button>
        </>
      )}
    </div>
  );

  const local = (
    <VideoTile
      stream={localStream}
      name={`${selfName} (vous)`}
      videoOn={localFlags.video}
      audioOn={localFlags.audio}
      local
      mirror={!localFlags.screen}
      contain={localFlags.screen}
      small
      className="h-full w-full"
    />
  );

  if (compact) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-ink-2">
          {remote}
          {overlay}
        </div>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-ink-2">{local}</div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-2 border-ink-2 bg-ink-2", className)}>
      {remote}
      {overlay}
      <div className="absolute right-3 top-3 aspect-video w-28 overflow-hidden rounded-xl border-2 border-white/80 shadow-lg sm:w-44">
        {local}
      </div>
      {snap.relayed && (
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/80">Via relais</span>
      )}
    </div>
  );
}
