import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, CalendarCheck, Check, ChevronDown, GraduationCap, MessageCircle,
  MonitorPlay, PenLine, Search, ShieldCheck, Star, TrendingUp, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Backdrop } from "@/components/brand/Backdrop"
import { PublicNav, SiteFooter } from "@/components/layout/PublicLayout"
import { useReveal } from "@/hooks/useReveal"
import { useTutors } from "@/hooks/useTutors"
import { SUBJECTS } from "@/lib/constants"
import {
  FREE_CANCEL_HOURS, LESSON_DURATIONS, MIN_LESSON_PRICE_EUR, MIN_WITHDRAWAL_EUR, PLATFORM_COMMISSION,
  TOPUP_PACKS, WITHDRAWAL_FEE_RATE, formatEur, lessonPriceEur, tutorShareEur,
} from "@/lib/credits"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "#comment", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#profs", label: "Les profs" },
  { href: "#devenir-prof", label: "Devenir prof" },
  { href: "#faq", label: "FAQ" },
]

export default function Landing() {
  useReveal()
  return (
    <div className="min-h-screen">
      <Backdrop variant="landing" />
      <PublicNav loggedIn={false} links={NAV_LINKS} />
      <main>
        <Hero />
        <SubjectsMarquee />
        <HowItWorks />
        <PriceSimulator />
        <TutorsShowcase />
        <ForTutors />
        <Packs />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

/* ─── 1. Hero : titre en serif, panneau crème avec de vrais profs ─────── */

function Hero() {
  const { data: tutors } = useTutors()
  const shown = useMemo(() => (tutors ?? [])
    .filter((t) => t.profiles?.first_name)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 3), [tutors])

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24 [&>*]:min-w-0">
      <div className="reveal">
        <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.04] tracking-[-0.02em]">
          Le bon prof,<br />pour <span className="hl-mark">chaque</span> élève.
        </h1>
        <p className="mt-7 max-w-[30em] text-[1.15rem] leading-[1.7] text-muted-foreground sm:text-[1.2rem]">
          Des cours particuliers en visio, du collège au master. Compare les profs, réserve un créneau,
          avec un prix unique, le même pour tous les profs.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/tutors">Trouver mon prof <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/signup?role=tutor">Je suis prof</Link></Button>
        </div>
        <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 text-sm sm:gap-6 [&>*]:min-w-0 text-muted-foreground">
          <div><dt className="sr-only">Prix</dt><dd><b className="block font-display text-[1.35rem] font-medium text-ink-2 sm:text-[1.6rem]">Dès {MIN_LESSON_PRICE_EUR} €</b>le cours</dd></div>
          <div><dt className="sr-only">Annulation</dt><dd><b className="block font-display text-[1.35rem] font-medium text-ink-2 sm:text-[1.6rem]">{FREE_CANCEL_HOURS} h</b>pour annuler sans frais</dd></div>
          <div><dt className="sr-only">Abonnement</dt><dd><b className="block font-display text-[1.35rem] font-medium text-ink-2 sm:text-[1.6rem]">0</b>abonnement</dd></div>
        </dl>
      </div>

      <div className="reveal glass-tint grid gap-3.5 p-5 sm:p-7 [&>*]:min-w-0">
        {shown.length > 0 ? (
          <>
            <p className="px-1 text-sm font-medium text-muted-foreground">Quelques profs inscrits</p>
            {shown.map((t) => <HeroTutor key={t.id} tutor={t} />)}
            <Link to="/tutors" className="px-1 pt-1 text-sm font-semibold text-ink hover:underline">Voir tous les profs →</Link>
          </>
        ) : <HeroExample />}
      </div>
    </section>
  )
}

