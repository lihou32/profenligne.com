import { Link } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Clock, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ActiveLessonBannerProps {
  lesson: { id: string; subject: string; topic?: string | null; scheduled_at: string; duration_minutes: number }
  role?: "student" | "tutor"
}

/** Bandeau prioritaire quand un cours est en cours ou que la salle est ouverte. */
export function ActiveLessonBanner({ lesson, role = "student" }: ActiveLessonBannerProps) {
  return (
    <div className="glass-ink reveal relative overflow-hidden rounded-3xl p-5 sm:p-6">
      <span aria-hidden className="blob" style={{ width: 260, height: 260, top: -110, right: -60, background: "hsl(46 100% 62%)", opacity: 0.35 }} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Video className="h-6 w-6 text-hl" />
            <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose" />
            </span>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-hl">{role === "tutor" ? "Ton cours commence" : "Ta salle est ouverte"}</p>
            <h3 className="text-xl leading-tight">{lesson.subject}{lesson.topic ? ` · ${lesson.topic}` : ""}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70">
              <Clock className="h-3.5 w-3.5" />{format(new Date(lesson.scheduled_at), "HH'h'mm", { locale: fr })} · {lesson.duration_minutes} min
            </p>
          </div>
        </div>
        <Button asChild variant="highlight" size="lg" className="shrink-0">
          <Link to={`/room/${lesson.id}`}><Video /> {role === "tutor" ? "Ouvrir la salle" : "Rejoindre"}</Link>
        </Button>
      </div>
    </div>
  )
}
