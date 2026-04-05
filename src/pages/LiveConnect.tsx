import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useTutors, useLessons } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";

const statusColors: Record<string, string> = {
  online: "bg-success",
  busy: "bg-warning",
  offline: "bg-muted-foreground",
};

const statusLabels: Record<string, string> = {
  online: "En ligne",
  busy: "Occupé",
  offline: "Hors ligne",
};

export default function LiveConnect() {
  useDocumentTitle("LiveConnect");
  const { data: tutors } = useTutors();
  const { data: lessons } = useLessons();
  const [search, setSearch] = useState("");
  const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);

  const activeLessons = (lessons || []).filter((l) => l.status === "in_progress");

  const filteredTutors = (tutors || []).filter((t: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.toLowerCase();
    const subjects = (t.subjects || []).join(" ").toLowerCase();
    return name.includes(q) || subjects.includes(q);
  });

  // Trier : en ligne en premier
  const sortedTutors = [...filteredTutors].sort((a: any, b: any) => {
    const order: Record<string, number> = { online: 0, busy: 1, offline: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display"><span className="gradient-text">LiveConnect</span></h1>
          <p className="text-muted-foreground">Rejoignez un cours en direct ou réservez avec un tuteur</p>
        </div>
        <BookLessonDialog />
      </div>

      {/* Sessions en cours */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-accent" />
            Sessions en cours
            {activeLessons.length > 0 && (
              <Badge variant="secondary">{activeLessons.length}</Badge>
            )}
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
                  <p className="text-xs text-muted-foreground">En cours</p>
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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">
            Tuteurs disponibles
            {sortedTutors.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sortedTutors.filter((t: any) => t.status === "online").length} en ligne)
              </span>
            )}
          </CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Nom, matière..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {sortedTutors.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {search ? "Aucun tuteur trouvé pour cette recherche" : "Aucun tuteur inscrit"}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {sortedTutors.map((tutor: any) => (
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
                      {tutor.profiles?.first_name
                        ? `${tutor.profiles.first_name} ${tutor.profiles.last_name || ""}`
                        : "Tuteur"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(tutor.subjects || []).join(", ") || "Aucune matière"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={tutor.status === "online" ? "default" : "secondary"}
                  disabled={tutor.status === "offline"}
                  onClick={() => tutor.status !== "offline" && setBookingTutorId(tutor.user_id)}
                >
                  {statusLabels[tutor.status] === "En ligne" ? "Réserver" : statusLabels[tutor.status] || "Hors ligne"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de réservation avec tuteur pré-sélectionné */}
      {bookingTutorId && (
        <BookLessonDialog
          defaultTutorId={bookingTutorId}
          defaultOpen={true}
          onClose={() => setBookingTutorId(null)}
        />
      )}
    </div>
  );
}
