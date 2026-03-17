import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowLeft, Mail, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email envoyé ! Vérifiez votre boîte de réception.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden mesh-bg">
      <div className="absolute top-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-[100px] float" />

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
            <CardTitle className="text-2xl font-display">Mot de passe oublié</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {sent ? "Vérifiez votre boîte email" : "Entrez votre email pour réinitialiser"}
            </p>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                  <Mail className="h-8 w-8 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Un email de réinitialisation a été envoyé à <span className="font-semibold text-foreground">{email}</span>
                </p>
                <Button variant="ghost" asChild className="text-primary">
                  <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:bg-secondary/80 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base btn-glow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Envoi...
                    </span>
                  ) : "Envoyer le lien"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Retour à la connexion
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
