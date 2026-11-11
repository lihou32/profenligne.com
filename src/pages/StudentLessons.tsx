import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Sparkles, Filter } from "lucide-react";
import { useState } from "react";
import { useLessons } from "@/hooks/useData";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";
import { LessonCard } from "@/components/lessons/LessonCard";

export default function StudentLessons() {
  const { data: lessons, isLoading } = useLessons();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const allLessons = lessons || [];
  const subjects = Array.from(new Set(allLessons.map((l) => l.subject))).sort();
  const filtered = subjectFilter === "all" ? allLessons : allLessons.filter((l) => l.subject === subjectFilter);

  const upcoming = filtered.filter((l) => ["pending", "confirmed", "in_progress"].includes(l.status));
  const cancelled = filtered.filter((l) => l.status === "cancelled");
  const completed = filtered.filter((l) => l.status === "completed");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Mes Cours
          </h1>
          <p className="text-muted-foreground">Gérez vos cours et votre planning</p>
        </div>
        <BookLessonDialog />
      </div>

      {subjects.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button
            size="sm"
            variant={subjectFilter === "all" ? "default" : "outline"}
            onClick={() => setSubjectFilter("all")}
            className={`rounded-xl h-7 text-xs ${subjectFilter === "all" ? "gradient-primary text-primary-foreground" : ""}`}
          >
            Toutes
          </Button>
          {subjects.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={subjectFilter === s ? "default" : "outline"}
              onClick={() => setSubjectFilter(s)}
              className={`rounded-xl h-7 text-xs ${subjectFilter === s ? "gradient-primary text-primary-foreground" : ""}`}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary/50 rounded-xl border border-border/30">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">Tous ({filtered.length})</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">Terminés ({completed.length})</TabsTrigger>
          {cancelled.length > 0 && (
            <TabsTrigger value="cancelled" className="rounded-lg data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">Annulés ({cancelled.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {isLoading && <LessonSkeletons />}
          {!isLoading && filtered.length === 0 && (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-3 p-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Aucun cours pour le moment</p>
                <BookLessonDialog />
              </CardContent>
            </Card>
          )}
          {filtered.map((lesson, i) => (
            <LessonCard key={lesson.id} lesson={lesson} viewer="student" counterpart={lesson.tutor_profile} index={i} />
          ))}
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours à venir</p>}
          {upcoming.map((lesson, i) => <LessonCard key={lesson.id} lesson={lesson} viewer="student" counterpart={lesson.tutor_profile} index={i} />)}
        </TabsContent>
        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun cours terminé</p>}
          {completed.map((lesson, i) => <LessonCard key={lesson.id} lesson={lesson} viewer="student" counterpart={lesson.tutor_profile} index={i} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.map((lesson, i) => <LessonCard key={lesson.id} lesson={lesson} viewer="student" counterpart={lesson.tutor_profile} index={i} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LessonSkeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Card key={i} className="glass-card">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
