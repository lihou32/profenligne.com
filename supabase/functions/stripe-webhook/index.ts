import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Stripe non configuré", { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });
  const body = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Signature invalide: ${err}`, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);
    if (!userId || credits <= 0) return new Response("Invalid metadata", { status: 400 });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { error } = await supabase.rpc("add_credits", { p_user_id: userId, p_credits: credits, p_description: `Achat de ${credits} crédit${credits > 1 ? "s" : ""} via Stripe`, p_stripe_session_id: session.id });
    if (error) { console.error("add_credits failed:", error); return new Response(`DB error: ${error.message}`, { status: 500 }); }
    console.log(`Added ${credits} credits to ${userId}`);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
