import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export function useAdminChartData(months = 6) {
  return useQuery({
    queryKey: ["admin-chart-data", months],
    queryFn: async () => {
      const now = new Date();

      // Build array of month ranges
      const ranges = Array.from({ length: months }, (_, i) => {
        const d = subMonths(now, months - 1 - i);
        return {
          label: format(d, "MMM yy", { locale: fr }),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        };
      });

      // Fetch all lessons and earnings in one go (within the full range)
      const rangeStart = ranges[0].start;
      const rangeEnd = ranges[ranges.length - 1].end;

      const [lessonsRes, earningsRes] = await Promise.all([
        supabase
          .from("lessons")
          .select("scheduled_at, status")
          .gte("scheduled_at", rangeStart)
          .lte("scheduled_at", rangeEnd),
        supabase
          .from("tutor_earnings")
          .select("amount, created_at, status")
          .eq("status", "paid")
          .gte("created_at", rangeStart)
          .lte("created_at", rangeEnd),
      ]);

      const lessons = lessonsRes.data ?? [];
      const earnings = earningsRes.data ?? [];

      return ranges.map((r) => {
        const monthLessons = lessons.filter(
          (l) => l.scheduled_at >= r.start && l.scheduled_at <= r.end
        );
        const monthEarnings = earnings.filter(
          (e) => e.created_at >= r.start && e.created_at <= r.end
        );

        return {
          mois: r.label,
          cours: monthLessons.length,
          revenus: Math.round(
            monthEarnings.reduce((s, e) => s + Number(e.amount), 0)
          ),
        };
      });
    },
  });
}
