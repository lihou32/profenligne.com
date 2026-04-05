import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, Coins, Zap, Crown, ShieldCheck } from "lucide-react"

interface CreditPack {
  credits: number
  price: number
  priceEuros: number
  description: string
  popular?: boolean
  icon: typeof Coins
  color: string
}

const CREDIT_PACKS: CreditPack[] = [
  { credits: 5,  price: 2500, priceEuros: 25, description: "Parfait pour essayer", icon: Coins, color: "from-info to-primary" },
  { credits: 10, price: 4500, priceEuros: 45, description: "Le plus populaire", popular: true, icon: Zap, color: "from-primary to-accent" },
  { credits: 20, price: 8000, priceEuros: 80, description: "Meilleure valeur", icon: Crown, color: "from-gold to-warning" },
]

export default function BuyCredits() {
  useDocumentTitle("Acheter des crédits")
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loadingPack, setLoadingPack] = useState<number | null>(null)

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold font-display">Veuillez vous connecter</h1>
          <Button onClick={() => navigate("/login")} className="rounded-xl gradient-primary text-primary-foreground">Aller à la connexion</Button>
        </div>
      </div>
    )
  }

  const handleBuy = async (pack: CreditPack) => {
    setLoadingPack(pack.credits)
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { credits: pack.credits, userId: user.id },
      })

      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur lors du paiement." })
        return
      }

      if (!data?.url) {
        toast({ variant: "destructive", title: "Erreur", description: "Réponse invalide du serveur." })
        return
      }

      window.location.href = data.url
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur inattendue s'est produite." })
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight font-display gradient-text">Acheter des crédits</h1>
        <p className="mt-2 text-muted-foreground">Choisissez un pack pour accéder aux tuteurs</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <Card
            key={pack.credits}
            className={`glass-card relative transition-all hover:shadow-xl ${
              pack.popular ? "border-gold ring-2 ring-gold/30" : ""
            }`}
          >
            {pack.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-black font-bold text-xs px-3">
                LE PLUS POPULAIRE
              </Badge>
            )}

            <CardHeader className="text-center pb-2">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl mb-3 bg-gradient-to-br ${pack.color} shadow-lg`}>
                <pack.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display">
                <span className="text-4xl font-bold">{pack.credits}</span>
                <span className="text-muted-foreground text-base ml-1">crédits</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
              <div className="mt-3">
                <span className="text-3xl font-bold">{pack.priceEuros}</span>
                <span className="text-muted-foreground">€</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(pack.priceEuros / pack.credits).toFixed(2)}€ par crédit
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2.5">
                {["Crédits non expirables", "Paiement sécurisé Stripe", "Accès immédiat"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleBuy(pack)}
                disabled={loadingPack !== null}
                className={`w-full rounded-xl font-semibold h-11 ${
                  pack.popular
                    ? "gradient-primary text-primary-foreground btn-glow"
                    : ""
                }`}
                variant={pack.popular ? "default" : "outline"}
              >
                {loadingPack === pack.credits ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Traitement...</span>
                ) : "Acheter maintenant"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <p>Paiement sécurisé par <span className="font-semibold text-foreground">Stripe</span></p>
      </div>
    </div>
  )
}
