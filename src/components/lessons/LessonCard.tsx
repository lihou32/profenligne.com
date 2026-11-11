import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookOpen, Calendar, CheckCircle2, Clock, Coins, Video, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCancelLesson, useConfirmLesson, type Lesson } from "@/hooks/useData";
import { FREE_CANCEL_HOURS, ROOM_OPEN_MINUTES_BEFORE, friendlyError, isFreeCancellation, isRoomOpen } from "@/lib/credits";

export const LESSON_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "border-transparent bg-hl-soft text-hl" },
  confirmed: { label: "Confirmé", className: "border-transparent bg-peri-soft text-ink" },
  in_progress: { label: "En cours", className: "border-transparent bg-rose-soft text-rose" },
  completed: { label: "Terminé", className: "border-transparent bg-mint-soft text-success" },
  cancelled: { label: "Annulé", className: "border-transparent bg-ink/5 text-muted-foreground" },
};

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)}h${rest ? String(rest).padStart(2, "0") : ""}`;
}

interface Person {
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
}

interface LessonCardProps {
  lesson: Lesson;
  /** Point de vue : l'élève voit le prof, le prof voit l'élève. */
  viewer: "student" | "tutor";
  /** La personne en face (prof pour l'élève, élève pour le prof). */
  counterpart?: Person | null;
  index?: number;
}

export function LessonCard({ lesson, viewer, counterpart, index = 0 }: LessonCardProps) {
  const confirmLesson = useConfirmLesson();
  const cancelLesson = useCancelLesson();

  const status = LESSON_STATUS[lesson.status] || LESSON_STATUS.pending;
  const scheduled = new Date(lesson.scheduled_at);
  const isPast = scheduled.getTime() + lesson.duration_minutes * 60_000 < Date.now();
  const canJoin =
    lesson.status === "in_progress" ||
    (lesson.status === "confirmed" && isRoomOpen(lesson.scheduled_at, lesson.duration_minutes));
  const canCancel = ["pending", "confirmed"].includes(lesson.status) && !isPast;
  const freeCancel = viewer === "tutor" || isFreeCancellation(lesson.status, lesson.scheduled_at);
  const busy = confirmLesson.isPending || cancelLesson.isPending;

  const name = counterpart
    ? `${counterpart.first_name || ""} ${counterpart.last_name || ""}`.trim()
    : "";
  const fallbackName = viewer === "tutor" ? "Élève" : "Professeur";

  const handleConfirm = () =>
    confirmLesson.mutate(lesson.id, {
      onSuccess: () => toast.success("Cours confirmé ! L'élève est prévenu."),
      onError: (e) => toast.error(friendlyError(e)),
    });

  const handleCancel = () =>
    cancelLesson.mutate(lesson, {
      onSuccess: () =>
        toast.success(
          viewer === "tutor"
            ? lesson.status === "pending" ? "Demande refusée — l'élève est remboursé" : "Cours annulé — l'élève est remboursé"
            : freeCancel ? `Cours annulé — ${lesson.credits_cost} crédit(s) remboursé(s)` : "Cours annulé",
        ),
      onError: (e) => toast.error(friendlyError(e)),
    });

  const cancelLabel = viewer === "tutor" && lesson.status === "pending" ? "Refuser" : "Annuler";

  return (
    <Card className="reveal lift group" style={{ transitionDelay: `${Math.min(index, 6) * 50}ms` }}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {counterpart !== undefined ? (
            <Avatar className="h-12 w-12 shrink-0 rounded-2xl">
              {counterpart?.avatar_url && <AvatarImage src={counterpart.avatar_url} alt={name} />}
              <AvatarFallback className="rounded-2xl bg-peri-soft font-display font-bold text-ink">
                {(counterpart?.first_name?.[0] || fallbackName[0]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-hl-soft">
              <BookOpen className="h-6 w-6 text-ink" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">
              {lesson.subject}
              {counterpart !== undefined && (
                <span className="font-normal text-muted-foreground"> · {name || fallbackName}</span>
              )}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{lesson.topic || "—"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(scheduled, "EEE d MMM yyyy", { locale: fr })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(scheduled, "HH:mm")} ({formatDuration(lesson.duration_minutes)})
              </span>
              {lesson.credits_cost > 0 && (
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-gold" />
                  {lesson.credits_cost} crédit{lesson.credits_cost > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge className={`rounded-full px-3 ${status.className}`} variant="outline">{status.label}</Badge>

          {viewer === "tutor" && lesson.status === "pending" && !isPast && (
            <Button size="sm" className="text-xs" onClick={handleConfirm} disabled={busy}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Accepter
            </Button>
          )}

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 text-xs" disabled={busy}>
                  <XCircle className="mr-1 h-3 w-3" /> {cancelLabel}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{cancelLabel} ce cours ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {viewer === "tutor"
                      ? `L'élève sera prévenu et remboursé de ${lesson.credits_cost} crédit(s).`
                      : freeCancel
                        ? `Vous serez remboursé de ${lesson.credits_cost} crédit(s).`
                        : `Le cours commence dans moins de ${FREE_CANCEL_HOURS} h : les crédits ne seront pas remboursés.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Retour</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {cancelLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canJoin && (
            <Button size="sm" className="text-xs" asChild>
              <Link to={`/room/${lesson.id}`}>
                <Video className="mr-1 h-3 w-3" /> {viewer === "tutor" && lesson.status === "confirmed" ? "Démarrer" : "Rejoindre"}
              </Link>
            </Button>
          )}
          {lesson.status === "confirmed" && !canJoin && !isPast && (
            <span className="text-[11px] text-muted-foreground">
              Salle ouverte {ROOM_OPEN_MINUTES_BEFORE} min avant
            </span>
          )}

          {lesson.status === "completed" && (
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80" asChild>
              <Link to={`/report/${lesson.id}`}>{viewer === "student" ? "Rapport & avis" : "Rapport"}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
