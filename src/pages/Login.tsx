import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { AuthShell, OrDivider, SocialButton } from "@/components/brand/AuthShell"

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Page demandée avant la redirection vers /login (uniquement un chemin interne)
  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn(email.trim(), password)
      toast.success("Bon retour parmi nous !")
      navigate(redirectTo, { replace: true })
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || ""
      toast.error(
        /invalid login credentials/i.test(msg) ? "Email ou mot de passe incorrect"
          : /email not confirmed/i.test(msg) ? "Confirme d'abord ton adresse email (lien reçu par mail)"
          : msg || "Connexion impossible",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) toast.error(error.message)
  }

  return (
    <AuthShell
      title="Content de te revoir"
      subtitle="Connecte-toi pour retrouver tes cours."
      footer={<>Pas encore de compte ? <Link to="/signup" className="font-bold text-ink-2 underline-offset-4 hover:underline">Créer un compte</Link></>}
    >
      <div className="grid gap-3">
        <SocialButton provider="google" onClick={() => handleSocialLogin("google")} />
        <SocialButton provider="apple" onClick={() => handleSocialLogin("apple")} />
      </div>
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="toi@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/forgot-password" className="text-sm font-semibold text-peri hover:underline">Oublié ?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-ink/5">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="animate-spin" /> Connexion…</> : "Se connecter"}
        </Button>
      </form>
    </AuthShell>
  )
}
