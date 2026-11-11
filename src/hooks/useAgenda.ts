import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"

/** Une plage de l'agenda : jour ISO (1 = lundi … 7 = dimanche), minutes depuis minuit, heure de Paris. */
export interface AvailabilityRange { weekday: number; start: number; end: number }

/** Disponibilités publiées par un prof (lecture publique). */
export function useTutorAvailability(tutorId?: string) {
  return useQuery({
    queryKey: ["tutor-availability", tutorId],
    enabled: !!tutorId,
    queryFn: async (): Promise<AvailabilityRange[]> => {
      const { data, error } = await supabase.from("tutor_availability")
        .select("weekday, start_minute, end_minute").eq("tutor_id", tutorId!)
        .order("weekday").order("start_minute")
      if (error) throw error
      return (data ?? []).map((r) => ({ weekday: r.weekday, start: r.start_minute, end: r.end_minute }))
    },
  })
}

/** Le prof remplace tout son agenda. */
export function useSaveAvailability() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ranges: AvailabilityRange[]) => {
      const { data, error } = await supabase.rpc("set_my_availability", { p_ranges: ranges as unknown as never })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tutor-availability", user?.id] })
      qc.invalidateQueries({ queryKey: ["open-slots"] })
      qc.invalidateQueries({ queryKey: ["next-slots"] })
    },
  })
}

/** Créneaux libres d'un prof pour une semaine (from = lundi, AAAA-MM-JJ). */
export function useOpenSlots(tutorId: string | undefined, from: string, days: number, duration: number, enabled = true) {
  return useQuery({
    queryKey: ["open-slots", tutorId, from, days, duration],
    enabled: !!tutorId && enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<Date[]> => {
      const { data, error } = await supabase.rpc("tutor_open_slots", {
        p_tutor: tutorId!, p_from: from, p_days: days, p_duration: duration,
      })
      if (error) throw error
      return (data ?? []).map((r: { starts_at: string }) => new Date(r.starts_at))
    },
  })
}

/** Prochain créneau libre de chaque prof qui a un agenda. */
export function useNextSlots(duration = 60) {
  return useQuery({
    queryKey: ["next-slots", duration],
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, Date>> => {
      const { data, error } = await supabase.rpc("tutors_next_slot", { p_duration: duration })
      if (error) throw error
      const m = new Map<string, Date>()
      for (const r of (data ?? []) as { tutor_id: string; next_slot: string | null }[]) {
        if (r.next_slot) m.set(r.tutor_id, new Date(r.next_slot))
      }
      return m
    },
  })
}

/**
 * Signal de présence du prof : tant que l'appli est ouverte et qu'il est en ligne
 * (ou en cours), on prévient la base toutes les 50 s. Sans signal pendant 3 min,
 * la base le repasse hors ligne et ne lui envoie plus d'élèves.
 */
export function useTutorHeartbeat(active: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!active) return
    let stopped = false
    const beat = async () => {
      const { data } = await supabase.rpc("tutor_heartbeat")
      if (!stopped && data && data !== "online" && data !== "busy") qc.invalidateQueries({ queryKey: ["tutor-profile"] })
    }
    beat()
    const id = window.setInterval(beat, 50_000)
    const onVisible = () => { if (document.visibilityState === "visible") beat() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { stopped = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVisible) }
  }, [active, qc])
}

/** Annule et rembourse les demandes jamais confirmées (appelé à l'ouverture des cours). */
export async function refreshLessons() {
  try { await supabase.rpc("refresh_lessons") } catch { /* sans effet si hors ligne */ }
}
