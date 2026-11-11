import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useTutorLessons } from "@/hooks/useData";
import { LessonCard } from "@/components/lessons/LessonCard";

export default function TutorLessons() {
  const { data: lessons, isLoading } = useTutorLessons();
  const all = lessons || [];

  const pending = all.filter((l) => l.status === "pending");
  const upcoming = all.filter((l) => ["confirmed", "in_progress"].includes(l.status));
  const history = all
    .filter((l) => ["completed", "cancelled"].includes(l.status))
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  const tabClass = "rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Mes Cours
        </h1>
        <p className="text-muted-foreground">Gérez les demandes et votre planning</p>
      </div>

      <Tabs defaultValue={pending.length > 0 || upcoming.length === 0 ? "pending" : "upcoming"}>
        <TabsList className="bg-secondary/50 rounded-xl border border-border/30">
          <TabsTrigger value="pending" className={tabClass}>En attente ({pending.length})</TabsTrigger>
          <TabsTrigger value="upcoming" className={tabClass}>À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="history" className={tabClass}>Historique ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading && <p className="text-center text-muted-foreground py-8">Chargement…</p>}
          {!isLoading && pending.length === 0 && (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-3 p-8">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Aucune demande en attente</p>
              </CardContent>
            </Card>
          )}
          {pending.map((lesson, i) => (
            <LessonCard key={lesson.id} lesson={lesson} viewer="tutor" counterpart={lesson.student_profile} index={i} />
          ))}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {!isLoading && upcoming.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours à venir</p>}
          {upcoming.map((lesson, i) => (
            <LessonCard key={lesson.id} lesson={lesson} viewer="tutor" counterpart={lesson.student_profile} index={i} />
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {!isLoading && history.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours terminé</p>}
          {history.map((lesson, i) => (
            <LessonCard key={lesson.id} lesson={lesson} viewer="tutor" counterpart={lesson.student_profile} index={i} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
