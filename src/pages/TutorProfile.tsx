import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarClock, CalendarDays, ChevronLeft, GraduationCap, MessageSquareQuote, Send, ShieldCheck, Star, Video, Zap } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog"
import { WeekSlotPicker } from "@/components/agenda/WeekSlotPicker"
import { SlotBookingDialog } from "@/components/agenda/SlotBookingDialog"
import { useTutorAvailability } from "@/hooks/useAgenda"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { SEO } from "@/components/SEO"
import { FREE_CANCEL_HOURS, LATE_START_HOUR, LATE_SURCHARGE_EUR, LESSON_DURATIONS, MIN_LESSON_PRICE_EUR, formatEur, lessonPriceEur } from "@/lib/credits"
import { isTutorLive } from "@/lib/agenda"
import { cn } from "@/lib/utils"

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn(size, i <= Math.round(value) ? "fill-gold text-gold" : "text-ink/15")} />)}
    </span>
  )
}

const BOOKABLE = LESSON_DURATIONS.filter((d) => d.value <= 120)

export default function TutorProfile() {
  useDocumentTitle("Profil du prof")
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const [params, setParams] = useSearchParams()
  const [duration, setDuration] = useState(Number(params.get("d")) || 60)
  const [slot, setSlot] = useState<Date | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [instantOpen, setInstantOpen] = useState(false)
  const agendaRef = useRef<HTMLElement>(null)

  const { data: tutor, isLoading, isFetching } = useQuery({
    queryKey: ["public-tutor", id],
    enabled: !!id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data: t, error } = await supabase.from("tutors").select("*").eq("user_id", id!).maybeSingle()
      if (error) throw error
      if (!t) return null
      const { data: profile } = await supabase.from("profiles").select("user_id, first_name, last_name, avatar_url, bio").eq("user_id", id!).maybeSingle()
      return { ...t, profile }
    },
  })
  const { data: availability = [], isLoading: agendaLoading } = useTutorAvailability(id)

  const { data: reviews = [] } = useQuery({
    queryKey: ["tutor-reviews", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id, rating, comment, created_at, student_id, lesson_id")
        .eq("tutor_id", id!).order("created_at", { ascending: false })
      if (error) throw error
      if (!data?.length) return []
      const ids = [...new Set(data.map((r) => r.student_id))]
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name").in("user_id", ids)
      const names = new Map((profiles ?? []).map((p) => [p.user_id, p.first_name || "Élève"]))
      return data.map((r) => ({ ...r, student_name: names.get(r.student_id) || "Élève" }))
    },
  })

  const isStudent = !!user && hasRole("student")
  const isSelf = !!user && user.id === tutor?.user_id
  const canBook = !!tutor && isStudent && !tutor.is_suspended && !isSelf

  // Retour après inscription : rouvre le créneau choisi (?slot=…&d=…) ou la demande (?book=1)
  useEffect(() => {
    if (!tutor || !user) return
    const s = params.get("slot")
    const wantsRequest = params.get("book") === "1"
    if (!s && !wantsRequest) return
    if (canBook) {
      if (s && !Number.isNaN(Date.parse(s))) setSlot(new Date(s))
      else if (wantsRequest) setRequestOpen(true)
    }
    const p = new URLSearchParams(params); p.delete("slot"); p.delete("book"); setParams(p, { replace: true })
  }, [tutor, user, canBook, params, setParams])

  const subjects = useMemo(() => tutor?.subjects ?? [], [tutor])

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
  const firstName = p?.first_name || "Ce prof"
  const fullName = [p?.first_name, p?.last_name ? `${p.last_name[0]}.` : ""].filter(Boolean).join(" ") || "Prof"
  const initials = `${p?.first_name?.[0] ?? "P"}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const live = isTutorLive(tutor)
  const busy = tutor.status === "busy"
  const hasAgenda = availability.length > 0
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }))
  const seoSubjects = subjects.slice(0, 3).join(", ")
  const levels = tutor.levels ?? []

  const gotoSignup = (from: string) => navigate("/signup", { state: { from } })
  const pickSlot = (s: Date) => {
    if (!user) { gotoSignup(`/tutors/${tutor.user_id}?slot=${encodeURIComponent(s.toISOString())}&d=${duration}`); return }
    if (!canBook) return
    setSlot(s)
  }
  const scrollToAgenda = () => agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  const request = () => {
    if (!user) { gotoSignup(`/tutors/${tutor.user_id}?book=1`); return }
    setRequestOpen(true)
  }

  return (
    <div className="space-y-6 pb-12">
      <SEO title={`${fullName} — prof de ${seoSubjects}`} path={`/tutors/${id}`} type="profile"
        description={`Réserve un cours avec ${fullName}.${seoSubjects ? ` Matières : ${seoSubjects}.` : ""} Dès ${MIN_LESSON_PRICE_EUR} € le cours.`} />

      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-ink-2">
        <ChevronLeft className="h-4 w-4" /> Retour
      </button>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
        <div className="min-w-0 space-y-5">
          {/* Identité */}
          <section className="glass reveal p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => <Link key={s} to={`/tutors?subject=${encodeURIComponent(s)}`} className="rounded-full bg-hl-soft px-3 py-1 text-xs font-bold text-ink-2 hover:bg-hl hover:text-white">{s}</Link>)}
            </div>
            <h1 className="mt-4 text-[clamp(1.6rem,3.5vw,2.3rem)] leading-tight">{tutor.headline || `${firstName}, prof de ${subjects[0] ?? "soutien scolaire"}`}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {reviews.length > 0
                ? <span className="flex items-center gap-2"><Stars value={avg} /><b className="text-ink-2">{avg.toFixed(1).replace(".", ",")}</b><span className="text-muted-foreground">({reviews.length} avis)</span></span>
                : <span className="rounded-full bg-peri-soft px-2.5 py-1 text-xs font-bold text-ink">Nouveau sur Ton Prof en Ligne</span>}
              {levels.length > 0 && <span className="flex items-center gap-1.5 text-ink-2"><GraduationCap className="h-4 w-4 text-peri" />{levels.join(" · ")}</span>}
              <span className="flex items-center gap-1.5 text-ink-2"><Video className="h-4 w-4 text-peri" />En visio</span>
            </div>
          </section>

          {/* À propos */}
          {p?.bio && (
            <section className="glass reveal p-6 sm:p-8">
              <h2 className="text-xl">À propos de {firstName}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-2/80">{p.bio}</p>
            </section>
          )}

          {/* Agenda */}
          <section ref={agendaRef} id="agenda" className="glass reveal scroll-mt-24 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl"><CalendarDays className="h-5 w-5 text-peri" /> Agenda de {firstName}</h2>
            {agendaLoading ? (
              <div className="mt-4 h-40 animate-pulse rounded-2xl bg-ink/5" />
            ) : hasAgenda ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Choisis un créneau : le cours est confirmé tout de suite.</p>
                <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Durée du cours">
                  {BOOKABLE.map((d) => (
                    <button key={d.value} type="button" role="radio" aria-checked={duration === d.value} onClick={() => setDuration(d.value)}
                      className={cn("rounded-full border-2 border-ink-2 px-3 py-1.5 text-sm font-bold transition", duration === d.value ? "bg-ink-2 text-white" : "bg-white hover:bg-peri-soft")}>
                      {d.label} · {d.priceEur} €
                    </button>
                  ))}
                </div>
                <div className="mt-5"><WeekSlotPicker tutorId={tutor.user_id} duration={duration} onPick={pickSlot} /></div>
                {user && !canBook && !isSelf && <p className="mt-3 text-center text-sm text-muted-foreground">La réservation est réservée aux comptes élèves.</p>}
              </>
            ) : (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/15 bg-white/60 p-5 text-center">
                <p className="font-semibold text-ink-2">{firstName} n'a pas encore publié son agenda.</p>
                <p className="mt-1 text-sm text-muted-foreground">Propose-lui une date : il confirme, sinon tu es remboursé automatiquement.</p>
                {!isSelf && (!user || canBook) && <Button variant="outline" className="mt-4" onClick={request}><Send /> Proposer une date</Button>}
              </div>
            )}
          </section>

          {/* Avis */}
          <section className="glass reveal p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl"><MessageSquareQuote className="h-5 w-5 text-peri" /> Avis des élèves</h2>
            {reviews.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white/50 px-4 py-8 text-center text-sm text-muted-foreground">
                Pas encore d'avis. Seuls les élèves qui ont terminé un cours avec {firstName} peuvent en laisser un.
              </p>
            ) : (
              <>
                <div className="mt-5 grid gap-6 sm:grid-cols-[150px_1fr]">
                  <div className="text-center sm:text-left">
                    <p className="display text-5xl text-ink-2">{avg.toFixed(1).replace(".", ",")}</p>
                    <Stars value={avg} />
                    <p className="mt-1 text-sm text-muted-foreground">{reviews.length} avis</p>
                  </div>
                  <div className="space-y-1.5">
                    {dist.map(({ n, c }) => (
                      <div key={n} className="flex items-center gap-3 text-sm">
                        <span className="w-3 font-bold text-ink-2">{n}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.07]"><span className="block h-full rounded-full bg-hl" style={{ width: `${(c / reviews.length) * 100}%` }} /></span>
                        <span className="w-6 text-right text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl bg-white/60 p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-peri-soft text-sm font-bold text-ink">{r.student_name[0]?.toUpperCase()}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-ink-2">{r.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "d MMMM yyyy", { locale: fr })}
                            {r.lesson_id ? " · après un cours terminé" : " · avis de l'ancienne version, non lié à un cours"}
                          </p>
                        </div>
                        <Stars value={r.rating} size="h-3.5 w-3.5" />
                      </div>
                      {r.comment && <p className="mt-3 text-sm leading-relaxed text-ink-2/80">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Avis publiés sans contrôle préalable de leur contenu, du plus récent au plus ancien.{" "}
                  <Link to="/fonctionnement#avis" className="underline">Comment fonctionnent les avis</Link>
                </p>
              </>
            )}
          </section>
        </div>

        {/* Carte du prof (fixe à droite, comme Superprof) */}
        <aside className="glass-strong reveal order-first rounded-[1.75rem] p-6 lg:order-none lg:sticky lg:top-24">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {p?.avatar_url
                ? <img src={p.avatar_url} alt="" className="h-32 w-32 rounded-[1.75rem] border-2 border-ink-2 object-cover" />
                : <span className="grid h-32 w-32 place-items-center rounded-[1.75rem] border-2 border-ink-2 bg-peri-soft font-display text-4xl font-extrabold text-ink-2">{initials}</span>}
              {live && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink-2 bg-mint px-2.5 py-0.5 text-xs font-extrabold text-ink-2">● En ligne</span>}
              {busy && !live && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink-2 bg-hl-soft px-2.5 py-0.5 text-xs font-extrabold text-ink-2">En cours</span>}
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold text-ink-2">{fullName}</p>
            {reviews.length > 0 && <p className="mt-1 flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-gold text-gold" /><b>{avg.toFixed(1).replace(".", ",")}</b><span className="text-muted-foreground">({reviews.length} avis)</span></p>}
          </div>

          <dl className="mt-5 divide-y-2 divide-ink/5 rounded-2xl bg-white/70 px-4 text-sm">
            <div className="flex items-center justify-between py-2.5"><dt className="text-muted-foreground">Tarif</dt><dd className="font-extrabold text-ink-2">dès {MIN_LESSON_PRICE_EUR} € <span className="font-semibold text-muted-foreground">(20 min)</span></dd></div>
            <div className="flex items-center justify-between py-2.5"><dt className="text-muted-foreground">1 h de cours</dt><dd className="font-extrabold text-ink-2">{formatEur(lessonPriceEur(60))}</dd></div>
            <div className="flex items-center justify-between py-2.5"><dt className="text-muted-foreground">Réservation</dt><dd className="font-extrabold text-ink-2">{hasAgenda ? "confirmée tout de suite" : "sur demande"}</dd></div>
          </dl>

          {isSelf ? (
            <div className="mt-5 space-y-2">
              <Button asChild size="lg" className="w-full"><Link to="/disponibilites"><CalendarClock /> Mes disponibilités</Link></Button>
              <Button asChild variant="outline" size="lg" className="w-full"><Link to="/profile">Modifier mon profil</Link></Button>
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {live && (!user || canBook) && (
                <Button size="lg" variant="highlight" className="w-full" onClick={() => user ? setInstantOpen(true) : gotoSignup(`/tutors/${tutor.user_id}`)}>
                  <Zap /> Cours en direct maintenant
                </Button>
              )}
              {hasAgenda
                ? <Button size="lg" variant={live ? "outline" : "default"} className="w-full" onClick={scrollToAgenda}><CalendarDays /> Voir les créneaux</Button>
                : (!user || canBook) && <Button size="lg" variant={live ? "outline" : "default"} className="w-full" onClick={request}><Send /> Proposer une date</Button>}
              {live && <p className="text-center text-xs text-muted-foreground">En direct après {LATE_START_HOUR} h : +{LATE_SURCHARGE_EUR} €</p>}
            </div>
          )}

          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-mint" />Annulation gratuite jusqu'à {FREE_CANCEL_HOURS} h avant</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-mint" />Remboursé si le prof ne confirme pas</li>
            <li className="flex gap-2"><Star className="h-4 w-4 shrink-0 text-gold" />Chaque nouvel avis est lié à un cours terminé</li>
          </ul>
        </aside>
      </div>

      {canBook && (
        <SlotBookingDialog open={!!slot} onOpenChange={(v) => { if (!v) setSlot(null) }} tutorId={tutor.user_id}
          tutorName={p?.first_name || "ton prof"} subjects={subjects} slot={slot} duration={duration}
          defaultSubject={params.get("subject") ?? undefined} />
      )}
      {canBook && requestOpen && <BookLessonDialog defaultTutorId={tutor.user_id} defaultOpen onClose={() => setRequestOpen(false)} trigger={<span className="hidden" />} />}
      {canBook && instantOpen && <BookLessonDialog instant defaultTutorId={tutor.user_id} defaultOpen onClose={() => setInstantOpen(false)} trigger={<span className="hidden" />} />}
    </div>
  )
}
