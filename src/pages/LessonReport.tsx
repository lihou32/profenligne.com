import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Brain, CheckCircle2, XCircle, Loader2, Star, Send } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface MindmapNode {
  label: string;
  children?: MindmapNode[];
}

function MindmapTree({ node, depth = 0 }: { node: MindmapNode; depth?: number }) {
  const colors = [
    "border-primary bg-primary/10 text-primary",
    "border-accent bg-accent/10 text-accent-foreground",
    "border-gold bg-gold/10 text-foreground",
    "border-success bg-success/10 text-foreground",
  ];
  const color = colors[depth % colors.length];

  return (
    <div className="flex flex-col items-start">
      <div className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium ${color}`}>
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
          {node.children.map((child, i) => (
            <MindmapTree key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LessonReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "Mathématiques";
  const topic = searchParams.get("topic") || "Cours";

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingMindmap, setLoadingMindmap] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [lessonTutorId, setLessonTutorId] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState(false);

  // Fetch lesson info + check existing review
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("tutor_id, student_id, status")
        .eq("id", id)
        .single();
      if (lesson && lesson.student_id === user.id && lesson.status === "completed") {
        setLessonTutorId(lesson.tutor_id);
      }
      // Check if already reviewed
      const { data: rev } = await supabase
        .from("reviews")
        .select("id")
        .eq("lesson_id", id)
        .eq("student_id", user.id)
        .maybeSingle();
      if (rev) {
        setExistingReview(true);
        setReviewSaved(true);
      }
    })();
  }, [id, user]);

  const handleSubmitReview = async () => {
    if (!id || !user || !lessonTutorId || reviewRating === 0) return;
    setReviewSaving(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        lesson_id: id,
        student_id: user.id,
        tutor_id: lessonTutorId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      if (error) throw error;
      setReviewSaved(true);
      toast.success("Merci pour votre avis !");
    } catch (e: any) {
      logger.error("Review submit error", e);
      toast.error(e?.message?.includes("unique") ? "Vous avez déjà noté ce cours" : "Erreur lors de l'envoi");
    } finally {
      setReviewSaving(false);
    }
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await supabase.functions.invoke("ai-chat", {
          body: { mode: "quiz", subject, topic },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        if (res.data?.questions) setQuiz(res.data.questions);
      } catch (e) {
        logger.error("Quiz generation error", e);
      } finally {
        setLoadingQuiz(false);
      }
    };

    const fetchMindmap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await supabase.functions.invoke("ai-chat", {
          body: { mode: "mindmap", subject, topic },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        if (res.data?.mindmap) setMindmap(res.data.mindmap);
      } catch (e) {
        logger.error("Mindmap generation error", e);
      } finally {
        setLoadingMindmap(false);
      }
    };

    fetchQuiz();
    fetchMindmap();
  }, [subject, topic]);

  const score = submitted
    ? quiz.reduce((s, q, i) => s + (parseInt(answers[i]) === q.correct ? 1 : 0), 0)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/lessons")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux leçons
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display">Rapport de cours</h1>
        <p className="text-muted-foreground">
          {subject} — {topic} · Session #{id}
        </p>
      </div>

      {/* QCM Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            QCM — Testez vos connaissances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingQuiz ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération du QCM par l'IA...
            </div>
          ) : quiz.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Impossible de générer le QCM pour cette session.
            </p>
          ) : (
            <div className="space-y-6">
              {quiz.map((q, qi) => (
                <div key={qi} className="space-y-3">
                  <p className="font-medium text-sm">
                    {qi + 1}. {q.question}
                  </p>
                  <RadioGroup
                    value={answers[qi] ?? ""}
                    onValueChange={(v) => setAnswers((a) => ({ ...a, [qi]: v }))}
                    disabled={submitted}
                  >
                    {q.options.map((opt, oi) => {
                      const isCorrect = submitted && oi === q.correct;
                      const isWrong = submitted && parseInt(answers[qi]) === oi && oi !== q.correct;
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors ${
                            isCorrect ? "bg-success/15" : isWrong ? "bg-destructive/15" : ""
                          }`}
                        >
                          <RadioGroupItem value={String(oi)} id={`q${qi}-o${oi}`} />
                          <Label htmlFor={`q${qi}-o${oi}`} className="flex-1 cursor-pointer">
                            {opt}
                          </Label>
                          {isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {isWrong && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}

              {!submitted ? (
                <Button
                  onClick={() => setSubmitted(true)}
                  disabled={Object.keys(answers).length < quiz.length}
                  className="gradient-primary text-primary-foreground"
                >
                  Valider mes réponses
                </Button>
              ) : (
                <div className="space-y-2 rounded-lg bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Score : {score}/{quiz.length}
                    </span>
                    <Badge variant={score >= quiz.length * 0.7 ? "default" : "destructive"}>
                      {score >= quiz.length * 0.7 ? "Réussi !" : "À retravailler"}
                    </Badge>
                  </div>
                  <Progress value={(score / quiz.length) * 100} className="h-2" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carte mentale */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-accent" />
            Carte mentale
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMindmap ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération de la carte mentale...
            </div>
          ) : !mindmap ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Impossible de générer la carte mentale.
            </p>
          ) : (
            <div className="overflow-x-auto py-2">
              <MindmapTree node={mindmap} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review section — only for students on completed lessons */}
      {lessonTutorId && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              Notez votre cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewSaved ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="font-semibold">Merci pour votre avis !</p>
                <p className="text-sm text-muted-foreground">Votre note aide les autres élèves à choisir leur professeur.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Star rating */}
                <div>
                  <p className="text-sm font-medium mb-2">Votre note</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none transition-transform hover:scale-110"
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(star)}
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            star <= (reviewHover || reviewRating)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <p className="text-sm font-medium mb-2">Commentaire (optionnel)</p>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Comment s'est passé le cours ? Qu'avez-vous appris ?"
                    className="resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{reviewComment.length}/500</p>
                </div>

                <Button
                  onClick={handleSubmitReview}
                  disabled={reviewRating === 0 || reviewSaving}
                  className="gradient-primary text-primary-foreground"
                >
                  {reviewSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Envoyer mon avis</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
