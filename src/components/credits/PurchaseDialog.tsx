import { useEffect, useState } from "react"
import { Copy, Landmark, Loader2, MessageCircle, Smartphone, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { friendlyError, formatEur, type CreditPack } from "@/lib/credits"
import {
  availableMethods, formatIban, PAYMENT_METHOD_LABELS, revolutLink, usePaymentSettings,
  useRequestCreditPurchase, whatsappLink,
  type CreditPurchaseRequest, type PaymentMethod, type PaymentSettings,
} from "@/hooks/useCreditPurchases"

const METHOD_ICONS: Record<PaymentMethod, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  virement: Landmark,
  revolut: Smartphone,
}

const METHOD_HINTS: Record<PaymentMethod, string> = {
  whatsapp: "On vous répond et on vous guide pour payer",
  virement: "Virement SEPA vers notre compte",
  revolut: "Paiement instantané via Revolut",
}

interface Props {
  open: boolean
  /** Pack choisi : étape « choisir le moyen de paiement ». */
  pack: CreditPack | null
  /** Demande existante : on affiche directement ses instructions. */
  existingRequest: CreditPurchaseRequest | null
  pendingCount: number
  onClose: () => void
}

export function PurchaseDialog({ open, pack, existingRequest, pendingCount, onClose }: Props) {
  const { toast } = useToast()
  const { data: settings, isLoading } = usePaymentSettings()
  const requestPurchase = useRequestCreditPurchase()
  const [created, setCreated] = useState<CreditPurchaseRequest | null>(null)

  useEffect(() => {
    if (!open) setCreated(null)
  }, [open])

  const request = created ?? existingRequest
  const methods = availableMethods(settings)

  const choose = async (method: PaymentMethod) => {
    if (!pack) return
    try {
      const r = await requestPurchase.mutateAsync({ credits: pack.credits, method })
      setCreated(r)
    } catch (e) {
      toast({ variant: "destructive", title: "Demande impossible", description: friendlyError(e) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {request && settings ? (
          <Instructions request={request} settings={settings} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">
                {pack ? `${pack.credits} crédits · ${formatEur(pack.priceCents / 100)}` : "Acheter des crédits"}
              </DialogTitle>
              <DialogDescription>Choisissez comment vous voulez payer.</DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : methods.length === 0 ? (
              <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Les paiements ouvrent très bientôt. Revenez dans quelques heures ou écrivez-nous depuis la page Aide.
              </p>
            ) : pendingCount >= 3 ? (
              <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Vous avez déjà 3 demandes en attente. Annulez-en une ou attendez qu'elles soient validées.
              </p>
            ) : (
              <div className="space-y-2">
                {methods.map((m) => {
                  const Icon = METHOD_ICONS[m]
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={requestPurchase.isPending}
                      onClick={() => choose(m)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{PAYMENT_METHOD_LABELS[m]}</span>
                        <span className="block text-xs text-muted-foreground">{METHOD_HINTS[m]}</span>
                      </span>
                      {requestPurchase.isPending && requestPurchase.variables?.method === m && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Instructions({ request, settings }: { request: CreditPurchaseRequest; settings: PaymentSettings }) {
  const { toast } = useToast()
  const method = request.method as PaymentMethod
  const amount = formatEur(request.amount_eur)

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: `${label} copié` })
    } catch {
      toast({ variant: "destructive", title: "Copie impossible", description: value })
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display">
          <CheckCircle2 className="h-5 w-5 text-success" /> Demande enregistrée
        </DialogTitle>
        <DialogDescription>
          {request.credits} crédits · {amount} · {PAYMENT_METHOD_LABELS[method]}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 text-sm">
        <Field label="Montant" value={amount} onCopy={() => copy(String(Number(request.amount_eur)), "Montant")} />
        <Field label="Référence à indiquer" value={request.reference} mono onCopy={() => copy(request.reference, "Référence")} />

        {method === "virement" && settings.iban && (
          <>
            {settings.account_holder && <Field label="Bénéficiaire" value={settings.account_holder} />}
            <Field label="IBAN" value={formatIban(settings.iban)} mono onCopy={() => copy(settings.iban!, "IBAN")} />
            {settings.bic && <Field label="BIC" value={settings.bic} mono onCopy={() => copy(settings.bic!, "BIC")} />}
            <p className="text-xs text-muted-foreground">Mettez la référence dans le libellé du virement pour qu'on le retrouve.</p>
          </>
        )}

        {method === "revolut" && settings.revolut_tag && (
          <>
            <Field label="Revolut" value={`@${settings.revolut_tag}`} onCopy={() => copy(settings.revolut_tag!, "Identifiant Revolut")} />
            <Button asChild className="w-full">
              <a href={revolutLink(settings.revolut_tag)} target="_blank" rel="noopener noreferrer">Payer avec Revolut</a>
            </Button>
            <p className="text-xs text-muted-foreground">Ajoutez la référence en note du paiement.</p>
          </>
        )}

        {method === "whatsapp" && settings.whatsapp_number && (
          <Button asChild className="w-full bg-[#25D366] text-white hover:bg-[#1ebe57]">
            <a href={whatsappLink(settings.whatsapp_number, request)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Envoyer le message WhatsApp
            </a>
          </Button>
        )}

        {settings.instructions && (
          <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-line">{settings.instructions}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Vos crédits sont ajoutés dès que nous recevons le paiement, en général sous 24 h. Vous recevrez une notification.
        </p>
      </div>
    </>
  )
}

function Field({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate font-semibold ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      {onCopy && (
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onCopy} aria-label={`Copier ${label}`}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
