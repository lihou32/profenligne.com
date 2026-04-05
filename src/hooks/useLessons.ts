import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logger } from "@/lib/logger";

// ─── Student Lessons ─────────────────────────────────────

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
      return data ?? [];
    },
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: {
      student_id: string;
      tutor_id: string;
      subject: string;
      scheduled_at: string;
      duration_minutes: number;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from("lessons")
        .insert(lesson)
        .select()
        .single();
      if (error) throw error;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.functions
            .invoke("notify-lesson-booking", {
              body: { lessonId: data.id },
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            .then(({ error: fnError }) => {
              if (fnError) logger.warn("Booking notification error", { error: fnError });
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
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      status?: string;
      rating?: number;
      [key: string]: unknown;
    }) => {
      const { data, error } = await supabase
        .from("lessons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      const newStatus = updates.status;
      if (newStatus === "confirmed" || newStatus === "cancelled") {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          supabase.functions
            .invoke("notify-lesson-status", {
              body: { lessonId: id, newStatus },
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            .then(({ error: fnError }) => {
              if (fnError) logger.warn("Notification function error", { error: fnError });
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

// ─── Dashboard Stats ─────────────────────────────────────

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

      const all = lessons ?? [];
      const completed = all.filter((l) => l.status === "completed");
      const totalMinutes = completed.reduce((s, l) => s + (l.duration_minutes || 0), 0);
      const rated = completed.filter((l) => l.rating != null);
      const avgRating = rated.length
        ? rated.reduce((s, l) => s + (l.rating || 0), 0) / rated.length
        : 0;

      return {
        totalHours: (totalMinutes / 60).toFixed(1),
        completedLessons: completed.length,
        averageRating: avgRating.toFixed(1),
        upcomingLessons: all.filter(
          (l) => l.status === "confirmed" || l.status === "pending",
        ),
      };
    },
  });
}
