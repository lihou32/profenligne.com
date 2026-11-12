import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Messages du cours en direct (un seul abonnement, même chat fermé, pour les non-lus). */
export function useLessonChat(lessonId: string, userId: string, enabled: boolean, onIncoming?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const incomingRef = useRef(onIncoming);
  incomingRef.current = onIncoming;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () =>
      supabase
        .from("lesson_messages")
        .select("id, sender_id, body, created_at")
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true })
        .limit(300)
        .then(({ data, error }) => {
          if (error) logger.error("Chat : chargement impossible", error);
          if (active && data) setMessages(data);
        });
    void load();
    const channel = supabase
      .channel(`lesson-chat:${lessonId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lesson_messages", filter: `lesson_id=eq.${lessonId}` },
        ({ new: row }) => {
          const m = row as ChatMessage;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== userId) incomingRef.current?.();
        },
      )
      .subscribe((status) => {
        // Après une coupure, on recharge pour ne rien rater
        if (status === "SUBSCRIBED") void load();
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [lessonId, userId, enabled]);

  const send = useCallback(
    async (body: string) => {
      const { data, error } = await supabase
        .from("lesson_messages")
        .insert({ lesson_id: lessonId, body })
        .select("id, sender_id, body, created_at")
        .single();
      if (error) {
        logger.error("Chat : envoi impossible", error);
        return false;
      }
      setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data]));
      return true;
    },
    [lessonId],
  );

  return { messages, send };
}
