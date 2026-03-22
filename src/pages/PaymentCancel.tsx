import React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default function PaymentCancel() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <XCircle className="w-20 h-20 text-red-500" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">Paiement annulé</h1>
        <p className="text-lg text-gray-300 mb-8">
          Vous avez annulé le paiement. Aucun frais n'a été débité.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/buy-credits")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
          >
            Réessayer
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Retour au Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