function HeroTutor({ tutor }: { tutor: NonNullable<ReturnType<typeof useTutors>["data"]>[number] }) {
  const p = tutor.profiles
  const name = `${p?.first_name ?? ""} ${p?.last_name?.[0] ? p.last_name[0] + "." : ""}`.trim()
  const initials = `${p?.first_name?.[0] ?? ""}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const reviews = tutor.total_reviews ?? 0
  return (
    <Link to={`/tutors/${tutor.user_id}`} className="lift block rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3.5">
        {p?.avatar_url
          ? <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-peri-soft text-sm font-semibold text-ink">{initials}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink-2">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{(tutor.subjects ?? []).slice(0, 2).join(" · ") || "Toutes matières"}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        {reviews > 0
          ? <><Star className="h-4 w-4 fill-gold text-gold" /><span className="font-semibold text-ink-2">{Number(tutor.rating).toFixed(1).replace(".", ",")}</span> · {reviews} avis</>
          : "Nouveau sur Prof en Ligne"}
      </p>
    </Link>
  )
}

/** Sans profs à montrer : un exemple de réservation, présenté comme tel. */
function HeroExample() {
  return (
    <div aria-label="Exemple de réservation" className="grid gap-3.5 [&>*]:min-w-0">
      <p className="px-1 text-sm font-medium text-muted-foreground">Exemple de réservation</p>
      <div className="rounded-2xl border bg-white p-5">
        <p className="font-semibold text-ink-2">Mathématiques · dérivées</p>
        <p className="text-sm text-muted-foreground">Mercredi · 1 h en visio</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {["16:00", "17:00", "18:00", "19:00"].map((h) => (
            <span key={h} className={cn("rounded-lg border py-2 text-center text-sm", h === "18:00" ? "border-ink-2 bg-ink-2 text-white" : "bg-white text-ink-2")}>{h}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-white p-5">
        <div>
          <p className="font-semibold text-ink-2">Cours de 1 h</p>
          <p className="text-sm text-muted-foreground">Payé avec ton solde, annulable {FREE_CANCEL_HOURS} h avant</p>
        </div>
        <span className="font-display text-xl text-ink-2">{formatEur(lessonPriceEur(60))}</span>
      </div>
    </div>
  )
}

/* ─── 2. Défilement des matières ──────────────────────────────────────── */

function SubjectsMarquee() {
  const row = [...SUBJECTS, ...SUBJECTS]
  return (
    <section className="relative overflow-hidden py-6" aria-label="Matières proposées">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-3 hover:[animation-play-state:paused]">
        {row.map((s, i) => (
          <Link key={i} to={`/tutors?subject=${encodeURIComponent(s)}`}
            className="glass rounded-full px-5 py-2.5 text-[15px] font-semibold text-ink-2 transition hover:border-peri/40 hover:text-ink">
            {s}
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ─── 3. Comment ça marche : écran collant qui change au défilement ─────── */

const STEPS = [
  { icon: Search, title: "Choisis ton prof", text: "Filtre par matière, niveau et tarif. Chaque prof affiche son prix à l'heure, ses avis vérifiés et ses disponibilités." },
  { icon: CalendarCheck, title: "Réserve un créneau", text: "Tu vois le prix exact avant de confirmer. Le prof accepte, et tu peux annuler gratuitement jusqu'à 24 h avant." },
  { icon: MonitorPlay, title: "Retrouve-le en visio", text: "La salle ouvre 15 minutes avant. Caméra, partage d'écran et tableau blanc : tout se passe dans le navigateur, rien à installer." },
  { icon: TrendingUp, title: "Progresse, cours après cours", text: "Rapport de séance, points d'expérience, certificats : tu vois ce que tu as travaillé et ce qui reste à faire." },
]

function HowItWorks() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step)) }),
      { rootMargin: "-45% 0px -45% 0px" },
    )
    refs.current.forEach((r) => r && io.observe(r))
    return () => io.disconnect()
  }, [])

  return (
    <section id="comment" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-24">
      <SectionHead eyebrow="Comment ça marche" title={<>Quatre étapes, <span className="hl-mark-anim">zéro prise de tête</span>.</>} />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-[18vh] lg:h-[460px]">
          <div className="brand-gradient relative h-[380px] overflow-hidden rounded-[2rem] p-5 shadow-[0_30px_70px_hsl(330_25%_30%/0.3)] sm:h-[440px]">
            {STEPS.map((_, i) => (
              <div key={i} className={cn(
                "absolute inset-5 rounded-3xl bg-white p-6 transition-all duration-500",
                active === i ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-[.98] opacity-0",
              )}>
                <StepScreen index={i} on={active === i} />
              </div>
            ))}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {STEPS.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", active === i ? "w-6 bg-white" : "w-1.5 bg-white/40")} />)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[22vh] pb-[16vh] pt-[6vh]">
          {STEPS.map((s, i) => (
            <article key={s.title} data-step={i} ref={(el) => (refs.current[i] = el)}
              className={cn("transition-opacity duration-500", active === i ? "opacity-100" : "opacity-30")}>
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-peri/30 bg-white text-peri shadow-card"><s.icon className="h-6 w-6" /></span>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-hl">Étape {i + 1}</p>
              <h3 className="mt-1 text-[1.9rem] leading-tight">{s.title}</h3>
              <p className="mt-3 max-w-md text-[1.08rem] text-muted-foreground">{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function StepScreen({ index, on }: { index: number; on: boolean }) {
  const anim = (d: number) => ({ transitionDelay: on ? `${d}ms` : "0ms" })
  const item = cn("transition-all duration-500", on ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0")
  if (index === 0) return (
    <div>
      <p className="font-display text-lg font-medium text-ink-2">Profs de maths · Terminale</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {[["Camille L.", "Lycée", "Dispo"], ["Yanis B.", "Prépa", "Dispo"], ["Inès M.", "Collège", "Ce soir"], ["Hugo D.", "Lycée", "Demain"]].map(([n, p, r], i) => (
          <div key={n} style={anim(i * 80)} className={cn(item, "flex items-center gap-3 rounded-2xl bg-background px-3 py-2.5")}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-peri-soft text-xs font-bold text-ink">{n.slice(0, 2).toUpperCase()}</span>
            <span className="flex-1 font-semibold text-ink-2">{n}</span>
            <span className="text-xs font-semibold text-success">{r}</span>
            <span className="w-16 text-right text-sm font-bold text-ink">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
  if (index === 1) return (
    <div>
      <p className="font-display text-lg font-medium text-ink-2">Réserver avec Camille</p>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="font-bold text-muted-foreground">{d}</span>)}
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={anim(i * 25)} className={cn("rounded-lg py-2 font-semibold transition-all duration-300", on ? "opacity-100" : "opacity-0",
            i === 9 ? "bg-primary text-white" : [2, 4, 8, 11].includes(i) ? "bg-peri-soft text-ink" : "bg-background text-muted-foreground")}>{i + 10}</span>
        ))}
      </div>
      <div style={anim(400)} className={cn(item, "mt-5 rounded-2xl bg-hl-soft p-4")}>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cours d'1 h</span><b className="text-ink-2">{formatEur(lessonPriceEur(60))}</b></div>
        <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Ton solde</span><b className="text-ink-2">{formatEur(55)}</b></div>
      </div>
    </div>
  )
  if (index === 2) return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-medium text-ink-2">Salle de cours</p>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-soft px-2.5 py-1 text-xs font-bold text-rose"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose" />En direct</span>
      </div>
      <div className="mt-3 grid flex-1 grid-cols-[1fr_88px] gap-2.5">
        <div className="rounded-2xl border border-border bg-background p-3">
          <svg viewBox="0 0 200 120" className="h-full w-full">
            <path d="M10 100 Q 60 10, 110 60 T 190 30" fill="none" stroke="hsl(245 25% 53%)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="300" strokeDashoffset={on ? 0 : 300} style={{ transition: "stroke-dashoffset 1.6s ease .2s" }} />
            <circle cx="110" cy="60" r="5" fill="hsl(359 52% 55%)" opacity={on ? 1 : 0} style={{ transition: "opacity .4s 1.4s" }} />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <span className="grid flex-1 place-items-center rounded-2xl bg-peri-soft text-xs font-bold text-ink">Toi</span>
          <span className="grid flex-1 place-items-center rounded-2xl bg-mint-soft text-xs font-bold text-mint">Camille</span>
        </div>
      </div>
    </div>
  )
  return (
    <div>
      <p className="font-display text-lg font-medium text-ink-2">Ta progression</p>
      <div className="mt-4 flex h-[200px] items-end gap-3 border-b-2 border-border px-1 pb-0.5">
        {[34, 48, 55, 68, 82].map((h, i) => (
          <div key={i} className={cn("flex-1 rounded-t-xl transition-all duration-700", i === 4 ? "bg-hl" : "bg-peri-soft")}
            style={{ height: on ? `${h}%` : "0%", transitionDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">Exemple : XP gagnée semaine après semaine</p>
    </div>
  )
}

/* ─── 4. Grille de prix (élèves) ─────────────────────────────────────── */

function PriceSimulator() {
  const [duration, setDuration] = useState(60)
  const price = lessonPriceEur(duration)
  const hourly = Math.round(price / duration * 60 * 100) / 100

  return (
    <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-20">
      <SectionHead eyebrow="Combien ça coûte ?" title="Un prix clair, le même pour tous." sub="Pas de surprise : le prix dépend seulement de la durée du cours, quel que soit le prof." />
      <div className="glass reveal mx-auto mt-4 grid max-w-4xl gap-8 p-6 sm:p-10 md:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <div>
          <p className="font-display font-medium text-ink-2">Durée du cours</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LESSON_DURATIONS.map((d) => (
              <button key={d.value} type="button" onClick={() => setDuration(d.value)} aria-pressed={duration === d.value}
                className={cn("rounded-xl border px-4 py-3 text-left transition", duration === d.value ? "border-ink-2 bg-ink-2 text-white" : "bg-white text-ink-2 hover:border-ink-2/30")}>
                <span className="block text-sm">{d.label}</span>
                <span className="font-display text-xl">{d.priceEur} €</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-hl-soft p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Ce cours te coûte</p>
          <p className="mt-1 font-display text-[3.4rem] font-medium leading-none text-ink-2 tabular">{formatEur(price)}</p>
          <p className="mt-3 text-sm text-muted-foreground">soit {formatEur(hourly)} de l'heure. Plus le cours est long, moins l'heure coûte cher.</p>
        </div>
      </div>
    </section>
  )
}

/* ─── 5. Les vrais profs de la plateforme ─────────────────────────────── */

function TutorsShowcase() {
  const { data: tutors } = useTutors()
  const shown = useMemo(() => (tutors ?? [])
    .filter((t) => t.profiles?.first_name)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 6), [tutors])

  if (shown.length === 0) return null
  return (
    <section id="profs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-24">
      <SectionHead eyebrow="Les profs" title={<>Des profs <span className="hl-mark-anim">en chair et en os</span>.</>} sub="Ils sont inscrits sur Prof en Ligne. Clique pour voir leur profil, leurs matières et leurs avis." />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => <TutorMiniCard key={t.id} tutor={t} />)}
      </div>
      <div className="reveal mt-8 text-center">
        <Button asChild variant="outline" size="lg"><Link to="/tutors">Voir tous les profs <ArrowRight /></Link></Button>
      </div>
    </section>
  )
}

function TutorMiniCard({ tutor }: { tutor: NonNullable<ReturnType<typeof useTutors>["data"]>[number] }) {
  const p = tutor.profiles
  const name = `${p?.first_name ?? ""} ${p?.last_name?.[0] ? p.last_name[0] + "." : ""}`.trim()
  const initials = `${p?.first_name?.[0] ?? ""}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const reviews = tutor.total_reviews ?? 0
  return (
    <Link to={`/tutors/${tutor.user_id}`} className="glass reveal lift group block p-5">
      <div className="flex items-center gap-3">
        {p?.avatar_url
          ? <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-peri-soft font-display text-lg font-medium text-ink">{initials}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-medium text-ink-2">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{(tutor.subjects ?? []).slice(0, 2).join(" · ") || "Toutes matières"}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-ink" />
      </div>
      {p?.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-bold text-ink-2">
          {reviews > 0
            ? <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-gold text-gold" />{Number(tutor.rating).toFixed(1).replace(".", ",")} <span className="font-medium text-muted-foreground">({reviews})</span></span>
            : <span className="text-muted-foreground">Nouveau</span>}
        </span>
      </div>
    </Link>
  )
}

/* ─── 6. Pour les profs : simulateur de revenus ───────────────────────── */

function ForTutors() {
  const [hours, setHours] = useState(6)
  const perHour = tutorShareEur(60)
  const monthly = Math.round(perHour * hours * 4.33)

  return (
    <section id="devenir-prof" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-24">
      <div className="glass-ink reveal relative overflow-hidden rounded-[2rem] p-6 sm:p-12">
        <span aria-hidden className="blob" style={{ width: 380, height: 380, top: -120, right: -80, background: "hsl(245 25% 53%)", opacity: 0.35 }} />
        <div className="relative grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow !text-[#E9A39F]">Pour les profs</span>
            <h2 className="mt-4 text-[clamp(2rem,4.2vw,3rem)] leading-[1.05]">Enseigne à ton rythme.<br />Garde {Math.round((1 - PLATFORM_COMMISSION) * 100)} % du prix de chaque cours.</h2>
            <ul className="mt-6 space-y-3 text-white/90">
              {[
                [Wallet, `Prix unique pour tous : tu touches ${formatEur(perHour)} par heure de cours.`],
                [CalendarCheck, "Tu acceptes ou refuses chaque demande. Si tu annules, l'élève est remboursé."],
                [PenLine, "Visio, tableau blanc et rapport de séance sont fournis."],
                [ShieldCheck, "Les élèves paient d'avance avec leur solde : pas d'impayés."],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof Wallet
                return <li key={i} className="flex gap-3"><I className="mt-0.5 h-5 w-5 shrink-0 text-white" /><span>{t as string}</span></li>
              })}
            </ul>
            <Button asChild variant="highlight" size="lg" className="mt-8"><Link to="/signup?role=tutor">Devenir prof <ArrowRight /></Link></Button>
          </div>
          <div className="rounded-3xl bg-white/[0.07] p-6 ring-1 ring-white/10 sm:p-8">
            <p className="font-display font-medium">Simule tes revenus</p>
            <div className="mt-6 space-y-7">
              <div className="flex justify-between text-sm"><span className="text-white/70">Tu touches par heure</span><b className="tabular">{formatEur(perHour)}</b></div>
              <div>
                <div className="flex justify-between text-sm"><span className="text-white/70">Heures de cours par semaine</span><b className="tabular">{hours} h</b></div>
                <Slider className="mt-3 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-white [&>span:first-child]:bg-white/25" min={1} max={30} step={1} value={[hours]} onValueChange={([v]) => setHours(v)} aria-label="Heures par semaine" />
              </div>
            </div>
            <div className="mt-8 rounded-2xl bg-white p-5 text-ink-2">
              <p className="text-sm font-semibold opacity-75">Tu gagnerais environ</p>
              <p className="display text-5xl tabular">{monthly.toLocaleString("fr-FR")} €</p>
              <p className="text-sm font-semibold opacity-75">par mois, commission déduite</p>
            </div>
            <p className="mt-3 text-xs text-white/70">Estimation : {formatEur(perHour)} × heures × 4,33 semaines. Avant les {Math.round(WITHDRAWAL_FEE_RATE * 100)} % de frais de retrait, hors impôts et cotisations.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── 7. Recharges du solde ──────────────────────────────────────────── */

function Packs() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-24">
      <SectionHead eyebrow="Ton solde" title="Recharge, et on t'en offre plus." sub="Tu paies tes cours avec ton solde, qui n'expire jamais. Plus la recharge est grosse, plus le bonus est grand. Pas d'abonnement obligatoire." />
      <div className="mx-auto mt-4 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {TOPUP_PACKS.map((p) => (
          <div key={p.amountEur} className={cn("reveal lift relative rounded-[1.25rem] p-7 text-center", p.recommended ? "glass-ink" : "glass")}>
            {p.recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-hl px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">Recommandé</span>}
            <p className={cn("text-sm", p.recommended ? "text-white/75" : "text-muted-foreground")}>Tu paies</p>
            <p className={cn("font-display text-5xl font-medium", p.recommended ? "text-white" : "text-ink-2")}>{p.amountEur} €</p>
            <p className={cn("mt-4 text-sm font-semibold", p.recommended ? "text-[#9FD9BE]" : "text-success")}>+{formatEur(p.bonusEur)} offerts</p>
            <p className={cn("mt-1 text-sm", p.recommended ? "text-white/80" : "text-muted-foreground")}>{formatEur(p.amountEur + p.bonusEur)} sur ton solde</p>
          </div>
        ))}
      </div>
      <div className="reveal mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold">Paiement par</span>
        {["WhatsApp", "virement", "Revolut"].map((m) => <span key={m} className="rounded-full border bg-white px-3 py-1 font-semibold text-ink-2">{m}</span>)}
        <span>· solde crédité dès réception, en général sous 24 h</span>
      </div>
    </section>
  )
}

