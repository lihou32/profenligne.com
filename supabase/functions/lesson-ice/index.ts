import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Serveurs de connexion pour la visio d'un cours.
// - STUN (gratuit, illimité) : suffit pour la grande majorité des connexions.
// - TURN Cloudflare (relais, gratuit jusqu'à 1 000 Go/mois) : pour les réseaux
//   très fermés (certains Wi-Fi d'école ou d'entreprise). Actif seulement si les
//   secrets CF_TURN_KEY_ID et CF_TURN_KEY_API_TOKEN sont réglés dans Supabase.
// Réservé aux participants du cours (vérifié par la base).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STUN = { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Non authentifié" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { lessonId } = await req.json().catch(() => ({}));
  if (typeof lessonId !== "string" || !/^[0-9a-f-]{36}$/.test(lessonId)) return json({ error: "Cours invalide" }, 400);
  const { data: allowed, error } = await supabase.rpc("is_lesson_participant", { p_lesson: lessonId, p_active_only: true });
  if (error || allowed !== true) return json({ error: "Accès refusé" }, 403);

  const keyId = Deno.env.get("CF_TURN_KEY_ID");
  const token = Deno.env.get("CF_TURN_KEY_API_TOKEN");
  if (!keyId || !token) return json({ iceServers: [STUN], turn: false });

  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 4 * 3600 }),
    });
    if (!res.ok) throw new Error(`Cloudflare ${res.status}`);
    const body = await res.json();
    const servers = Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers];
    // Les ports 53 sont souvent bloqués par les navigateurs : on les retire.
    const cleaned = servers.map((s: { urls: string | string[] }) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !u.includes(":53")),
    }));
    return json({ iceServers: [STUN, ...cleaned], turn: true });
  } catch (e) {
    console.error("TURN indisponible", e);
    return json({ iceServers: [STUN], turn: false });
  }
});
