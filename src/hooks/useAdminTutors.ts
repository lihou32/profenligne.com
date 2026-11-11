import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface Tutor {
  id: string; // user_id du prof
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_online: boolean;
  created_at: string;
  rating: number | null;
  total_reviews: number;
  hourly_rate: number | null;
  lessons_completed: number;
  is_suspended: boolean;
}

interface UseAdminTutorsResult {
  data: Tutor[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  approveTutor: (id: string) => Promise<void>;
  suspendTutor: (id: string) => Promise<void>;
}

/** Gestion des profs par l'admin (RPC admin_list_tutors / admin_set_tutor_suspended). */
export function useAdminTutors(): UseAdminTutorsResult {
  const [data, setData] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTutors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: rows, error: fetchError } = await supabase.rpc("admin_list_tutors");
      if (fetchError) throw new Error(fetchError.message);
      setData((rows ?? []).map((t) => ({
        id: t.user_id,
        email: t.email,
        first_name: t.first_name,
        last_name: t.last_name,
        is_online: t.status === "online",
        created_at: t.created_at,
        rating: t.rating === null ? null : Number(t.rating),
        total_reviews: Number(t.total_reviews ?? 0),
        hourly_rate: t.hourly_rate === null ? null : Number(t.hourly_rate),
        lessons_completed: Number(t.lessons_completed ?? 0),
        is_suspended: t.is_suspended,
      })));
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Erreur inconnue");
      setError(e);
      logger.error("Erreur récupération tuteurs", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSuspended = async (id: string, suspended: boolean) => {
    const { error: updateError } = await supabase.rpc("admin_set_tutor_suspended", {
      p_user_id: id,
      p_suspended: suspended,
    });
    if (updateError) {
      logger.error("AdminTutors action error", updateError);
      throw new Error(updateError.message);
    }
    setData((prev) => prev.map((t) => (t.id === id ? { ...t, is_suspended: suspended, is_online: suspended ? false : t.is_online } : t)));
  };

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTutors,
    approveTutor: (id) => setSuspended(id, false),
    suspendTutor: (id) => setSuspended(id, true),
  };
}
