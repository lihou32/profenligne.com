import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Check, Coins, Zap, Crown, Info, Clock, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useCreditTransactions, useUserCredits } from "@/hooks/useCredits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CREDIT_PACKS, CREDIT_VALUE_EUR, FREE_CANCEL_HOURS, type CreditPack, friendlyError, formatEur } from "@/lib/credits"
import {
  useCancelCreditPurchase, useMyCreditPurchases, PAYMENT_METHOD_LABELS, PURCHASE_STATUS_LABELS,
  type CreditPurchaseRequest, type PaymentMethod,
} from "@/hooks/useCreditPurchases"
import { PurchaseDialog } from "@/components/credits/PurchaseDialog"
import { PageHeader } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"

const PACK_STYLE = [
  { icon: Coins, color: "bg-peri-soft" },
  { icon: Zap, color: "bg-hl-soft" },
  { icon: Crown, color: "bg-mint-soft" },
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
  const { data: purchases } = useMyCreditPurchases()
  const cancelPurchase = useCancelCreditPurchase()
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null)
  const [openRequest, setOpenRequest] = useState<CreditPurchaseRequest | null>(null)

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl">Connecte-toi pour acheter des crédits</h1>
          <Button onClick={() => navigate("/login")}>Se connecter</Button>
        </div>
      </div>
    )
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelPurchase.mutateAsync(id)
      toast({ title: "Demande annulée" })
    } catch (e) {
      toast({ variant: "destructive", title: "Annulation impossible", description: friendlyError(e) })
    }
  }

  const pending = (purchases ?? []).filter((p) => p.status === "pending")
  const dialogOpen = selectedPack !== null || openRequest !== null

  const balance = credits?.balance ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end [&>*]:min-w-0">
        <PageHeader eyebrow="Crédits" title={<>Recharge, <span className="hl-mark">réserve</span>, progresse.</>}
          subtitle={<>1 crédit = {CREDIT_VALUE_EUR} € de cours. Débités à la réservation, remboursés si le prof refuse ou si tu annules plus de {FREE_CANCEL_HOURS} h avant. Ils n'expirent jamais.</>} />
        <div className="glass-ink reveal flex items-center justify-between rounded-3xl p-5">
          <div>
            <p className="text-sm text-white/70">Ton solde</p>
            <p className="display text-4xl tabular">{balance} <span className="text-lg text-white/70">crédit{balance > 1 ? "s" : ""}</span></p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hl text-ink-2 [&>*]:min-w-0"><Coins className="h-6 w-6" /></span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
        {CREDIT_PACKS.map((pack, i) => {
          const style = PACK_STYLE[i % PACK_STYLE.length]
          const price = pack.priceCents / 100
          const perCredit = price / pack.credits
          const saving = Math.round((1 - perCredit / CREDIT_VALUE_EUR) * 100)
          return (
            <div key={pack.credits} className={cn("glass reveal lift relative flex flex-col p-6", pack.popular && "ring-2 ring-hl")}>
              {pack.popular && <span className="absolute -top-3 left-6 rounded-full bg-hl px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-2">Le plus choisi</span>}
              <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", style.color)}><style.icon className="h-6 w-6 text-ink" /></span>
              <p className="mt-4"><span className="display text-5xl text-ink-2">{pack.credits}</span> <span className="font-display font-bold text-muted-foreground">crédits</span></p>
              <p className="text-sm text-muted-foreground">{pack.description} · {pack.credits * CREDIT_VALUE_EUR} € de cours</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="display text-3xl text-ink-2">{price} €</span>
                {saving > 0 && <span className="rounded-full bg-mint-soft px-2 py-0.5 text-xs font-bold text-success">−{saving} %</span>}
              </div>
              <p className="text-xs text-muted-foreground">{perCredit.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} le crédit</p>
              <Button onClick={() => setSelectedPack(pack)} variant={pack.popular ? "default" : "outline"} className="mt-6 w-full">Choisir ce pack</Button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Paiement par WhatsApp, virement ou Revolut. Vos crédits sont ajoutés dès que nous recevons le paiement, en général sous 24 h.
      </p>

      {(purchases?.length ?? 0) > 0 && (
        <Card className="reveal">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display">Mes demandes d'achat</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {purchases!.slice(0, 10).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.credits} crédits · {formatEur(p.amount_eur)} · {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Réf. <span className="font-mono">{p.reference}</span> · {format(new Date(p.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                    {p.status === "rejected" && p.admin_note ? ` · ${p.admin_note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "confirmed" ? "default" : "secondary"} className="gap-1">
                    {p.status === "pending" && <Clock className="h-3 w-3" />}
                    {PURCHASE_STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setOpenRequest(p)}>
                        Comment payer
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="text-muted-foreground"
                        disabled={cancelPurchase.isPending}
                        onClick={() => handleCancel(p.id)}
                        aria-label="Annuler la demande"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PurchaseDialog
        open={dialogOpen}
        pack={selectedPack}
        existingRequest={openRequest}
        pendingCount={pending.length}
        onClose={() => { setSelectedPack(null); setOpenRequest(null) }}
      />

      {(transactions?.length ?? 0) > 0 && (
        <Card className="reveal">
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
