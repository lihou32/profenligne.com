import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

// Typed via Database - no cast needed

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

      const [lessonsRes, earningsRes] = await Promise.all([
        db
          .from("lessons")
          .select("scheduled_at, status")
          .gte("scheduled_at", rangeStart)
          .lte("scheduled_at", rangeEnd),
        db
          .from("tutor_earnings")
          .select("amount, created_at, status")
          .eq("status", "paid")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
      ]);

      const lessons = lessonsRes.data ?? [];
      const earnings = earningsRes.data ?? [];

      return ranges.map((r: any) => {
        const monthLessons = lessons.filter(
          (l: any) => l.scheduled_at >= r.start && l.scheduled_at <= r.end
        );
        const monthEarnings = earnings.filter(
          (e: any) => e.created_at >= r.start && e.created_at <= r.end
        );

        return {
          mois: r.label,
          cours: monthLessons.length,
          revenus: Math.round(
            monthEarnings.reduce((s: number, e: any) => s + Number(e.amount), 0)
          ),
        };
      });
    },
  });
}
