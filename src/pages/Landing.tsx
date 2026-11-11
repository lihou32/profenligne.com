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

/** Une couleur et un emoji par matière : on reconnaît la matière d'un coup d'œil. */
const SUBJECT_STYLE: Record<string, { emoji: string; bg: string }> = {
  "Mathématiques": { emoji: "📐", bg: "bg-peri-soft" },
  "Français": { emoji: "📚", bg: "bg-hl-soft" },
  "Anglais": { emoji: "🇬🇧", bg: "bg-sky-soft" },
  "Physique-Chimie": { emoji: "🧪", bg: "bg-mint-soft" },
  "SVT": { emoji: "🌱", bg: "bg-mint-soft" },
  "Histoire-Géographie": { emoji: "🗺️", bg: "bg-sun-soft" },
  "Philosophie": { emoji: "💭", bg: "bg-pink-soft" },
  "Espagnol": { emoji: "🇪🇸", bg: "bg-hl-soft" },
  "Allemand": { emoji: "🇩🇪", bg: "bg-sun-soft" },
  "Informatique": { emoji: "💻", bg: "bg-sky-soft" },
  "Économie": { emoji: "📈", bg: "bg-peri-soft" },
  "SES": { emoji: "📊", bg: "bg-pink-soft" },
}
const subjectStyle = (s: string) => SUBJECT_STYLE[s] ?? { emoji: "✏️", bg: "bg-sun-soft" }

const AVATAR_BG = ["bg-peri-soft", "bg-hl-soft", "bg-mint-soft", "bg-sun-soft", "bg-sky-soft", "bg-pink-soft"]

