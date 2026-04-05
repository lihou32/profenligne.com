import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
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
  const [searchParams] = useSearchParams()
  const credits = searchParams.get("credits") || "0"

  // Fetch real balance from DB
  const { data: balance, isLoading } = useQuery({
    queryKey: ["user-credits", user?.id],
    enabled: !!user,
    // Refetch a few times to wait for webhook processing
    refetchInterval: (query) => {
      // Stop refetching after 5 successful fetches or if balance > 0
      const data = query.state.data
      if (data && data > 0) return false
      return 2000 // retry every 2s
    },
    queryFn: async () => {
      const { data } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle()
      return data?.balance ?? 0
    },
  })

  return (
    <div className="flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-success/10 p-5">
            <CheckCircle2 className="h-16 w-16 text-success animate-bounce" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold font-display gradient-text">Paiement réussi !</h1>
          <p className="mt-2 text-muted-foreground">Merci pour votre achat</p>
        </div>

        <Card className="glass-card border-success/30">
          <CardContent className="p-6 space-y-3">
            <div className="text-5xl font-bold text-success">+{credits}</div>
            <div className="text-muted-foreground">crédits ajoutés à votre compte</div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/30">
              <Coins className="h-4 w-4 text-gold" />
              <span className="text-sm text-muted-foreground">Solde actuel :</span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="font-bold text-foreground">{balance ?? 0} crédits</span>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Les crédits sont disponibles immédiatement. Vous pouvez maintenant réserver des cours.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold btn-glow"
          >
            Retour au Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate("/tutors")}
            variant="outline"
            className="w-full h-11 rounded-xl"
          >
            <Users className="mr-2 h-4 w-4" />
            Trouver un tuteur
          </Button>
        </div>
      </div>
    </div>
  )
}
