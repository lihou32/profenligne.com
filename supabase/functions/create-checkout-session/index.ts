import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Recharges du solde par carte (pas encore activé : paiement manuel pour l'instant).
// Doit rester aligné avec src/lib/credits.ts (TOPUP_PACKS) et public.topup_bonus_eur.
const TOPUP_BONUS_EUR: Record<number, number> = { 50: 5, 70: 7.5, 100: 15, 150: 25 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Le paiement n'est pas encore configuré" }, 503);

    // L'acheteur est identifié par son token — jamais par le corps de la requête
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Non authentifié" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Non authentifié" }, 401);

    const { amount: amountEur } = await req.json().catch(() => ({}));
    if (!(Number(amountEur) in TOPUP_BONUS_EUR)) return json({ error: "Recharge invalide" }, 400);
    const amount = Number(amountEur) * 100;

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const appUrl = (Deno.env.get("APP_URL") ?? "https://profenligne.com").replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Recharge Prof en Ligne de ${amountEur} €`,
            description: `+${TOPUP_BONUS_EUR[Number(amountEur)]} € offerts sur ton solde`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/payment/success?amount=${amountEur}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel`,
      metadata: { userId: user.id, amount_eur: String(amountEur) },
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
