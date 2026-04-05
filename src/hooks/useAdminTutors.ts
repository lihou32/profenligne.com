import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";

export interface Tutor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_online: boolean;
  created_at: string;
  rating: number | null;
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

export function useAdminTutors(): UseAdminTutorsResult {
  const [data, setData] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTutors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: tutors, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, is_online, created_at, rating, is_suspended')
        .eq('role', 'tutor')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setData((tutors as Tutor[]) || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);
      logger.error('Erreur récupération tuteurs', error);
    } finally {
      setIsLoading(false);
    }
  };

  const approveTutor = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_suspended: false })
        .eq('id', id);

      if (updateError) throw new Error(updateError.message);

      setData((prev) => prev.map((t) => t.id === id ? { ...t, is_suspended: false } : t));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Erreur lors de l'activation");
      logger.error('AdminTutors action error', error);
      throw error;
    }
  };

  const suspendTutor = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_suspended: true })
        .eq('id', id);

      if (updateError) throw new Error(updateError.message);

      setData((prev) => prev.map((t) => t.id === id ? { ...t, is_suspended: true } : t));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur lors de la suspension');
      logger.error("AdminTutors action error", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  return { data, isLoading, error, refetch: fetchTutors, approveTutor, suspendTutor };
}
