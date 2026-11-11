import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type LessonStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "all";

export interface Lesson {
  id: string;
  tutor_id: string;
  student_id: string;
  tutor_name: string;
  student_name: string;
  subject: string;
  status: Exclude<LessonStatus, "all">;
  created_at: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  credits_cost: number;
  price: number | null;
}

interface UseAdminLessonsResult {
  data: Lesson[];
  isLoading: boolean;
  error: Error | null;
  statusFilter: LessonStatus;
  setStatusFilter: (status: LessonStatus) => void;
  refetch: () => Promise<void>;
}

/** Liste des cours pour l'admin (RPC admin_list_lessons). */
export function useAdminLessons(): UseAdminLessonsResult {
  const [data, setData] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<LessonStatus>("all");

  const fetchLessons = useCallback(async (status: LessonStatus) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: rows, error: fetchError } = await supabase.rpc("admin_list_lessons", {
        p_status: status === "all" ? undefined : status,
      });
      if (fetchError) throw new Error(fetchError.message);
      setData((rows ?? []).map((l) => ({
        id: l.id,
        tutor_id: l.tutor_id,
        student_id: l.student_id,
        tutor_name: l.tutor_name,
        student_name: l.student_name,
        subject: l.subject,
        status: l.status as Lesson["status"],
        created_at: l.created_at,
        scheduled_at: l.scheduled_at,
        duration_minutes: l.duration_minutes,
        credits_cost: l.credits_cost,
        price: l.price_eur === null ? null : Number(l.price_eur),
      })));
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Erreur inconnue");
      setError(e);
      logger.error("Erreur récupération leçons", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons(statusFilter);
  }, [statusFilter, fetchLessons]);

  return { data, isLoading, error, statusFilter, setStatusFilter, refetch: () => fetchLessons(statusFilter) };
}
