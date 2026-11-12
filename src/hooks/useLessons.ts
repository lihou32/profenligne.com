import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { refreshLessons } from "./useAgenda";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";
import { logger } from "@/lib/logger";

export type Lesson = Tables<"lessons">;
export type PersonSummary = Pick<Tables<"profiles">, "user_id" | "first_name" | "last_name" | "avatar_url">;
export type StudentLesson = Lesson & { tutor_profile: PersonSummary | null };

/**
 * Toutes les transitions de statut passent par des RPC côté base
 * (book_lesson, confirm_lesson, cancel_lesson, start_lesson, complete_lesson) :
 * débit/remboursement du solde, XP, gains prof et notifications sont
 * gérés de façon atomique côté serveur.
 */

function invalidateLessonQueries(qc: QueryClient) {
  for (const key of ["lessons", "tutor-lessons", "dashboard-stats", "tutor-stats", "user-credits",
    "credit-transactions", "tutor-earnings", "earnings-balance", "unread-notifications", "notifications"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

/** Envoi d'email best-effort (la notification in-app est déjà créée côté base). */
function sendEmail(fn: "notify-lesson-booking" | "notify-lesson-status", body: Record<string, unknown>) {
  supabase.functions.invoke(fn, { body }).then(({ error }) => {
    if (error) logger.warn(`${fn} failed`, { error: String(error) });
  });
}

// ─── Student Lessons ─────────────────────────────────────

export function useLessons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lessons", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<StudentLesson[]> => {
      await refreshLessons();
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", user!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      const lessons = data ?? [];

      const tutorIds = [...new Set(lessons.map((l) => l.tutor_id))];
      if (tutorIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", tutorIds);
      const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return lessons.map((l) => ({ ...l, tutor_profile: byId.get(l.tutor_id) ?? null }));
    },
  });
}

// ─── Booking ─────────────────────────────────────────────

export interface BookLessonInput {
  tutor_id: string;
  subject: string;
  topic: string | null;
  scheduled_at: string;
  duration_minutes: number;
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: BookLessonInput) => {
      const { data, error } = await supabase.rpc("book_lesson", {
        p_tutor_id: lesson.tutor_id,
        p_subject: lesson.subject,
        p_topic: lesson.topic ?? "",
        p_scheduled_at: lesson.scheduled_at,
        p_duration_minutes: lesson.duration_minutes,
      });
      if (error) throw error;
      sendEmail("notify-lesson-booking", { lessonId: data.id });
      return data;
    },
    onSuccess: () => invalidateLessonQueries(qc),
  });
}

// ─── Status transitions ──────────────────────────────────

export function useConfirmLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data, error } = await supabase.rpc("confirm_lesson", { p_lesson_id: lessonId });
      if (error) throw error;
      sendEmail("notify-lesson-status", { lessonId, newStatus: "confirmed" });
      return data;
    },
    onSuccess: () => invalidateLessonQueries(qc),
  });
}

export function useCancelLesson() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lesson: Pick<Lesson, "id" | "tutor_id">) => {
      const { data, error } = await supabase.rpc("cancel_lesson", { p_lesson_id: lesson.id });
      if (error) throw error;
      // L'email d'annulation à l'élève n'est envoyé que si c'est le prof qui annule
      if (user?.id === lesson.tutor_id) {
        sendEmail("notify-lesson-status", { lessonId: lesson.id, newStatus: "cancelled" });
      }
      return data;
    },
    onSuccess: () => invalidateLessonQueries(qc),
  });
}

export function useStartLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data, error } = await supabase.rpc("start_lesson", { p_lesson_id: lessonId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateLessonQueries(qc),
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data, error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateLessonQueries(qc),
  });
}

// ─── Dashboard Stats ─────────────────────────────────────

export function computeStudentStats(lessons: Lesson[], ratings: number[]) {
  const completed = lessons.filter((l) => l.status === "completed");
  const totalMinutes = completed.reduce((s, l) => s + (l.duration_minutes || 0), 0);
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
  return {
    totalHours: (totalMinutes / 60).toFixed(1),
    completedLessons: completed.length,
    averageRating: avgRating.toFixed(1),
    upcomingLessons: lessons.filter((l) => ["pending", "confirmed", "in_progress"].includes(l.status)),
  };
}

export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [lessonsRes, reviewsRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("student_id", user!.id),
        supabase.from("reviews").select("rating").eq("student_id", user!.id),
      ]);
      if (lessonsRes.error) throw lessonsRes.error;
      return computeStudentStats(lessonsRes.data ?? [], (reviewsRes.data ?? []).map((r) => r.rating));
    },
  });
}
