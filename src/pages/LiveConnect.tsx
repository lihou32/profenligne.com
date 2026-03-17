import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useTutors, useLessons } from "@/hooks/useData";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";

const statusColors: Record<string, string> = {
  online: "bg-success",
  busy: "bg-warning",
  offline: "bg-muted-foreground",
};

export default function LiveConnect() {
  const { data: tutors } = useTutors();
  const { data: lessons } = useLessons();

  const activeLessons = (lessons || []).filter((l) => l.status === "in_progress");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LiveConnect</h1>
          <p className="text-muted-foreground">Rejoignez un cours en direct ou démarrez une session</p>
        </div>
        <BookLessonDialog />
      </div>

      {/* Sessions en cours */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-accent" />
            Sessions en cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeLessons.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune session en cours</p>
          )}
          {activeLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-xl">
                    <Video className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{lesson.subject} — {lesson.topic || "Cours"}</h3>
                </div>
              </div>
              <Button asChild>
                <Link to={`/room/${lesson.id}`}>Rejoindre</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tuteurs disponibles */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tuteurs disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {(!tutors || tutors.length === 0) && (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun tuteur inscrit</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(tutors || []).map((tutor: any) => (
              <div key={tutor.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground">
                      {(tutor.profiles?.first_name?.[0] || "T").toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusColors[tutor.status] || statusColors.offline}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {tutor.profiles?.first_name ? `${tutor.profiles.first_name} ${tutor.profiles.last_name || ""}` : "Tuteur"}
                    </p>
                    <p className="text-xs text-muted-foreground">{(tutor.subjects || []).join(", ")}</p>
                  </div>
                </div>
                <Button size="sm" variant={tutor.status === "online" ? "default" : "secondary"} disabled={tutor.status === "offline"}>
                  {tutor.status === "online" ? "Appeler" : tutor.status === "busy" ? "Occupé" : "Hors ligne"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
