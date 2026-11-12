import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Sparkles, Filter, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useLessons } from "@/hooks/useData";
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
    <div className="space-y-6">
      <PageHeader eyebrow="Mes cours" title="Ton planning" subtitle="Tes réservations, à venir et passées." actions={<Button asChild><Link to="/tutors"><Plus /> Réserver un cours</Link></Button>} />

      {subjects.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button
            size="sm"
            variant={subjectFilter === "all" ? "default" : "outline"}
            onClick={() => setSubjectFilter("all")}
            className="h-8 text-xs"
          >
            Toutes
          </Button>
          {subjects.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={subjectFilter === s ? "default" : "outline"}
              onClick={() => setSubjectFilter(s)}
              className="h-8 text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="all">Tous ({filtered.length})</TabsTrigger>
          <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Terminés ({completed.length})</TabsTrigger>
          {cancelled.length > 0 && (
            <TabsTrigger value="cancelled">Annulés ({cancelled.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {isLoading && <LessonSkeletons />}
          {!isLoading && filtered.length === 0 && (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-3 p-8">
                <BookOpen className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Aucun cours pour le moment</p>
                <Button asChild><Link to="/tutors"><Plus /> Réserver un cours</Link></Button>
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
