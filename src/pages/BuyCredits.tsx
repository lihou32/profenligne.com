import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Clock, Gift, Wallet, X } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useCreditTransactions, useUserCredits } from "@/hooks/useCredits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FREE_CANCEL_HOURS, LESSON_DURATIONS, MAX_TOPUP_EUR, MIN_TOPUP_EUR, TOPUP_PACKS,
  centsToEur, friendlyError, formatEur, topupBonusEur,
} from "@/lib/credits"
import {
  useCancelCreditPurchase, useMyCreditPurchases, PAYMENT_METHOD_LABELS, PURCHASE_STATUS_LABELS,
  type CreditPurchaseRequest, type PaymentMethod,
} from "@/hooks/useCreditPurchases"
import { PurchaseDialog } from "@/components/credits/PurchaseDialog"
import { PageHeader } from "@/components/brand/PageHeader"
import { cn } from "@/lib/utils"

const TX_LABELS: Record<string, string> = {
  purchase: "Recharge",
  lesson_booking: "Réservation",
  refund: "Remboursement",
  referral: "Parrainage",
}

type Topup = { amountEur: number; bonusEur: number }

export default function BuyCredits() {
  useDocumentTitle("Mon solde")
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data: credits } = useUserCredits()
  const { data: transactions } = useCreditTransactions()
  const { data: purchases } = useMyCreditPurchases()
  const cancelPurchase = useCancelCreditPurchase()
  const [selected, setSelected] = useState<Topup | null>(null)
  const [openRequest, setOpenRequest] = useState<CreditPurchaseRequest | null>(null)
  const [custom, setCustom] = useState("")

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <h1 className="text-2xl">Connecte-toi pour recharger ton solde</h1>
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
  const dialogOpen = selected !== null || openRequest !== null
  const balance = credits?.balanceEur ?? 0
  const customAmount = Number(custom.replace(",", "."))
  const customValid = Number.isFinite(customAmount) && customAmount >= MIN_TOPUP_EUR && customAmount <= MAX_TOPUP_EUR

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end [&>*]:min-w-0">
        <PageHeader eyebrow="Mon solde" title={<>Recharge, <span className="hl-mark">réserve</span>, progresse.</>}
          subtitle={<>Le prix d'un cours est débité à la réservation et remboursé si le prof refuse ou si tu annules plus de {FREE_CANCEL_HOURS} h avant. Ton solde n'expire jamais.</>} />
        <div className="glass reveal flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Ton solde</p>
            <p className="font-display text-4xl font-medium text-ink-2 tabular">{formatEur(balance)}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-2 text-white"><Wallet className="h-6 w-6" /></span>
        </div>
      </div>

      <section className="glass reveal p-5 sm:p-6">
        <h2 className="text-lg">Le prix des cours</h2>
        <p className="mt-1 text-sm text-muted-foreground">Le même pour tous les profs.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {LESSON_DURATIONS.map((d) => (
            <div key={d.value} className="rounded-xl bg-secondary px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="font-display text-xl text-ink-2">{d.priceEur} €</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        {TOPUP_PACKS.map((pack) => (
          <div key={pack.amountEur} className={cn("glass reveal lift relative flex flex-col p-6", pack.recommended && "ring-2 ring-hl")}>
            {pack.recommended && <span className="absolute -top-3 left-6 rounded-full bg-hl px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Recommandé</span>}
            <p className="text-sm text-muted-foreground">{pack.description}</p>
            <p className="mt-2 font-display text-4xl font-medium text-ink-2">{pack.amountEur} €</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-success"><Gift className="h-4 w-4" /> +{formatEur(pack.bonusEur)} offerts</p>
            <p className="text-xs text-muted-foreground">soit {formatEur(pack.amountEur + pack.bonusEur)} sur ton solde</p>
            <Button onClick={() => setSelected(pack)} variant={pack.recommended ? "default" : "outline"} className="mt-6 w-full">Recharger</Button>
          </div>
        ))}
      </div>

      <form
        className="glass reveal flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        onSubmit={(e) => { e.preventDefault(); if (customValid) setSelected({ amountEur: customAmount, bonusEur: topupBonusEur(customAmount) }) }}
      >
        <div className="flex-1">
          <label htmlFor="custom-topup" className="text-sm font-semibold text-ink-2">Autre montant</label>
          <p className="text-xs text-muted-foreground">De {MIN_TOPUP_EUR} à {MAX_TOPUP_EUR} €, sans bonus. Pratique pour payer un seul cours.</p>
          <Input id="custom-topup" inputMode="decimal" placeholder="35" value={custom} onChange={(e) => setCustom(e.target.value)} className="mt-2 sm:max-w-[200px]" />
        </div>
        <Button type="submit" variant="outline" disabled={!customValid}>Recharger {customValid ? formatEur(customAmount) : ""}</Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Paiement par WhatsApp, virement ou Revolut. Ton solde est crédité dès que nous recevons le paiement, en général sous 24 h.
      </p>

      {(purchases?.length ?? 0) > 0 && (
        <Card className="reveal">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mes recharges</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {purchases!.slice(0, 10).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatEur(p.amount_eur)}{Number(p.bonus_eur) > 0 ? ` + ${formatEur(p.bonus_eur)} offerts` : ""} · {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
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
        topup={selected}
        existingRequest={openRequest}
        pendingCount={pending.length}
        onClose={() => { setSelected(null); setOpenRequest(null) }}
      />

      {(transactions?.length ?? 0) > 0 && (
        <Card className="reveal">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Historique</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            {transactions!.slice(0, 15).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.description || TX_LABELS[t.type] || t.type}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "d MMM yyyy à HH:mm", { locale: fr })}</p>
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${t.amount >= 0 ? "text-success" : "text-muted-foreground"}`}>
                  {t.amount > 0 ? "+" : ""}{formatEur(centsToEur(t.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
