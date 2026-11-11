import { useDeferredValue, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CalendarDays, Heart, Search, Star, Users, X, Zap } from "lucide-react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTutors, type TutorWithProfile } from "@/hooks/useData"
import { useNextSlots } from "@/hooks/useAgenda"
import { SUBJECTS } from "@/lib/constants"
import { MIN_LESSON_PRICE_EUR } from "@/lib/credits"
import { LEVELS, addDays, friendlySlot, isTutorLive, parisDate } from "@/lib/agenda"
import { EmptyState } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"

type SortKey = "reco" | "soon" | "rating" | "reviews"
const SORTS: { value: SortKey; label: string }[] = [
  { value: "reco", label: "Recommandés" },
  { value: "soon", label: "Disponibles au plus tôt" },
  { value: "rating", label: "Mieux notés" },
  { value: "reviews", label: "Plus d'avis" },
]
type When = "all" | "now" | "week"

const TILE_TONES = ["bg-peri-soft", "bg-hl-soft", "bg-mint-soft", "bg-sun-soft", "bg-sky-soft", "bg-pink-soft"]
const FAV_KEY = "pel:favs"
const readFavs = (): string[] => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]") } catch { return [] } }

export default function Tutors() {
  useDocumentTitle("Trouver un prof")
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const deferred = useDeferredValue(search)
  const subject = params.get("subject") ?? "all"
  const level = params.get("level") ?? "all"
  const [when, setWhen] = useState<When>("all")
  const [sortBy, setSortBy] = useState<SortKey>("reco")
  const [favs, setFavs] = useState<string[]>(readFavs)
  const [favOnly, setFavOnly] = useState(false)
  const { data: tutors = [], isLoading } = useTutors()
  const { data: nextSlots } = useNextSlots(60)

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v === "all") p.delete(k); else p.set(k, v)
    setParams(p, { replace: true })
  }
  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]
    setFavs(next)
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)) } catch { /* navigation privée */ }
  }

  const weekEnd = useMemo(() => new Date(`${addDays(parisDate(), 7)}T00:00:00`), [])
  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    const next = (t: TutorWithProfile) => nextSlots?.get(t.user_id)
    const list = tutors.filter((t) => {
      const text = `${t.profiles?.first_name ?? ""} ${t.profiles?.last_name ?? ""} ${t.headline ?? ""} ${(t.subjects ?? []).join(" ")}`.toLowerCase()
      if (q && !text.includes(q)) return false
      if (subject !== "all" && !(t.subjects ?? []).includes(subject)) return false
      if (level !== "all" && !(t.levels ?? []).includes(level)) return false
      if (when === "now" && !isTutorLive(t)) return false
      if (when === "week" && !(isTutorLive(t) || (next(t) && next(t)! < weekEnd))) return false
      if (favOnly && !favs.includes(t.user_id)) return false
      return true
    })
    const r = (t: TutorWithProfile) => Number(t.rating) || 0
    const n = (t: TutorWithProfile) => next(t)?.getTime() ?? Infinity
    const score = (t: TutorWithProfile) => (isTutorLive(t) ? 2 : 0) + (next(t) ? 1 : 0)
    return list.sort((a, b) => {
      if (sortBy === "rating") return r(b) - r(a) || (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
      if (sortBy === "reviews") return (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
      if (sortBy === "soon") return Number(isTutorLive(b)) - Number(isTutorLive(a)) || n(a) - n(b)
      return score(b) - score(a) || r(b) - r(a) || n(a) - n(b)
    })
  }, [tutors, nextSlots, deferred, subject, level, when, sortBy, favOnly, favs, weekEnd])

  const subjectChips = useMemo(() => {
    const found = [...new Set(tutors.flatMap((t) => t.subjects ?? []))]
    const order = (x: string) => { const i = SUBJECTS.indexOf(x); return i === -1 ? 99 : i }
    return found.length ? found.sort((x, y) => order(x) - order(y) || x.localeCompare(y, "fr")) : SUBJECTS
  }, [tutors])
  const liveCount = tutors.filter((t) => isTutorLive(t)).length

  const reset = () => { setSearch(""); setWhen("all"); setFavOnly(false); setParams(new URLSearchParams(), { replace: true }) }

  return (
    <div className="space-y-5">
      <SEO title="Trouver un prof" description="Cours particuliers en visio : choisis ton prof par matière et par niveau, regarde ses créneaux libres et réserve en deux clics." path="/tutors" />

      <header className="reveal pt-4">
        <h1 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.05]">
          {subject !== "all" ? <>Profs de <span className="hl-mark">{subject}</span></> : <>Trouve <span className="hl-mark">ton</span> prof</>}
        </h1>
        <p className="mt-2 text-muted-foreground">Même prix chez tous les profs, dès {MIN_LESSON_PRICE_EUR} € le cours. Regarde leurs créneaux libres et réserve en deux clics.</p>
      </header>

      {/* Barre de recherche + filtres principaux (comme Preply) */}
      <div className="reveal glass-strong grid gap-2 rounded-[1.5rem] p-2 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <label className="flex items-center gap-2 rounded-2xl bg-white px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Prénom, matière…" aria-label="Rechercher un prof"
            className="h-12 min-w-0 flex-1 bg-transparent text-ink-2 outline-none placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch("")} aria-label="Effacer"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </label>
        <Select value={subject} onValueChange={(v) => setParam("subject", v)}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label="Matière"><span className="mr-1 text-xs font-semibold text-muted-foreground">Matière</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {subjectChips.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => setParam("level", v)}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label="Niveau"><span className="mr-1 text-xs font-semibold text-muted-foreground">Niveau</span><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-12 rounded-2xl" aria-label="Trier"><span className="mr-1 text-xs font-semibold text-muted-foreground">Trier</span><SelectValue /></SelectTrigger>
          <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="reveal no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {([["all", "Tous les profs"], ["now", `⚡ En ligne maintenant${liveCount ? ` (${liveCount})` : ""}`], ["week", "Dispo cette semaine"]] as [When, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setWhen(v)} aria-pressed={when === v}
            className={cn("shrink-0 rounded-full border-2 border-ink-2 px-4 py-2 text-sm font-bold transition", when === v ? "bg-sun shadow-[2px_2px_0_0_hsl(var(--ink-2))]" : "bg-white hover:bg-peri-soft")}>
            {label}
          </button>
        ))}
        <button onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly}
          className={cn("flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink-2 px-4 py-2 text-sm font-bold transition", favOnly ? "bg-pink-soft shadow-[2px_2px_0_0_hsl(var(--ink-2))]" : "bg-white hover:bg-peri-soft")}>
          <Heart className={cn("h-4 w-4", favOnly && "fill-hl text-hl")} /> Mes favoris{favs.length ? ` (${favs.length})` : ""}
        </button>
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        {isLoading ? "Chargement…" : `${filtered.length} prof${filtered.length > 1 ? "s" : ""}`}
        {subject !== "all" && <> en <span className="text-ink-2">{subject}</span></>}
        {level !== "all" && <> · niveau <span className="text-ink-2">{level}</span></>}
      </p>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="glass h-[380px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun prof ne correspond"
          text={when === "now" ? "Aucun prof de cette matière n'est en ligne. Rejoins la file : le premier qui se connecte te prend." : "Élargis un peu ta recherche : une autre matière, un autre niveau ou toutes les disponibilités."}
          action={when === "now"
            ? <Button asChild variant="highlight"><Link to={`/rejoindre${subject !== "all" ? `?subject=${encodeURIComponent(subject)}` : ""}`}><Zap /> Rejoindre la file</Link></Button>
            : <Button variant="outline" onClick={reset}>Réinitialiser les filtres</Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {filtered.map((t, i) => (
            <TutorCard key={t.id} tutor={t} tone={TILE_TONES[i % TILE_TONES.length]} highlight={subject !== "all" ? subject : undefined}
              next={nextSlots?.get(t.user_id)} fav={favs.includes(t.user_id)} onFav={() => toggleFav(t.user_id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TutorCard({ tutor, tone, highlight, next, fav, onFav }: {
  tutor: TutorWithProfile; tone: string; highlight?: string; next?: Date; fav: boolean; onFav: () => void
}) {
  const p = tutor.profiles
  const name = p?.first_name ?? "Prof"
  const initials = `${p?.first_name?.[0] ?? "P"}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const live = isTutorLive(tutor)
  const reviews = tutor.total_reviews ?? 0
  const subjects = [...(tutor.subjects ?? [])].sort((a, b) => (a === highlight ? -1 : b === highlight ? 1 : 0))
  const pitch = tutor.headline || p?.bio
  const href = `/tutors/${tutor.user_id}${highlight ? `?subject=${encodeURIComponent(highlight)}` : ""}`

  return (
    <article className="reveal group relative flex flex-col">
      <Link to={href} className="relative block overflow-hidden rounded-[1.5rem] border-2 border-ink-2 transition group-hover:-translate-y-0.5 group-hover:shadow-hard">
        <div className={cn("aspect-[4/3] w-full", tone)}>
          {p?.avatar_url
            ? <img src={p.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <span className="grid h-full w-full place-items-center font-display text-6xl font-extrabold text-ink-2/80">{initials}</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-2/85 via-ink-2/40 to-transparent px-4 pb-3 pt-10 text-white">
          <p className="font-display text-2xl font-extrabold leading-none">{name}</p>
          <p className="mt-1 text-sm font-semibold text-white/85">{subjects.slice(0, 2).join(" · ") || "Soutien scolaire"} · en visio</p>
        </div>
        {live && <span className="absolute left-3 top-3 rounded-full border-2 border-ink-2 bg-mint px-2.5 py-0.5 text-xs font-extrabold text-ink-2">● En ligne</span>}
      </Link>
      <button type="button" onClick={onFav} aria-pressed={fav} aria-label={fav ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-ink-2 bg-white transition hover:scale-105">
        <Heart className={cn("h-4 w-4", fav ? "fill-hl text-hl" : "text-ink-2")} />
      </button>

      <Link to={href} className="flex flex-1 flex-col px-1 pt-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          {reviews > 0
            ? <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-gold text-gold" /><b className="text-ink-2">{Number(tutor.rating).toFixed(1).replace(".", ",")}</b><span className="text-muted-foreground">({reviews} avis)</span></span>
            : <span className="rounded-full bg-peri-soft px-2 py-0.5 text-xs font-bold text-ink">Nouveau</span>}
          {(tutor.levels ?? []).length > 0 && <span className="truncate text-xs font-semibold text-muted-foreground">{(tutor.levels ?? []).join(" · ")}</span>}
        </div>
        {pitch && <p className="mt-1.5 line-clamp-2 text-sm text-ink-2/75">{pitch}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm">
          <span className="font-bold text-ink-2">dès {MIN_LESSON_PRICE_EUR} €<span className="font-semibold text-muted-foreground"> · 20 min</span></span>
          {live
            ? <span className="flex items-center gap-1 font-bold text-success"><Zap className="h-4 w-4" />Dispo maintenant</span>
            : next
              ? <span className="flex items-center gap-1 font-semibold text-ink-2"><CalendarDays className="h-4 w-4 text-peri" />{friendlySlot(next)}</span>
              : <span className="text-xs font-semibold text-muted-foreground">Sur demande</span>}
        </div>
      </Link>
    </article>
  )
}
