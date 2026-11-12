import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export function useAdminChartData(months = 6) {
  return useQuery({
    queryKey: ["admin-chart-data", months],
    queryFn: async () => {
      const now = new Date();

      const ranges = Array.from({ length: months }, (_, i) => {
        const d = subMonths(now, months - 1 - i);
        return {
          label: format(d, "MMM yy", { locale: fr }),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        };
      });

      const rangeStart = ranges[0].start;
      const rangeEnd = ranges[ranges.length - 1].end;

      const [lessonsRes, purchasesRes] = await Promise.all([
        supabase
          .from("lessons")
          .select("scheduled_at, status")
          .neq("status", "cancelled")
          .gte("scheduled_at", rangeStart)
          .lte("scheduled_at", rangeEnd),
        // Chiffre d'affaires = montants réellement encaissés (paiements validés)
        supabase
          .from("credit_transactions")
          .select("amount_paid_eur, created_at")
          .eq("type", "purchase")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
      ]);
      if (lessonsRes.error) throw lessonsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      const lessons = lessonsRes.data ?? [];
      const purchases = purchasesRes.data ?? [];

      return ranges.map((r) => {
        const monthLessons = lessons.filter((l) => l.scheduled_at >= r.start && l.scheduled_at <= r.end);
        const monthRevenue = purchases
          .filter((p) => p.created_at >= r.start && p.created_at <= r.end)
          .reduce((s, p) => s + Number(p.amount_paid_eur ?? 0), 0);
        return { mois: r.label, cours: monthLessons.length, revenus: Math.round(monthRevenue) };
      });
    },
  });
}
