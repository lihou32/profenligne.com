import { useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { friendlyError } from "@/lib/credits"
import { AuthShell } from "@/components/brand/AuthShell"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      setSent(true)
    } catch (error: unknown) {
      toast.error(friendlyError(error, "Envoi impossible"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title={sent ? "Regarde tes emails" : "Mot de passe oublié"}
      subtitle={sent ? undefined : "On t'envoie un lien pour en choisir un nouveau."}
      footer={<Link to="/login" className="font-bold text-ink-2 underline-offset-4 hover:underline">← Retour à la connexion</Link>}
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint-soft"><MailCheck className="h-8 w-8 text-mint" /></span>
          <p className="mt-4 text-muted-foreground">Si un compte existe pour <b className="text-ink-2">{email}</b>, un lien de réinitialisation vient d'être envoyé. Pense à vérifier les spams.</p>
          <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>Utiliser une autre adresse</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="toi@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="animate-spin" /> Envoi…</> : "Recevoir le lien"}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
