import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Calendar, Clock, Video, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTutorLessons, useUpdateLesson } from "@/hooks/useData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/15 text-warning border-warning/30" },
  confirmed: { label: "Confirmé", className: "bg-info/15 text-info border-info/30" },
  in_progress: { label: "En cours", className: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Terminé", className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Annulé", className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30" },
};

export default function TutorLessons() {
  const { data: lessons, isLoading } = useTutorLessons();
  const updateLesson = useUpdateLesson();

  const pending = (lessons || []).filter((l: any) => l.status === "pending");
  const upcoming = (lessons || []).filter((l: any) => ["confirmed", "in_progress"].includes(l.status));
  const completed = (lessons || []).filter((l: any) => l.status === "completed");

  const handleAccept = (id: string) => {
    updateLesson.mutate({ id, status: "confirmed" }, { onSuccess: () => toast.success("Cours confirmé !") });
  };

  const handleReject = (id: string) => {
    updateLesson.mutate({ id, status: "cancelled" }, { onSuccess: () => toast.success("Cours refusé") });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Mes Cours
        </h1>
        <p className="text-muted-foreground">Gérez les demandes et votre planning</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="bg-secondary/50 rounded-xl border border-border/30">
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
            En attente ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
            À venir ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
            Historique ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading && <p className="text-center text-muted-foreground py-8">Chargement...</p>}
          {!isLoading && pending.length === 0 && (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-3 p-8">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Aucune demande en attente</p>
              </CardContent>
            </Card>
          )}
          {pending.map((lesson: any, i: number) => (
            <TutorLessonCard key={lesson.id} lesson={lesson} index={i} onAccept={handleAccept} onReject={handleReject} />
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours à venir</p>}
          {upcoming.map((lesson: any, i: number) => (
            <TutorLessonCard key={lesson.id} lesson={lesson} index={i} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours terminé</p>}
          {completed.map((lesson: any, i: number) => (
            <TutorLessonCard key={lesson.id} lesson={lesson} index={i} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TutorLessonCard({
  lesson,
  index = 0,
  onAccept,
  onReject,
}: {
  lesson: any;
  index?: number;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const status = statusConfig[lesson.status] || statusConfig.pending;
  const durationLabel = lesson.duration_minutes >= 60
    ? `${Math.floor(lesson.duration_minutes / 60)}h${lesson.duration_minutes % 60 ? (lesson.duration_minutes % 60) + "min" : ""}`
    : `${lesson.duration_minutes}min`;

  return (
    <Card className="glass-card transition-all duration-200 hover:border-primary/20 group animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
              {(lesson.student_profile?.first_name?.[0] || "E").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {lesson.student_profile?.first_name || "Élève"} {lesson.student_profile?.last_name || ""} — {lesson.subject}
            </h3>
            <p className="text-sm text-muted-foreground">{lesson.topic || "—"}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(lesson.scheduled_at), "dd MMM yyyy", { locale: fr })}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(lesson.scheduled_at), "HH:mm")} ({durationLabel})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`rounded-full px-3 ${status.className}`} variant="outline">{status.label}</Badge>
          {lesson.status === "pending" && onAccept && onReject && (
            <>
              <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground text-xs" onClick={() => onAccept(lesson.id)}>
                <CheckCircle2 className="mr-1 h-3 w-3" /> Accepter
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10 text-xs" onClick={() => onReject(lesson.id)}>
                <XCircle className="mr-1 h-3 w-3" /> Refuser
              </Button>
            </>
          )}
          {(lesson.status === "confirmed" || lesson.status === "in_progress") && (
            <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground btn-glow text-xs" asChild>
              <Link to={`/room/${lesson.id}`}><Video className="mr-1 h-3 w-3" /> Démarrer</Link>
            </Button>
          )}
          {lesson.status === "completed" && (
            <Button size="sm" variant="ghost" className="rounded-xl text-primary hover:text-primary/80" asChild>
              <Link to={`/report/${lesson.id}`}>Rapport</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
