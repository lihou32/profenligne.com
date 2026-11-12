import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Solde de l'élève. En base, user_credits.balance et credit_transactions.amount
 * sont en centimes d'euro ; ce hook expose aussi balanceEur.
 */

export function useUserCredits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-credits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return { ...data, balanceEur: (data?.balance ?? 0) / 100 };
    },
  });
}

export function useCreditTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-transactions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Le solde n'est crédité que côté serveur (validation admin d'un paiement, parrainage, remboursement).
// No client-side credit manipulation is allowed.
