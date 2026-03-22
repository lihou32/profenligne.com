import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Check } from "lucide-react"

interface CreditPack {
  credits: number
  price: number
  priceEuros: number
  description: string
  popular?: boolean
}

const CREDIT_PACKS: CreditPack[] = [
  { credits: 5,  price: 2500, priceEuros: 25, description: "Parfait pour essayer" },
  { credits: 10, price: 4500, priceEuros: 45, description: "Le plus populaire", popular: true },
  { credits: 20, price: 8000, priceEuros: 80, description: "Meilleure valeur" },
]

export default function BuyCredits() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loadingPack, setLoadingPack] = useState<number | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Veuillez vous connecter</h1>
          <Button onClick={() => navigate("/login")}>Aller à la connexion</Button>
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
    <div className="min-h-screen bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Acheter des crédits</h1>
          <p className="text-lg text-gray-400">Choisissez un pack pour accéder aux tuteurs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.credits}
              className={`relative rounded-lg border transition-all duration-300 ${
                pack.popular
                  ? "border-blue-500 shadow-lg shadow-blue-500/20 md:scale-105"
                  : "border-gray-700 hover:border-gray-600"
              } bg-gray-900 p-8`}
            >
              {pack.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-block bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Populaire
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">{pack.credits}</div>
                <div className="text-gray-400 text-sm mb-4">crédits</div>
                <div className="text-3xl font-bold text-white mb-2">{pack.priceEuros}€</div>
                <p className="text-gray-500 text-sm">{pack.description}</p>
              </div>

              <div className="text-center mb-6 text-gray-400 text-xs">
                {(pack.priceEuros / pack.credits).toFixed(2)}€ par crédit
              </div>

              <ul className="space-y-3 mb-8">
                {["Crédits non expirables", "Paiement sécurisé Stripe", "Accès immédiat"].map((b) => (
                  <li key={b} className="flex items-center text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleBuy(pack)}
                disabled={loadingPack !== null}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
              >
                {loadingPack === pack.credits ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</>
                ) : "Acheter maintenant"}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>Paiement sécurisé par <span className="text-white font-semibold">Stripe</span></p>
        </div>
      </div>
    </div>
  )
}
