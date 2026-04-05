import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";

export type LessonStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'all';

interface LessonRow {
  id: string;
  tutor_id: string;
  student_id: string;
  subject: string;
  status: LessonStatus;
  created_at: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  price: number | null;
  tutor?: { first_name: string | null; last_name: string | null };
  student?: { first_name: string | null; last_name: string | null };
}

export interface Lesson {
  id: string;
  tutor_id: string;
  student_id: string;
  tutor_name: string;
  student_name: string;
  subject: string;
  status: LessonStatus;
  created_at: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
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

export function useAdminLessons(): UseAdminLessonsResult {
  const [data, setData] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<LessonStatus>('all');

  const fetchLessons = async (status: LessonStatus) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('lessons')
        .select(`
          id, tutor_id, student_id, subject, status,
          created_at, scheduled_at, duration_minutes, price,
          tutor:profiles!tutor_id(first_name, last_name),
          student:profiles!student_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: lessons, error: fetchError } = await query;

      if (fetchError) throw new Error(fetchError.message);

      const formatted: Lesson[] = (lessons || []).map((l: LessonRow) => ({
        id: l.id,
        tutor_id: l.tutor_id,
        student_id: l.student_id,
        tutor_name: `${l.tutor?.first_name || ''} ${l.tutor?.last_name || ''}`.trim() || 'Inconnu',
        student_name: `${l.student?.first_name || ''} ${l.student?.last_name || ''}`.trim() || 'Inconnu',
        subject: l.subject,
        status: l.status,
        created_at: l.created_at,
        scheduled_at: l.scheduled_at,
        duration_minutes: l.duration_minutes,
        price: l.price,
      }));

      setData(formatted);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);
      logger.error('Erreur récupération cours', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons(statusFilter);
  }, [statusFilter]);

  return {
    data, isLoading, error, statusFilter, setStatusFilter,
    refetch: () => fetchLessons(statusFilter),
  };
}
