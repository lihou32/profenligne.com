import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { format, formatDistanceToNowStrict, isToday, isTomorrow } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowRight, CalendarDays, Clock, Coins, GraduationCap, Search, Sparkles, Star, Trophy, UserRound, Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useDashboardStats, useTutors } from "@/hooks/useData"
import { supabase } from "@/integrations/supabase/client"
import { isRoomOpen } from "@/lib/credits"
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog"
import { ActiveLessonBanner } from "@/components/lessons/ActiveLessonBanner"
import { StatTile } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"

const LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500]

function levelOf(xp: number) {
  let lvl = 0
  while (lvl < LEVELS.length - 1 && xp >= LEVELS[lvl + 1]) lvl++
  const floor = LEVELS[lvl], next = LEVELS[lvl + 1] ?? floor
  return { level: lvl + 1, pct: next > floor ? Math.round(((xp - floor) / (next - floor)) * 100) : 100, toNext: Math.max(0, next - xp) }
}

function when(iso: string) {
  const d = new Date(iso)
  const day = isToday(d) ? "Aujourd'hui" : isTomorrow(d) ? "Demain" : format(d, "EEEE d MMMM", { locale: fr })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${format(d, "HH'h'mm")}`
}

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: tutors } = useTutors()
  const { data: credits } = useUserCredits()
  const firstName = profile?.first_name || ""

  const { data: xp = 0 } = useQuery({
    queryKey: ["my-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_xp").select("total_xp").eq("user_id", user!.id).maybeSingle()
      return data?.total_xp ?? 0
    },
  })

  const upcoming = useMemo(() => [...(stats?.upcomingLessons ?? [])]
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at)), [stats])
  const active = upcoming.find((l) => l.status === "in_progress" || (l.status === "confirmed" && isRoomOpen(l.scheduled_at, l.duration_minutes)))
  const next = upcoming.find((l) => l.id !== active?.id && new Date(l.scheduled_at) > new Date())
  const lvl = levelOf(xp)

  // Profs suggérés : d'abord ceux qui enseignent les matières de l'élève, puis les mieux notés
  const wanted = (profile as { subjects?: string[] | null } | null)?.subjects ?? []
  const suggested = useMemo(() => (tutors ?? [])
    .filter((t) => t.profiles?.first_name)
    .map((t) => ({ t, match: (t.subjects ?? []).filter((s) => wanted.includes(s)).length }))
    .sort((a, b) => b.match - a.match || (Number(b.t.rating) || 0) - (Number(a.t.rating) || 0))
    .slice(0, 4).map((x) => x.t), [tutors, wanted])

  const hello = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir"

  return (
    <div className="space-y-6">
      <header className="reveal flex flex-col gap-4 pb-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
          <h1 className="mt-1 text-[clamp(1.7rem,3.2vw,2.4rem)] leading-tight">{hello}{firstName ? `, ${firstName}` : ""}</h1>
        </div>
        <div><BookLessonDialog /></div>
      </header>

      {active && <ActiveLessonBanner lesson={active} role="student" />}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {/* Prochain cours */}
        <section className="glass-tint reveal relative overflow-hidden p-6 sm:p-8">
          {next ? (
            <>
              <span className="eyebrow"><CalendarDays className="h-3.5 w-3.5" /> Prochain cours</span>
              <h2 className="mt-4 text-[1.9rem] leading-tight">{next.subject}</h2>
              {next.topic && <p className="mt-1 text-muted-foreground">{next.topic}</p>}
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-white/80 px-3 py-1.5 text-ink-2">{when(next.scheduled_at)}</span>
                <span className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-ink-2"><Clock className="h-3.5 w-3.5" />{next.duration_minutes} min</span>
                <span className={cn("rounded-full px-3 py-1.5", next.status === "confirmed" ? "bg-mint-soft text-success" : "bg-hl-soft text-hl")}>
                  {next.status === "confirmed" ? "Confirmé" : "En attente du prof"}
                </span>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Dans {formatDistanceToNowStrict(new Date(next.scheduled_at), { locale: fr })} · la salle ouvre 15 min avant.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild><Link to="/lessons">Voir mes cours <ArrowRight /></Link></Button>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">On commence ?</span>
              <h2 className="mt-4 text-[1.9rem] leading-tight">Aucun cours de prévu.</h2>
              <p className="mt-2 max-w-md text-muted-foreground">Choisis un prof, un créneau, et c'est parti. Tu vois le prix en crédits avant de confirmer.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild><Link to="/tutors"><Search /> Trouver un prof</Link></Button>
                {(credits?.balance ?? 0) === 0 && <Button asChild variant="outline"><Link to="/credits"><Coins /> Acheter des crédits</Link></Button>}
              </div>
            </>
          )}
        </section>

        {/* Niveau */}
        <section className="glass reveal flex items-center gap-5 p-6">
          <div className="ring-progress h-28 w-28 shrink-0" style={{ "--p": lvl.pct, "--c": "hsl(var(--hl))" } as React.CSSProperties}>
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Niveau</p>
              <p className="display text-3xl leading-none text-ink-2">{lvl.level}</p>
            </div>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-display font-medium text-ink-2"><Trophy className="h-4 w-4 text-gold" />{xp.toLocaleString("fr-FR")} XP</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lvl.toNext > 0 ? <>Encore <b className="text-ink-2">{lvl.toNext} XP</b> pour le niveau {lvl.level + 1}. Un cours terminé = 100 XP.</> : "Niveau maximum atteint, bravo !"}
            </p>
            <Link to="/certificates" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-peri hover:underline">Mes certificats <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        <StatTile label="Crédits" value={credits?.balance ?? 0} icon={Coins} tone="hl" hint={<Link to="/credits" className="font-semibold text-peri hover:underline">Recharger</Link>} />
        <StatTile label="Cours terminés" value={isLoading ? "…" : stats?.completedLessons ?? 0} icon={GraduationCap} tone="mint" />
        <StatTile label="Heures de cours" value={isLoading ? "…" : `${String(stats?.totalHours ?? "0").replace(".", ",")} h`} icon={Clock} tone="peri" />
        <StatTile label="À venir" value={upcoming.length} icon={CalendarDays} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        {/* À venir */}
        <section className="glass reveal p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Tes cours à venir</h2>
            <Link to="/lessons" className="text-sm font-bold text-peri hover:underline">Tout voir</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl bg-white/50 px-4 py-8 text-center text-sm text-muted-foreground">Rien pour l'instant. Tes réservations apparaîtront ici.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 4).map((l) => {
                const d = new Date(l.scheduled_at)
                const open = l.status === "in_progress" || (l.status === "confirmed" && isRoomOpen(l.scheduled_at, l.duration_minutes))
                return (
                  <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 transition hover:bg-white">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-peri-soft text-center leading-none [&>*]:min-w-0">
                      <span><b className="block font-display text-lg text-ink-2">{format(d, "d")}</b><span className="text-[10px] font-bold uppercase text-ink/60">{format(d, "MMM", { locale: fr })}</span></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink-2">{l.subject}{l.topic ? <span className="font-medium text-muted-foreground"> · {l.topic}</span> : null}</p>
                      <p className="text-sm text-muted-foreground">{format(d, "HH'h'mm")} · {l.duration_minutes} min</p>
                    </div>
                    {open ? (
                      <Button asChild size="sm"><Link to={`/room/${l.id}`}><Video /> Rejoindre</Link></Button>
                    ) : (
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", l.status === "confirmed" ? "bg-mint-soft text-success" : "bg-hl-soft text-hl")}>
                        {l.status === "confirmed" ? "Confirmé" : "En attente"}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Profs suggérés */}
        <section className="glass reveal p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg">Profs pour toi</h2>
            <Link to="/tutors" className="text-sm font-bold text-peri hover:underline">Explorer</Link>
          </div>
          {suggested.length === 0 ? (
            <p className="rounded-2xl bg-white/50 px-4 py-8 text-center text-sm text-muted-foreground">Les profs apparaîtront ici.</p>
          ) : (
            <ul className="space-y-2">
              {suggested.map((t) => {
                const p = t.profiles!
                return (
                  <li key={t.id}>
                    <Link to={`/tutors/${t.user_id}`} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-white/70">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                        : <span className="grid h-11 w-11 place-items-center rounded-xl bg-hl-soft font-display font-medium text-ink [&>*]:min-w-0">{(p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink-2">{p.first_name} {p.last_name?.[0] ? `${p.last_name[0]}.` : ""}</p>
                        <p className="truncate text-xs text-muted-foreground">{(t.subjects ?? []).slice(0, 2).join(" · ")}</p>
                      </div>
                      <span className="text-right text-sm">
                        <b className="block text-ink-2">{Number(t.hourly_rate)} €/h</b>
                        {(t.total_reviews ?? 0) > 0 && <span className="flex items-center justify-end gap-0.5 text-xs text-muted-foreground"><Star className="h-3 w-3 fill-gold text-gold" />{Number(t.rating).toFixed(1).replace(".", ",")}</span>}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {(!profile?.bio || !profile?.grade_level) && (
        <Link to="/profile" className="glass reveal lift flex items-center gap-4 p-4 sm:p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-peri-soft [&>*]:min-w-0"><UserRound className="h-5 w-5 text-ink" /></span>
          <div className="flex-1">
            <p className="font-bold text-ink-2">Complète ton profil</p>
            <p className="text-sm text-muted-foreground">Ton niveau et quelques mots sur toi aident ton prof à préparer le premier cours.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}
    </div>
  )
}
