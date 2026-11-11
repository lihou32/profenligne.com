import { useState } from "react";
import { Backdrop } from "@/components/brand/Backdrop";
import { Logo } from "@/components/brand/Logo";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap, BookOpen, Euro, Sparkles, Loader2,
  ChevronRight, ChevronLeft, CheckCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBJECTS } from "@/lib/constants";
import { LEVELS } from "@/lib/agenda";
import { LESSON_DURATIONS, MIN_WITHDRAWAL_EUR, PLATFORM_COMMISSION, WITHDRAWAL_FEE_RATE, formatEur, friendlyError, tutorShareEur } from "@/lib/credits";

const MAX_SUBJECTS = 6;

const STEPS = [
  { title: "Matières", icon: BookOpen },
  { title: "Revenus", icon: Euro },
  { title: "Profil", icon: GraduationCap },
];

export default function TutorOnboarding() {
  useDocumentTitle("Devenir Professeur");
  const { user, profile } = useAuth();

  const [step, setStep] = useState(0);
  // Pré-remplit avec les matières choisies à l'inscription
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() =>
    String(user?.user_metadata?.subjects ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => (SUBJECTS as readonly string[]).includes(x))
      .slice(0, MAX_SUBJECTS),
  );
  const [bio, setBio] = useState(profile?.bio || "");
  const [levels, setLevels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canNext = () => {
    if (step === 0) return selectedSubjects.length > 0 && selectedSubjects.length <= MAX_SUBJECTS && levels.length > 0;
    if (step === 1) return true;
    if (step === 2) return bio.trim().length >= 20;
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Update bio in profiles
      if (bio.trim()) {
        await supabase
          .from("profiles")
          .update({ bio: bio.trim(), updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      // Call the become_tutor RPC
      const { error } = await supabase.rpc("become_tutor", {
        p_subjects: selectedSubjects,
      });

      if (error) throw error;
      await supabase.from("tutors").update({ levels }).eq("user_id", user.id);

      toast.success("Bienvenue parmi les professeurs ! Dernière étape : ouvre tes créneaux.");

      // Recharge la page pour rafraîchir les rôles, puis ouvre l'agenda
      window.location.href = "/disponibilites";
    } catch (err: unknown) {
      toast.error(friendlyError(err, "Erreur lors de la création du profil professeur"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <Backdrop variant="landing" />
      <div className="relative w-full max-w-lg animate-[fadeup_.6s_cubic-bezier(.2,.7,.2,1)]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-[2rem] leading-tight">Ton profil de <span className="hl-mark">prof</span></h1>
          <p className="mt-1 text-muted-foreground">Trois étapes, et tu apparais dans la liste des profs.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step
                    ? "bg-primary text-white shadow-hard"
                    : i < step
                    ? "bg-mint-soft text-success"
                    : "bg-white/60 text-muted-foreground"
                }`}
              >
                {i < step ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <s.icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${i < step ? "bg-success" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="glass-strong">
          <CardContent className="p-6 md:p-8">
            {/* Step 0: Subjects */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <CardTitle className="text-xl">Quelles matières enseignez-vous ?</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Au moins une matière et un niveau
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map((subject) => {
                    const checked = selectedSubjects.includes(subject);
                    return (
                      <label
                        key={subject}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? "border-primary/50 bg-primary/10 shadow-sm"
                            : "border-border/50 hover:border-primary/30 bg-secondary/30"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!checked && selectedSubjects.length >= MAX_SUBJECTS}
                          onCheckedChange={(c) =>
                            setSelectedSubjects((prev) =>
                              c ? (prev.length >= MAX_SUBJECTS ? prev : [...prev, subject]) : prev.filter((s) => s !== subject)
                            )
                          }
                        />
                        <span className="text-sm font-medium text-foreground/80">{subject}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedSubjects.length > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    {selectedSubjects.length} matière{selectedSubjects.length > 1 ? "s" : ""} sélectionnée{selectedSubjects.length > 1 ? "s" : ""}
                  </p>
                )}
                <div className="space-y-2 pt-2">
                  <p className="text-center text-sm font-semibold text-ink-2">Et pour quels niveaux ?</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {LEVELS.map((lv) => {
                      const on = levels.includes(lv);
                      return (
                        <button key={lv} type="button" aria-pressed={on}
                          onClick={() => setLevels((prev) => on ? prev.filter((x) => x !== lv) : [...prev, lv])}
                          className={`rounded-full border-2 border-ink-2 px-3.5 py-1.5 text-sm font-bold transition ${on ? "bg-sun" : "bg-white hover:bg-peri-soft"}`}>
                          {lv}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Hourly Rate */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <CardTitle className="text-xl">Un prix unique, la même grille pour tous</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Pas de tarif à fixer : l'élève paie selon la durée, et vous touchez {Math.round((1 - PLATFORM_COMMISSION) * 100)} %.
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary text-left text-xs text-muted-foreground">
                      <tr><th className="px-3 py-2 font-medium">Durée</th><th className="px-3 py-2 font-medium">L'élève paie</th><th className="px-3 py-2 font-medium">Vous touchez</th></tr>
                    </thead>
                    <tbody>
                      {LESSON_DURATIONS.map((d) => (
                        <tr key={d.value} className="border-t">
                          <td className="px-3 py-2">{d.label}</td>
                          <td className="px-3 py-2">{formatEur(d.priceEur)}</td>
                          <td className="px-3 py-2 font-semibold text-ink-2">{formatEur(tutorShareEur(d.value))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Retrait dès {MIN_WITHDRAWAL_EUR} € depuis votre espace, avec {Math.round(WITHDRAWAL_FEE_RATE * 100)} % de frais de retrait.
                </p>
              </div>
            )}

            {/* Step 2: Bio */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <CardTitle className="text-xl">Présentez-vous aux élèves</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Une bonne bio augmente vos chances d'être contacté
                  </p>
                </div>

                <div className="space-y-2">
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Exemple : Diplômé d'un Master en Mathématiques, j'enseigne depuis 5 ans auprès de collégiens et lycéens. Ma méthode est basée sur la compréhension des concepts plutôt que l'apprentissage par cœur..."
                    className="min-h-[150px] rounded-xl bg-secondary/50 border-border/50 resize-none"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{bio.trim().length < 20 ? `Minimum 20 caractères (${bio.trim().length}/20)` : "Parfait !"}</span>
                    <span>{bio.length}/500</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="glass-card p-4 rounded-xl space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubjects.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground">
                    Prix : <strong>grille unique, dès {formatEur(LESSON_DURATIONS[0].priceEur)} le cours</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-12 rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Retour
                </Button>
              )}

              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  className="flex-1" size="lg"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canNext() || isSubmitting}
                  className="flex-1 h-12"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Publier mon profil
                    </span>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Vous pourrez modifier ces informations à tout moment depuis votre profil
        </p>
      </div>
    </div>
  );
}
