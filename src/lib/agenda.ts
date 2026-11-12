// Agenda, présence et niveaux — mêmes règles que la base (migration 0600).

/** Niveaux enseignés (liste fermée, vérifiée par la base). */
export const LEVELS = ["Primaire", "Collège", "Lycée", "Supérieur", "Adulte"] as const
export type Level = (typeof LEVELS)[number]

/** Sans signal depuis 3 min, un prof n'est plus « en ligne ». */
export const PRESENCE_TIMEOUT_MS = 180_000
/** Un créneau de l'agenda se réserve au moins 1 h avant. */
export const MIN_NOTICE_MINUTES = 60
/** L'agenda se publie par tranches de 30 min. */
export const SLOT_STEP_MINUTES = 30
/** Créneaux visibles sur 4 semaines. */
export const AGENDA_DAYS = 28

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const
export const WEEKDAYS_SHORT = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."] as const

const TZ = "Europe/Paris"

/** Un prof est vraiment en ligne : statut « en ligne » ET signal récent. */
export function isTutorLive(t: { status?: string | null; last_seen_at?: string | null }, now = Date.now()): boolean {
  if (t.status !== "online" || !t.last_seen_at) return false
  return now - new Date(t.last_seen_at).getTime() < PRESENCE_TIMEOUT_MS
}

/** 1020 → "17:00" */
export function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/** "17:00" → 1020 ; "24:00" → 1440 */
export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Date (AAAA-MM-JJ) de Paris pour un instant donné. */
export function parisDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
export function isoWeekday(ymd: string): number {
  const d = new Date(`${ymd}T12:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

/** AAAA-MM-JJ + n jours. */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lundi de la semaine (heure de Paris) qui contient la date. */
export function mondayOf(ymd: string): string {
  return addDays(ymd, 1 - isoWeekday(ymd))
}

/** Les 7 jours d'une semaine qui commence au lundi donné. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** "17:30" (heure de Paris) d'un instant. */
export function parisTime(at: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(at)
}

/** "lun. 17 nov." (heure de Paris) */
export function parisDayLabel(at: Date | string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const d = typeof at === "string" ? new Date(`${at}T12:00:00Z`) : at
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, ...opts }).format(d)
}

/** « aujourd'hui 18:00 », « demain 9:30 », « jeu. 20 nov. 18:00 » */
export function friendlySlot(at: Date, now = new Date()): string {
  const day = parisDate(at)
  const today = parisDate(now)
  const time = parisTime(at)
  if (day === today) return `aujourd'hui ${time}`
  if (day === addDays(today, 1)) return `demain ${time}`
  return `${parisDayLabel(at)} ${time}`
}

/** Nombre d'heures par semaine d'un agenda. */
export function weeklyHours(ranges: { start: number; end: number }[]): number {
  return ranges.reduce((s, r) => s + (r.end - r.start), 0) / 60
}

/** Fusionne les plages d'un même jour qui se chevauchent ou se touchent (comme la base). */
export function mergeRanges<T extends { weekday: number; start: number; end: number }>(ranges: T[]): { weekday: number; start: number; end: number }[] {
  const out: { weekday: number; start: number; end: number }[] = []
  const sorted = [...ranges].filter((r) => r.end > r.start).sort((a, b) => a.weekday - b.weekday || a.start - b.start)
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && last.weekday === r.weekday && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push({ weekday: r.weekday, start: r.start, end: r.end })
  }
  return out
}
