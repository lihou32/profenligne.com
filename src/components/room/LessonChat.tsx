import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/useLessonChat";

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