export default function Landing() {
  useReveal()
  return (
    <div className="min-h-screen">
      <Backdrop variant="landing" />
      <PublicNav loggedIn={false} links={NAV_LINKS} />
      <main className="overflow-x-clip">
        <Hero />
        <SubjectsStrip />
        <HowItWorks />
        <Prices />
        <TutorsShowcase />
        <ForTutors />
        <Topups />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

/* ─── 1. Hero : gros titre + collage d'« autocollants » qui suit la souris ── */

function Hero() {
  const art = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const { data: tutors } = useTutors()
  const tutor = useMemo(() => (tutors ?? []).filter((t) => t.profiles?.first_name)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0], [tutors])

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
  const layer = (d: number) => ({ transform: `translate3d(${tilt.x * d}px, ${tilt.y * d}px, 0)`, transition: "transform .35s cubic-bezier(.2,.8,.2,1)" })

  const name = tutor ? `${tutor.profiles?.first_name ?? ""} ${tutor.profiles?.last_name?.[0] ? tutor.profiles.last_name[0] + "." : ""}`.trim() : null
  const initials = tutor ? `${tutor.profiles?.first_name?.[0] ?? ""}${tutor.profiles?.last_name?.[0] ?? ""}`.toUpperCase() : "CL"
  const reviews = tutor?.total_reviews ?? 0

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20 [&>*]:min-w-0">
      <div className="reveal">
        <span className="eyebrow">🎓 Du collège au master</span>
        <h1 className="mt-6 text-[clamp(2.9rem,7vw,5.2rem)]">
          Le bon prof,<br />pour <span className="hl-mark">chaque</span> élève.
        </h1>
        <p className="mt-6 max-w-[30em] text-[1.15rem] leading-relaxed text-ink-2/75 sm:text-[1.22rem]">
          Des cours particuliers en visio avec des profs choisis un par un.
          Un seul prix pour tous, dès {MIN_LESSON_PRICE_EUR} € le cours.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-14 px-7 text-base"><Link to="/tutors"><Search /> Trouver mon prof</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base"><Link to="/signup?role=tutor"><GraduationCap /> Je suis prof</Link></Button>
        </div>
        <ul className="mt-9 flex flex-wrap gap-2.5 text-sm font-bold text-ink-2">
          {[["bg-mint-soft", "✅", `Annulation gratuite ${FREE_CANCEL_HOURS} h avant`], ["bg-sky-soft", "💳", "Sans abonnement"], ["bg-pink-soft", "🖥️", "Rien à installer"]].map(([bg, e, t]) => (
            <li key={t} className={cn("sticker-sm rounded-full px-3.5 py-1.5", bg)}>{e} {t}</li>
          ))}
        </ul>
      </div>

      <div ref={art} className="relative h-[460px] sm:h-[520px]" aria-hidden="true">
        {/* Fond coloré */}
        <div className="absolute inset-x-4 inset-y-6 rotate-2 rounded-[2rem] border-2 border-ink-2 bg-peri sm:inset-x-8" />
        <div className="absolute inset-x-4 inset-y-6 -rotate-1 rounded-[2rem] border-2 border-ink-2 bg-sun-soft sm:inset-x-8" />

        {/* Carte prof */}
        <div style={layer(-16)} className="absolute left-0 top-2 z-20 w-[250px] sm:left-2">
          <div className="sticker floaty rounded-2xl bg-white p-4" style={{ ["--r" as string]: "-3deg" }}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink-2 bg-hl-soft font-display text-lg font-extrabold">{initials}</span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-extrabold leading-tight">{name ?? "Camille L."}</p>
                <p className="truncate text-xs font-semibold text-muted-foreground">{(tutor?.subjects ?? ["Maths", "Physique"]).slice(0, 2).join(" · ")}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-bold">
                {reviews > 0 ? <><Star className="h-4 w-4 fill-sun text-ink-2" />{Number(tutor!.rating).toFixed(1).replace(".", ",")}</> : "✨ Nouveau"}
              </span>
              <span className="rounded-full border-2 border-ink-2 bg-mint-soft px-2.5 py-0.5 text-xs font-bold">Dispo</span>
            </div>
            {!tutor && <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Exemple de profil</p>}
          </div>
        </div>

        {/* Réservation */}
        <div style={layer(22)} className="absolute right-0 top-[120px] z-30 w-[270px] sm:right-2">
          <div className="sticker rounded-2xl bg-white p-4 rotate-2">
            <p className="font-display text-lg font-extrabold">Mercredi · 18 h</p>
            <p className="text-sm font-semibold text-muted-foreground">Dérivées · 1 h</p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {["16:00", "17:00", "18:00", "19:00"].map((h) => (
                <span key={h} className={cn("rounded-lg border-2 border-ink-2 py-1.5 text-center text-xs font-bold", h === "18:00" ? "bg-peri text-white" : "bg-white")}>{h}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-ink-2 bg-sun px-3 py-2">
              <span className="text-sm font-bold">Cours d'1 h</span>
              <span className="font-display text-lg font-extrabold">{formatEur(lessonPriceEur(60))}</span>
            </div>
          </div>
        </div>

        {/* Tableau blanc */}
        <div style={layer(10)} className="absolute bottom-6 left-3 z-10 w-[290px] sm:left-6">
          <div className="sticker -rotate-2 rounded-2xl bg-ink-2 p-3">
            <div className="flex items-center justify-between px-1 pb-2 text-xs font-bold text-white">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-hl" /> En direct</span>
              <span>Tableau blanc</span>
            </div>
            <div className="rounded-xl bg-white p-3">
              <svg viewBox="0 0 260 84" className="h-[84px] w-full">
                <path d="M8 70 C 60 70, 70 16, 120 18 S 196 68, 252 14" fill="none" stroke="#6B4EFF" strokeWidth="4" strokeLinecap="round" />
                <path d="M8 78 H 252 M 18 6 V 80" stroke="#17162B" strokeOpacity=".25" strokeWidth="2" />
                <rect x="132" y="8" width="70" height="14" rx="4" fill="#FFC53D" />
                <text x="138" y="19" fontSize="12" fontWeight="800" fill="#17162B">f′(x) = 0</text>
              </svg>
            </div>
          </div>
        </div>

        {/* XP */}
        <div style={layer(-28)} className="absolute bottom-20 right-4 z-40">
          <div className="sticker floaty rounded-2xl bg-hl px-4 py-3 text-white" style={{ ["--r" as string]: "6deg" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider">Après le cours</p>
            <p className="font-display text-3xl font-extrabold leading-none">+100 XP</p>
          </div>
        </div>

        {/* Pastilles matières */}
        <span style={layer(30)} className="sticker-sm absolute right-16 top-0 z-30 rotate-6 rounded-full bg-mint-soft px-3 py-1 text-sm font-bold">🧪 Physique</span>
        <span style={layer(-24)} className="sticker-sm absolute bottom-0 left-1/2 z-30 -rotate-3 rounded-full bg-sky-soft px-3 py-1 text-sm font-bold">🇬🇧 Anglais</span>
      </div>
    </section>
  )
}

/* ─── 2. Bandeau des matières qui défile ─────────────────────────────── */

function SubjectsStrip() {
  const row = [...SUBJECTS, ...SUBJECTS]
  return (
    <section className="-rotate-1 border-y-2 border-ink-2 bg-sun py-4" aria-label="Matières proposées">
      <div className="overflow-hidden">
        <div className="flex w-max animate-[marquee_45s_linear_infinite] gap-3 hover:[animation-play-state:paused]">
          {row.map((s, i) => {
            const st = subjectStyle(s)
            return (
              <Link key={i} to={`/tutors?subject=${encodeURIComponent(s)}`}
                className={cn("sticker-sm rounded-full px-4 py-2 text-[15px] font-bold text-ink-2 transition hover:-translate-y-0.5", st.bg)}>
                <span className="mr-1.5">{st.emoji}</span>{s}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── 3. Comment ça marche : quatre cartes de couleur ─────────────────── */

const STEPS = [
  { icon: Search, bg: "bg-hl-soft", title: "Choisis ton prof", text: "Par matière et par niveau. Chaque prof a son profil, ses avis vérifiés et ses créneaux." },
  { icon: CalendarCheck, bg: "bg-sky-soft", title: "Réserve un créneau", text: `Tu vois le prix avant de confirmer. Annulation gratuite jusqu'à ${FREE_CANCEL_HOURS} h avant.` },
  { icon: MonitorPlay, bg: "bg-mint-soft", title: "Retrouve-le en visio", text: "Caméra, partage d'écran et tableau blanc, directement dans le navigateur." },
  { icon: TrendingUp, bg: "bg-sun-soft", title: "Progresse", text: "Rapport de séance, XP et certificats : tu vois ce que tu as travaillé." },
]

function HowItWorks() {
  return (
    <section id="comment" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="⚡ Comment ça marche" title={<>Quatre étapes, <span className="hl-mark">zéro</span> prise de tête.</>} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {STEPS.map((s, i) => (
          <article key={s.title} className={cn("sticker reveal lift relative flex flex-col rounded-[1.5rem] p-6", s.bg)} style={{ transitionDelay: `${i * 70}ms` }}>
            <span className="absolute -top-4 right-5 grid h-10 w-10 place-items-center rounded-full border-2 border-ink-2 bg-white font-display text-lg font-extrabold">{i + 1}</span>
            <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink-2 bg-white"><s.icon className="h-6 w-6" /></span>
            <h3 className="mt-5 text-[1.5rem]">{s.title}</h3>
            <p className="mt-2 text-[0.98rem] text-ink-2/75">{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ─── 4. Prix : une grille unique, à cliquer ─────────────────────────── */

const DURATION_BG = ["bg-mint-soft", "bg-sky-soft", "bg-pink-soft", "bg-sun", "bg-hl-soft", "bg-peri-soft"]

function Prices() {
  const [duration, setDuration] = useState(60)
  const price = lessonPriceEur(duration)
  const hourly = Math.round(price / duration * 60 * 100) / 100

  return (
    <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="💶 Tarifs" title={<>Un prix clair, <span className="hl-mark">le même</span> pour tous.</>} sub="Le prix dépend seulement de la durée du cours, quel que soit le prof. Clique pour voir." />
      <div className="reveal grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LESSON_DURATIONS.map((d, i) => (
            <button key={d.value} type="button" onClick={() => setDuration(d.value)} aria-pressed={duration === d.value}
              className={cn("rounded-2xl border-2 border-ink-2 p-4 text-left transition-all duration-150", DURATION_BG[i],
                duration === d.value ? "-translate-x-0.5 -translate-y-0.5 shadow-[5px_5px_0_0_hsl(var(--ink-2))]" : "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--ink-2))]")}>
              <span className="block text-sm font-bold text-ink-2/70">{d.label}</span>
              <span className="font-display text-[2rem] font-extrabold leading-tight">{d.priceEur} €</span>
            </button>
          ))}
        </div>
        <div className="sticker flex flex-col justify-center rounded-[1.75rem] bg-peri p-8 text-center text-white">
          <p className="text-sm font-bold uppercase tracking-wider text-white/80">Ce cours te coûte</p>
          <p className="mt-2 font-display text-[4rem] font-extrabold leading-none tabular">{formatEur(price)}</p>
          <p className="mx-auto mt-4 max-w-xs text-white/85">soit {formatEur(hourly)} de l'heure. Plus le cours est long, moins l'heure coûte cher.</p>
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
    <section id="profs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="👋 Les profs" title={<>Des profs <span className="hl-mark">en chair et en os</span>.</>} sub="Ils sont inscrits sur Prof en Ligne. Clique pour voir leur profil, leurs matières et leurs avis." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
        {shown.map((t, i) => <TutorMiniCard key={t.id} tutor={t} bg={AVATAR_BG[i % AVATAR_BG.length]} />)}
      </div>
      <div className="reveal mt-10 text-center">
        <Button asChild variant="outline" size="lg"><Link to="/tutors">Voir tous les profs <ArrowRight /></Link></Button>
      </div>
    </section>
  )
}

function TutorMiniCard({ tutor, bg }: { tutor: NonNullable<ReturnType<typeof useTutors>["data"]>[number]; bg: string }) {
  const p = tutor.profiles
  const name = `${p?.first_name ?? ""} ${p?.last_name?.[0] ? p.last_name[0] + "." : ""}`.trim()
  const initials = `${p?.first_name?.[0] ?? ""}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const reviews = tutor.total_reviews ?? 0
  return (
    <Link to={`/tutors/${tutor.user_id}`} className="sticker reveal lift group block rounded-[1.5rem] bg-white p-5">
      <div className="flex items-center gap-3.5">
        {p?.avatar_url
          ? <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-2xl border-2 border-ink-2 object-cover" />
          : <span className={cn("grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink-2 font-display text-xl font-extrabold", bg)}>{initials}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-extrabold">{name}</p>
          <p className="flex items-center gap-1 text-sm font-bold">
            {reviews > 0
              ? <><Star className="h-4 w-4 fill-sun text-ink-2" />{Number(tutor.rating).toFixed(1).replace(".", ",")} <span className="font-semibold text-muted-foreground">· {reviews} avis</span></>
              : <span className="text-muted-foreground">✨ Nouveau</span>}
          </p>
        </div>
        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
      </div>
      {p?.bio && <p className="mt-3 line-clamp-2 text-sm text-ink-2/70">{p.bio}</p>}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(tutor.subjects ?? []).slice(0, 3).map((s) => (
          <span key={s} className={cn("rounded-full border-[1.5px] border-ink-2 px-2.5 py-0.5 text-xs font-bold", subjectStyle(s).bg)}>{subjectStyle(s).emoji} {s}</span>
        ))}
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
    <section id="devenir-prof" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <div className="sticker reveal relative overflow-hidden rounded-[2rem] bg-ink-2 p-6 text-white sm:p-12">
        <div className="relative grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <span className="eyebrow !bg-hl !text-white">🧑‍🏫 Pour les profs</span>
            <h2 className="mt-5 text-[clamp(2.1rem,4.4vw,3.4rem)] text-white">Enseigne à ton rythme. Garde <span className="text-sun">{Math.round((1 - PLATFORM_COMMISSION) * 100)} %</span> du prix.</h2>
            <ul className="mt-7 space-y-3.5 text-white/90">
              {[
                [Wallet, `Prix unique pour tous : tu touches ${formatEur(perHour)} par heure de cours.`],
                [CalendarCheck, "Tu acceptes ou refuses chaque demande. Si tu annules, l'élève est remboursé."],
                [PenLine, "Visio, tableau blanc et rapport de séance sont fournis."],
                [ShieldCheck, "Les élèves paient d'avance avec leur solde : pas d'impayés."],
              ].map(([Icon, t], i) => {
                const I = Icon as typeof Wallet
                return <li key={i} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10"><I className="h-4 w-4 text-sun" /></span><span className="pt-1">{t as string}</span></li>
              })}
            </ul>
            <Button asChild variant="highlight" size="lg" className="mt-9 h-14 px-7 text-base"><Link to="/signup?role=tutor">Devenir prof <ArrowRight /></Link></Button>
          </div>
          <div className="rounded-[1.5rem] border-2 border-white/20 bg-white/[0.06] p-6 sm:p-8">
            <p className="font-display text-xl font-extrabold">Simule tes revenus</p>
            <div className="mt-7">
              <div className="flex justify-between text-sm"><span className="font-semibold text-white/75">Heures de cours par semaine</span><b className="tabular">{hours} h</b></div>
              <Slider className="mt-4 [&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-2 [&_[role=slider]]:border-ink-2 [&_[role=slider]]:bg-sun [&>span:first-child>span]:bg-sun [&>span:first-child]:h-3 [&>span:first-child]:bg-white/20" min={1} max={30} step={1} value={[hours]} onValueChange={([v]) => setHours(v)} aria-label="Heures par semaine" />
            </div>
            <div className="sticker mt-8 rotate-1 rounded-2xl bg-sun p-6 text-ink-2">
              <p className="text-sm font-bold">Tu gagnerais environ</p>
              <p className="font-display text-[3.4rem] font-extrabold leading-none tabular">{monthly.toLocaleString("fr-FR")} €</p>
              <p className="text-sm font-bold">par mois, commission déduite</p>
            </div>
            <p className="mt-4 text-xs text-white/65">Estimation : {formatEur(perHour)} × heures × 4,33 semaines. Avant les {Math.round(WITHDRAWAL_FEE_RATE * 100)} % de frais de retrait, hors impôts et cotisations.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── 7. Recharges du solde ──────────────────────────────────────────── */

const TOPUP_BG = ["bg-mint-soft", "bg-sky-soft", "bg-peri", "bg-hl-soft"]

function Topups() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-28">
      <SectionHead eyebrow="🎁 Ton solde" title={<>Recharge, et on t'en <span className="hl-mark">offre plus</span>.</>} sub="Tu paies tes cours avec ton solde, qui n'expire jamais. Plus la recharge est grosse, plus le bonus est grand." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {TOPUP_PACKS.map((p, i) => {
          const dark = TOPUP_BG[i] === "bg-peri"
          return (
            <div key={p.amountEur} className={cn("sticker reveal lift relative rounded-[1.5rem] p-6 pt-10 text-center", TOPUP_BG[i], dark && "text-white")}>
              {p.recommended && <span className="absolute -top-4 left-1/2 -translate-x-1/2 -rotate-2 rounded-full border-2 border-ink-2 bg-sun px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink-2">⭐ Recommandé</span>}
              <p className={cn("text-sm font-bold", dark ? "text-white/80" : "text-ink-2/70")}>Tu paies</p>
              <p className="font-display text-[3.2rem] font-extrabold leading-none">{p.amountEur} €</p>
              <span className="mt-4 inline-block rotate-[-3deg] rounded-full border-2 border-ink-2 bg-white px-3 py-1 text-sm font-extrabold text-ink-2">+{formatEur(p.bonusEur)} offerts</span>
              <p className={cn("mt-3 text-sm font-semibold", dark ? "text-white/85" : "text-ink-2/70")}>{formatEur(p.amountEur + p.bonusEur)} sur ton solde</p>
            </div>
          )
        })}
      </div>
      <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-ink-2/70">
        <span>Paiement par</span>
        {[["💬", "WhatsApp"], ["🏦", "Virement"], ["⚡", "Revolut"]].map(([e, m]) => <span key={m} className="sticker-sm rounded-full bg-white px-3 py-1 font-bold text-ink-2">{e} {m}</span>)}
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
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="🤔 FAQ" title="Les questions qu'on nous pose." />
      <div className="space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="reveal group rounded-2xl border-2 border-ink-2 bg-white px-6 transition open:bg-sun-soft open:shadow-[4px_4px_0_0_hsl(var(--ink-2))] [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.15rem] font-bold">
              {q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink-2 bg-white transition-transform group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span>
            </summary>
            <p className="pb-5 text-ink-2/75">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <div className="sticker reveal relative overflow-hidden rounded-[2rem] bg-hl px-6 py-16 text-center text-white">
        <span aria-hidden className="absolute -left-6 top-6 -rotate-12 text-6xl">📐</span>
        <span aria-hidden className="absolute -right-4 bottom-4 rotate-12 text-6xl">🎓</span>
        <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] text-white">Prêt à progresser ?</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">Crée ton compte en une minute, trouve ton prof et réserve ton premier cours.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="highlight" className="h-14 px-7 text-base"><Link to="/signup">Créer mon compte <ArrowRight /></Link></Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base"><a href="#faq"><MessageCircle /> J'ai une question</a></Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white/90"><Check className="h-4 w-4" /> Sans abonnement · paiement au cours</p>
      </div>
    </section>
  )
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="reveal mx-auto mb-12 max-w-3xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-5 text-[clamp(2.2rem,5vw,3.6rem)]">{title}</h2>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-[1.1rem] text-ink-2/70">{sub}</p>}
    </div>
  )
}
