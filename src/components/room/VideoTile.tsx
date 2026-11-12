import { useEffect, useRef, useState } from "react";
import { MicOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  stream: MediaStream | null;
  name: string;
  videoOn: boolean;
  audioOn: boolean;
  /** Vignette locale : sans son (pas d'écho) et en miroir (sauf écran partagé). */
  local?: boolean;
  mirror?: boolean;
  /** Écran partagé : on affiche toute l'image, sans la rogner. */
  contain?: boolean;
  className?: string;
  small?: boolean;
}

export function VideoTile({ stream, name, videoOn, audioOn, local, mirror, contain, className, small }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (!stream) return;
    el.play().then(() => setBlocked(false)).catch(() => {
      // Son bloqué par le navigateur tant qu'on n'a pas cliqué : on propose un bouton
      if (!local) setBlocked(true);
    });
  }, [stream, local, videoOn]);

  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const showVideo = !!stream && videoOn;

  return (
    <div className={cn("relative overflow-hidden bg-ink-2", className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={local}
        className={cn(
          "h-full w-full",
          contain ? "object-contain" : "object-cover",
          mirror && "-scale-x-100",
          !showVideo && "invisible",
        )}
      />
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-peri font-display font-bold text-white",
              small ? "h-10 w-10 text-lg" : "h-20 w-20 text-3xl sm:h-24 sm:w-24",
            )}
          >
            {initial}
          </div>
        </div>
      )}
      <div
        className={cn(
          "absolute bottom-2 left-2 flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-white backdrop-blur",
          small ? "text-[11px]" : "text-xs",
        )}
      >
        {!audioOn && <MicOff className="h-3 w-3 shrink-0 text-rose" aria-label="Micro coupé" />}
        <span className="truncate">{name}</span>
      </div>
      {blocked && (
        <button
          type="button"
          onClick={() => ref.current?.play().then(() => setBlocked(false)).catch(() => undefined)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm font-semibold text-white"
        >
          <Volume2 className="h-8 w-8" />
          Touchez pour activer le son
        </button>
      )}
    </div>
  );
}
