import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type TutorProfileSummary = Pick<Tables<"profiles">, "user_id" | "first_name" | "last_name" | "avatar_url" | "bio">;
export type TutorWithProfile = Tables<"tutors"> & { profiles: TutorProfileSummary | null };

// ─── All Tutors (public list) ────────────────────────────

export function useTutors() {
  return useQuery({
    queryKey: ["tutors"],
    queryFn: async (): Promise<TutorWithProfile[]> => {
      const { data: tutors, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("is_suspended", false);
      if (error) throw error;

      const userIds = [...new Set((tutors || []).map((t) => t.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url, bio")
        .in("user_id", userIds);
      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return (tutors || []).map((t) => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null,
      }));
    },
  });
}

// ─── Own Tutor Profile ───────────────────────────────────

export function useTutorProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Tutor Lessons (with student profiles) ───────────────

export function useTutorLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-lessons", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("tutor_id", user!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;

      const studentIds = [...new Set((data || []).map((l) => l.student_id))];
      if (studentIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", studentIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return (data || []).map((l) => ({
        ...l,
        student_profile: profileMap.get(l.student_id) || null,
      }));
    },
  });
}

// ─── Tutor Stats ─────────────────────────────────────────

export function useTutorStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [lessonsRes, tutorRes, reviewsRes, earningsRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("tutor_id", user!.id).gte("scheduled_at", startOfMonth),
        supabase.from("tutors").select("hourly_rate, rating").eq("user_id", user!.id).maybeSingle(),
        supabase.from("reviews").select("rating").eq("tutor_id", user!.id),
        supabase.from("tutor_earnings").select("amount").eq("tutor_id", user!.id).gte("created_at", startOfMonth),
      ]);

      const lessons = lessonsRes.data || [];
      const completedThisMonth = lessons.filter((l) => l.status === "completed");
      const monthlyRevenue = (earningsRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
      const uniqueStudents = new Set(lessons.map((l) => l.student_id)).size;

      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : tutorRes.data?.rating || 0;

      return {
        monthlyRevenue: Math.round(monthlyRevenue),
        monthlyLessons: completedThisMonth.length,
        avgRating,
        activeStudents: uniqueStudents,
      };
    },
  });
}

// ─── Update Tutor Status ─────────────────────────────────

export function useUpdateTutorStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("tutors")
        .update({ status })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-profile"] }),
  });
}

// ─── Tutor Reviews ───────────────────────────────────────
// reviews.tutor_id = auth user id du prof (même convention que lessons.tutor_id)

export function useTutorReviews(tutorUserId?: string) {
  return useQuery({
    queryKey: ["tutor-reviews", tutorUserId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (tutorUserId) query = query.eq("tutor_id", tutorUserId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Avis vérifié : uniquement sur un cours terminé, une fois par cours. */
export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: { lesson_id: string; rating: number; comment: string | null }) => {
      const { data, error } = await supabase.rpc("submit_review", {
        p_lesson_id: review.lesson_id,
        p_rating: review.rating,
        p_comment: review.comment ?? "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tutor-reviews"] });
      qc.invalidateQueries({ queryKey: ["tutors"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
