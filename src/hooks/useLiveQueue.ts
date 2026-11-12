import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * « Rejoindre un cours » : l'élève entre dans la file, la base le met en relation
 * avec le premier prof en ligne (migration 20261111000500_live_queue.sql).
 */

export type LiveRequest = {
  id: string; status: "waiting" | "matched" | "cancelled" | "expired"; subject: string;
  duration_minutes: number; lesson_id: string | null; note: string | null; created_at: string;
  queue_position: number; tutors_online: number; priority?: number; is_express?: boolean;
};

/** Profs en ligne et élèves en attente (public, pour l'accueil). */
export function useLiveStats() {
  return useQuery({
    queryKey: ["live-stats"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("live_stats");
      if (error) throw error;
      return data?.[0] ?? { tutors_online: 0, students_waiting: 0 };
    },
  });
}

/** Dernière demande de l'élève ; interroge toutes les 3 s tant qu'il attend. */
export function useMyLiveRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-live-request", user?.id],
    enabled: !!user,
    refetchInterval: (q) => ((q.state.data as LiveRequest | null)?.status === "waiting" ? 3000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_live_request");
      if (error) throw error;
      return (data?.[0] ?? null) as LiveRequest | null;
    },
  });
}

export function useJoinLiveQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { subject: string; topic: string; duration: number }) => {
      const { data, error } = await supabase.rpc("join_live_queue", {
        p_subject: v.subject, p_topic: v.topic, p_duration_minutes: v.duration,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-live-request"] });
      qc.invalidateQueries({ queryKey: ["user-credits"] });
    },
  });
}

export function useCancelLiveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("cancel_live_request", { p_request_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-live-request"] }),
  });
}

/** Côté prof : élèves qui attendent un cours en direct. */
export function useTutorLiveQueue(enabled = true) {
  return useQuery({
    queryKey: ["tutor-live-queue"],
    enabled,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("tutor_live_queue");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAcceptLiveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("tutor_accept_live_request", { p_request_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tutor-live-queue"] });
      qc.invalidateQueries({ queryKey: ["lessons"] });
    },
  });
}
