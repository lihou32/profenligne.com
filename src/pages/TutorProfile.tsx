import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateLesson, useCreateReview } from "@/hooks/useData";
import { toast } from "sonner";

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

// ─── Booking modal ────────────────────────────────────────

const subjects = [
  "Mathématiques", "Physique", "Chimie", "Anglais", "Français",
  "Histoire", "Géographie", "SVT", "Informatique", "Philosophie",
];

function BookingModal({
  open,
  onClose,
  tutorUserId,
  tutorName,
}: {
  open: boolean;
  onClose: () => void;
  tutorUserId: string;
  tutorName: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createLesson = useCreateLesson();

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Connectez-vous pour réserver un cours");
      navigate("/login");
      return;
    }
    if (!subject || !date || !time) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    try {
      await createLesson.mutateAsync({
        student_id: user.id,
        tutor_id: tutorUserId,
        subject,
        topic: topic || null,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(duration),
        status: "pending",
      });
      toast.success(`Demande envoyée à ${tutorName} !`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réservation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Réserver un cours avec {tutorName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Matière *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sujet / Chapitre</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex : Intégrales, Chapitre 5…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Durée</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={createLesson.isPending}
          >
            {createLesson.isPending ? "Envoi…" : "Envoyer la demande"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const createReview = useCreateReview();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  // Fetch tutor + profile
  const { data: tutor, isLoading } = useQuery({
    queryKey: ["public-tutor", id],
    enabled: !!id,
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

  // Fetch reviews for this tutor
  const { data: reviews } = useQuery({
    queryKey: ["tutor-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_reviews")
        .select("*")
        .eq("tutor_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const avgRating = reviews?.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Connectez-vous pour laisser un avis"); return; }
    if (!newRating) { toast.error("Choisissez une note"); return; }
    try {
      await createReview.mutateAsync({
        tutor_id: id!,
        student_id: user.id,
        rating: newRating,
        comment: newComment || null,
      });
      toast.success("Avis publié !");
      setNewRating(0);
      setNewComment("");
    } catch {
      toast.error("Erreur lors de la publication");
    }
  };

  // ── Loading / not found ──────────────────────────────────

  if (isLoading) {
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

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in pb-16">
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
            {isStudent && tutor.status === "online" && (
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
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">É</AvatarFallback>
                </Avatar>
                <div>
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}

          {/* Leave a review */}
          {user && hasRole("student") && (
            <>
              <Separator className="my-4" />
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <p className="text-sm font-medium">Laisser un avis</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Note :</span>
                  <StarRating rating={newRating} onRate={setNewRating} interactive />
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Partagez votre expérience avec ce professeur…"
                  rows={3}
                />
                <Button
                  type="submit"
                  className="gradient-primary text-primary-foreground"
                  disabled={!newRating || createReview.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Publier l'avis
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      {isStudent && tutor.status === "online" && (
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

      {/* Booking modal */}
      {tutor && (
        <BookingModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          tutorUserId={tutor.user_id}
          tutorName={fullName}
        />
      )}
    </div>
  );
}
