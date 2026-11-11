import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { friendlyError } from "@/lib/credits"
import { AuthShell } from "@/components/brand/AuthShell"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [show, setShow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { toast.error("Les deux mots de passe ne correspondent pas"); return }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      toast.error("8 caractères minimum, avec au moins une lettre et un chiffre"); return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success("Mot de passe mis à jour")
      navigate("/dashboard")
    } catch (error: unknown) {
      toast.error(friendlyError(error, "Mise à jour impossible"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis-en un que tu n'utilises nulle part ailleurs.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="pw">Nouveau mot de passe</Label>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="pr-12" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Masquer" : "Afficher"}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-ink/5">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">Confirmer</Label>
          <Input id="pw2" type={show ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="animate-spin" /> Enregistrement…</> : "Enregistrer"}
        </Button>
      </form>
    </AuthShell>
  )
}
