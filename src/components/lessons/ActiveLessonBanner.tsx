import { Video, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActiveLessonBannerProps {
  lesson: {
    id: string;
    subject: string;
    topic?: string | null;
    scheduled_at: string;
    duration_minutes: number;
  };
  role?: "student" | "tutor";
}

export function ActiveLessonBanner({ lesson, role = "student" }: ActiveLessonBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-5 animate-fade-in">
      {/* Pulsing background glow */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30">
            <Video className="h-7 w-7 text-primary" />
            <span className="absolute flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
                <Zap className="h-3 w-3" />
                {role === "tutor" ? "Cours actif" : "Cours en cours"}
              </span>
            </div>
            <h3 className="font-bold text-lg leading-tight">{lesson.subject}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {lesson.topic && <span>{lesson.topic}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(lesson.scheduled_at), "HH:mm", { locale: fr })} · {lesson.duration_minutes}min
              </span>
            </div>
          </div>
        </div>

        <Button
          asChild
          className="gradient-primary text-primary-foreground btn-glow font-bold px-6 shrink-0"
          size="lg"
        >
          <Link to={`/room/${lesson.id}`}>
            <Video className="mr-2 h-5 w-5" />
            {role === "tutor" ? "Démarrer / Rejoindre" : "Rejoindre maintenant"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
