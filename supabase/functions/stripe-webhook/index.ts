import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Doit rester aligné avec create-checkout-session et src/lib/credits.ts
const CREDIT_PACKS: Record<number, number> = { 5: 2500, 10: 4500, 20: 8000 };

const ok = () =>
  new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });

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
    console.error("Invalid Stripe signature:", err);
    return new Response("Signature invalide", { status: 400 });
  }

  // Paiement immédiat (carte) ou différé (virement SEPA…)
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return ok();
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return ok();

  const userId = session.metadata?.userId ?? session.client_reference_id;
  const credits = parseInt(session.metadata?.credits ?? "0", 10);
  if (!userId || !CREDIT_PACKS[credits]) {
    console.error("Invalid metadata on session", session.id);
    return new Response("Invalid metadata", { status: 400 });
  }
  // Le montant réellement payé doit correspondre au pack
  if (session.amount_total !== CREDIT_PACKS[credits]) {
    console.error(`Amount mismatch on ${session.id}: ${session.amount_total} ≠ ${CREDIT_PACKS[credits]}`);
    return new Response("Amount mismatch", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // add_credits est idempotent sur l'id de session Stripe (rejeux sans double crédit)
  const { error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_credits: credits,
    p_description: `Achat de ${credits} crédits`,
    p_stripe_session_id: session.id,
  });
  if (error) {
    console.error("add_credits failed:", error);
    return new Response("DB error", { status: 500 }); // Stripe réessaiera
  }

  console.log(`Credited ${credits} to ${userId} (session ${session.id})`);
  return ok();
});