/* ─── 8. FAQ ──────────────────────────────────────────────────────────── */

const FAQ = [
  ["Comment se passe un cours ?", "En visio, directement dans le navigateur : caméra, micro, partage d'écran et tableau blanc. La salle ouvre 15 minutes avant l'heure prévue. Rien à installer."],
  ["Combien coûte un cours ?", `Le même prix chez tous les profs : ${LESSON_DURATIONS.map((d) => `${d.label} ${d.priceEur} €`).join(", ")}.`],
  ["Comment je paie ?", "Tu recharges ton solde par WhatsApp, virement ou Revolut (à partir de 50 €, un bonus est offert). Le prix du cours est débité à la réservation, et ton solde n'expire jamais."],
  ["Et si je dois annuler ?", `Tant que le prof n'a pas confirmé, ou jusqu'à ${FREE_CANCEL_HOURS} h avant le cours, tu es remboursé intégralement. Si c'est le prof qui annule, tu es toujours remboursé.`],
  ["Quels niveaux ?", "Du collège au master : chaque prof indique ses matières et ses niveaux sur son profil."],
  ["Je suis prof, comment je suis payé ?", `Tu touches ${Math.round((1 - PLATFORM_COMMISSION) * 100)} % du prix de chaque cours terminé. Tu demandes un retrait depuis ton espace dès ${MIN_WITHDRAWAL_EUR} € (frais de retrait : ${Math.round(WITHDRAWAL_FEE_RATE * 100)} %).`],
  ["Les avis sont-ils vrais ?", "Seul un élève qui a terminé un cours avec le prof peut laisser un avis, une fois par cours."],
]

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-5 pt-24">
      <SectionHead eyebrow="FAQ" title="Les questions qu'on nous pose." />
      <div className="mt-2 space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="glass reveal group px-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.08rem] font-medium text-ink-2">
              {q}<ChevronDown className="h-5 w-5 shrink-0 text-peri transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="glass-ink reveal rounded-[2rem] px-6 py-14 text-center">
        <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.1]">Prêt à progresser ?</h2>
        <p className="mx-auto mt-4 max-w-lg text-white/85">Crée ton compte en une minute, trouve ton prof et réserve ton premier cours.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="highlight"><Link to="/signup">Créer mon compte <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href="#faq"><MessageCircle /> J'ai une question</a></Button>
        </div>
      </div>
    </section>
  )
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="reveal mx-auto mb-10 max-w-3xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.05]">{title}</h2>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-[1.08rem] text-muted-foreground">{sub}</p>}
    </div>
  )
}

