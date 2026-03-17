import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
      const { data, error } = await supabase
        .from("tutor_earnings")
        .select("amount, status")
        .eq("tutor_id", user!.id);
      if (error) throw error;

      const total = (data || []).reduce((s, e) => s + Number(e.amount), 0);
      const paid = (data || []).filter((e) => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
      const pending = total - paid;

      return { total: Math.round(total * 100) / 100, paid: Math.round(paid * 100) / 100, pending: Math.round(pending * 100) / 100 };
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
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .insert({ tutor_id: user.id, amount })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      qc.invalidateQueries({ queryKey: ["earnings-balance"] });
    },
  });
}
