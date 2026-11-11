import { useDeferredValue, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowRight, Search, SlidersHorizontal, Star, Users, X } from "lucide-react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { SEO } from "@/components/SEO"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTutors, type TutorWithProfile } from "@/hooks/useData"
import { SUBJECTS } from "@/lib/constants"
import { lessonCreditCost } from "@/lib/credits"
import { EmptyState } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"

type SortKey = "rating" | "price_asc" | "price_desc" | "reviews"
const SORTS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "Mieux notés" },
  { value: "reviews", label: "Plus d'avis" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
]

const STATUS: Record<string, { dot: string; label: string }> = {
  online: { dot: "bg-mint", label: "Disponible" },
  busy: { dot: "bg-hl", label: "Occupé" },
  offline: { dot: "bg-ink/25", label: "Hors ligne" },
}

const AVATAR_TONES = ["bg-peri-soft", "bg-hl-soft", "bg-mint-soft", "bg-rose-soft", "bg-sky-soft"]

export default function Tutors() {
  useDocumentTitle("Trouver un prof")
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const deferred = useDeferredValue(search)
  const subject = params.get("subject") ?? "all"
  const [maxPrice, setMaxPrice] = useState(150)
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState<SortKey>("rating")
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { data: tutors = [], isLoading } = useTutors()

  const setSubject = (s: string) => {
    const p = new URLSearchParams(params)
    if (s === "all") p.delete("subject"); else p.set("subject", s)
    setParams(p, { replace: true })
  }

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    const list = tutors.filter((t) => {
      const name = `${t.profiles?.first_name ?? ""} ${t.profiles?.last_name ?? ""}`.toLowerCase()
      if (q && !name.includes(q) && !(t.subjects ?? []).some((s) => s.toLowerCase().includes(q))) return false
      if (subject !== "all" && !(t.subjects ?? []).includes(subject)) return false
      if (t.hourly_rate && Number(t.hourly_rate) > maxPrice) return false
      if (minRating > 0 && (Number(t.rating) || 0) < minRating) return false
      if (onlineOnly && t.status !== "online") return false
      return true
    })
    const r = (t: TutorWithProfile) => Number(t.rating) || 0
    const p = (t: TutorWithProfile) => Number(t.hourly_rate) || 0
    return list.sort((a, b) =>
      sortBy === "rating" ? r(b) - r(a) || (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
        : sortBy === "reviews" ? (b.total_reviews ?? 0) - (a.total_reviews ?? 0)
        : sortBy === "price_asc" ? p(a) - p(b) : p(b) - p(a))
  }, [tutors, deferred, subject, maxPrice, minRating, onlineOnly, sortBy])

  // Matières proposées = celles réellement enseignées par les profs (sinon la liste de référence)
  const subjectChips = useMemo(() => {
    const found = [...new Set(tutors.flatMap((t) => t.subjects ?? []))]
    const order = (x: string) => { const i = SUBJECTS.indexOf(x); return i === -1 ? 99 : i }
    return found.length ? found.sort((x, y) => order(x) - order(y) || x.localeCompare(y, "fr")) : SUBJECTS
  }, [tutors])

  const activeFilters = (maxPrice < 150 ? 1 : 0) + (minRating > 0 ? 1 : 0) + (onlineOnly ? 1 : 0)
  const reset = () => { setSearch(""); setSubject("all"); setMaxPrice(150); setMinRating(0); setOnlineOnly(false) }

  return (
    <div className="space-y-6">
      <SEO title="Trouver un prof" description="Cours particuliers en visio : choisis ton prof par matière, niveau, tarif et avis, puis réserve un créneau." path="/tutors" />

      <header className="reveal pt-4 text-center">
        <span className="eyebrow">Les profs</span>
        <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02]">Trouve <span className="hl-mark">ton</span> prof.</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Compare les tarifs et les avis, puis réserve en quelques clics.</p>
      </header>

      {/* Recherche */}
      <div className="reveal mx-auto max-w-3xl">
        <div className="glass-strong flex items-center gap-2 rounded-full p-2 pl-5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Un prénom, une matière…" aria-label="Rechercher un prof"
            className="h-11 min-w-0 flex-1 bg-transparent text-[1.02rem] text-ink-2 outline-none placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch("")} aria-label="Effacer" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-ink/5 [&>*]:min-w-0"><X className="h-4 w-4" /></button>}
          <Button variant={showFilters || activeFilters ? "default" : "outline"} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal /> <span className="hidden sm:inline">Filtres</span>{activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-hl px-1 text-[11px] text-white [&>*]:min-w-0">{activeFilters}</span>}
          </Button>
        </div>

        {showFilters && (
          <div className="glass mt-3 grid gap-6 p-5 animate-[fadeup_.35s_ease] sm:grid-cols-3">
            <div>
              <div className="flex justify-between text-sm"><span className="font-semibold text-ink-2">Tarif max</span><b className="tabular text-ink-2">{maxPrice >= 150 ? "Tous" : `${maxPrice} €/h`}</b></div>
              <Slider className="mt-3" min={10} max={150} step={5} value={[maxPrice]} onValueChange={([v]) => setMaxPrice(v)} aria-label="Tarif maximum" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-2">Note minimum</p>
              <div className="mt-2 flex gap-1.5">
                {[0, 4, 4.5].map((r) => (
                  <button key={r} onClick={() => setMinRating(r)} className={cn("rounded-full px-3 py-1.5 text-sm font-bold transition", minRating === r ? "bg-primary text-white" : "bg-white/70 text-ink hover:bg-white")}>
                    {r === 0 ? "Toutes" : `${String(r).replace(".", ",")}+`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink-2">Trier</p>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-2 sm:col-span-3">
              <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="h-4 w-4 accent-[hsl(233_52%_20%)]" />
              Seulement les profs disponibles maintenant
            </label>
          </div>
        )}
      </div>

      {/* Matières */}
      <div className="reveal no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center">
        {["all", ...subjectChips].map((s) => (
          <button key={s} onClick={() => setSubject(s)}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold transition",
              subject === s ? "bg-primary text-white shadow-ink" : "bg-white/65 text-ink ring-1 ring-ink/5 hover:bg-white")}>
            {s === "all" ? "Toutes les matières" : s}
          </button>
        ))}
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        {isLoading ? "Chargement…" : `${filtered.length} prof${filtered.length > 1 ? "s" : ""}`}
        {subject !== "all" && <> en <span className="text-ink-2">{subject}</span></>}
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="glass h-[230px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun prof ne correspond"
          text="Élargis un peu ta recherche : une autre matière, un tarif plus haut ou toutes les notes."
          action={<Button variant="outline" onClick={reset}>Réinitialiser les filtres</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {filtered.map((t, i) => <TutorCard key={t.id} tutor={t} tone={AVATAR_TONES[i % AVATAR_TONES.length]} highlight={subject !== "all" ? subject : undefined} />)}
        </div>
      )}
    </div>
  )
}

