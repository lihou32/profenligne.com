import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { eachWeekOfInterval, endOfMonth, format, isWithinInterval, startOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { ArrowRight, BookOpen, CalendarDays, Check, Inbox, Star, Users, Video, Wallet, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"
import { useCancelLesson, useConfirmLesson, useTutorLessons, useTutorProfile, useTutorStats, useUpdateTutorStatus } from "@/hooks/useData"
import { supabase } from "@/integrations/supabase/client"
import { formatEur, friendlyError, isRoomOpen } from "@/lib/credits"
import { ActiveLessonBanner } from "@/components/lessons/ActiveLessonBanner"
import { StatTile } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"
import { useAcceptLiveRequest, useTutorLiveQueue } from "@/hooks/useLiveQueue"
import { useTutorAvailability } from "@/hooks/useAgenda"
import { weeklyHours } from "@/lib/agenda"

export default function TutorDashboard() {
  const { profile } = useAuth()
  const { data: stats, isLoading } = useTutorStats()
  const { data: lessons } = useTutorLessons()
  const { data: tutorProfile } = useTutorProfile()
  const updateStatus = useUpdateTutorStatus()
  const confirmLesson = useConfirmLesson()
  const cancelLesson = useCancelLesson()
  const isOnline = tutorProfile?.status === "online"
  const { data: agenda, isLoading: agendaLoading } = useTutorAvailability(profile?.user_id)

  const now = Date.now()
  const pending = (lessons ?? []).filter((l) => l.status === "pending" && new Date(l.scheduled_at).getTime() > now)
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
  const upcoming = (lessons ?? []).filter((l) => ["confirmed", "in_progress"].includes(l.status)
    && (l.status === "in_progress" || new Date(l.scheduled_at).getTime() + l.duration_minutes * 60_000 > now))
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
  const active = upcoming.find((l) => l.status === "in_progress" || isRoomOpen(l.scheduled_at, l.duration_minutes))

  const toggleStatus = () => {
    if (!tutorProfile) { toast.error("Complète d'abord ton profil de prof"); return }
    updateStatus.mutate(isOnline ? "offline" : "online", { onError: (e) => toast.error(friendlyError(e)) })
  }
  const accept = (id: string) => confirmLesson.mutate(id, {
    onSuccess: () => toast.success("Cours confirmé, l'élève est prévenu"),
    onError: (e) => toast.error(friendlyError(e)),
  })
  const refuse = (l: { id: string; tutor_id: string }) => cancelLesson.mutate(l, {
    onSuccess: () => toast.success("Demande refusée, l'élève est remboursé"),
    onError: (e) => toast.error(friendlyError(e)),
  })

  const { data: earningsRaw } = useQuery({
    queryKey: ["tutor-weekly-earnings", profile?.user_id],
    enabled: !!profile?.user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const d = new Date()
      const { data, error } = await supabase.from("tutor_earnings").select("amount, created_at")
        .eq("tutor_id", profile!.user_id).gte("created_at", startOfMonth(d).toISOString()).lte("created_at", endOfMonth(d).toISOString())
      if (error) throw error
      return data ?? []
    },
  })
  const chart = useMemo(() => {
    const d = new Date(), weeks = eachWeekOfInterval({ start: startOfMonth(d), end: endOfMonth(d) }, { weekStartsOn: 1 })
    return weeks.map((ws, i) => {
      const we = i < weeks.length - 1 ? weeks[i + 1] : endOfMonth(d)
      const total = (earningsRaw ?? []).filter((e) => isWithinInterval(new Date(e.created_at), { start: ws, end: we }))
        .reduce((s, e) => s + Number(e.amount), 0)
      return { week: `Sem. ${i + 1}`, revenus: Math.round(total) }
    })
  }, [earningsRaw])

  return (
    <div className="space-y-6">
      <header className="reveal flex flex-col gap-4 pb-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{format(new Date(), "EEEE d MMMM", { locale: fr })}</p>
          <h1 className="mt-1 text-[clamp(1.7rem,3.2vw,2.4rem)] leading-tight">Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""}</h1>
        </div>
        <label className="glass-strong flex cursor-pointer items-center gap-3 rounded-full py-2 pl-4 pr-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-mint" : "bg-ink-2/25")} />
          <span className="text-sm font-bold text-ink-2">{isOnline ? "En ligne : garde cette page ouverte" : tutorProfile?.status === "busy" ? "En cours" : "Hors ligne"}</span>
          <Switch checked={isOnline} onCheckedChange={toggleStatus} aria-label="Disponibilité" />
        </label>
      </header>

      {tutorProfile === null && (
        <div className="glass reveal flex flex-col gap-3 border-l-4 !border-l-hl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-ink-2">Complète ton profil de prof</p>
            <p className="text-sm text-muted-foreground">Ajoute tes matières et ton tarif pour apparaître dans la liste et recevoir des demandes.</p>
          </div>
          <Button asChild><Link to="/become-tutor">Compléter <ArrowRight /></Link></Button>
        </div>
      )}
      {tutorProfile?.is_suspended && (
        <div className="glass reveal border-l-4 !border-l-rose p-5 text-sm">
          <p className="font-bold text-rose">Profil suspendu</p>
          <p className="text-muted-foreground">Ton profil n'apparaît plus dans la liste des profs. Contacte le support pour en savoir plus.</p>
        </div>
      )}

      {active && <ActiveLessonBanner lesson={active} role="tutor" />}

      {tutorProfile && !tutorProfile.is_suspended && !agendaLoading && (
        (agenda ?? []).length === 0 ? (
          <div className="glass reveal flex flex-col gap-3 border-l-4 !border-l-sun p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink-2">Publie ton agenda pour recevoir des réservations</p>
              <p className="text-sm text-muted-foreground">Les élèves réservent tes créneaux libres en deux clics, et le cours est confirmé tout de suite. Sans agenda, ils doivent te proposer une date.</p>
            </div>
            <Button asChild><Link to="/disponibilites"><CalendarDays /> Ouvrir mes créneaux</Link></Button>
          </div>
        ) : (
          <Link to="/disponibilites" className="glass reveal flex items-center justify-between gap-3 p-4 text-sm hover:bg-white/70">
            <span className="flex items-center gap-2 font-semibold text-ink-2"><CalendarDays className="h-4 w-4 text-peri" />Ton agenda est ouvert : {String(weeklyHours(agenda ?? [])).replace(".", ",")} h de créneaux par semaine</span>
            <span className="flex items-center gap-1 font-bold text-peri">Modifier <ArrowRight className="h-4 w-4" /></span>
          </Link>
        )
      )}

      {tutorProfile && !tutorProfile.is_suspended && <LiveQueueCard online={isOnline} busy={tutorProfile.status === "busy"} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        <StatTile label="Gagné ce mois" value={isLoading ? "…" : formatEur(stats?.monthlyRevenue ?? 0)} icon={Wallet} tone="mint" hint={<Link to="/earnings" className="font-semibold text-peri hover:underline">Retirer</Link>} />
        <StatTile label="Cours ce mois" value={isLoading ? "…" : stats?.monthlyLessons ?? 0} icon={BookOpen} tone="peri" />
        <StatTile label="Note moyenne" value={stats?.avgRating ? Number(stats.avgRating).toFixed(1).replace(".", ",") : "—"} icon={Star} tone="hl" />
        <StatTile label="Élèves actifs" value={isLoading ? "…" : stats?.activeStudents ?? 0} icon={Users} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] [&>*]:min-w-0">
        {/* Demandes */}
        <section className="glass reveal p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg">Demandes {pending.length > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-hl px-1.5 text-xs text-white [&>*]:min-w-0">{pending.length}</span>}</h2>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-2xl bg-white/50 px-4 py-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-ink/25" />
              <p className="mt-2 text-sm text-muted-foreground">Aucune demande en attente.{!isOnline && " Passe en disponible pour en recevoir."}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {pending.slice(0, 5).map((l) => (
                <li key={l.id} className="rounded-2xl bg-white/70 p-3.5 ring-1 ring-ink/5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-peri-soft font-display text-sm font-medium text-ink [&>*]:min-w-0">
                      {(l.student_profile?.first_name?.[0] ?? "É").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink-2">{l.student_profile?.first_name ?? "Élève"} · {l.subject}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(l.scheduled_at), "EEE d MMM 'à' HH'h'mm", { locale: fr })} · {l.duration_minutes} min</p>
                    </div>
                  </div>
                  {l.topic && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">« {l.topic} »</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => accept(l.id)} disabled={confirmLesson.isPending}><Check /> Accepter</Button>
                    <Button size="sm" variant="outline" onClick={() => refuse(l)} disabled={cancelLesson.isPending}><X /> Refuser</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Revenus */}
        <section className="glass reveal p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg">Revenus du mois</h2>
            <Link to="/earnings" className="text-sm font-bold text-peri hover:underline">Détail</Link>
          </div>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ left: -18, right: 6, top: 10 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(245 25% 53%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(245 25% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(233 52% 20% / 0.08)" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(231 14% 42%)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} unit=" €" stroke="hsl(231 14% 42%)" allowDecimals={false} />
                <Tooltip cursor={{ stroke: "hsl(233 52% 20% / 0.15)" }} formatter={(v: number) => [formatEur(v), "Revenus"]}
                  contentStyle={{ borderRadius: 14, border: "1px solid hsl(228 35% 87%)", boxShadow: "0 10px 30px hsl(233 52% 20% / .12)" }} />
                <Area type="monotone" dataKey="revenus" stroke="hsl(245 25% 53%)" strokeWidth={3} fill="url(#rev)" dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Prochains cours */}
      <section className="glass reveal p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg">Prochains cours</h2>
          <Link to="/lessons" className="text-sm font-bold text-peri hover:underline">Tout voir</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl bg-white/50 px-4 py-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-ink/25" />
            <p className="mt-2 text-sm text-muted-foreground">Aucun cours confirmé pour l'instant.</p>
          </div>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2 [&>*]:min-w-0">
            {upcoming.slice(0, 6).map((l) => {
              const d = new Date(l.scheduled_at)
              const open = l.status === "in_progress" || isRoomOpen(l.scheduled_at, l.duration_minutes)
              return (
                <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-hl-soft text-center leading-none [&>*]:min-w-0">
                    <span><b className="block font-display text-lg text-ink-2">{format(d, "d")}</b><span className="text-[10px] font-bold uppercase text-ink/60">{format(d, "MMM", { locale: fr })}</span></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-2">{l.student_profile?.first_name ?? "Élève"} · {l.subject}</p>
                    <p className="text-sm text-muted-foreground">{format(d, "HH'h'mm")} · {l.duration_minutes} min</p>
                  </div>
                  {open
                    ? <Button asChild size="sm"><Link to={`/room/${l.id}`}><Video /> {l.status === "in_progress" ? "Rejoindre" : "Démarrer"}</Link></Button>
                    : <span className="rounded-full bg-mint-soft px-2.5 py-1 text-xs font-bold text-success">Confirmé</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/** File des élèves qui veulent un cours en direct maintenant. */
function LiveQueueCard({ online, busy }: { online: boolean; busy: boolean }) {
  const navigate = useNavigate()
  const { data: queue = [] } = useTutorLiveQueue()
  const accept = useAcceptLiveRequest()
  const take = async (id: string) => {
    try {
      const l = await accept.mutateAsync(id)
      if (l?.id) navigate(`/room/${l.id}`)
    } catch (e) {
      toast.error(friendlyError(e))
    }
  }
  return (
    <section className="glass reveal bg-sun-soft p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl"><Zap className="h-5 w-5 fill-sun" /> Élèves en attente d'un cours en direct
          {queue.length > 0 && <span className="grid h-7 min-w-7 place-items-center rounded-full border-2 border-ink-2 bg-hl px-1.5 text-sm text-white">{queue.length}</span>}
        </h2>
        <p className="text-sm font-semibold text-ink-2/70">
          {online ? "Tu es en ligne : le prochain élève de ta matière t'est envoyé automatiquement." : busy ? "Tu es en cours. Tu repasses en ligne à la fin." : "Passe « en ligne » pour recevoir les élèves automatiquement."}
        </p>
      </div>
      {queue.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-ink-2/30 bg-white/60 px-4 py-5 text-center text-sm text-ink-2/70">Personne dans la file pour l'instant.</p>
      ) : (
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
          {queue.map((r) => (
            <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl border-2 border-ink-2 p-3 ${r.is_express ? "bg-sun-soft" : "bg-white"}`}>
              <div className="min-w-0">
                <p className="truncate font-bold">{r.is_express && <span className="mr-1.5 rounded-full bg-hl px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">Question express</span>}{r.student_first_name} · {r.subject} · {r.duration_minutes} min</p>
                <p className="truncate text-xs text-ink-2/65">{r.topic || "Pas de précision"} · attend depuis {Math.max(1, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000))} min{r.mine ? "" : " · pas dans tes matières"}</p>
              </div>
              <Button size="sm" onClick={() => take(r.id)} disabled={accept.isPending || busy}>Prendre · {formatEur(r.payout_eur != null ? Number(r.payout_eur) : Number(r.price_eur) * 0.8)}</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
