import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) return new Response("Missing stripe-signature", { status: 400 })

    const body = await req.text()
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
    if (!webhookSecret) return new Response("Server config error", { status: 500 })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown"
      console.error("Signature verification failed:", msg)
      return new Response(`Webhook error: ${msg}`, { status: 400 })
    }

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), { status: 200 })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const { userId, credits: creditsStr } = session.metadata || {}
    const credits = parseInt(creditsStr || "0", 10)
    const amountCents = session.amount_total || 0

    if (!userId || !credits || isNaN(credits)) {
      console.error("Invalid metadata:", session.metadata)
      return new Response("Invalid metadata", { status: 400 })
    }

    // Enregistrer la transaction
    const { error: insertError } = await supabase
      .from("credit_transactions")
      .insert({ user_id: userId, credits, amount_cents: amountCents, stripe_session_id: session.id, status: "completed" })

    if (insertError) {
      console.error("Insert error:", insertError)
      return new Response(`DB error: ${insertError.message}`, { status: 500 })
    }

    // Récupérer les crédits actuels
    const { data: profile, error: selectError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single()

    if (selectError || !profile) {
      console.error("Profile fetch error:", selectError)
      return new Response("User not found", { status: 404 })
    }

    // Mettre à jour les crédits
    const newCredits = (profile.credits || 0) + credits
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId)

    if (updateError) {
      console.error("Update error:", updateError)
      return new Response(`DB error: ${updateError.message}`, { status: 500 })
    }

    console.log(`✅ +${credits} crédits pour ${userId} → total: ${newCredits}`)
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Unexpected error:", msg)
    return new Response(`Internal error: ${msg}`, { status: 500 })
  }
})
