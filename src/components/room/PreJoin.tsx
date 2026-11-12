import { Loader2, Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaFlags, MediaProblem } from "@/lib/room/call";
import { VideoTile } from "./VideoTile";

const PROBLEM_TEXT: Record<MediaProblem, string> = {
  permission:
    "Votre navigateur bloque la caméra (ou le micro). Cliquez sur le cadenas à gauche de l'adresse, autorisez-les, puis « Réessayer ».",
  "no-device": "Aucune caméra trouvée : vous entrerez avec le micro seulement (ou sans rien si aucun micro).",
  "in-use": "La caméra est déjà utilisée par une autre application (Zoom, Teams…). Fermez-la puis « Réessayer ».",
  insecure: "La visio a besoin d'une connexion sécurisée (https).",
  unknown: "Impossible d'accéder à la caméra.",
};

interface Props {
  title: string;
  subtitle?: string | null;
  selfName: string;
  stream: MediaStream | null;
  flags: MediaFlags;
  problem: MediaProblem | null;
  requesting: boolean;
  joining: boolean;
  joinLabel: string;
  helper: string;
  onRetryMedia: () => void;
  onMic: () => void;
  onCamera: () => void;
  onJoin: () => void;
  extra?: React.ReactNode;
}

export function PreJoin(p: Props) {
  const hasMic = !!p.stream?.getAudioTracks().length;
  const hasCam = !!p.stream?.getVideoTracks().length;
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-6 py-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-ink-2 bg-ink-2 shadow-hard">
        {p.requesting && !p.stream ? (
          <div className="flex h-full items-center justify-center text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <VideoTile stream={p.stream} name={`${p.selfName} (vous)`} videoOn={p.flags.video} audioOn={p.flags.audio} local mirror className="h-full w-full" />
        )}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          <button
            type="button"
            onClick={p.onMic}
            disabled={!hasMic}
            aria-label={p.flags.audio ? "Couper le micro" : "Activer le micro"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-2 shadow-hard disabled:opacity-40 ${p.flags.audio ? "bg-white text-ink-2" : "bg-destructive text-white"}`}
          >
            {p.flags.audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={p.onCamera}
            disabled={!hasCam}
            aria-label={p.flags.video ? "Couper la caméra" : "Activer la caméra"}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-2 shadow-hard disabled:opacity-40 ${p.flags.video ? "bg-white text-ink-2" : "bg-destructive text-white"}`}
          >
            {p.flags.video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-4 text-center lg:text-left">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{p.title}</h1>
          {p.subtitle && <p className="mt-1 text-muted-foreground">{p.subtitle}</p>}
        </div>
        <p className="text-sm text-muted-foreground">{p.helper}</p>
        {p.problem && (
          <div className="rounded-xl border-2 border-ink-2 bg-sun-soft p-3 text-left text-sm">
            {PROBLEM_TEXT[p.problem]}
            {(p.problem === "permission" || p.problem === "in-use") && (
              <Button variant="outline" size="sm" className="mt-2" onClick={p.onRetryMedia}>Réessayer</Button>
            )}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          <Button size="lg" onClick={p.onJoin} disabled={p.joining || p.requesting}>
            {p.joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
            {p.joinLabel}
          </Button>
          {p.extra}
        </div>
      </div>
    </div>
  );
}
