import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// ─── All Tutors (public list) ────────────────────────────

export function useTutors() {
  return useQuery({
    queryKey: ["tutors"],
    queryFn: async () => {
      const { data: tutors, error } = await supabase.from("tutors").select("*");
      if (error) throw error;

      const userIds = [...new Set((tutors || []).map((t) => t.user_id))];
      if (userIds.length === 0) return tutors || [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
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

      const [lessonsRes, tutorRes, reviewsRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("tutor_id", user!.id).gte("scheduled_at", startOfMonth),
        supabase.from("tutors").select("hourly_rate, rating").eq("user_id", user!.id).maybeSingle(),
        supabase.from("reviews").select("rating").eq("tutor_id", user!.id),
      ]);

      const lessons = lessonsRes.data || [];
      const completedThisMonth = lessons.filter((l) => l.status === "completed");
      const hourlyRate = Number(tutorRes.data?.hourly_rate) || 0;
      const monthlyRevenue = completedThisMonth.reduce(
        (s, l) => s + ((l.duration_minutes || 0) / 60) * hourlyRate,
        0,
      );
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

export function useTutorReviews() {
  return useQuery({
    queryKey: ["tutor-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      tutor_id: string;
      student_id: string;
      rating: number;
      comment: string | null;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-reviews"] }),
  });
}
