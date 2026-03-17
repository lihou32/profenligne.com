import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Lock, Trash2, Loader2, AlertTriangle, Bell, Sun, Moon, Palette } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Notification preferences
  const [notifyLessonReminder, setNotifyLessonReminder] = useState(true);
  const [notifyNewMessage, setNotifyNewMessage] = useState(true);
  const [notifyLessonCancelled, setNotifyLessonCancelled] = useState(true);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notify_lesson_reminder, notify_new_message, notify_lesson_cancelled, theme")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNotifyLessonReminder((data as any).notify_lesson_reminder ?? true);
          setNotifyNewMessage((data as any).notify_new_message ?? true);
          setNotifyLessonCancelled((data as any).notify_lesson_cancelled ?? true);
          const savedTheme = (data as any).theme;
          if (savedTheme && savedTheme !== theme) {
            setTheme(savedTheme);
          }
        }
      });
  }, [user, theme]);

  const handleSaveNotifs = async () => {
    if (!user) return;
    setIsSavingNotifs(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notify_lesson_reminder: notifyLessonReminder,
          notify_new_message: notifyNewMessage,
          notify_lesson_cancelled: notifyLessonCancelled,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Préférences de notifications sauvegardées !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ theme: newTheme } as any)
      .eq("user_id", user.id);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Mot de passe modifié avec succès !");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") return;
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      await signOut();
      toast.success("Votre compte a été supprimé");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression du compte");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display gradient-text flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Account Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Compte</CardTitle>
          <CardDescription>
            Votre adresse email : <span className="text-foreground font-medium">{user?.email}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Theme */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Apparence
          </CardTitle>
          <CardDescription>Choisissez votre thème préféré</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => handleThemeChange("dark")}
              className={`flex-1 h-12 rounded-xl font-semibold gap-2 ${
                theme === "dark" ? "gradient-primary text-primary-foreground" : "bg-secondary/50 border-border/50"
              }`}
            >
              <Moon className="h-4 w-4" />
              Sombre
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => handleThemeChange("light")}
              className={`flex-1 h-12 rounded-xl font-semibold gap-2 ${
                theme === "light" ? "gradient-primary text-primary-foreground" : "bg-secondary/50 border-border/50"
              }`}
            >
              <Sun className="h-4 w-4" />
              Clair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications par email
          </CardTitle>
          <CardDescription>Choisissez les notifications que vous souhaitez recevoir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Rappels de cours</p>
              <p className="text-xs text-muted-foreground">Recevez un email avant vos cours programmés</p>
            </div>
            <Switch checked={notifyLessonReminder} onCheckedChange={setNotifyLessonReminder} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nouveaux messages</p>
              <p className="text-xs text-muted-foreground">Soyez notifié quand vous recevez un message</p>
            </div>
            <Switch checked={notifyNewMessage} onCheckedChange={setNotifyNewMessage} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cours annulés</p>
              <p className="text-xs text-muted-foreground">Soyez informé si un cours est annulé</p>
            </div>
            <Switch checked={notifyLessonCancelled} onCheckedChange={setNotifyLessonCancelled} />
          </div>
          <Button
            onClick={handleSaveNotifs}
            disabled={isSavingNotifs}
            className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold btn-glow"
          >
            {isSavingNotifs ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</span>
            ) : (
              "Sauvegarder les préférences"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>Choisissez un nouveau mot de passe sécurisé</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nouveau mot de passe
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-11 rounded-xl bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirmer le mot de passe
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="h-11 rounded-xl bg-secondary/50 border-border/50"
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold btn-glow"
            >
              {isChangingPassword ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Modification...</span>
              ) : (
                "Modifier le mot de passe"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="glass-card border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Supprimer le compte
          </CardTitle>
          <CardDescription>
            Cette action est irréversible. Toutes vos données seront définitivement supprimées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full h-11 rounded-xl font-semibold">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-destructive/30">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Êtes-vous absolument sûr ?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>Cette action supprimera définitivement votre compte et toutes les données associées.</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tapez SUPPRIMER pour confirmer
                    </Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="h-11 rounded-xl bg-secondary/50 border-destructive/30"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl" onClick={() => setDeleteConfirmText("")}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "SUPPRIMER" || isDeletingAccount}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAccount ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Suppression...</span>
                  ) : (
                    "Supprimer définitivement"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
