import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarClock, Copy, Eye, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/brand/PageHeader"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useSaveAvailability, useTutorAvailability, type AvailabilityRange } from "@/hooks/useAgenda"
import { MIN_NOTICE_MINUTES, WEEKDAYS, mergeRanges, minutesToHHMM, weeklyHours } from "@/lib/agenda"
import { friendlyError } from "@/lib/credits"
import { cn } from "@/lib/utils"

const TIMES = Array.from({ length: 49 }, (_, i) => i * 30) // 00:00 → 24:00

const PRESETS: { label: string; ranges: AvailabilityRange[] }[] = [
  { label: "Soirs de semaine · 17 h–20 h", ranges: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: 1020, end: 1200 })) },
  { label: "Mercredi après-midi · 13 h–18 h", ranges: [{ weekday: 3, start: 780, end: 1080 }] },
  { label: "Week-end · 10 h–18 h", ranges: [6, 7].map((weekday) => ({ weekday, start: 600, end: 1080 })) },
  { label: "Soirées tardives · 21 h–23 h", ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start: 1260, end: 1380 })) },
]

function TimeSelect({ value, onChange, min = 0, max = 1440, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 rounded-xl border-2 border-ink-2 bg-white px-2 text-sm font-bold text-ink-2 focus:outline-none focus:ring-2 focus:ring-peri">
      {TIMES.filter((t) => t >= min && t <= max).map((t) => <option key={t} value={t}>{t === 1440 ? "24:00" : minutesToHHMM(t)}</option>)}
    </select>
  )
}

export default function TutorAvailability() {
  useDocumentTitle("Mes disponibilités")
  const { user } = useAuth()
  const { data: saved, isLoading } = useTutorAvailability(user?.id)
  const save = useSaveAvailability()
  const [ranges, setRanges] = useState<AvailabilityRange[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => { if (saved && !dirty) setRanges(saved) }, [saved, dirty])

  const update = (next: AvailabilityRange[]) => { setRanges(next); setDirty(true) }
  const byDay = useMemo(() => WEEKDAYS.map((_, i) => ranges.map((r, idx) => ({ ...r, idx })).filter((r) => r.weekday === i + 1)), [ranges])
  const hours = weeklyHours(mergeRanges(ranges))

  const addRange = (weekday: number) => {
    const last = byDay[weekday - 1].at(-1)
    const start = last ? Math.min(last.end + 60, 1380) : 1020
    update([...ranges, { weekday, start, end: Math.min(start + 120, 1440) }])
  }
  const setRange = (idx: number, patch: Partial<AvailabilityRange>) => {
    update(ranges.map((r, i) => {
      if (i !== idx) return r
      const n = { ...r, ...patch }
      if (n.end <= n.start) n.end = Math.min(n.start + 60, 1440)
      return n
    }))
  }
  const removeRange = (idx: number) => update(ranges.filter((_, i) => i !== idx))
  const copyToWeekdays = (weekday: number) => {
    const src = byDay[weekday - 1].map(({ start, end }) => ({ start, end }))
    const others = [1, 2, 3, 4, 5].filter((d) => d !== weekday)
    update([...ranges.filter((r) => !others.includes(r.weekday)), ...others.flatMap((d) => src.map((s) => ({ weekday: d, ...s })))])
    toast.success(`Copié sur les autres jours de semaine`)
  }
  const applyPreset = (p: AvailabilityRange[]) => update(mergeRanges([...ranges, ...p]))

  const onSave = async () => {
    try {
      const merged = mergeRanges(ranges)
      await save.mutateAsync(merged)
      setRanges(merged); setDirty(false)
      toast.success(merged.length ? "Agenda publié : les élèves peuvent réserver tes créneaux." : "Agenda vidé : plus aucune réservation possible.")
    } catch (e) {
      toast.error(friendlyError(e, "Enregistrement impossible"))
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader eyebrow="Ma vitrine" title="Mes disponibilités"
        subtitle={`Les élèves réservent directement ces créneaux : le cours est confirmé tout de suite, au moins ${MIN_NOTICE_MINUTES / 60} h avant. Heures de Paris.`}
        actions={user && <Button asChild variant="outline"><Link to={`/tutors/${user.id}#agenda`}><Eye /> Voir comme un élève</Link></Button>} />

      <div className="glass p-5">
        <p className="text-sm font-bold text-ink-2">Remplir vite</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p.ranges)}
              className="rounded-full border-2 border-ink-2 bg-white px-3.5 py-1.5 text-sm font-bold text-ink-2 transition hover:bg-sun">
              + {p.label}
            </button>
          ))}
          {ranges.length > 0 && (
            <button type="button" onClick={() => update([])} className="rounded-full px-3.5 py-1.5 text-sm font-bold text-destructive hover:bg-destructive/10">Tout effacer</button>
          )}
        </div>
      </div>

      <div className="glass divide-y-2 divide-ink/5">
        {isLoading ? <div className="h-72 animate-pulse" /> : WEEKDAYS.map((day, i) => {
          const list = byDay[i]
          return (
            <div key={day} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5">
              <div className="flex w-32 shrink-0 items-center gap-2 pt-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", list.length ? "bg-mint" : "bg-ink/15")} />
                <span className="font-bold text-ink-2">{day}</span>
              </div>
              <div className="flex-1 space-y-2">
                {list.length === 0 && <p className="pt-2 text-sm text-muted-foreground">Indisponible</p>}
                {list.map((r) => (
                  <div key={r.idx} className="flex flex-wrap items-center gap-2">
                    <TimeSelect label={`${day} début`} value={r.start} max={1410} onChange={(v) => setRange(r.idx, { start: v })} />
                    <span className="text-sm font-bold text-muted-foreground">→</span>
                    <TimeSelect label={`${day} fin`} value={r.end} min={r.start + 30} onChange={(v) => setRange(r.idx, { end: v })} />
                    <button type="button" onClick={() => removeRange(r.idx)} aria-label="Retirer cette plage" className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 sm:pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => addRange(i + 1)}><Plus /> Plage</Button>
                {i < 5 && list.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => copyToWeekdays(i + 1)} title="Copier sur les autres jours de semaine"><Copy /> <span className="hidden md:inline">Lun.–ven.</span></Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-3 z-30 rounded-2xl border-2 border-ink-2 bg-white/95 shadow-hard backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <CalendarClock className="h-4 w-4 text-peri" />
            {hours > 0 ? <>{String(hours).replace(".", ",")} h par semaine</> : "Aucun créneau ouvert"}
            {dirty && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-xs font-bold">non enregistré</span>}
          </p>
          <Button onClick={onSave} disabled={save.isPending || !dirty}><Save /> {save.isPending ? "Publication…" : "Publier mon agenda"}</Button>
        </div>
      </div>
    </div>
  )
}
