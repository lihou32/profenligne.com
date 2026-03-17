import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ChatMessage = {
  id: string;
  sender_name: string;
  content: string;
  created_at: string;
  user_id: string;
};

export function useRoomChat(roomId: string) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const fetchedRef = useRef(false);

  // Fetch existing messages
  useEffect(() => {
    if (!roomId || fetchedRef.current) return;
    fetchedRef.current = true;

    supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });
  }, [roomId]);

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;
    const senderName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Utilisateur";

    await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      sender_name: senderName,
      content: content.trim(),
    });
  };

  return { messages, sendMessage };
}
