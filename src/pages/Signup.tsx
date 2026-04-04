import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Eye, EyeOff, Sparkles, Zap } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, GRADE_LEVELS } from "@/lib/constants";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 30 }, (_, i) => currentYear - 10 - i);

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [gradeLevel, setGradeLevel] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Capture referral code from URL on mount
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && /^[A-Z0-9]{8}$/i.test(ref)) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  const isStudent = role === "student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const metadata: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        role,
      };
      if (isStudent) {
        if (gradeLevel) metadata.grade_level = gradeLevel;
        if (birthYear) metadata.birth_year = birthYear;
        if (schoolType) metadata.school_type = schoolType;
      }
      if (selectedSubjects.length > 0) metadata.subjects = selectedSubjects.join(",");
      const user = await signUp(email, password, metadata);

      // Link referral if a valid ?ref= code was present
      if (referralCode && user?.id) {
        try {
          // Find the referrer by matching the first 8 chars of their user_id
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("user_id", `${referralCode.toLowerCase()}%`)
            .limit(1)
            .single();

          if (referrerProfile) {
            await supabase.from("referrals").insert({
              referrer_id: referrerProfile.user_id,
              referred_user_id: user.id,
              referral_code: referralCode,
              status: "pending",
              credits_awarded: 0,
            });
          }
        } catch {
          // Referral linking is best-effort — don't block signup
        }
      }

      toast.success("Compte créé avec succès ! Bienvenue 🎉");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  };




  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden mesh-bg">
      <div className="absolute top-[-10%] left-[-10%] h-[450px] w-[450px] rounded-full bg-gradient-to-br from-info/15 to-primary/10 blur-[90px] float" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-accent/15 to-primary/10 blur-[80px] float" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 gradient-primary inline-flex h-16 w-16 items-center justify-center rounded-2xl glow">
            <GraduationCap className="h-9 w-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display gradient-text">PROF EN LIGNE</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3 text-gold" /> Plateforme de Tutorat Interactive
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader className="text-center pb-2 pt-6">
            <CardTitle className="text-2xl font-display">Inscription</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Créez votre compte</p>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            {/* Social login buttons */}
            <div className="space-y-3 mb-5">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl bg-secondary/50 border-border/50 hover:bg-secondary/80 font-medium"
                onClick={() => handleSocialLogin("google")}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continuer avec Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl bg-secondary/50 border-border/50 hover:bg-secondary/80 font-medium"
                onClick={() => handleSocialLogin("apple")}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Continuer avec Apple
              </Button>
            </div>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prénom</Label>
                  <Input placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-11 rounded-xl bg-secondary/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</Label>
                  <Input placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-11 rounded-xl bg-secondary/50 border-border/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl bg-secondary/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Je suis</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="student">🎓 Étudiant</SelectItem>
                    <SelectItem value="tutor">👨‍🏫 Professeur / Tuteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isStudent && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classe / Niveau</Label>
                      <Select value={gradeLevel} onValueChange={setGradeLevel}>
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-border/50">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {GRADE_LEVELS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Année de naissance</Label>
                      <Select value={birthYear} onValueChange={setBirthYear}>
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-border/50">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50 max-h-48">
                          {BIRTH_YEARS.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type d'établissement</Label>
                    <Select value={schoolType} onValueChange={setSchoolType}>
                      <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-border/50">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="public">🏫 Public</SelectItem>
                        <SelectItem value="prive">🏠 Privé</SelectItem>
                        <SelectItem value="prive_sous_contrat">📋 Privé sous contrat</SelectItem>
                        <SelectItem value="cned">📧 CNED / À distance</SelectItem>
                        <SelectItem value="autre">📌 Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Subjects field for both roles */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isStudent ? "Matières recherchées" : "Matières enseignées"}
                </Label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 border border-border/50 p-3">
                  {SUBJECTS.map((subject) => (
                    <label key={subject} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedSubjects.includes(subject)}
                        onCheckedChange={(checked) => {
                          setSelectedSubjects((prev) =>
                            checked ? [...prev, subject] : prev.filter((s) => s !== subject)
                          );
                        }}
                      />
                      <span className="text-foreground/80">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mot de passe</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-xl bg-secondary/50 border-border/50 pr-10" />
                  <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base btn-glow" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Création...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Créer mon compte
                  </span>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">Se connecter</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
