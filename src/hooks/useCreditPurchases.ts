import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

/**
 * Recharge du solde par paiement manuel (WhatsApp, virement, Revolut).
 * L'élève crée une demande ; l'admin la valide une fois l'argent reçu.
 * Le solde n'est crédité que côté serveur (admin_confirm_credit_purchase).
 */

export type PaymentMethod = "whatsapp" | "virement" | "revolut";
export type PaymentSettings = Tables<"payment_settings">;
export type CreditPurchaseRequest = Tables<"credit_purchase_requests">;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  whatsapp: "WhatsApp",
  virement: "Virement bancaire",
  revolut: "Revolut",
};

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Validée",
  rejected: "Refusée",
  cancelled: "Annulée",
};

/** Moyens de paiement réellement utilisables avec les coordonnées renseignées. */
export function availableMethods(s: PaymentSettings | null | undefined): PaymentMethod[] {
  if (!s) return [];
  const out: PaymentMethod[] = [];
  if (s.whatsapp_number) out.push("whatsapp");
  if (s.iban) out.push("virement");
  if (s.revolut_tag) out.push("revolut");
  return out;
}

/** Lien WhatsApp avec un message pré-rempli contenant la référence. */
export function whatsappLink(number: string, req: Pick<CreditPurchaseRequest, "amount_eur" | "reference">): string {
  const text = `Bonjour, je souhaite recharger mon solde Prof en Ligne de ${Number(req.amount_eur)} €. Référence : ${req.reference}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function revolutLink(tag: string): string {
  return `https://revolut.me/${encodeURIComponent(tag)}`;
}

/** IBAN lisible par groupes de 4. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function usePaymentSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-settings"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyCreditPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credit-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_purchase_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amountEur, method }: { amountEur: number; method: PaymentMethod }) => {
      const { data, error } = await supabase.rpc("request_topup", { p_amount_eur: amountEur, p_method: method });
      if (error) throw error;
      return data as CreditPurchaseRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-purchases"] }),
  });
}

export function useCancelCreditPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("cancel_credit_purchase", { p_request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-purchases"] }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────

export function useAdminCreditPurchases(status: string | null) {
  return useQuery({
    queryKey: ["admin-credit-purchases", status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_credit_purchases", { p_status: status ?? undefined });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminPurchaseActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-credit-purchases"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const confirm = useMutation({
    mutationFn: async ({ id, amountReceived }: { id: string; amountReceived?: number }) => {
      const { error } = await supabase.rpc("admin_confirm_credit_purchase", {
        p_request_id: id,
        p_amount_received_eur: amountReceived,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase.rpc("admin_reject_credit_purchase", { p_request_id: id, p_note: note });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { confirm, reject };
}

export function useUpdatePaymentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: {
      whatsapp_number: string; account_holder: string; iban: string; bic: string; revolut_tag: string; instructions: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_update_payment_settings", {
        p_whatsapp_number: s.whatsapp_number,
        p_account_holder: s.account_holder,
        p_iban: s.iban,
        p_bic: s.bic,
        p_revolut_tag: s.revolut_tag,
        p_instructions: s.instructions,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-settings"] }),
  });
}
