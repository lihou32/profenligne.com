import { useMemo, useState } from "react";
import { PageHeader } from "@/components/brand/PageHeader";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useCreateReview, useLessons } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/credits";

function Stars({ value, onChange, size = "h-4 w-4" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= (hover || value);
        const star = <Star className={`${size} ${filled ? "fill-gold text-gold" : "text-muted-foreground/30"}`} />;
        return onChange ? (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i)}
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </div>
  );
}

function useMyReviews(column: "tutor_id" | "student_id") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-reviews", column, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq(column, user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const reviews = data ?? [];
      const otherIds = [...new Set(reviews.map((r) => (column === "tutor_id" ? r.student_id : r.tutor_id)))];
      if (otherIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", otherIds);
      const names = new Map((profiles ?? []).map((p) => [p.user_id, `${p.first_name || ""} ${p.last_name || ""}`.trim()]));
      return reviews.map((r) => ({ ...r, other_name: names.get(column === "tutor_id" ? r.student_id : r.tutor_id) || "" }));
    },
  });
}

function ReviewItem({ name, rating, comment, date, fallback }: { name: string; rating: number; comment: string | null; date: string; fallback: string }) {
  // Côté prof, on n'affiche que le prénom de l'élève
  const display = name ? name.split(" ")[0] : fallback;
  return (
    <div className="flex gap-3 rounded-xl border border-border/30 p-4">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
          {display[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-sm">{display}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(date), "d MMM yyyy", { locale: fr })}</span>
        </div>
        <Stars value={rating} />
        {comment && <p className="text-sm text-muted-foreground whitespace-pre-line">{comment}</p>}
      </div>
    </div>
  );
}

function PendingReview({ lessonId, title, subtitle }: { lessonId: string; title: string; subtitle: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const createReview = useCreateReview();

  const submit = () =>
    createReview.mutate(
      { lesson_id: lessonId, rating, comment: comment.trim() || null },
      {
        onSuccess: () => toast.success("Merci pour votre avis !"),
        onError: (e) => toast.error(friendlyError(e, "Erreur lors de l'envoi")),
      },
    );

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Stars value={rating} onChange={setRating} size="h-6 w-6" />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        placeholder="Qu'avez-vous pensé du cours ? (facultatif)"
        className="min-h-[70px]"
      />
      <Button size="sm" disabled={rating === 0 || createReview.isPending} onClick={submit}>
        {createReview.isPending ? "Envoi…" : "Publier mon avis"}
      </Button>
    </div>
  );
}

export default function TutorReviews() {
  const { mode } = useAuth();
  const isTutor = mode === "tutor";
  useDocumentTitle(isTutor ? "Mes avis" : "Mes avis sur les profs");

  const received = useMyReviews("tutor_id");
  const given = useMyReviews("student_id");
  const { data: lessons } = useLessons();

  const toReview = useMemo(() => {
    const reviewed = new Set((given.data ?? []).map((r) => r.lesson_id));
    return (lessons ?? []).filter((l) => l.status === "completed" && !reviewed.has(l.id));
  }, [lessons, given.data]);

  if (isTutor) {
    const reviews = received.data ?? [];
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Avis" title="Ce que disent tes élèves" />
        <Card className="glass-card">
          <CardContent className="flex flex-wrap items-center gap-6 p-6">
            <div className="text-center">
              <p className="text-4xl font-medium font-display">{reviews.length ? avg.toFixed(1) : "—"}</p>
              <Stars value={Math.round(avg)} />
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong className="text-foreground">{reviews.length}</strong> avis vérifié{reviews.length > 1 ? "s" : ""}</p>
              <p className="flex items-center gap-1 mt-1"><ShieldCheck className="h-4 w-4 text-success" /> Seuls les élèves ayant suivi un cours peuvent vous noter</p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {received.isLoading && <p className="py-8 text-center text-muted-foreground">Chargement…</p>}
          {!received.isLoading && reviews.length === 0 && (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-muted-foreground">Pas encore d'avis. Ils apparaîtront ici après vos premiers cours.</p>
              </CardContent>
            </Card>
          )}
          {reviews.map((r) => (
            <ReviewItem key={r.id} name={r.other_name} rating={r.rating} comment={r.comment} date={r.created_at} fallback="Élève" />
          ))}
        </div>
      </div>
    );
  }

  const myReviews = given.data ?? [];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Avis" title="Note tes cours" subtitle={<>Une note par cours terminé. Elle s'affiche sur le <Link to="/tutors" className="font-semibold text-peri hover:underline">profil du prof</Link>.</>} />

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">À noter ({toReview.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {toReview.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun cours à noter pour le moment.</p>
          )}
          {toReview.map((l) => (
            <PendingReview
              key={l.id}
              lessonId={l.id}
              title={`${l.subject}${l.tutor_profile?.first_name ? ` avec ${l.tutor_profile.first_name}` : ""}`}
              subtitle={format(new Date(l.scheduled_at), "EEEE d MMMM yyyy", { locale: fr })}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Avis publiés ({myReviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myReviews.length === 0 && <p className="text-sm text-muted-foreground">Vous n'avez encore publié aucun avis.</p>}
          {myReviews.map((r) => (
            <ReviewItem key={r.id} name={r.other_name} rating={r.rating} comment={r.comment} date={r.created_at} fallback="Professeur" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
