import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, CalendarCheck, Check, ChevronDown, GraduationCap, MessageCircle,
  MonitorPlay, PenLine, Search, ShieldCheck, Sparkles, Star, TrendingUp, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Backdrop } from "@/components/brand/Backdrop"
import { PublicNav, SiteFooter } from "@/components/layout/PublicLayout"
import { useReveal } from "@/hooks/useReveal"
import { useTutors } from "@/hooks/useTutors"
import { SUBJECTS } from "@/lib/constants"
import {
  CREDIT_PACKS, CREDIT_VALUE_EUR, FREE_CANCEL_HOURS, LESSON_DURATIONS, MAX_HOURLY_RATE, MIN_HOURLY_RATE,
  PLATFORM_COMMISSION, formatEur, lessonCreditCost, lessonPriceEur,
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

/* ─── 1. Hero : cartes en verre qui suivent la souris ───────────────────── */

function Hero() {
  const art = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = art.current
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 })
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  const layer = (depth: number) => ({ transform: `translate3d(${tilt.x * depth}px, ${tilt.y * depth}px, 0)`, transition: "transform .4s cubic-bezier(.2,.7,.2,1)" })

  return (
    <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-6">
      <div className="reveal">
        <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Du collège au master</span>
        <h1 className="mt-5 text-[clamp(2.7rem,6.4vw,5rem)] leading-[0.98]">
          Le bon prof, <br /><span className="hl-mark-anim">en un clic.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[1.18rem] leading-relaxed text-muted-foreground">
          Choisis ton prof, réserve un créneau et retrouve-le en visio avec un tableau blanc partagé.
          Tu paies au cours, avec des crédits qui n'expirent jamais.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/tutors"><Search /> Trouver mon prof</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/signup?role=tutor"><GraduationCap /> Je suis prof</Link></Button>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted-foreground">
          {["Dès 10 € de l'heure", `Annulation gratuite jusqu'à ${FREE_CANCEL_HOURS} h avant`, "Sans abonnement"].map((t) => (
            <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-mint" />{t}</li>
          ))}
        </ul>
      </div>

      <div ref={art} className="relative hidden h-[560px] lg:block" aria-hidden="true">
        {/* carte prof */}
        <div style={layer(-18)} className="absolute left-0 top-0 z-10 w-[260px]">
          <div className="glass float-a p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-peri-soft font-display text-lg font-extrabold text-ink">CL</span>
              <div>
                <p className="font-display font-extrabold text-ink-2">Camille L.</p>
                <p className="text-xs text-muted-foreground">Maths · Physique-Chimie</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-bold text-ink-2"><Star className="h-4 w-4 fill-hl text-hl" /> 4,9</span>
              <span className="rounded-full bg-mint-soft px-2.5 py-1 text-xs font-bold text-mint">Disponible</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Exemple de profil</p>
          </div>
        </div>
        {/* réservation */}
        <div style={layer(26)} className="absolute right-0 top-[150px] z-20 w-[290px]">
          <div className="glass float-b p-5">
            <p className="font-display font-extrabold text-ink-2">Mercredi 18 h 00</p>
            <p className="text-sm text-muted-foreground">Dérivées · 1 h</p>
            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {["16:00", "17:00", "18:00", "19:00"].map((h) => (
                <span key={h} className={cn("rounded-xl py-2 text-center text-xs font-bold", h === "18:00" ? "bg-primary text-white" : "bg-white/80 text-ink")}>{h}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-hl-soft px-3 py-2.5">
              <span className="text-sm font-bold text-ink-2">7 crédits</span>
              <span className="text-xs text-muted-foreground">35 € de l'heure</span>
            </div>
          </div>
        </div>
        {/* salle de cours */}
        <div style={layer(12)} className="absolute bottom-6 left-0 z-10 w-[330px]">
          <div className="glass-ink float-c rounded-3xl p-4">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-rose" /> En direct</span>
              <span>23:41</span>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4">
              <svg viewBox="0 0 280 90" className="h-[90px] w-full">
                <path d="M10 70 C 60 70, 70 20, 120 22 S 200 70, 270 18" fill="none" stroke="hsl(233 90% 66%)" strokeWidth="3" strokeLinecap="round" />
                <path d="M10 80 H 270 M 20 10 V 85" stroke="hsl(233 52% 20% / .25)" strokeWidth="1.5" />
                <text x="150" y="16" fontSize="13" fontWeight="700" fill="hsl(233 52% 20%)">f'(x) = 0</text>
                <rect x="140" y="20" width="62" height="5" rx="2.5" fill="hsl(46 100% 62%)" opacity=".8" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold">Tableau blanc partagé</p>
          </div>
        </div>
        {/* XP */}
        <div style={layer(-30)} className="absolute bottom-24 right-2 z-30 w-[200px]">
          <div className="glass float-a p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Après le cours</p>
            <p className="display mt-1 text-3xl text-ink-2">+100 XP</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full w-2/3 rounded-full bg-hl" /></div>
          </div>
        </div>
      </div>
    </section>
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
            className="glass rounded-full px-5 py-2.5 font-display text-[15px] font-bold text-ink-2 transition hover:bg-hl-soft">
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
  { icon: CalendarCheck, title: "Réserve un créneau", text: "Tu vois le coût exact en crédits avant de confirmer. Le prof accepte, et tu peux annuler gratuitement jusqu'à 24 h avant." },
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
          <div className="relative h-[380px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-2 to-ink-3 p-5 shadow-[0_30px_70px_hsl(234_55%_12%/0.35)] sm:h-[440px]">
            {STEPS.map((_, i) => (
              <div key={i} className={cn(
                "absolute inset-5 rounded-3xl bg-white p-6 transition-all duration-500",
                active === i ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-[.98] opacity-0",
              )}>
                <StepScreen index={i} on={active === i} />
              </div>
            ))}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {STEPS.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", active === i ? "w-6 bg-hl" : "w-1.5 bg-white/40")} />)}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[22vh] pb-[16vh] pt-[6vh]">
          {STEPS.map((s, i) => (
            <article key={s.title} data-step={i} ref={(el) => (refs.current[i] = el)}
              className={cn("transition-opacity duration-500", active === i ? "opacity-100" : "opacity-30")}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-ink"><s.icon className="h-5 w-5" /></span>
              <p className="mt-4 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-peri">Étape {i + 1}</p>
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
      <p className="font-display text-lg font-extrabold text-ink-2">Profs de maths · Terminale</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {[["Camille L.", "35 €/h", "4,9"], ["Yanis B.", "28 €/h", "4,8"], ["Inès M.", "40 €/h", "5,0"], ["Hugo D.", "22 €/h", "4,7"]].map(([n, p, r], i) => (
          <div key={n} style={anim(i * 80)} className={cn(item, "flex items-center gap-3 rounded-2xl bg-background px-3 py-2.5")}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-peri-soft text-xs font-extrabold text-ink">{n.slice(0, 2).toUpperCase()}</span>
            <span className="flex-1 font-semibold text-ink-2">{n}</span>
            <span className="flex items-center gap-1 text-sm font-bold"><Star className="h-3.5 w-3.5 fill-hl text-hl" />{r}</span>
            <span className="w-16 text-right text-sm font-bold text-ink">{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
  if (index === 1) return (
    <div>
      <p className="font-display text-lg font-extrabold text-ink-2">Réserver avec Camille</p>
      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="font-bold text-muted-foreground">{d}</span>)}
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={anim(i * 25)} className={cn("rounded-lg py-2 font-semibold transition-all duration-300", on ? "opacity-100" : "opacity-0",
            i === 9 ? "bg-primary text-white" : [2, 4, 8, 11].includes(i) ? "bg-peri-soft text-ink" : "bg-background text-muted-foreground")}>{i + 10}</span>
        ))}
      </div>
      <div style={anim(400)} className={cn(item, "mt-5 rounded-2xl bg-hl-soft p-4")}>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cours d'1 h · 35 €/h</span><b className="text-ink-2">7 crédits</b></div>
        <div className="mt-1 flex justify-between text-sm"><span className="text-muted-foreground">Ton solde</span><b className="text-ink-2">10 crédits</b></div>
      </div>
    </div>
  )
  if (index === 2) return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-extrabold text-ink-2">Salle de cours</p>
        <span className="flex items-center gap-1.5 rounded-full bg-rose-soft px-2.5 py-1 text-xs font-bold text-rose"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose" />En direct</span>
      </div>
      <div className="mt-3 grid flex-1 grid-cols-[1fr_88px] gap-2.5">
        <div className="rounded-2xl border border-border bg-background p-3">
          <svg viewBox="0 0 200 120" className="h-full w-full">
            <path d="M10 100 Q 60 10, 110 60 T 190 30" fill="none" stroke="hsl(233 90% 66%)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="300" strokeDashoffset={on ? 0 : 300} style={{ transition: "stroke-dashoffset 1.6s ease .2s" }} />
            <circle cx="110" cy="60" r="5" fill="hsl(46 100% 55%)" opacity={on ? 1 : 0} style={{ transition: "opacity .4s 1.4s" }} />
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
      <p className="font-display text-lg font-extrabold text-ink-2">Ta progression</p>
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

/* ─── 4. Simulateur de prix (élèves) ──────────────────────────────────── */

function PriceSimulator() {
  const [rate, setRate] = useState(30)
  const [duration, setDuration] = useState(60)
  const credits = lessonCreditCost(rate, duration)
  const price = lessonPriceEur(rate, duration)

  return (
    <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-20">
      <SectionHead eyebrow="Combien ça coûte ?" title="Tu sais toujours ce que tu paies." sub={`1 crédit = ${CREDIT_VALUE_EUR} € de cours. Chaque prof fixe son tarif ; le coût en crédits s'affiche avant de réserver.`} />
      <div className="glass reveal mx-auto mt-4 grid max-w-4xl gap-8 p-6 sm:p-10 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <div>
            <div className="flex items-baseline justify-between">
              <label className="font-display font-bold text-ink-2" htmlFor="rate">Tarif du prof</label>
              <span className="display text-2xl text-ink-2 tabular">{rate} €<span className="text-base text-muted-foreground"> / h</span></span>
            </div>
            <Slider id="rate" className="mt-4" min={MIN_HOURLY_RATE} max={80} step={1} value={[rate]} onValueChange={([v]) => setRate(v)} aria-label="Tarif horaire du prof" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{MIN_HOURLY_RATE} €</span><span>80 € et plus</span></div>
          </div>
          <div>
            <p className="font-display font-bold text-ink-2">Durée du cours</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LESSON_DURATIONS.map((d) => (
                <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                  className={cn("rounded-full px-4 py-2 text-sm font-bold transition", duration === d.value ? "bg-primary text-white shadow-ink" : "bg-white/70 text-ink hover:bg-white")}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-3xl bg-hl-soft p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Ce cours te coûte</p>
          <p className="display mt-1 text-[3.6rem] leading-none text-ink-2 tabular">{credits}</p>
          <p className="font-display font-bold text-ink-2">crédit{credits > 1 ? "s" : ""}</p>
          <p className="mt-3 text-sm text-muted-foreground">soit {formatEur(credits * CREDIT_VALUE_EUR)} (prix exact : {formatEur(price)}, arrondi au crédit supérieur)</p>
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
          : <span className="grid h-14 w-14 place-items-center rounded-2xl bg-peri-soft font-display text-lg font-extrabold text-ink">{initials}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold text-ink-2">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{(tutor.subjects ?? []).slice(0, 2).join(" · ") || "Toutes matières"}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-ink" />
      </div>
      {p?.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-bold text-ink-2">
          {reviews > 0
            ? <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-hl text-hl" />{Number(tutor.rating).toFixed(1).replace(".", ",")} <span className="font-medium text-muted-foreground">({reviews})</span></span>
            : <span className="text-muted-foreground">Nouveau</span>}
        </span>
        {tutor.hourly_rate != null && <span className="rounded-full bg-hl-soft px-3 py-1 text-sm font-bold text-ink-2">{Number(tutor.hourly_rate)} €/h</span>}
      </div>
    </Link>
  )
}

/* ─── 6. Pour les profs : simulateur de revenus ───────────────────────── */

function ForTutors() {
  const [rate, setRate] = useState(30)
  const [hours, setHours] = useState(6)
  const monthly = Math.round(rate * hours * 4.33 * (1 - PLATFORM_COMMISSION))

  return (
    <section id="devenir-prof" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-24">
      <div className="glass-ink reveal relative overflow-hidden rounded-[2rem] p-6 sm:p-12">
        <span aria-hidden className="blob" style={{ width: 380, height: 380, top: -120, right: -80, background: "hsl(233 90% 66%)", opacity: 0.35 }} />
        <div className="relative grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow !bg-white/10 !text-hl">Pour les profs</span>
            <h2 className="mt-4 text-[clamp(2rem,4.2vw,3rem)] leading-[1.05]">Enseigne à ton rythme.<br />Garde {Math.round((1 - PLATFORM_COMMISSION) * 100)} % de ce que tu factures.</h2>
            <ul className="mt-6 space-y-3 text-white/80">
              {[
                [Wallet, `Tu fixes ton tarif, entre ${MIN_HOURLY_RATE} et ${MAX_HOURLY_RATE} € de l'heure.`],
                [CalendarCheck, "Tu acceptes ou refuses chaque demande. Si tu annules, l'élève est remboursé."],
                [PenLine, "Visio, tableau blanc et rapport de séance sont fournis."],
                [ShieldCheck, "Les élèves paient d'avance en crédits : pas d'impayés."],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof Wallet
                return <li key={i} className="flex gap-3"><I className="mt-0.5 h-5 w-5 shrink-0 text-hl" /><span>{t as string}</span></li>
              })}
            </ul>
            <Button asChild variant="highlight" size="lg" className="mt-8"><Link to="/signup?role=tutor">Devenir prof <ArrowRight /></Link></Button>
          </div>
          <div className="rounded-3xl bg-white/[0.07] p-6 ring-1 ring-white/10 sm:p-8">
            <p className="font-display font-bold">Simule tes revenus</p>
            <div className="mt-6 space-y-7">
              <div>
                <div className="flex justify-between text-sm"><span className="text-white/70">Ton tarif</span><b className="tabular">{rate} €/h</b></div>
                <Slider className="mt-3 [&_[role=slider]]:border-hl [&_[role=slider]]:bg-hl [&>span:first-child>span]:bg-hl [&>span:first-child]:bg-white/15" min={MIN_HOURLY_RATE} max={80} step={1} value={[rate]} onValueChange={([v]) => setRate(v)} aria-label="Ton tarif horaire" />
              </div>
              <div>
                <div className="flex justify-between text-sm"><span className="text-white/70">Heures de cours par semaine</span><b className="tabular">{hours} h</b></div>
                <Slider className="mt-3 [&_[role=slider]]:border-hl [&_[role=slider]]:bg-hl [&>span:first-child>span]:bg-hl [&>span:first-child]:bg-white/15" min={1} max={30} step={1} value={[hours]} onValueChange={([v]) => setHours(v)} aria-label="Heures par semaine" />
              </div>
            </div>
            <div className="mt-8 rounded-2xl bg-hl p-5 text-ink-2">
              <p className="text-sm font-semibold opacity-75">Tu gagnerais environ</p>
              <p className="display text-5xl tabular">{monthly.toLocaleString("fr-FR")} €</p>
              <p className="text-sm font-semibold opacity-75">par mois, commission déduite</p>
            </div>
            <p className="mt-3 text-xs text-white/50">Estimation : tarif × heures × 4,33 semaines × {Math.round((1 - PLATFORM_COMMISSION) * 100)} %. Hors impôts et cotisations.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── 7. Packs de crédits ─────────────────────────────────────────────── */

function Packs() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-24">
      <SectionHead eyebrow="Crédits" title="Des packs, pas d'abonnement." sub="Les crédits n'expirent jamais. Plus le pack est gros, moins le crédit coûte cher." />
      <div className="mx-auto mt-4 grid max-w-4xl gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((p) => {
          const price = p.priceCents / 100
          const saving = Math.round((1 - price / p.credits / CREDIT_VALUE_EUR) * 100)
          return (
            <div key={p.credits} className={cn("glass reveal lift relative p-7 text-center", p.popular && "ring-2 ring-hl")}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-hl px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink-2">Le plus choisi</span>}
              <p className="display text-5xl text-ink-2">{p.credits}</p>
              <p className="font-display font-bold text-muted-foreground">crédits</p>
              <p className="display mt-5 text-3xl text-ink-2">{price} €</p>
              <p className="mt-1 h-5 text-sm font-semibold text-mint">{saving > 0 ? `${saving} % d'économie` : " "}</p>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
            </div>
          )
        })}
      </div>
      <div className="reveal mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold">Paiement par</span>
        {["WhatsApp", "virement", "Revolut"].map((m) => <span key={m} className="rounded-full bg-white/70 px-3 py-1 font-bold text-ink">{m}</span>)}
        <span>· crédits ajoutés dès réception, en général sous 24 h</span>
      </div>
    </section>
  )
}

/* ─── 8. FAQ ──────────────────────────────────────────────────────────── */

const FAQ = [
  ["Comment se passe un cours ?", "En visio, directement dans le navigateur : caméra, micro, partage d'écran et tableau blanc. La salle ouvre 15 minutes avant l'heure prévue. Rien à installer."],
  ["Comment je paie ?", `Tu achètes un pack de crédits (1 crédit = ${CREDIT_VALUE_EUR} €) par WhatsApp, virement ou Revolut. Les crédits sont débités à la réservation et n'expirent jamais.`],
  ["Et si je dois annuler ?", `Tant que le prof n'a pas confirmé, ou jusqu'à ${FREE_CANCEL_HOURS} h avant le cours, tu es remboursé intégralement. Si c'est le prof qui annule, tu es toujours remboursé.`],
  ["Quels niveaux ?", "Du collège au master : chaque prof indique ses matières et ses niveaux sur son profil."],
  ["Je suis prof, comment je suis payé ?", `Tu touches ${Math.round((1 - PLATFORM_COMMISSION) * 100)} % du prix de chaque cours terminé. Tu demandes un retrait depuis ton espace dès 20 €.`],
  ["Les avis sont-ils vrais ?", "Seul un élève qui a terminé un cours avec le prof peut laisser un avis, une fois par cours."],
]

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-5 pt-24">
      <SectionHead eyebrow="FAQ" title="Les questions qu'on nous pose." />
      <div className="mt-2 space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="glass reveal group px-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.08rem] font-extrabold text-ink-2">
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
      <div className="glass-tint reveal rounded-[2rem] px-6 py-14 text-center">
        <h2 className="text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.05]">Ton prochain cours <span className="hl-mark-anim">commence ici</span>.</h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Crée ton compte en une minute, trouve ton prof et réserve ton premier créneau.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/signup">Créer mon compte <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline"><a href="#faq"><MessageCircle /> J'ai une question</a></Button>
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

