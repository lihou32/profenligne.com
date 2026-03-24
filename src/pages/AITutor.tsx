import { useState, useRef, useEffect, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, ImagePlus, Sparkles, X, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type MessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Message = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Bonjour ! 👋 Je suis votre assistant IA. Je peux vous aider avec vos devoirs, expliquer des concepts ou résoudre des exercices. Envoyez-moi une photo de votre devoir ou posez votre question !",
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AITutor() {
  useDocumentTitle("AI Tutor");
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load most recent conversation on mount
  useEffect(() => {
    if (!user) { setHistoryLoading(false); return; }
    (async () => {
      try {
        const { data: conv } = await supabase
          .from("ai_conversations")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conv) { setHistoryLoading(false); return; }

        const { data: msgs } = await supabase
          .from("ai_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setConversationId(conv.id);
          setMessages([
            WELCOME,
            ...msgs.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ]);
        }
      } catch {
        // silently ignore — history is non-critical
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [user]);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([WELCOME]);
    setInput("");
    setImagePreview(null);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: input || (imagePreview ? "Analyse cette image" : ""),
      imageUrl: imagePreview || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setImagePreview(null);
    setIsLoading(true);

    // Build API messages with multimodal support
    const apiMessages = messages
      .concat(userMsg)
      .filter((m) => m.content || m.imageUrl)
      .map((m) => {
        if (m.imageUrl) {
          const parts: MessageContent[] = [];
          if (m.content) parts.push({ type: "text", text: m.content });
          parts.push({ type: "image_url", image_url: { url: m.imageUrl } });
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      });

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant" as const, content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Vous devez être connecté pour utiliser le tuteur IA");
        setIsLoading(false);
        return;
      }

      // Ensure a conversation exists in DB (create lazily on first real message)
      let convId = conversationId;
      if (!convId && user) {
        const { data: newConv } = await supabase
          .from("ai_conversations")
          .insert({ user_id: user.id, title: userMsg.content.slice(0, 60) || "Nouvelle conversation" })
          .select("id")
          .single();
        if (newConv?.id) {
          convId = newConv.id;
          setConversationId(newConv.id);
        }
      }

      // Save user message to DB (text only — images are transient)
      if (convId) {
        await supabase.from("ai_messages").insert({
          conversation_id: convId,
          role: "user",
          content: userMsg.content,
        });
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
        toast.error(err.error || "Erreur du service IA");
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            /* ignore */
          }
        }
      }

      // Persist assistant response
      if (convId && assistantSoFar) {
        await supabase.from("ai_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantSoFar,
        });
      }
    } catch (e) {
      console.error("Stream error:", e);
      toast.error("Erreur de connexion à l'IA");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            AI Tutor
          </h1>
          <p className="text-muted-foreground">
            Votre assistant intelligent pour l'aide aux devoirs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={startNewConversation}
          className="gap-2 rounded-xl"
          disabled={messages.length <= 1}
        >
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>

      <Card className="glass-card flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "assistant"
                        ? "gradient-primary"
                        : "bg-secondary"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Image envoyée"
                        className="mb-2 max-h-48 rounded-lg object-contain"
                      />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-full">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {imagePreview && (
          <div className="border-t px-4 pt-3 pb-1">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="h-20 rounded-lg object-contain border"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={(!input.trim() && !imagePreview) || isLoading}
              className="gradient-primary text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
