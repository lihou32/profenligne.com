import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ─── Lessons ────────────────────────────────────────────

export function useLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", user!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Tables<"lessons">[];
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: TablesInsert<"lessons">) => {
      const { data, error } = await supabase.from("lessons").insert(lesson).select().single();
      if (error) throw error;

      // Notify the tutor about the new booking (fire-and-forget)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.functions
            .invoke("notify-lesson-booking", {
              body: { lessonId: data.id },
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            .then(({ error: fnError }) => {
              if (fnError) console.warn("Booking notification error:", fnError);
            });
        }
      });

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lessons"] }),
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Tables<"lessons">>) => {
      const { data, error } = await supabase.from("lessons").update(updates).eq("id", id).select().single();
      if (error) throw error;

      // Trigger notification when tutor accepts or refuses a lesson
      const newStatus = updates.status;
      if (newStatus === "confirmed" || newStatus === "cancelled") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          supabase.functions
            .invoke("notify-lesson-status", {
              body: { lessonId: id, newStatus },
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            .then(({ error: fnError }) => {
              if (fnError) console.warn("Notification function error:", fnError);
            });
        }
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["tutor-lessons"] });
    },
  });
}

// ─── Tutors ─────────────────────────────────────────────

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

// ─── Tutor Profile (own) ────────────────────────────────

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

// ─── Tutor Lessons (with student profile) ───────────────

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

      // Fetch student profiles
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

// ─── Tutor Stats ────────────────────────────────────────

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
        supabase.from("tutor_reviews").select("rating").eq("tutor_id", user!.id),
      ]);

      const lessons = lessonsRes.data || [];
      const completedThisMonth = lessons.filter((l) => l.status === "completed");
      const hourlyRate = Number(tutorRes.data?.hourly_rate) || 0;
      const monthlyRevenue = completedThisMonth.reduce((s, l) => s + (l.duration_minutes / 60) * hourlyRate, 0);
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

// ─── Update Tutor Status ────────────────────────────────

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

// ─── Notifications ──────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"notifications">[];
    },
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── Tutor Reviews ──────────────────────────────────────

export function useTutorReviews() {
  return useQuery({
    queryKey: ["tutor-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_reviews")
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
    mutationFn: async (review: { tutor_id: string; student_id: string; rating: number; comment: string | null }) => {
      const { data, error } = await supabase.from("tutor_reviews").insert(review).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutor-reviews"] }),
  });
}

// ─── Dashboard Stats ────────────────────────────────────

export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: lessons, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", user!.id);
      if (error) throw error;

      const completed = (lessons || []).filter((l) => l.status === "completed");
      const totalMinutes = completed.reduce((s, l) => s + (l.duration_minutes || 0), 0);
      const avgRating = completed.filter((l) => l.rating != null).length
        ? completed.reduce((s, l) => s + (l.rating || 0), 0) /
          completed.filter((l) => l.rating != null).length
        : 0;

      return {
        totalHours: (totalMinutes / 60).toFixed(1),
        completedLessons: completed.length,
        averageRating: avgRating.toFixed(1),
        upcomingLessons: (lessons || []).filter(
          (l) => l.status === "confirmed" || l.status === "pending"
        ),
      };
    },
  });
}
