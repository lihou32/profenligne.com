import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 100;
const MAX_TOPIC_LENGTH = 200;

function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Authentication ──────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // ─── Parse body ──────────────────────────────────────
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode } = body;

    // ─── Quiz mode ──────────────────────────────────────
    if (mode === "quiz") {
      const subject = validateString(body.subject, MAX_SUBJECT_LENGTH);
      const topic = validateString(body.topic, MAX_TOPIC_LENGTH);
      if (!subject || !topic) {
        return new Response(JSON.stringify({ error: "Invalid subject or topic" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un générateur de QCM pédagogique. Génère exactement 5 questions à choix multiples sur le sujet donné. Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks. Format: {"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]} où correct est l'index (0-3) de la bonne réponse.`,
            },
            {
              role: "user",
              content: `Matière: ${subject}. Sujet: ${topic}. Génère 5 questions QCM.`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Quiz AI error:", res.status, t);
        return new Response(JSON.stringify({ questions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Quiz parse error:", content);
        return new Response(JSON.stringify({ questions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Mindmap mode ───────────────────────────────────
    if (mode === "mindmap") {
      const subject = validateString(body.subject, MAX_SUBJECT_LENGTH);
      const topic = validateString(body.topic, MAX_TOPIC_LENGTH);
      if (!subject || !topic) {
        return new Response(JSON.stringify({ error: "Invalid subject or topic" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un générateur de cartes mentales pédagogiques. Crée une carte mentale structurée sur le sujet donné. Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks. Format: {"mindmap":{"label":"Sujet principal","children":[{"label":"Concept 1","children":[{"label":"Sous-concept"}]}]}}`,
            },
            {
              role: "user",
              content: `Matière: ${subject}. Sujet: ${topic}. Génère une carte mentale avec 4-6 branches principales et 2-3 sous-branches.`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Mindmap AI error:", res.status, t);
        return new Response(JSON.stringify({ mindmap: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(content.replace(/```json\n?|```/g, "").trim());
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Mindmap parse error:", content);
        return new Response(JSON.stringify({ mindmap: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Le mode chat libre (« Tuteur IA ») a été retiré du produit.
    return new Response(JSON.stringify({ error: "Mode non supporté" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
