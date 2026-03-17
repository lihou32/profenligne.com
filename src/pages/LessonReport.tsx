import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "Mathématiques";
  const topic = searchParams.get("topic") || "Cours";

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [loadingMindmap, setLoadingMindmap] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

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
        console.error("Quiz error:", e);
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
        console.error("Mindmap error:", e);
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
    </div>
  );
}
