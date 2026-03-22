import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno"

interface CreateCheckoutSessionRequest {
  credits: number
  userId: string
}

const CREDIT_PRICE_MAP: Record<number, string> = {
  5:  Deno.env.get("STRIPE_PRICE_ID_5_CREDITS")  || "",
  10: Deno.env.get("STRIPE_PRICE_ID_10_CREDITS") || "",
  20: Deno.env.get("STRIPE_PRICE_ID_20_CREDITS") || "",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const stripe = new Stripe(stripeSecretKey)

    let body: CreateCheckoutSessionRequest
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const { credits, userId } = body

    if (!credits || !userId) {
      return new Response(JSON.stringify({ error: "Missing: credits, userId" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    if (!(credits in CREDIT_PRICE_MAP)) {
      return new Response(JSON.stringify({ error: `Invalid credits: ${credits}. Allowed: 5, 10, 20` }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const priceId = CREDIT_PRICE_MAP[credits]
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173"

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      customer_email: req.headers.get("x-user-email") || undefined,
      metadata: { userId, credits: credits.toString() },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
})
