import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { BookOpenCheck, Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { GRADE_LEVELS, SCHOOL_TYPES, SUBJECTS } from "@/lib/constants"
import { AuthShell, OrDivider, SocialButton } from "@/components/brand/AuthShell"
import { cn } from "@/lib/utils"

const currentYear = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: 30 }, (_, i) => currentYear - 10 - i)

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "Le mot de passe doit contenir au moins 8 caractères"
  if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return "Le mot de passe doit contenir au moins une lettre et un chiffre"
  return null
}

type Role = "student" | "tutor"

export default function Signup() {
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState<Role>(searchParams.get("role") === "tutor" ? "tutor" : "student")
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [schoolType, setSchoolType] = useState("")
  const [subjects, setSubjects] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Page à retrouver après l'inscription (chemin interne uniquement)
  const fromState = (location.state as { from?: string } | null)?.from
  const from = fromState && fromState.startsWith("/") && !fromState.startsWith("//") ? fromState : null
  const isStudent = role === "student"

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref && /^[A-Z0-9]{8}$/i.test(ref)) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  const toggleSubject = (s: string) => setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pwdError = validatePassword(password)
    if (pwdError) { toast.error(pwdError); return }
    setIsLoading(true)
    try {
      const metadata: Record<string, string> = { first_name: firstName.trim(), last_name: lastName.trim(), role }
      if (isStudent) {
        if (gradeLevel) metadata.grade_level = gradeLevel
        if (birthYear) metadata.birth_year = birthYear
        if (schoolType) metadata.school_type = schoolType
      }
      if (subjects.length > 0) metadata.subjects = subjects.join(",")
      // Le parrainage est lié côté base à la création du compte (trigger handle_new_user)
      if (referralCode) metadata.referral_code = referralCode

      await signUp(email.trim(), password, metadata)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.success("Compte créé ! Confirme ton adresse via le lien reçu par email, puis connecte-toi.")
        navigate("/login", from ? { state: { from } } : undefined)
        return
      }
      toast.success("Bienvenue sur Prof en Ligne !")
      // Un prof doit compléter son profil (matières, tarif) pour apparaître dans la liste
      navigate(role === "tutor" ? "/become-tutor" : from ?? "/dashboard")
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || ""
      toast.error(/already registered|already exists/i.test(msg) ? "Un compte existe déjà avec cet email" : msg || "Inscription impossible")
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
      aside={role}
      title={isStudent ? "Crée ton compte" : "Deviens prof"}
      subtitle={isStudent ? "Une minute, et tu peux réserver ton premier cours." : "Crée ton compte, puis complète ton profil (matières, tarif)."}
      footer={<>Déjà un compte ? <Link to="/login" state={from ? { from } : undefined} className="font-bold text-ink-2 underline-offset-4 hover:underline">Se connecter</Link></>}
    >
      {/* Choix du rôle */}
      <div role="radiogroup" aria-label="Je suis" className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-ink/[0.05] p-1.5">
        {([["student", "Je suis élève", BookOpenCheck], ["tutor", "Je suis prof", GraduationCap]] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => setRole(value)}
            className={cn("flex h-12 items-center justify-center gap-2 rounded-2xl font-display text-sm font-bold transition-all",
              role === value ? "bg-white text-ink-2 shadow-soft" : "text-muted-foreground hover:text-ink-2")}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {referralCode && (
        <p className="mt-4 rounded-2xl bg-mint-soft px-4 py-3 text-sm font-semibold text-success">
          Invitation de parrainage appliquée : 2 crédits offerts après ton premier cours.
        </p>
      )}

      <div className="mt-6 grid gap-3">
        <SocialButton provider="google" onClick={() => handleSocialLogin("google")} />
      </div>
      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="fn">Prénom</Label><Input id="fn" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="ln">Nom</Label><Input id="ln" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="em">Email</Label><Input id="em" type="email" autoComplete="email" placeholder="toi@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>

        {isStudent && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Niveau</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{GRADE_LEVELS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Année de naissance</Label>
              <Select value={birthYear} onValueChange={setBirthYear}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent className="max-h-56">{BIRTH_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Établissement</Label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger><SelectValue placeholder="Choisir (facultatif)" /></SelectTrigger>
                <SelectContent>{SCHOOL_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label.replace(/^\S+\s/, "")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{isStudent ? "Matières qui t'intéressent" : "Matières que tu enseignes"}</legend>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const on = subjects.includes(s)
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => toggleSubject(s)}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                    on ? "bg-primary text-white" : "bg-white/70 text-ink ring-1 ring-ink/10 hover:ring-ink/30")}>
                  {s}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="pw">Mot de passe</Label>
          <div className="relative">
            <Input id="pw" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)} required aria-describedby="pw-hint" className="pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-ink/5">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordMeter value={password} />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? <><Loader2 className="animate-spin" /> Création…</> : isStudent ? "Créer mon compte" : "Continuer vers mon profil de prof"}
        </Button>
      </form>
    </AuthShell>
  )
}

function PasswordMeter({ value }: { value: string }) {
  const checks = [value.length >= 8, /[A-Za-z]/.test(value) && /\d/.test(value), value.length >= 12 || /[^A-Za-z0-9]/.test(value)]
  const score = checks.filter(Boolean).length
  return (
    <div id="pw-hint">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors",
            i < score ? (score === 3 ? "bg-mint" : score === 2 ? "bg-hl" : "bg-rose") : "bg-ink/10")} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
    </div>
  )
}
