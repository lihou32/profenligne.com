import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Send, ExternalLink } from "lucide-react";
import { useTutors } from "@/hooks/useData";
import { useTutorReviews, useCreateReview } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function StarRating({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-gold text-gold" : "text-muted-foreground/30"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
}

export default function TutorReviews() {
  const navigate = useNavigate();
  const { data: tutors, isLoading: loadingTutors } = useTutors();
  const { data: reviews, isLoading: loadingReviews } = useTutorReviews();
  const createReview = useCreateReview();
  const { user } = useAuth();

  const [selectedTutor, setSelectedTutor] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");

  const handleSubmitReview = async () => {
    if (!selectedTutor || !newRating || !user) return;
    try {
      await createReview.mutateAsync({
        tutor_id: selectedTutor,
        student_id: user.id,
        rating: newRating,
        comment: newComment || null,
      });
      toast.success("Avis publié !");
      setNewRating(0);
      setNewComment("");
      setSelectedTutor(null);
    } catch {
      toast.error("Erreur lors de la publication");
    }
  };

  const getReviewsForTutor = (tutorId: string) =>
    (reviews || []).filter((r) => r.tutor_id === tutorId);

  const getAvgRating = (tutorId: string) => {
    const tutorReviews = getReviewsForTutor(tutorId);
    if (!tutorReviews.length) return 0;
    return tutorReviews.reduce((s, r) => s + r.rating, 0) / tutorReviews.length;
  };

  if (loadingTutors || loadingReviews) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display">Avis sur les Professeurs</h1>
        <p className="mt-1 text-muted-foreground">Découvrez les retours des élèves et partagez votre expérience</p>
      </div>

      <div className="space-y-6">
        {(tutors || []).map((tutor: any) => {
          const tutorReviews = getReviewsForTutor(tutor.id);
          const avg = getAvgRating(tutor.id);
          const profile = tutor.profiles;
          const name = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            : "Tuteur";
          const initials = profile
            ? `${(profile.first_name?.[0] || "T").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}`
            : "T";

          return (
            <Card key={tutor.id} className="glass-card">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{name || "Professeur"}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={Math.round(avg)} />
                    <span className="text-sm text-muted-foreground">
                      {avg.toFixed(1)} · {tutorReviews.length} avis
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(tutor.subjects || []).join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tutors/${tutor.user_id}`)}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Voir le profil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTutor(selectedTutor === tutor.id ? null : tutor.id)}
                  >
                    Donner un avis
                  </Button>
                </div>
              </CardHeader>

              {selectedTutor === tutor.id && (
                <CardContent className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Votre note :</span>
                    <StarRating rating={newRating} onRate={setNewRating} interactive />
                  </div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Partagez votre expérience..."
                    rows={3}
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={!newRating || createReview.isPending}
                    className="gradient-primary text-primary-foreground"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Publier
                  </Button>
                </CardContent>
              )}

              {tutorReviews.length > 0 && (
                <CardContent className="space-y-3 pt-0">
                  {tutorReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="rounded-lg bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
