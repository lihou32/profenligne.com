import { useNavigate } from "react-router-dom"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowRight, RotateCcw } from "lucide-react"

export default function PaymentCancel() {
  useDocumentTitle("Paiement annulé")
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-5">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold font-display">Paiement annulé</h1>
          <p className="mt-2 text-muted-foreground">
            Vous avez annulé le paiement. Aucun frais n'a été débité.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/credits")}
            className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="w-full h-11 rounded-xl"
          >
            Retour au Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
