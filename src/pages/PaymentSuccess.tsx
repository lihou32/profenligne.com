import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CREDIT_PACKS } from "@/lib/credits"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, ArrowRight, Users, Coins, Loader2 } from "lucide-react"

export default function PaymentSuccess() {
  useDocumentTitle("Paiement réussi")
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // N'affiche que des packs connus (le paramètre d'URL est manipulable)
  const creditsParam = Number(searchParams.get("credits"))
  const credits = CREDIT_PACKS.some((p) => p.credits === creditsParam) ? creditsParam : null
  const sessionId = searchParams.get("session_id")
  const startedAt = useRef(Date.now())

  // Attend que le webhook Stripe ait crédité le compte (transaction liée à la session)
  const { data, isLoading } = useQuery({
    queryKey: ["payment-confirmation", user?.id, sessionId],
    enabled: !!user,
    refetchInterval: (query) => {
      if (query.state.data?.confirmed) return false
      if (Date.now() - startedAt.current > 60_000) return false // on arrête après 1 min
      return 2000
    },
    queryFn: async () => {
      const [balanceRes, txRes] = await Promise.all([
        supabase.from("user_credits").select("balance").eq("user_id", user!.id).maybeSingle(),
        sessionId
          ? supabase.from("credit_transactions").select("id").eq("stripe_payment_id", sessionId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      return { balance: balanceRes.data?.balance ?? 0, confirmed: !sessionId || !!txRes.data }
    },
  })
  const balance = data?.balance
  const confirmed = data?.confirmed ?? false

  useEffect(() => {
    if (confirmed) queryClient.invalidateQueries({ queryKey: ["user-credits"] })
  }, [confirmed, queryClient])

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-success/10 p-5">
            <CheckCircle2 className="h-16 w-16 text-success animate-bounce" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-display gradient-text">Paiement réussi !</h1>
          <p className="mt-2 text-muted-foreground">Merci pour votre achat</p>
        </div>

        <Card className="glass-card border-success/30">
          <CardContent className="p-6 space-y-3">
            <div className="text-5xl font-bold text-success">{credits ? `+${credits}` : "✓"}</div>
            <div className="text-muted-foreground">
              {confirmed ? "crédits ajoutés à votre compte" : "Validation du paiement en cours…"}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/30">
              <Coins className="h-4 w-4 text-gold" />
              <span className="text-sm text-muted-foreground">Solde actuel :</span>
              {isLoading || !confirmed ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="font-bold text-foreground">{balance ?? 0} crédits</span>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          {confirmed
            ? "Vos crédits sont disponibles. Vous pouvez maintenant réserver des cours."
            : "Cela prend généralement quelques secondes. Vous pouvez quitter cette page, vos crédits arriveront automatiquement."}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full"
          >
            Retour au Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate("/tutors")}
            variant="outline"
            className="w-full"
          >
            <Users className="mr-2 h-4 w-4" />
            Trouver un tuteur
          </Button>
        </div>
      </div>
    </div>
  )
}
