import { describe, expect, it } from "vitest"
import {
  addDays, friendlySlot, hhmmToMinutes, isTutorLive, isoWeekday, mergeRanges, minutesToHHMM,
  mondayOf, parisDate, parisTime, weekDays, weeklyHours,
} from "@/lib/agenda"

describe("agenda", () => {
  it("convertit les heures", () => {
    expect(minutesToHHMM(1020)).toBe("17:00")
    expect(minutesToHHMM(570)).toBe("09:30")
    expect(hhmmToMinutes("17:30")).toBe(1050)
    expect(hhmmToMinutes("24:00")).toBe(1440)
  })

  it("calcule les semaines (lundi → dimanche)", () => {
    expect(isoWeekday("2026-11-16")).toBe(1) // lundi
    expect(isoWeekday("2026-11-22")).toBe(7) // dimanche
    expect(mondayOf("2026-11-22")).toBe("2026-11-16")
    expect(mondayOf("2026-11-16")).toBe("2026-11-16")
    expect(weekDays("2026-11-16")).toHaveLength(7)
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("affiche l'heure de Paris", () => {
    const at = new Date("2026-11-16T17:00:00Z") // 18:00 à Paris (hiver)
    expect(parisTime(at)).toBe("18:00")
    expect(parisDate(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17")
  })

  it("dit aujourd'hui / demain", () => {
    const now = new Date("2026-11-16T09:00:00Z")
    expect(friendlySlot(new Date("2026-11-16T17:00:00Z"), now)).toBe("aujourd'hui 18:00")
    expect(friendlySlot(new Date("2026-11-17T08:30:00Z"), now)).toBe("demain 09:30")
  })

  it("fusionne les plages comme la base", () => {
    const m = mergeRanges([
      { weekday: 1, start: 1080, end: 1200 }, { weekday: 1, start: 1020, end: 1110 },
      { weekday: 1, start: 1200, end: 1260 }, { weekday: 3, start: 600, end: 720 },
    ])
    expect(m).toEqual([{ weekday: 1, start: 1020, end: 1260 }, { weekday: 3, start: 600, end: 720 }])
    expect(weeklyHours(m)).toBe(6)
  })

  it("présence : en ligne seulement avec un signal récent", () => {
    const now = Date.parse("2026-11-16T20:00:00Z")
    expect(isTutorLive({ status: "online", last_seen_at: "2026-11-16T19:58:30Z" }, now)).toBe(true)
    expect(isTutorLive({ status: "online", last_seen_at: "2026-11-16T19:50:00Z" }, now)).toBe(false)
    expect(isTutorLive({ status: "online", last_seen_at: null }, now)).toBe(false)
    expect(isTutorLive({ status: "busy", last_seen_at: "2026-11-16T19:59:00Z" }, now)).toBe(false)
  })
})
