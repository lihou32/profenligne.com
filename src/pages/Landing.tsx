import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, CalendarCheck, Check, ChevronDown, MessageCircle, Zap,
  MonitorPlay, PenLine, Search, ShieldCheck, Star, TrendingUp, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Backdrop } from "@/components/brand/Backdrop"
import { PublicNav, SiteFooter } from "@/components/layout/PublicLayout"
import { useReveal } from "@/hooks/useReveal"
import { useTutors } from "@/hooks/useTutors"
import { useLiveStats } from "@/hooks/useLiveQueue"
import { SUBJECTS } from "@/lib/constants"
import {
  FREE_CANCEL_HOURS, LATE_END_HOUR, LATE_START_HOUR, LATE_SURCHARGE_EUR, LESSON_DURATIONS, MIN_LESSON_PRICE_EUR,
  MIN_WITHDRAWAL_EUR, PLATFORM_COMMISSION, TOPUP_PACKS, WITHDRAWAL_FEE_RATE, formatEur, tutorShareEur,
} from "@/lib/credits"
import { cn } from "@/lib/utils"
import { PLANS } from "@/lib/membership"

const NAV_LINKS = [
  { href: "#tarifs", label: "Tarifs" },
  { href: "#comment", label: "Comment ça marche" },
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
        <KeyFacts />
        <SubjectsStrip />
        <TwoWays />
        <HowItWorks />
        <TutorsShowcase />
        <Topups />
        <Plans />
        <ForTutors />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

/* ─── 1. Hero : ce que c'est, combien ça coûte, comment commencer ──────── */

const ROW_BG = ["bg-mint-soft", "bg-sky-soft", "bg-pink-soft", "bg-sun-soft", "bg-hl-soft", "bg-peri-soft"]

function Hero() {
  const { data: live } = useLiveStats()
  const online = live?.tutors_online ?? 0
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-16 [&>*]:min-w-0">
      <div className="reveal">
        <span className="eyebrow">🎓 Du collège au master · dès 20 minutes</span>
        <h1 className="mt-6 text-[clamp(2.8rem,6.6vw,5rem)]">
          Un prof en visio, <span className="hl-mark">dans la minute</span>.
        </h1>
        <p className="mt-6 max-w-[32em] text-[1.15rem] leading-relaxed text-ink-2/80 sm:text-[1.22rem]">
          Il est 23 h, ton DM est pour demain ? Choisis ta matière, clique sur <b className="text-ink-2">Rejoindre</b> : le premier prof libre te rejoint.
          Personne de libre ? Tu passes en <b className="text-ink-2">file d'attente</b>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="highlight" className="h-16 px-8 text-lg"><Link to="/rejoindre"><Zap className="fill-ink-2" /> Rejoindre un cours maintenant</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-16 px-6 text-base"><Link to="/tutors"><Search /> Réserver un créneau</Link></Button>
        </div>
        {online > 0 && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-ink-2 bg-white px-3.5 py-1.5 text-sm font-bold">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-mint" /> {online} prof{online > 1 ? "s" : ""} en ligne maintenant
          </p>
        )}
        <p className="mt-5 text-sm font-semibold text-ink-2/70">
          Tu es prof ? <Link to="/signup?role=tutor" className="font-bold text-ink underline underline-offset-4">Donne des cours ici <ArrowRight className="inline h-3.5 w-3.5" /></Link>
        </p>
      </div>

      <div id="prix" className="reveal relative">
        <div className="sticker overflow-hidden rounded-[1.75rem] bg-white">
          <div className="flex items-center justify-between border-b-2 border-ink-2 bg-peri px-6 py-4 text-white">
            <p className="font-display text-2xl font-extrabold">Les prix</p>
            <span className="rounded-full border-2 border-ink-2 bg-white px-3 py-0.5 text-xs font-extrabold text-ink-2">Même prix chez tous les profs</span>
          </div>
          <table className="w-full text-left">
            <thead className="sr-only"><tr><th>Durée</th><th>Prix</th></tr></thead>
            <tbody>
              {LESSON_DURATIONS.map((d, i) => (
                <tr key={d.value} className={cn("border-b-2 border-ink-2/10", ROW_BG[i])}>
                  <td className="px-6 py-3 text-[1.05rem] font-bold">{d.label}</td>
                  <td className="px-6 py-3 text-right font-display text-2xl font-extrabold tabular">{d.priceEur} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 border-t-2 border-ink-2 bg-sun px-6 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink-2 bg-white" aria-hidden><Zap className="h-4 w-4 fill-ink-2" /></span>
            <p className="text-[0.98rem] font-bold leading-snug">Cours en direct après {LATE_START_HOUR} h : <span className="whitespace-nowrap">+{LATE_SURCHARGE_EUR} €</span>, quelle que soit la durée.</p>
          </div>
        </div>
        <span aria-hidden className="sticker floaty absolute -right-3 -top-5 hidden rounded-2xl sm:block bg-hl px-3 py-1.5 font-display text-lg font-extrabold text-white" style={{ ["--r" as string]: "8deg" }}>Sans engagement</span>
      </div>
    </section>
  )
}

/* ─── 1 bis. L'essentiel en quatre cases ─────────────────────────────── */

const FACTS = [
  { e: "⚡", bg: "bg-sun-soft", t: "En cours dans la minute", d: "Tu cliques, le premier prof libre te rejoint. Sinon, file d'attente." },
  { e: "⏱️", bg: "bg-mint-soft", t: `Dès 20 min, ${MIN_LESSON_PRICE_EUR} €`, d: "Juste le temps de débloquer ton exercice. Même prix chez tous les profs." },
  { e: "↩️", bg: "bg-sky-soft", t: `Annulation gratuite ${FREE_CANCEL_HOURS} h avant`, d: "Et toujours remboursé si le prof annule." },
  { e: "🎁", bg: "bg-pink-soft", t: "Jusqu'à +25 € offerts", d: "Recharge ton solde : plus la recharge est grosse, plus on t'en offre." },
]

function KeyFacts() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16" aria-label="L'essentiel">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {FACTS.map((f, i) => (
          <div key={f.t} className={cn("sticker reveal rounded-2xl p-5", f.bg)} style={{ transitionDelay: `${i * 60}ms` }}>
            <span className="text-3xl" aria-hidden>{f.e}</span>
            <p className="mt-2 font-display text-[1.25rem] font-extrabold leading-tight">{f.t}</p>
            <p className="mt-1.5 text-[0.95rem] text-ink-2/75">{f.d}</p>
          </div>
        ))}
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
  { icon: Search, bg: "bg-hl-soft", title: "Choisis ta matière", text: "Et ta durée : 20 min pour un exercice, 1 h pour un chapitre. Tu vois le prix tout de suite." },
  { icon: Zap, bg: "bg-sky-soft", title: "Clique sur Rejoindre", text: "Le premier prof libre te rejoint. Sinon tu attends ton tour dans la file, ou tu réserves un créneau." },
  { icon: MonitorPlay, bg: "bg-mint-soft", title: "Cours en visio", text: "Caméra, partage d'écran et tableau blanc, directement dans le navigateur. Rien à installer." },
  { icon: TrendingUp, bg: "bg-sun-soft", title: "Progresse", text: "Rapport de séance, XP et certificats : tu vois ce que tu as travaillé." },
]

