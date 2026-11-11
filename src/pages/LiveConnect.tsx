import { useState } from "react";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useTutors, useLessons, useTutorLessons } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { LATE_START_HOUR, LATE_SURCHARGE_EUR, isRoomOpen } from "@/lib/credits";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";
import { isTutorLive } from "@/lib/agenda";

const statusColors: Record<string, string> = {
  online: "bg-success",
  busy: "bg-warning",
  offline: "bg-muted-foreground",
};

export default function LiveConnect() {
  useDocumentTitle("Cours en direct");
  const { data: tutors } = useTutors();
  const { hasRole } = useAuth();
  const isTutor = hasRole("tutor");
  const { data: studentLessons } = useLessons();
  const { data: tutorLessons } = useTutorLessons();
  const lessons = isTutor ? tutorLessons : studentLessons;
  const [search, setSearch] = useState("");
  const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);
  const [bookingInstant, setBookingInstant] = useState(false);

  // Cours en cours, ou confirmés dont la salle est ouverte
  const activeLessons = (lessons || []).filter(
    (l) => l.status === "in_progress" || (l.status === "confirmed" && isRoomOpen(l.scheduled_at, l.duration_minutes)),
  );

  // Statut réel : « en ligne » seulement si l'appli du prof donne signe de vie
  const filteredTutors = (tutors || []).map((t) => ({
    ...t, status: isTutorLive(t) ? "online" : t.status === "busy" ? "busy" : "offline",
  })).filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.toLowerCase();
    const subjects = (t.subjects || []).join(" ").toLowerCase();
    return name.includes(q) || subjects.includes(q);
  });

  // Trier : en ligne en premier
  const sortedTutors = [...filteredTutors].sort((a, b) => {
    const order: Record<string, number> = { online: 0, busy: 1, offline: 2 };
    return (order[a.status] ?? 2) - (order[b.status] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader eyebrow="Salle de cours" title="En direct" subtitle={<>Prends un cours tout de suite avec un prof en ligne (⚡ En direct), ou réserve un créneau. Après {LATE_START_HOUR} h, un cours en direct coûte {LATE_SURCHARGE_EUR} € de plus.</>} actions={<BookLessonDialog />} />

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
                  <h3 className="">{lesson.subject} — {lesson.topic || "Cours"}</h3>
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
                ({sortedTutors.filter((t) => t.status === "online").length} en ligne)
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
            {sortedTutors.map((tutor) => (
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
                {tutor.status === "online" ? (
                  <Button size="sm" onClick={() => { setBookingInstant(true); setBookingTutorId(tutor.user_id) }}>
                    ⚡ En direct
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setBookingInstant(false); setBookingTutorId(tutor.user_id) }}>
                    Réserver
                  </Button>
                )}
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
          instant={bookingInstant}
          onClose={() => setBookingTutorId(null)}
        />
      )}
    </div>
  );
}
