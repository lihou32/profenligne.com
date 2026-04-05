import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_PACKS: Record<number, number> = { 5: 2500, 10: 4500, 20: 8000 };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return new Response(JSON.stringify({ error: "Stripe non configuré" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { credits, userId } = await req.json();
    if (!credits || !userId) return new Response(JSON.stringify({ error: "credits et userId requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const amount = CREDIT_PACKS[credits as number];
    if (!amount) return new Response(JSON.stringify({ error: "Pack invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const appUrl = Deno.env.get("APP_URL") ?? "https://profenligne.com";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", product_data: { name: `${credits} crédits Prof en Ligne`, description: `Pack de ${credits} crédits` }, unit_amount: amount }, quantity: 1 }],
      mode: "payment",
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment-cancel`,
      metadata: { userId, credits: String(credits) },
    });
    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
