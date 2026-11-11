import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const pctChange = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

/** Chiffres clés du panneau admin (RPC admin_stats, réservée aux admins). */
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [statsRes, reviewsRes] = await Promise.all([
        supabase.rpc("admin_stats"),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);
      if (statsRes.error) throw statsRes.error;
      const s = statsRes.data?.[0];
      if (!s) throw new Error("Statistiques indisponibles");

      return {
        totalUsers: Number(s.total_users),
        totalTutors: Number(s.total_tutors),
        lessonsThisMonth: Number(s.lessons_this_month),
        lessonsChange: pctChange(Number(s.lessons_this_month), Number(s.lessons_last_month)),
        revenueThisMonth: Math.round(Number(s.revenue_this_month)),
        revenueChange: pctChange(Number(s.revenue_this_month), Number(s.revenue_last_month)),
        satisfactionPct: Math.round((Number(s.avg_rating) / 5) * 100),
        reviewCount: reviewsRes.count ?? 0,
        preregistrations: Number(s.preregistrations),
      };
    },
  });
}
