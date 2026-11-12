import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Globe2 } from "lucide-react"
import { useOpenSlots } from "@/hooks/useAgenda"
import { AGENDA_DAYS, addDays, mondayOf, parisDate, parisDayLabel, parisTime, weekDays } from "@/lib/agenda"
import { cn } from "@/lib/utils"

interface Props {
  tutorId: string
  duration: number
  onPick: (slot: Date) => void
  /** Nombre de créneaux montrés par jour avant « + n » */
  perDay?: number
}

/** Agenda de la semaine façon Preply : une colonne par jour, un bouton par créneau libre. */
export function WeekSlotPicker({ tutorId, duration, onPick, perDay = 8 }: Props) {
  const thisMonday = mondayOf(parisDate())
  const lastMonday = mondayOf(addDays(parisDate(), AGENDA_DAYS - 1))
  const [monday, setMonday] = useState(thisMonday)
  const [expanded, setExpanded] = useState(false)
  const { data: slots = [], isLoading, isError } = useOpenSlots(tutorId, monday, 7, duration)

  const days = weekDays(monday)
  const today = parisDate()
  const byDay = useMemo(() => {
    const m = new Map<string, Date[]>()
    for (const s of slots) {
      const k = parisDate(s)
      m.set(k, [...(m.get(k) ?? []), s])
    }
    return m
  }, [slots])

  const go = (n: number) => { setMonday(addDays(monday, 7 * n)); setExpanded(false) }
  const range = `${parisDayLabel(days[0], { day: "numeric", month: "short" })} – ${parisDayLabel(days[6], { day: "numeric", month: "short", year: "numeric" })}`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border-2 border-ink-2">
            <button type="button" onClick={() => go(-1)} disabled={monday <= thisMonday} aria-label="Semaine précédente"
              className="grid h-9 w-9 place-items-center bg-white hover:bg-peri-soft disabled:opacity-30 disabled:hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(1)} disabled={monday >= lastMonday} aria-label="Semaine suivante"
              className="grid h-9 w-9 place-items-center border-l-2 border-ink-2 bg-white hover:bg-peri-soft disabled:opacity-30 disabled:hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="font-bold text-ink-2">{range}</p>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Globe2 className="h-3.5 w-3.5" />Heures de Paris</p>
      </div>

      {/* Téléphone : une ligne par jour qui a des créneaux */}
      <div className="mt-4 space-y-3 sm:hidden">
        {isLoading && <span className="block h-24 animate-pulse rounded-xl bg-ink/5" />}
        {!isLoading && days.filter((d) => (byDay.get(d) ?? []).length).map((d) => (
          <div key={d}>
            <p className={cn("text-sm font-extrabold first-letter:uppercase", d === today ? "text-peri" : "text-ink-2")}>
              {d === today ? "Aujourd'hui" : parisDayLabel(d, { weekday: "long", day: "numeric", month: "short" })}
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(byDay.get(d) ?? []).map((s) => (
                <button key={s.toISOString()} type="button" onClick={() => onPick(s)}
                  className="h-10 rounded-xl border-2 border-ink-2 bg-white text-sm font-bold text-ink-2 active:bg-sun">
                  {parisTime(s)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="no-scrollbar -mx-1 mt-4 hidden overflow-x-auto px-1 sm:block">
        <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
          {days.map((d) => {
            const list = byDay.get(d) ?? []
            const shown = expanded ? list : list.slice(0, perDay)
            const isToday = d === today
            const past = d < today
            return (
              <div key={d} className="min-w-0">
                <div className={cn("rounded-lg pb-2 text-center", list.length ? "border-t-4 border-peri" : "border-t-4 border-ink/10")}>
                  <p className={cn("pt-2 text-xs font-bold uppercase tracking-wide", isToday ? "text-peri" : "text-muted-foreground")}>
                    {parisDayLabel(d, { weekday: "short" })}
                  </p>
                  <p className={cn("text-lg font-extrabold", past ? "text-ink/30" : "text-ink-2")}>{parisDayLabel(d, { day: "numeric" })}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {isLoading
                    ? Array.from({ length: 3 }, (_, i) => <span key={i} className="h-8 animate-pulse rounded-lg bg-ink/5" />)
                    : shown.map((s) => (
                      <button key={s.toISOString()} type="button" onClick={() => onPick(s)}
                        className="h-8 rounded-lg text-sm font-bold text-ink-2 underline decoration-ink/25 underline-offset-4 transition hover:bg-sun hover:no-underline focus-visible:bg-sun">
                        {parisTime(s)}
                      </button>
                    ))}
                  {!isLoading && !expanded && list.length > perDay && (
                    <button type="button" onClick={() => setExpanded(true)} className="text-xs font-bold text-peri hover:underline">+{list.length - perDay}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!isLoading && slots.length === 0 && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-ink/15 bg-white/60 p-4 text-center text-sm text-muted-foreground">
          {isError ? "Impossible de charger l'agenda. Réessaie dans un instant." : "Aucun créneau libre cette semaine."}
          {!isError && monday < lastMonday && (
            <button type="button" onClick={() => go(1)} className="ml-2 font-bold text-peri hover:underline">Semaine suivante →</button>
          )}
        </div>
      )}
    </div>
  )
}