function HowItWorks() {
  return (
    <section id="comment" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="⚡ Comment ça marche" title={<>Trois clics, <span className="hl-mark">et tu es en cours</span>.</>} />
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

/* ─── 3 bis. Deux façons de prendre un cours ─────────────────────────── */

function TwoWays() {
  return (
    <section id="tarifs" className="mx-auto max-w-6xl scroll-mt-28 px-5 pt-28">
      <SectionHead eyebrow="💶 Tarifs" title={<>Deux façons d'avoir <span className="hl-mark">ton prof</span>.</>} sub="Le prix dépend seulement de la durée du cours. Il est débité de ton solde au moment où tu demandes le cours." />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <article className="sticker reveal flex flex-col rounded-[1.75rem] bg-sun-soft p-7">
          <span className="flex w-fit items-center gap-1.5 rounded-full border-2 border-ink-2 bg-white px-3 py-1 text-sm font-extrabold"><Zap className="h-4 w-4 fill-sun" /> Rejoindre maintenant</span>
          <h3 className="mt-4 text-[2rem]">Comme un Uber, mais pour tes cours</h3>
          <p className="mt-2 text-ink-2/75">Tu choisis ta matière et ta durée, tu cliques : le premier prof libre te rejoint en visio. Aucun prof dispo ? Tu passes en file d'attente et tu es connecté dès qu'un prof se libère.</p>
          <ul className="mt-5 space-y-2 font-semibold">
            <li className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0" />Dès 20 minutes, même grille de prix</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0" />Rien n'est débité tant qu'aucun prof ne t'a rejoint</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0" />De {LATE_START_HOUR} h à {LATE_END_HOUR} h : <b>+{LATE_SURCHARGE_EUR} €</b>, quelle que soit la durée</li>
          </ul>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[20, 60, 120].map((m) => {
              const d = LESSON_DURATIONS.find((x) => x.value === m)!
              return (
                <div key={m} className="rounded-xl border-2 border-ink-2 bg-white p-2.5">
                  <p className="text-xs font-bold text-ink-2/70">{d.label}</p>
                  <p className="font-display text-xl font-extrabold">{d.priceEur} €</p>
                  <p className="text-[11px] font-bold text-hl">{d.priceEur + LATE_SURCHARGE_EUR} € après {LATE_START_HOUR} h</p>
                </div>
              )
            })}
          </div>
          <Button asChild size="lg" variant="highlight" className="mt-7 w-fit"><Link to="/rejoindre"><Zap className="fill-ink-2" /> Rejoindre un cours</Link></Button>
        </article>

        <article className="sticker reveal flex flex-col rounded-[1.75rem] bg-peri-soft p-7">
          <span className="w-fit rounded-full border-2 border-ink-2 bg-white px-3 py-1 text-sm font-extrabold">📅 Sur réservation</span>
          <h3 className="mt-4 text-[2rem]">Le créneau qui t'arrange</h3>
          <p className="mt-2 text-ink-2/75">Tu choisis ton prof, ta date et ta durée. Le prof confirme, et tu reçois un rappel avant le cours.</p>
          <ul className="mt-5 space-y-2 font-semibold">
            <li className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0" />Aucun supplément, même le soir</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-5 w-5 shrink-0" />Annulation gratuite jusqu'à {FREE_CANCEL_HOURS} h avant</li>
          </ul>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {LESSON_DURATIONS.map((d) => (
              <div key={d.value} className="rounded-xl border-2 border-ink-2 bg-white p-2.5">
                <p className="text-xs font-bold text-ink-2/70">{d.label}</p>
                <p className="font-display text-xl font-extrabold">{d.priceEur} €</p>
              </div>
            ))}
          </div>
          <Button asChild size="lg" className="mt-7 w-fit"><Link to="/tutors">Réserver un prof <ArrowRight /></Link></Button>
        </article>
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
      <SectionHead eyebrow="👋 Les profs" title={<>Des profs <span className="hl-mark">en chair et en os</span>.</>} sub="Ils sont inscrits sur Ton Prof en Ligne. Clique pour voir leur profil, leurs matières et leurs avis." />
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

function Plans() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-28">
      <SectionHead eyebrow="👑 Abonnements" title={<>Facultatif, mais <span className="hl-mark">tu passes devant</span>.</>} sub="Sans engagement : tu paies 30 jours depuis ton solde, rien ne se renouvelle tout seul." />
      <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
        {PLANS.map((p) => (
          <div key={p.id} className={cn("sticker reveal lift relative rounded-[1.75rem] p-7", p.id === "bac" ? "bg-sun" : "bg-peri-soft")}>
            {p.id === "bac" && <span className="absolute -top-4 right-6 rotate-2 rounded-full border-2 border-ink-2 bg-hl px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">Spécial examens</span>}
            <p className="font-display text-2xl font-extrabold">{p.name}</p>
            <p className="mt-1 font-display text-[2.6rem] font-extrabold leading-none">{formatEur(p.priceEur)}<span className="text-base font-bold text-ink-2/60"> / 30 jours</span></p>
            <p className="mt-2 text-sm font-semibold text-ink-2/70">{p.tagline}</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {p.perks.map((perk) => <li key={perk} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />{perk}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="reveal mt-8 text-center"><Button asChild size="lg" variant="outline"><Link to="/abonnement">Voir les abonnements <ArrowRight /></Link></Button></div>
    </section>
  )
}

/* ─── 8. FAQ ──────────────────────────────────────────────────────────── */

const FAQ = [
  ["Comment se passe un cours ?", "En visio, directement dans le navigateur : caméra, micro, partage d'écran et tableau blanc. La salle ouvre 15 minutes avant l'heure prévue. Rien à installer."],
  ["Combien coûte un cours ?", `Le même prix chez tous les profs : ${LESSON_DURATIONS.map((d) => `${d.label} ${d.priceEur} €`).join(", ")}. Un cours en direct (sans réservation) coûte ${LATE_SURCHARGE_EUR} € de plus s'il commence entre ${LATE_START_HOUR} h et ${LATE_END_HOUR} h.`],
  ["C'est quoi « Rejoindre un cours » ?", "Tu choisis ta matière et ta durée (dès 20 min) et tu cliques : le premier prof en ligne te rejoint dans la minute. S'il n'y a personne de libre, tu passes en file d'attente et tu es connecté dès qu'un prof se libère (30 min maximum). Rien n'est débité tant qu'aucun prof ne t'a rejoint."],
  ["Comment je paie ?", "Tu recharges ton solde par WhatsApp, virement ou Revolut (à partir de 50 €, un bonus est offert). Le prix du cours est débité à la réservation, et ton solde n'expire jamais."],
  ["Et si je dois annuler ?", `Tant que le prof n'a pas confirmé, ou jusqu'à ${FREE_CANCEL_HOURS} h avant le cours, tu es remboursé intégralement. Si c'est le prof qui annule, tu es toujours remboursé.`],
  ["À quoi sert l'abonnement ?", "Il est facultatif. Plus (9,99 €) te fait passer devant dans la file « Rejoindre un cours », allonge l'annulation gratuite jusqu'à 2 h avant et donne accès aux offres membres. Bac (15,99 €) ajoute, pendant les semaines de révision, une question express gratuite par jour avec un prof de permanence, à toute heure."],
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
        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-white/90"><Check className="h-4 w-4" /> Sans engagement · paiement au cours</p>
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
