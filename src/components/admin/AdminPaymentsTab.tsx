import { useEffect, useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Check, Loader2, Save, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { friendlyError, formatEur } from "@/lib/credits"
import {
  PAYMENT_METHOD_LABELS, PURCHASE_STATUS_LABELS, useAdminCreditPurchases, useAdminPurchaseActions,
  usePaymentSettings, useUpdatePaymentSettings, type PaymentMethod,
} from "@/hooks/useCreditPurchases"

const FILTERS: { value: string | null; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: null, label: "Toutes" },
]

export function AdminPaymentsTab() {
  const { toast } = useToast()
  const [status, setStatus] = useState<string | null>("pending")
  const { data: rows, isLoading } = useAdminCreditPurchases(status)
  const { confirm, reject } = useAdminPurchaseActions()

  const onConfirm = async (id: string, label: string) => {
    if (!window.confirm(`Confirmer la réception du paiement ${label} ? Le solde de l'élève (avec le bonus éventuel) sera crédité immédiatement.`)) return
    try {
      await confirm.mutateAsync({ id })
      toast({ title: "Paiement validé", description: "Le solde de l'élève a été crédité." })
    } catch (e) {
      toast({ variant: "destructive", title: "Validation impossible", description: friendlyError(e) })
    }
  }

  const onReject = async (id: string) => {
    const note = window.prompt("Motif du refus (visible par l'élève) :", "Paiement non reçu")
    if (note === null) return
    try {
      await reject.mutateAsync({ id, note })
      toast({ title: "Demande refusée" })
    } catch (e) {
      toast({ variant: "destructive", title: "Refus impossible", description: friendlyError(e) })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Recharges de solde à vérifier</CardTitle>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <Button
                  key={f.label} size="sm" variant={status === f.value ? "default" : "outline"}
                  onClick={() => setStatus(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (rows?.length ?? 0) === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Aucune demande</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3">Référence</th>
                    <th className="p-3">Élève</th>
                    <th className="p-3">Pack</th>
                    <th className="p-3">Moyen</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows!.map((r) => {
                    const name = [r.first_name, r.last_name].filter(Boolean).join(" ")
                    const busy = (confirm.isPending && confirm.variables?.id === r.id) || (reject.isPending && reject.variables?.id === r.id)
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 font-mono font-semibold">{r.reference}</td>
                        <td className="p-3">
                          <p className="font-medium">{name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatEur(r.amount_eur)}{Number(r.bonus_eur) > 0 && <span className="block text-xs text-success">+{formatEur(r.bonus_eur)} offerts</span>}</td>
                        <td className="p-3">{PAYMENT_METHOD_LABELS[r.method as PaymentMethod] ?? r.method}</td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {format(new Date(r.created_at), "dd MMM HH:mm", { locale: fr })}
                        </td>
                        <td className="p-3">
                          <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                            {PURCHASE_STATUS_LABELS[r.status] ?? r.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {r.status === "pending" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" disabled={busy} onClick={() => onConfirm(r.id, `${r.reference} (${formatEur(r.amount_eur)})`)}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Payé
                              </Button>
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReject(r.id)} aria-label="Refuser">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentSettingsCard />
    </div>
  )
}

function PaymentSettingsCard() {
  const { toast } = useToast()
  const { data: settings, isLoading } = usePaymentSettings()
  const update = useUpdatePaymentSettings()
  const [form, setForm] = useState({
    whatsapp_number: "", account_holder: "", iban: "", bic: "", revolut_tag: "", instructions: "",
  })

  useEffect(() => {
    if (!settings) return
    setForm({
      whatsapp_number: settings.whatsapp_number ?? "",
      account_holder: settings.account_holder ?? "",
      iban: settings.iban ?? "",
      bic: settings.bic ?? "",
      revolut_tag: settings.revolut_tag ?? "",
      instructions: settings.instructions ?? "",
    })
  }, [settings])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync(form)
      toast({ title: "Coordonnées enregistrées" })
    } catch (err) {
      toast({ variant: "destructive", title: "Enregistrement impossible", description: friendlyError(err) })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Coordonnées de paiement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visibles par les élèves connectés. Un moyen de paiement n'apparaît que si son champ est rempli.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa">Numéro WhatsApp</Label>
              <Input id="wa" value={form.whatsapp_number} onChange={set("whatsapp_number")} placeholder="33612345678" inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev">Identifiant Revolut</Label>
              <Input id="rev" value={form.revolut_tag} onChange={set("revolut_tag")} placeholder="lihou" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="holder">Titulaire du compte</Label>
              <Input id="holder" value={form.account_holder} onChange={set("account_holder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bic">BIC</Label>
              <Input id="bic" value={form.bic} onChange={set("bic")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" value={form.iban} onChange={set("iban")} placeholder="FR76 …" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="instr">Message affiché aux élèves (optionnel)</Label>
              <Textarea id="instr" value={form.instructions} onChange={set("instructions")} rows={2} maxLength={500} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
