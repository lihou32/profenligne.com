import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Loader2, X, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useCancelLiveRequest, useJoinLiveQueue, useLiveStats, useMyLiveRequest } from "@/hooks/useLiveQueue"
import { SUBJECTS } from "@/lib/constants"
import {
  LATE_START_HOUR, LATE_SURCHARGE_EUR, LESSON_DURATIONS, formatEur, friendlyError, lateSurchargeEur, lessonPriceEur,
} from "@/lib/credits"
import { cn } from "@/lib/utils"

const EMOJI: Record<string, string> = {
  "Mathématiques": "📐", "Français": "📚", "Anglais": "🇬🇧", "Physique-Chimie": "🧪", "SVT": "🌱",
  "Histoire-Géographie": "🗺️", "Philosophie": "💭", "Espagnol": "🇪🇸", "Allemand": "🇩🇪",
  "Informatique": "💻", "Économie": "📈", "SES": "📊",
}
const CHIP_BG = ["bg-peri-soft", "bg-hl-soft", "bg-sky-soft", "bg-mint-soft", "bg-pink-soft", "bg-sun-soft"]

/**
 * « Rejoindre un cours » : l'élève choisit sa matière et sa durée, clique, et se
 * retrouve en cours avec le premier prof libre — ou en file d'attente.
 */
