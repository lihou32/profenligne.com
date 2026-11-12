import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

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

interface Props {
  userId: string;
  names: Record<string, string>;
  messages: ChatMessage[];
  onSend: (body: string) => Promise<boolean>;
  readOnly?: boolean;
  className?: string;
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function LessonChat({ userId, names, messages, onSend, readOnly, className }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const ok = await onSend(body);
    setSending(false);
    if (ok) setDraft("");
    else toast.error("Message non envoyé");
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Envoyez un lien, un exercice, une question… Les messages restent dans le cours.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <span className="mb-0.5 text-[10px] text-muted-foreground">
                {mine ? "Vous" : names[m.sender_id] ?? "Participant"} ·{" "}
                {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border-2 border-ink-2 px-3 py-1.5 text-sm",
                  mine ? "bg-peri text-white" : "bg-white",
                )}
              >
                <Linkified text={m.body} />
              </div>
            </div>
          );
        })}
      </div>
      {!readOnly && (
        <form
          className="flex items-end gap-2 border-t-2 border-ink-2 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Écrire un message…"
            aria-label="Message"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border-2 border-ink-2 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-peri"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Envoyer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink-2 bg-peri text-white shadow-hard disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