function TutorCard({ tutor, tone, highlight }: { tutor: TutorWithProfile; tone: string; highlight?: string }) {
  const p = tutor.profiles
  const name = `${p?.first_name ?? "Prof"} ${p?.last_name?.[0] ? `${p.last_name[0]}.` : ""}`.trim()
  const initials = `${p?.first_name?.[0] ?? "P"}${p?.last_name?.[0] ?? ""}`.toUpperCase()
  const status = STATUS[tutor.status] ?? STATUS.offline
  const rate = Number(tutor.hourly_rate) || 0
  const reviews = tutor.total_reviews ?? 0
  const subjects = [...(tutor.subjects ?? [])].sort((a, b) => (a === highlight ? -1 : b === highlight ? 1 : 0))

  return (
    <Link to={`/tutors/${tutor.user_id}`} className="glass reveal lift group flex flex-col p-5">
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          {p?.avatar_url
            ? <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            : <span className={cn("grid h-16 w-16 place-items-center rounded-2xl font-display text-xl font-bold text-ink", tone)}>{initials}</span>}
          <span className={cn("absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white", status.dot)} title={status.label} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-ink-2">{name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm">
            {reviews > 0
              ? <><Star className="h-4 w-4 fill-gold text-gold" /><b className="text-ink-2">{Number(tutor.rating).toFixed(1).replace(".", ",")}</b><span className="text-muted-foreground">· {reviews} avis</span></>
              : <span className="rounded-full bg-peri-soft px-2 py-0.5 text-xs font-bold text-ink">Nouveau</span>}
          </p>
        </div>
      </div>

      {p?.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {subjects.slice(0, 3).map((s) => (
          <span key={s} className={cn("rounded-full px-2.5 py-1 text-xs font-bold", s === highlight ? "bg-hl text-white" : "bg-white/80 text-ink")}>{s}</span>
        ))}
        {subjects.length > 3 && <span className="rounded-full px-2 py-1 text-xs font-bold text-muted-foreground">+{subjects.length - 3}</span>}
      </div>

      <div className="mt-auto flex items-end justify-between pt-5">
        <div>
          <p className="display text-2xl leading-none text-ink-2">{rate ? `${rate} €` : "—"}<span className="text-sm font-semibold text-muted-foreground"> /h</span></p>
          {rate > 0 && <p className="mt-1 text-xs text-muted-foreground">soit {lessonCreditCost(rate, 60)} crédits l'heure</p>}
        </div>
        <span className="flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-bold text-white transition group-hover:gap-2">
          Voir <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
