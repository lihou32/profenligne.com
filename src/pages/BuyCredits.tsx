import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Loader2, Check, Coins, Zap, Crown, ShieldCheck, Info } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useCreditTransactions, useUserCredits } from "@/hooks/useCredits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CREDIT_PACKS, CREDIT_VALUE_EUR, FREE_CANCEL_HOURS, type CreditPack, friendlyError } from "@/lib/credits"

const PACK_STYLE = [
  { icon: Coins, color: "from-info to-primary" },
  { icon: Zap, color: "from-primary to-accent" },
  { icon: Crown, color: "from-gold to-warning" },
]

const TX_LABELS: Record<string, string> = {
  purchase: "Achat",
  lesson_booking: "Réservation",
  refund: "Remboursement",
  referral: "Parrainage",
}

export default function BuyCredits() {
  useDocumentTitle("Acheter des crédits")
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: credits } = useUserCredits()
  const { data: transactions } = useCreditTransactions()
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
      // L'acheteur est identifié côté serveur par son token, pas par le corps de la requête
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { credits: pack.credits },
      })
      if (error || !data?.url) {
        toast({ variant: "destructive", title: "Paiement indisponible", description: friendlyError(error, "Réessayez dans un instant.") })
        return
      }
      window.location.href = data.url
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: friendlyError(e, "Une erreur inattendue s'est produite.") })
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight font-display gradient-text">Acheter des crédits</h1>
        <p className="mt-2 text-muted-foreground">
          Solde actuel : <strong className="text-foreground">{credits?.balance ?? 0} crédit{(credits?.balance ?? 0) > 1 ? "s" : ""}</strong>
        </p>
      </div>

      <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">1 crédit = {CREDIT_VALUE_EUR} € de cours.</strong>{" "}
          Un cours d'1 h avec un professeur à 35 €/h coûte 7 crédits. Les crédits sont débités à la réservation,
          remboursés si le professeur refuse ou si vous annulez plus de {FREE_CANCEL_HOURS} h avant, et n'expirent jamais.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {CREDIT_PACKS.map((pack, i) => {
          const style = PACK_STYLE[i % PACK_STYLE.length]
          const price = pack.priceCents / 100
          const perCredit = price / pack.credits
          const saving = Math.round((1 - perCredit / CREDIT_VALUE_EUR) * 100)
          return (
            <Card
              key={pack.credits}
              className={`glass-card relative transition-all hover:shadow-xl ${pack.popular ? "border-gold ring-2 ring-gold/30" : ""}`}
            >
              {pack.popular && (
                <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap bg-gold text-black font-bold text-xs px-3">
                  LE PLUS POPULAIRE
                </Badge>
              )}

              <CardHeader className="text-center pb-2">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-xl mb-3 bg-gradient-to-br ${style.color} shadow-lg`}>
                  <style.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="font-display">
                  <span className="text-4xl font-bold">{pack.credits}</span>
                  <span className="text-muted-foreground text-base ml-1">crédits</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{pack.description}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{price}</span>
                  <span className="text-muted-foreground">€</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {perCredit.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} par crédit
                  {saving > 0 && <span className="ml-1 font-semibold text-success">(−{saving} %)</span>}
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {["Crédits sans date d'expiration", "Paiement sécurisé Stripe", "Disponibles dès le paiement validé"].map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleBuy(pack)}
                  disabled={loadingPack !== null}
                  className={`w-full rounded-xl font-semibold h-11 ${pack.popular ? "gradient-primary text-primary-foreground btn-glow" : ""}`}
                  variant={pack.popular ? "default" : "outline"}
                >
                  {loadingPack === pack.credits ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Redirection…</span>
                  ) : "Acheter maintenant"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <p>Paiement sécurisé par <span className="font-semibold text-foreground">Stripe</span></p>
      </div>

      {(transactions?.length ?? 0) > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display">Historique</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {transactions!.slice(0, 15).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description || TX_LABELS[t.type] || t.type}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "d MMM yyyy à HH:mm", { locale: fr })}</p>
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${t.amount >= 0 ? "text-success" : "text-muted-foreground"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
