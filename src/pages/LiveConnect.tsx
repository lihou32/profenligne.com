import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, DoorOpen, Inbox, Video, Zap } from "lucide-react";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLessons, useTutorLessons } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { friendlySlot } from "@/lib/agenda";
import { ROOM_OPEN_MINUTES_BEFORE, isRoomOpen } from "@/lib/credits";

interface Person {
  first_name: string | null;
  last_name: string | null;
}

interface RoomLesson {
  id: string;
  subject: string;
  topic: string | null;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  person: Person | null;
}

function personName(p: Person | null, fallback: string) {
  if (!p?.first_name) return fallback;
  return `${p.first_name}${p.last_name ? ` ${p.last_name[0]}.` : ""}`;
}

/** Salle de cours : les cours ouverts maintenant et les prochains, pour l'élève comme pour le prof. */
export default function LiveConnect() {
  useDocumentTitle("Salle de cours");
  const { mode } = useAuth();
  const isTutor = mode === "tutor";
  const { data: studentLessons, isLoading: loadingStudent } = useLessons();
  const { data: tutorLessons, isLoading: loadingTutor } = useTutorLessons();
  const loading = isTutor ? loadingTutor : loadingStudent;
  const [now, setNow] = useState(() => Date.now());

  // La salle s'ouvre toute seule à l'heure : on recalcule chaque minute
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lessons: RoomLesson[] = isTutor
    ? (tutorLessons ?? []).map((l) => ({ ...l, person: l.student_profile }))
    : (studentLessons ?? []).map((l) => ({ ...l, person: l.tutor_profile }));

  const open = lessons.filter(
    (l) => l.status === "in_progress" || (l.status === "confirmed" && isRoomOpen(l.scheduled_at, l.duration_minutes, now)),
  );
  const upcoming = lessons
    .filter((l) => (l.status === "confirmed" || l.status === "pending") && !open.includes(l) && new Date(l.scheduled_at).getTime() > now)
    .slice(0, 6);
  const pendingForTutor = isTutor ? lessons.filter((l) => l.status === "pending").length : 0;
  const other = isTutor ? "ton élève" : "ton prof";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Salle de cours"
        title="Tes cours en visio"
        subtitle={`La salle ouvre ${ROOM_OPEN_MINUTES_BEFORE} min avant chaque cours : visio, tableau et chat avec ${other}.`}
        actions={
          isTutor ? (
            <Button asChild variant="outline"><Link to="/disponibilites"><CalendarClock /> Mes disponibilités</Link></Button>
          ) : (
            <>
              <Button asChild><Link to="/rejoindre"><Zap /> Un prof tout de suite</Link></Button>
              <Button asChild variant="outline"><Link to="/tutors"><CalendarDays /> Réserver un créneau</Link></Button>
            </>
          )
        }
      />

      {pendingForTutor > 0 && (
        <Link
          to="/lessons"
          className="flex items-center gap-3 rounded-2xl border-2 border-ink-2 bg-sun-soft p-4 text-sm font-semibold shadow-hard transition hover:-translate-y-px"
        >
          <Inbox className="h-5 w-5 shrink-0" />
          {pendingForTutor === 1 ? "1 demande de cours attend ta réponse" : `${pendingForTutor} demandes de cours attendent ta réponse`}
          <span className="ml-auto text-ink">Répondre →</span>
        </Link>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DoorOpen className="h-5 w-5 text-accent" />
            Ouvert maintenant
            {open.length > 0 && <Badge variant="secondary">{open.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && open.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun cours ouvert pour l'instant. La salle de ton prochain cours s'ouvrira ici.
            </p>
          )}
          {open.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink-2 bg-mint-soft p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-mint" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {l.subject}{l.topic ? ` — ${l.topic}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avec {personName(l.person, other)} · {l.status === "in_progress" ? "en cours" : `commence ${friendlySlot(new Date(l.scheduled_at))}`} · {l.duration_minutes} min
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to={`/room/${l.id}`}><Video /> Entrer dans la salle</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            Prochains cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && upcoming.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isTutor
                  ? "Aucun cours prévu. Ouvre des créneaux dans ton agenda, ou passe « En ligne » depuis l'accueil pour recevoir des élèves en direct."
                  : "Aucun cours prévu. Prends un cours tout de suite ou réserve un créneau avec le prof de ton choix."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {isTutor ? (
                  <>
                    <Button asChild size="sm"><Link to="/disponibilites">Ouvrir des créneaux</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/dashboard">Passer en ligne</Link></Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="sm"><Link to="/rejoindre">Un prof tout de suite</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to="/tutors">Trouver un prof</Link></Button>
                  </>
                )}
              </div>
            </div>
          )}
          {upcoming.map((l) => {
            const opensAt = new Date(new Date(l.scheduled_at).getTime() - ROOM_OPEN_MINUTES_BEFORE * 60_000);
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink-2/15 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {l.subject}{l.topic ? ` — ${l.topic}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {friendlySlot(new Date(l.scheduled_at))} · {l.duration_minutes} min · avec {personName(l.person, other)}
                  </p>
                </div>
                {l.status === "pending" ? (
                  isTutor ? (
                    <Button asChild size="sm" variant="outline"><Link to="/lessons">Accepter ou refuser</Link></Button>
                  ) : (
                    <Badge variant="secondary">En attente du prof</Badge>
                  )
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Salle ouverte {friendlySlot(opensAt)}</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
