import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AlertTriangle, CalendarCheck, Clock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateLesson } from "@/hooks/useData"
import { useUserCredits } from "@/hooks/useCredits"
import { FREE_CANCEL_HOURS, formatEur, friendlyError, lessonPriceEur } from "@/lib/credits"
import { parisDayLabel, parisTime } from "@/lib/agenda"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  tutorId: string
  tutorName: string
  subjects: string[]
  slot: Date | null
  duration: number
  defaultSubject?: string
}

/** Confirmer un créneau choisi dans l'agenda : le cours est confirmé tout de suite. */
export function SlotBookingDialog({ open, onOpenChange, tutorId, tutorName, subjects, slot, duration, defaultSubject }: Props) {
  const navigate = useNavigate()
  const createLesson = useCreateLesson()
  const { data: credits } = useUserCredits()
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")

  useEffect(() => {
    if (open) setSubject(defaultSubject && subjects.includes(defaultSubject) ? defaultSubject : subjects[0] ?? "")
  }, [open, defaultSubject, subjects])

  if (!slot) return null
  const price = lessonPriceEur(duration)
  const balance = credits?.balanceEur ?? 0
  const missing = Math.max(0, Math.round((price - balance) * 100) / 100)
  const end = new Date(slot.getTime() + duration * 60_000)

  const submit = async () => {
    if (!subject) { toast.error("Choisis la matière du cours"); return }
    try {
      await createLesson.mutateAsync({
        tutor_id: tutorId, subject, topic: topic.trim() || null,
        scheduled_at: slot.toISOString(), duration_minutes: duration,
      })
      toast.success(`Cours confirmé : ${parisDayLabel(slot, { weekday: "long", day: "numeric", month: "long" })} à ${parisTime(slot)}`)
      onOpenChange(false)
      navigate("/lessons")
    } catch (e) {
      toast.error(friendlyError(e, "Réservation impossible"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Réserver ce créneau</DialogTitle>
          <DialogDescription>Le cours est confirmé tout de suite : {tutorName} le voit dans son agenda.</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border-2 border-ink-2 bg-sun-soft p-4">
          <p className="text-sm font-semibold capitalize text-muted-foreground">{parisDayLabel(slot, { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-ink-2">{parisTime(slot)} – {parisTime(end)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2"><Clock className="h-4 w-4" />{duration} min avec {tutorName} · en visio</p>
        </div>

        <div className="space-y-2">
          <Label>Matière</Label>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s} type="button" onClick={() => setSubject(s)} aria-pressed={subject === s}
                className={cn("rounded-full border-2 border-ink-2 px-3 py-1.5 text-sm font-bold transition", subject === s ? "bg-peri text-white" : "bg-white hover:bg-peri-soft")}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="slot-topic">Sur quoi veux-tu travailler ? <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
          <Input id="slot-topic" value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="Ex : DM de dérivées pour jeudi" />
        </div>

        <div className={cn("rounded-xl border p-3 text-sm", missing > 0 ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/30")}>
          <div className="flex items-center justify-between font-semibold"><span>Prix du cours</span><span>{formatEur(price)}</span></div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>Ton solde</span><span>{formatEur(balance)}</span></div>
          {missing > 0 && (
            <p className="mt-2 text-xs text-destructive">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Il te manque {formatEur(missing)}.{" "}
              <Link to="/credits" className="font-semibold underline" onClick={() => onOpenChange(false)}>Recharger mon solde</Link>
            </p>
          )}
        </div>

        <Button size="lg" className="w-full" onClick={submit} disabled={createLesson.isPending || missing > 0 || !subject}>
          {createLesson.isPending ? "Réservation…" : `Confirmer pour ${formatEur(price)}`}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />Annulation gratuite jusqu'à {FREE_CANCEL_HOURS} h avant
        </p>
      </DialogContent>
    </Dialog>
  )
}
