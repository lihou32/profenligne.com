import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarCheck, ChevronLeft, MessageSquareQuote, ShieldCheck, Star, Video } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { SEO } from "@/components/SEO"
import { CREDIT_VALUE_EUR, FREE_CANCEL_HOURS, LESSON_DURATIONS, lessonCreditCost } from "@/lib/credits"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  online: { label: "Disponible maintenant", cls: "bg-mint-soft text-success", dot: "bg-mint" },
  busy: { label: "Occupé", cls: "bg-hl-soft text-hl", dot: "bg-hl" },
  offline: { label: "Hors ligne", cls: "bg-ink/5 text-muted-foreground", dot: "bg-ink/30" },
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(size, i <= Math.round(value) ? "fill-gold text-gold" : "text-ink/15")} />)}
    </span>
  )
}

export default function TutorProfile() {
  useDocumentTitle("Profil du prof")
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const [duration, setDuration] = useState(60)

  const { data: tutor, isLoading, isFetching } = useQuery({
    queryKey: ["public-tutor", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: t, error } = await supabase.from("tutors").select("*").eq("user_id", id!).maybeSingle()
      if (error) throw error
      if (!t) return null
      const { data: profile } = await supabase.from("profiles").select("user_id, first_name, last_name, avatar_url, bio").eq("user_id", id!).maybeSingle()
      return { ...t, profile }
    },
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ["tutor-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id, rating, comment, created_at, student_id")
        .eq("tutor_id", id!).order("created_at", { ascending: false })
      if (error) throw error
      if (!data?.length) return []
      const ids = [...new Set(data.map((r) => r.student_id))]
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name").in("user_id", ids)
      const names = new Map((profiles ?? []).map((p) => [p.user_id, p.first_name || "Élève"]))
      return data.map((r) => ({ ...r, student_name: names.get(r.student_id) || "Élève" }))
    },
  })

  // Retour après inscription : rouvre la réservation si le compte peut réserver
  const wantsBooking = params.get("book") === "1"
  useEffect(() => {
    if (!wantsBooking || !tutor || !user) return
    if (hasRole("student") && user.id !== tutor.user_id && !tutor.is_suspended) setBookingOpen(true)
    const p = new URLSearchParams(params); p.delete("book"); setParams(p, { replace: true })
  }, [wantsBooking, tutor, user, hasRole, params, setParams])

  if (!id || (isLoading && isFetching)) {
    return <div className="grid gap-4 pt-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0"><div className="glass h-80 animate-pulse" /><div className="glass h-80 animate-pulse" /></div>
  }
  if (!tutor) {
    return (
      <div className="flex flex-col items-center gap-4 py-28 text-center">
        <h1 className="text-2xl">Prof introuvable</h1>
        <p className="text-muted-foreground">Ce profil n'existe pas ou n'est plus visible.</p>
        <Button asChild variant="outline"><Link to="/tutors">Voir les profs</Link></Button>
      </div>
    )
  }

  const p = tutor.profile
  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Prof"
  const initials = `${p?.first_name?.[0] ?? "P"}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const status = STATUS[tutor.status] ?? STATUS.offline
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const rate = Number(tutor.hourly_rate) || 0
  const cost = lessonCreditCost(rate, duration)
  const isStudent = !!user && hasRole("student")
  const isSelf = user?.id === tutor.user_id
  const canBook = isStudent && !tutor.is_suspended && !isSelf
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }))
  const seoSubjects = (tutor.subjects ?? []).slice(0, 3).join(", ")

  const book = () => {
    // Après inscription ou connexion, on revient ici et la réservation s'ouvre (?book=1)
    if (!user) { navigate("/signup", { state: { from: `/tutors/${tutor.user_id}?book=1` } }); return }
    setBookingOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
      <SEO title={`${fullName} — prof de ${seoSubjects}`} path={`/tutors/${id}`} type="profile"
        description={`Réserve un cours avec ${fullName}.${seoSubjects ? ` Matières : ${seoSubjects}.` : ""} ${rate ? `${rate} € de l'heure.` : ""}`} />

      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-ink-2">
        <ChevronLeft className="h-4 w-4" /> Retour
      </button>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <div className="space-y-5">
          {/* Identité */}
          <section className="glass reveal overflow-hidden rounded-[1.75rem]">
            <div className="h-28 bg-gradient-to-br from-peri-soft via-hl-soft to-mint-soft" />
            <div className="px-6 pb-6 sm:px-8">
              <div className="-mt-12 flex flex-wrap items-end gap-4">
                {p?.avatar_url
                  ? <img src={p.avatar_url} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white" />
                  : <span className="grid h-24 w-24 place-items-center rounded-3xl bg-white font-display text-3xl font-medium text-ink ring-4 ring-white [&>*]:min-w-0">{initials}</span>}
                <span className={cn("mb-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", status.cls)}>
                  <span className={cn("h-2 w-2 rounded-full", status.dot)} />{status.label}
                </span>
              </div>
              <h1 className="mt-4 text-[2rem] leading-tight">{fullName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {reviews.length > 0
                  ? <span className="flex items-center gap-2"><Stars value={avg} /><b className="text-ink-2">{avg.toFixed(1).replace(".", ",")}</b><span className="text-muted-foreground">· {reviews.length} avis</span></span>
                  : <span className="rounded-full bg-peri-soft px-2.5 py-1 text-xs font-bold text-ink">Nouveau sur Prof en Ligne</span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(tutor.subjects ?? []).map((s) => <Link key={s} to={`/tutors?subject=${encodeURIComponent(s)}`} className="rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-ink hover:bg-hl-soft">{s}</Link>)}
              </div>
              {p?.bio && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink/80">{p.bio}</p>}
            </div>
          </section>

          {/* Avis */}
          <section className="glass reveal p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl"><MessageSquareQuote className="h-5 w-5 text-peri" /> Avis des élèves</h2>
            {reviews.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white/50 px-4 py-8 text-center text-sm text-muted-foreground">
                Pas encore d'avis. Seuls les élèves qui ont terminé un cours avec {p?.first_name ?? "ce prof"} peuvent en laisser un.
              </p>
            ) : (
              <>
                <div className="mt-5 grid gap-6 sm:grid-cols-[150px_1fr]">
                  <div className="text-center sm:text-left">
                    <p className="display text-5xl text-ink-2">{avg.toFixed(1).replace(".", ",")}</p>
                    <Stars value={avg} />
                    <p className="mt-1 text-sm text-muted-foreground">{reviews.length} avis vérifiés</p>
                  </div>
                  <div className="space-y-1.5">
                    {dist.map(({ n, c }) => (
                      <div key={n} className="flex items-center gap-3 text-sm">
                        <span className="w-3 font-bold text-ink-2">{n}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/8 bg-ink/[0.07]"><span className="block h-full rounded-full bg-hl" style={{ width: `${(c / reviews.length) * 100}%` }} /></span>
                        <span className="w-6 text-right text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl bg-white/60 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-peri-soft text-sm font-bold text-ink [&>*]:min-w-0">{r.student_name[0]?.toUpperCase()}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-ink-2">{r.student_name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMMM yyyy", { locale: fr })}</p>
                        </div>
                        <Stars value={r.rating} size="h-3.5 w-3.5" />
                      </div>
                      {r.comment && <p className="mt-3 text-sm leading-relaxed text-ink/80">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* Réservation */}
        <aside className="glass-strong reveal rounded-[1.75rem] p-6 lg:sticky lg:top-24">
          <p className="display text-4xl text-ink-2">{rate ? `${rate} €` : "—"}<span className="text-base font-semibold text-muted-foreground"> / heure</span></p>
          {rate > 0 && (
            <>
              <p className="mt-5 text-sm font-semibold text-ink-2">Durée</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {LESSON_DURATIONS.map((d) => (
                  <button key={d.value} onClick={() => setDuration(d.value)}
                    className={cn("rounded-xl py-2 text-sm font-bold transition", duration === d.value ? "bg-primary text-white" : "bg-white/70 text-ink hover:bg-white")}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-hl-soft px-4 py-3">
                <span className="text-sm text-muted-foreground">Coût du cours</span>
                <span className="text-right"><b className="font-display text-lg text-ink-2">{cost} crédit{cost > 1 ? "s" : ""}</b><span className="block text-xs text-muted-foreground">{cost * CREDIT_VALUE_EUR} €</span></span>
              </div>
            </>
          )}
          {isSelf ? (
            <Button asChild variant="outline" size="lg" className="mt-5 w-full"><Link to="/profile">Modifier mon profil</Link></Button>
          ) : user && !isStudent ? (
            <p className="mt-5 rounded-2xl bg-white/60 p-3 text-center text-sm text-muted-foreground">La réservation est réservée aux comptes élèves.</p>
          ) : (
            <Button size="lg" className="mt-5 w-full" onClick={book} disabled={!!user && !canBook}>
              <CalendarCheck /> {user ? "Réserver un cours" : "Créer un compte pour réserver"}
            </Button>
          )}
          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-mint" />Annulation gratuite jusqu'à {FREE_CANCEL_HOURS} h avant</li>
            <li className="flex gap-2"><Video className="h-4 w-4 shrink-0 text-peri" />En visio, avec tableau blanc</li>
            <li className="flex gap-2"><Star className="h-4 w-4 shrink-0 text-gold" />Tu pourras noter le cours ensuite</li>
          </ul>
        </aside>
      </div>

      {canBook && <BookLessonDialog defaultTutorId={tutor.user_id} defaultOpen={bookingOpen} onClose={() => setBookingOpen(false)} trigger={<span className="hidden" />} />}
    </div>
  )
}
