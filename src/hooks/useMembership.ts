import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"
import type { PlanId } from "@/lib/membership"

export interface Membership {
  plan: PlanId | null
  ends_at: string | null
  active: boolean
  revision_label: string | null
  revision_ends_on: string | null
  express_left_today: number
  cancel_hours: number
}

/** Abonnement de l'élève connecté (actif ou non) + semaine de révision en cours. */
export function useMyMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["my-membership", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<Membership> => {
      const { data, error } = await supabase.rpc("my_membership")
      if (error) throw error
      const r = (data?.[0] ?? {}) as Partial<Membership>
      return {
        plan: (r.plan as PlanId) ?? null, ends_at: r.ends_at ?? null, active: !!r.active,
        revision_label: r.revision_label ?? null, revision_ends_on: r.revision_ends_on ?? null,
        express_left_today: r.express_left_today ?? 0, cancel_hours: r.cancel_hours ?? 24,
      }
    },
  })
}

export function useSubscribe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plan: PlanId) => {
      const { data, error } = await supabase.rpc("subscribe", { p_plan: plan })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-membership"] })
      qc.invalidateQueries({ queryKey: ["user-credits"] })
      qc.invalidateQueries({ queryKey: ["credit-transactions"] })
      qc.invalidateQueries({ queryKey: ["member-offers"] })
    },
  })
}

export interface RevisionPeriod { id: string; label: string; starts_on: string; ends_on: string }

/** Semaines de révision à venir ou en cours (public). */
export function useRevisionPeriods() {
  return useQuery({
    queryKey: ["revision-periods"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RevisionPeriod[]> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase.from("revision_periods").select("id, label, starts_on, ends_on")
        .gte("ends_on", today).order("starts_on").limit(12)
      if (error) throw error
      return data ?? []
    },
  })
}

export interface MemberOffer { id: string; title: string; body: string | null; code: string | null; plans: string[]; ends_at: string | null; created_at: string }

/** Offres réservées aux membres (la base ne les montre qu'aux abonnés et à l'admin). */
export function useMemberOffers(enabled = true) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["member-offers", user?.id],
    enabled: !!user && enabled,
    queryFn: async (): Promise<MemberOffer[]> => {
      const { data, error } = await supabase.from("member_offers").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useJoinExpress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { subject: string; topic: string }) => {
      const { data, error } = await supabase.rpc("join_express_queue", { p_subject: v.subject, p_topic: v.topic })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-live-request"] })
      qc.invalidateQueries({ queryKey: ["my-membership"] })
    },
  })
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export function useAdminMembershipStats() {
  return useQuery({
    queryKey: ["admin-membership-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_membership_stats")
      if (error) throw error
      return data?.[0] ?? null
    },
  })
}

export function useAdminRevisionPeriods() {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ["admin-revision-periods"],
    queryFn: async (): Promise<RevisionPeriod[]> => {
      const { data, error } = await supabase.from("revision_periods").select("id, label, starts_on, ends_on").order("starts_on", { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-revision-periods"] }); qc.invalidateQueries({ queryKey: ["revision-periods"] }) }
  const add = useMutation({
    mutationFn: async (p: Omit<RevisionPeriod, "id">) => {
      const { error } = await supabase.from("revision_periods").insert(p)
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("revision_periods").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: refresh,
  })
  return { list, add, remove }
}

export function useAdminOffers() {
  const qc = useQueryClient()
  const list = useMemberOffers()
  const refresh = () => qc.invalidateQueries({ queryKey: ["member-offers"] })
  const add = useMutation({
    mutationFn: async (o: { title: string; body: string | null; code: string | null; plans: string[]; ends_at: string | null }) => {
      const { error } = await supabase.from("member_offers").insert(o)
      if (error) throw error
    },
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_offers").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: refresh,
  })
  return { list, add, remove }
}
