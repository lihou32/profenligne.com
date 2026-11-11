import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  BookOpen,
  Clock,
  Euro,
  CheckCircle,
  ChevronLeft,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { SEO } from "@/components/SEO";

// ─── Star rating ─────────────────────────────────────────

function StarRating({
  rating,
  onRate,
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" : "text-muted-foreground/30"
          } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  online: { label: "Disponible", className: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]" },
  busy: { label: "Occupé", className: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]" },
  offline: { label: "Hors ligne", className: "bg-muted text-muted-foreground border-border" },
  suspended: { label: "Suspendu", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function TutorProfile() {
  useDocumentTitle("Profil du professeur");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [bookingOpen, setBookingOpen] = useState(false);

  // Fetch tutor + profile
  const { data: tutor, isLoading, isFetching } = useQuery({
    queryKey: ["public-tutor", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: t, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("user_id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!t) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url, bio")
        .eq("user_id", id!)
        .maybeSingle();

      return { ...t, profile };
    },
  });

  // Fetch reviews for this tutor with student names
  const { data: reviews } = useQuery({
    queryKey: ["tutor-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, student_id")
        .eq("tutor_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch student names
      const studentIds = [...new Set(data.map((r) => r.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name")
        .in("user_id", studentIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.first_name || "Élève"]));

      return data.map((r) => ({
        ...r,
        student_name: nameMap.get(r.student_id) || "Élève",
      }));
    },
  });

  const avgRating = reviews?.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  // ── Loading / not found ──────────────────────────────────

  // Only show spinner when actively fetching (avoids infinite spinner if query is disabled or id is missing)
  if (!id || (isLoading && isFetching)) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-muted-foreground text-lg">Professeur introuvable.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 h-4 w-4" />Retour
        </Button>
      </div>
    );
  }

  const profile = tutor.profile;
  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Professeur";
  const initials = profile
    ? `${(profile.first_name?.[0] || "P").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}`
    : "P";
  const statusInfo = statusConfig[tutor.status] ?? statusConfig.offline;
  const isStudent = user && hasRole("student");
  const seoSubjects = (tutor.subjects || []).slice(0, 3).join(", ");

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in pb-16">
      <SEO
        title={`${fullName} — Professeur ${seoSubjects}`}
        description={`Réservez un cours avec ${fullName}. ${seoSubjects ? `Matières : ${seoSubjects}.` : ""} Note : ${avgRating.toFixed(1)}/5 (${reviews?.length ?? 0} avis). À partir de ${tutor.hourly_rate || "–"}€/h.`}
        path={`/tutor/${id}`}
        type="profile"
      />
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Button>

      {/* Hero card */}
      <Card className="glass-card overflow-hidden">
        {/* Gradient banner */}
        <div className="h-28 gradient-primary opacity-60" />

        <CardContent className="relative pt-0 pb-6 px-6">
          {/* Avatar */}
          <div className="absolute -top-12 left-6 ring-4 ring-card rounded-full">
            <Avatar className="h-24 w-24 text-3xl">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* CTA */}
          <div className="flex justify-end mb-2">
            {isStudent && !tutor.is_suspended && (
              <Button
                className="gradient-primary text-primary-foreground shadow-lg"
                onClick={() => setBookingOpen(true)}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Réserver un cours
              </Button>
            )}
            {!user && (
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => navigate("/login")}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Se connecter pour réserver
              </Button>
            )}
          </div>

          {/* Identity */}
          <div className="mt-8 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold font-display">{fullName || "Professeur"}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusInfo.label}
              </span>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2">
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} · {reviews?.length ?? 0} avis
              </span>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{profile.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <Euro className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-bold">
              {tutor.hourly_rate ? `${tutor.hourly_rate}€` : "–"}
            </span>
            <span className="text-xs text-muted-foreground">/ heure</span>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <Star className="h-5 w-5 text-[hsl(var(--gold))] mb-1" />
            <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">{reviews?.length ?? 0} avis</span>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center gap-1 py-5">
            <BookOpen className="h-5 w-5 text-accent mb-1" />
            <span className="text-2xl font-bold">{(tutor.subjects || []).length}</span>
            <span className="text-xs text-muted-foreground">matières</span>
          </CardContent>
        </Card>
      </div>

      {/* Subjects */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Matières enseignées
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(tutor.subjects || []).map((s: string) => (
            <Badge key={s} variant="secondary" className="rounded-full px-3 py-1 text-sm">
              <CheckCircle className="mr-1.5 h-3 w-3 text-primary" />
              {s}
            </Badge>
          ))}
          {(!tutor.subjects || tutor.subjects.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucune matière renseignée</p>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Avis élèves
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {reviews?.length ?? 0} avis · {avgRating.toFixed(1)} / 5
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(reviews ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun avis pour le moment. Soyez le premier à laisser un avis !
            </p>
          )}
          {(reviews ?? []).map((review) => (
            <div key={review.id} className="rounded-xl bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {(review.student_name?.[0] || "É").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{review.student_name}</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}

          {/* Note about verified reviews */}
          {user && hasRole("student") && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground text-center py-2">
                Les avis sont vérifiés — vous pouvez noter un professeur après chaque cours complété.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      {isStudent && !tutor.is_suspended && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">Prêt à apprendre avec {fullName} ?</h3>
          <p className="text-sm text-muted-foreground">
            Réservez votre premier cours en quelques clics.
          </p>
          <Button
            size="lg"
            className="gradient-primary text-primary-foreground"
            onClick={() => setBookingOpen(true)}
          >
            <Clock className="mr-2 h-5 w-5" />
            Réserver maintenant
          </Button>
        </div>
      )}
      {!user && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">Envie de progresser avec {fullName} ?</h3>
          <p className="text-sm text-muted-foreground">
            Créez un compte gratuit pour réserver votre premier cours.
          </p>
          <Button
            size="lg"
            className="gradient-primary text-primary-foreground"
            onClick={() => navigate("/signup")}
          >
            <Calendar className="mr-2 h-5 w-5" />
            S'inscrire pour réserver
          </Button>
        </div>
      )}

      {/* Booking modal */}
      {tutor && (
        <BookLessonDialog
          defaultTutorId={tutor.user_id}
          defaultOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  );
}
