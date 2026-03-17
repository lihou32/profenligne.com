import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      const [profilesRes, lessonsRes, lastMonthLessonsRes, earningsRes, lastMonthEarningsRes, reviewsRes] =
        await Promise.all([
          db.from("profiles").select("id", { count: "exact", head: true }),
          db.from("lessons").select("id", { count: "exact", head: true }).gte("scheduled_at", startOfMonth),
          db.from("lessons").select("id", { count: "exact", head: true }).gte("scheduled_at", startOfLastMonth).lt("scheduled_at", startOfMonth),
          db.from("tutor_earnings").select("amount").eq("status", "paid").gte("created_at", startOfMonth),
          db.from("tutor_earnings").select("amount").eq("status", "paid").gte("created_at", startOfLastMonth).lt("created_at", startOfMonth),
          db.from("tutor_reviews").select("rating"),
        ]);

      const totalUsers = profilesRes.count ?? 0;
      const lessonsThisMonth = lessonsRes.count ?? 0;
      const lessonsLastMonth = lastMonthLessonsRes.count ?? 0;
      const lessonsChange = lessonsLastMonth > 0 ? Math.round(((lessonsThisMonth - lessonsLastMonth) / lessonsLastMonth) * 100) : null;

      const revenueThisMonth = (earningsRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const revenueLastMonth = (lastMonthEarningsRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const revenueChange = revenueLastMonth > 0 ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) : null;

      const reviews = reviewsRes.data ?? [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;
      const satisfactionPct = Math.round((avgRating / 5) * 100);

      return { totalUsers, lessonsThisMonth, lessonsChange, revenueThisMonth: Math.round(revenueThisMonth), revenueChange, satisfactionPct, reviewCount: reviews.length };
    },
  });
}
