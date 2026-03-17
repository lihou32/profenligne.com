import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, GraduationCap, BookOpen, CheckCircle, Mail } from "lucide-react";

const LAUNCH_DATE = new Date("2026-04-01T00:00:00");

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  return timeLeft;
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const countdown = useCountdown(LAUNCH_DATE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("preregistrations")
        .insert([{ email: email.trim().toLowerCase(), role }]);

      if (error) {
        if (error.code === "23505") {
          toast.info("Cet email est déjà préinscrit !");
        } else {
          throw error;
        }
      } else {
        setRegistered(true);
        toast.success("Préinscription réussie ! 🎉");
      }
    } catch (err: any) {
      toast.error("Erreur lors de la préinscription");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const countdownBlocks = [
    { value: countdown.days, label: "Jours" },
    { value: countdown.hours, label: "Heures" },
    { value: countdown.minutes, label: "Minutes" },
    { value: countdown.seconds, label: "Secondes" },
  ];

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-[120px] float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow">
            <Rocket className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Prof en Ligne</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-center text-muted-foreground text-lg max-w-md">
          La plateforme de soutien scolaire qui connecte élèves et tuteurs.{" "}
          <span className="text-foreground font-medium">Bientôt disponible.</span>
        </p>

        {/* Countdown */}
        <div className="flex gap-3">
          {countdownBlocks.map((block) => (
            <div key={block.label} className="glass-card p-4 min-w-[72px] text-center">
              <div className="text-2xl md:text-3xl font-bold gradient-text tabular-nums">
                {String(block.value).padStart(2, "0")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{block.label}</div>
            </div>
          ))}
        </div>

        {/* Registration form */}
        <div className="glass-card p-6 md:p-8 w-full">
          {registered ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="w-12 h-12 text-success" />
              <h2 className="text-xl font-semibold text-foreground">Merci pour votre préinscription !</h2>
              <p className="text-muted-foreground text-center text-sm">
                Vous recevrez un email dès le lancement de la plateforme.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold text-foreground">Préinscrivez-vous</h2>
                <p className="text-sm text-muted-foreground">
                  Soyez parmi les premiers à rejoindre la plateforme
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">Je suis…</Label>
                <RadioGroup value={role} onValueChange={setRole} className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === "student"
                        ? "border-primary/50 bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="student" id="student" />
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Élève</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === "tutor"
                        ? "border-accent/50 bg-accent/10"
                        : "border-border hover:border-accent/30"
                    }`}
                  >
                    <RadioGroupItem value="tutor" id="tutor" />
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">Tuteur</span>
                  </label>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full gradient-primary btn-glow" disabled={loading}>
                {loading ? "Inscription…" : "Je me préinscris"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Lancement prévu le 1er avril 2026 · Aucun spam, promis ✨
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
