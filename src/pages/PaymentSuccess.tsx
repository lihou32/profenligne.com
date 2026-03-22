import React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const credits = searchParams.get("credits") || "0"

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <CheckCircle2 className="w-20 h-20 text-green-500 animate-bounce" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Paiement réussi !</h1>
        <p className="text-lg text-gray-300 mb-6">Merci pour votre achat. Vous avez reçu</p>

        <div className="bg-gray-900 border border-green-500/30 rounded-lg p-6 mb-8">
          <div className="text-5xl font-bold text-green-500 mb-2">+{credits}</div>
          <div className="text-gray-400">crédits ajoutés à votre compte</div>
        </div>

        <p className="text-gray-400 mb-8">
          Les crédits sont disponibles immédiatement. Vous pouvez maintenant réserver des cours.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
          >
            Retour au Dashboard
          </Button>
          <Button
            onClick={() => navigate("/find-tutor")}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Trouver un tuteur
          </Button>
        </div>
      </div>
    </div>
  )
}
