import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Typed via Database - no cast needed

export function useTutorEarnings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-earnings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_earnings")
        .select("*")
        .eq("tutor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEarningsBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["earnings-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [earningsRes, availableRes] = await Promise.all([
        supabase.from("tutor_earnings").select("amount, status").eq("tutor_id", user!.id),
        supabase.rpc("tutor_available_balance", { _tutor_id: user!.id }),
      ]);
      if (earningsRes.error) throw earningsRes.error;

      const round = (n: number) => Math.round(n * 100) / 100;
      const data = earningsRes.data || [];
      const total = data.reduce((s, e) => s + Number(e.amount), 0);
      const paid = data.filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
      // Disponible au retrait = gains − retraits déjà demandés (non rejetés)
      const available = Number(availableRes.data ?? 0);

      return { total: round(total), paid: round(paid), pending: round(total - paid), available: round(available) };
    },
  });
}

export function useWithdrawalRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["withdrawal-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("tutor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestWithdrawal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase.rpc("request_withdrawal", { p_amount: amount });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      qc.invalidateQueries({ queryKey: ["earnings-balance"] });
    },
  });
}