export default function JoinLesson() {
  useDocumentTitle("Rejoindre un cours maintenant")
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: stats } = useLiveStats()
  const { data: credits } = useUserCredits()
  const { data: request, isLoading } = useMyLiveRequest()
  const join = useJoinLiveQueue()
  const cancel = useCancelLiveRequest()

  const [subject, setSubject] = useState("")
  const [duration, setDuration] = useState(20)
  const [topic, setTopic] = useState("")

  const surcharge = lateSurchargeEur(true)
  const price = lessonPriceEur(duration) + surcharge
  const balance = credits?.balanceEur ?? 0
  const missing = user ? Math.max(0, Math.round((price - balance) * 100) / 100) : 0

  // Mis en relation : direction la salle de cours
  useEffect(() => {
    if (request?.status === "matched" && request.lesson_id && Date.now() - new Date(request.created_at).getTime() < 3 * 3600_000) {
      navigate(`/room/${request.lesson_id}`)
    }
  }, [request, navigate])

  const waiting = request?.status === "waiting"
  const ended = request && (request.status === "expired" || request.status === "cancelled") &&
    Date.now() - new Date(request.created_at).getTime() < 3600_000

  const submit = async () => {
    if (!user) { navigate("/signup", { state: { from: "/rejoindre" } }); return }
    if (!subject) { toast.error("Choisis ta matière"); return }
    try {
      const r = await join.mutateAsync({ subject, topic: topic.trim(), duration })
      if (r?.status === "matched" && r.lesson_id) navigate(`/room/${r.lesson_id}`)
    } catch (e) {
      toast.error(friendlyError(e, "Impossible de rejoindre un cours"))
    }
  }

  const tutorsOnline = stats?.tutors_online ?? 0
  const durations = useMemo(() => LESSON_DURATIONS.filter((d) => d.value <= 60), [])

  if (user && isLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  if (waiting && request) return <Waiting request={request} onCancel={() => cancel.mutate(request.id)} cancelling={cancel.isPending} />

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10 pt-2">
      <header className="reveal text-center">
        <span className="eyebrow"><Zap className="h-3.5 w-3.5 fill-ink-2" /> En direct</span>
        <h1 className="mt-5 text-[clamp(2.4rem,6vw,4rem)]">Un prof, <span className="hl-mark">dans la minute</span>.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2/75">
          Choisis ta matière, clique sur « Rejoindre » : le premier prof libre te rejoint en visio.
          Personne de libre ? Tu passes en file d'attente.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-ink-2 bg-white px-3.5 py-1.5 text-sm font-bold">
          <span className={cn("h-2.5 w-2.5 rounded-full", tutorsOnline > 0 ? "animate-pulse bg-mint" : "bg-ink-2/30")} />
          {tutorsOnline > 0 ? `${tutorsOnline} prof${tutorsOnline > 1 ? "s" : ""} en ligne maintenant` : "Aucun prof en ligne pour l'instant : tu passeras en file d'attente"}
        </p>
      </header>

      {ended && (
        <div className="sticker-sm rounded-2xl bg-hl-soft p-4 text-sm font-semibold">
          {request!.status === "expired" ? "Aucun prof ne s'est libéré à temps pour ta dernière demande. Réessaie, ou réserve un créneau." : `Ta dernière demande a été annulée${request!.note ? ` : ${request!.note}` : "."}`}
        </div>
      )}

      <section className="glass reveal space-y-7 p-6 sm:p-8">
        <div>
          <p className="font-display text-xl font-extrabold">1. Ta matière</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUBJECTS.map((s, i) => (
              <button key={s} type="button" onClick={() => setSubject(s)} aria-pressed={subject === s}
                className={cn("rounded-full border-2 border-ink-2 px-3.5 py-1.5 text-sm font-bold transition",
                  subject === s ? "-translate-y-0.5 bg-ink-2 text-white shadow-[3px_3px_0_0_hsl(var(--peri))]" : cn(CHIP_BG[i % CHIP_BG.length], "hover:-translate-y-0.5"))}>
                {EMOJI[s] ?? "✏️"} {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-display text-xl font-extrabold">2. Combien de temps ?</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {durations.map((d) => (
              <button key={d.value} type="button" onClick={() => setDuration(d.value)} aria-pressed={duration === d.value}
                className={cn("relative rounded-2xl border-2 border-ink-2 p-3 text-left transition",
                  duration === d.value ? "bg-sun shadow-[3px_3px_0_0_hsl(var(--ink-2))]" : "bg-white hover:bg-sun-soft")}>
                {d.value === 20 && <span className="absolute -top-2.5 right-2 rounded-full border-2 border-ink-2 bg-hl px-2 text-[10px] font-extrabold uppercase text-white">Express</span>}
                <span className="block text-sm font-bold">{d.label}</span>
                <span className="font-display text-2xl font-extrabold">{d.priceEur + surcharge} €</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-ink-2/60">Besoin de plus d'1 h ? <Link to="/tutors" className="underline">Réserve un créneau</Link> (jusqu'à 2 h).</p>
        </div>

        <div>
          <label htmlFor="topic" className="font-display text-xl font-extrabold">3. Sur quoi tu bloques ? <span className="text-sm font-semibold text-ink-2/60">(facultatif)</span></label>
          <Input id="topic" className="mt-3" maxLength={200} placeholder="Ex. : DM de maths sur les dérivées, exercice 4" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink-2 bg-peri-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink-2/70">Prix du cours</p>
            <p className="font-display text-4xl font-extrabold">{formatEur(price)}</p>
            {surcharge > 0
              ? <p className="text-xs font-semibold text-ink-2/70">dont {formatEur(surcharge)} : cours en direct après {LATE_START_HOUR} h</p>
              : <p className="text-xs font-semibold text-ink-2/70">Après {LATE_START_HOUR} h : +{LATE_SURCHARGE_EUR} €. Débité seulement quand un prof te rejoint.</p>}
            {user && <p className="mt-1 text-xs font-semibold">Ton solde : {formatEur(balance)}</p>}
          </div>
          {missing > 0 ? (
            <Button asChild size="lg" variant="highlight"><Link to="/credits">Recharger ({formatEur(missing)} manquants)</Link></Button>
          ) : (
            <Button size="lg" className="h-14 px-7 text-base" onClick={submit} disabled={join.isPending}>
              {join.isPending ? <Loader2 className="animate-spin" /> : <Zap className="fill-white" />} {user ? "Rejoindre un cours" : "Créer un compte et rejoindre"}
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

function Waiting({ request, onCancel, cancelling }: { request: NonNullable<ReturnType<typeof useMyLiveRequest>["data"]>; onCancel: () => void; cancelling: boolean }) {
  const [seconds, setSeconds] = useState(() => Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000))
  useEffect(() => {
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000)), 1000)
    return () => clearInterval(t)
  }, [request.created_at])
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="relative mx-auto grid h-40 w-40 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-peri/25" />
        <span className="sticker relative grid h-32 w-32 place-items-center rounded-full bg-sun">
          <span className="font-display text-5xl font-extrabold">n° {request.queue_position}</span>
        </span>
      </div>
      <h1 className="mt-8 text-[2.4rem]">Tu es dans la file</h1>
      <p className="mt-3 text-lg text-ink-2/75">
        {request.subject} · {request.duration_minutes} min. Dès qu'un prof se libère, tu es envoyé en cours automatiquement.
        Garde cette page ouverte.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="sticker-sm rounded-2xl bg-mint-soft p-4"><p className="text-sm font-bold">Profs en ligne en {request.subject}</p><p className="font-display text-3xl font-extrabold">{request.tutors_online}</p></div>
        <div className="sticker-sm rounded-2xl bg-sky-soft p-4"><p className="text-sm font-bold">Temps d'attente</p><p className="font-display text-3xl font-extrabold tabular">{mm}:{ss}</p></div>
      </div>
      <p className="mt-4 text-sm text-ink-2/60">Rien n'est débité tant qu'aucun prof ne t'a rejoint. Ta demande expire au bout de 30 minutes.</p>
      <Button variant="outline" className="mt-6" onClick={onCancel} disabled={cancelling}><X /> Quitter la file</Button>
      <p className="mt-6 text-sm"><Link to="/tutors" className="font-bold underline">Ou réserve un créneau plus tard <ArrowRight className="inline h-3.5 w-3.5" /></Link></p>
    </div>
  )
}
