import { useState } from "react"
import { CalendarHeart, Crown, Gift, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdminMembershipStats, useAdminOffers, useAdminRevisionPeriods } from "@/hooks/useMembership"
import { EXPRESS_PAYOUT_EUR } from "@/lib/membership"
import { formatEur, friendlyError } from "@/lib/credits"
import { parisDayLabel, parisDate } from "@/lib/agenda"
import { cn } from "@/lib/utils"

const fmtDay = (ymd: string) => parisDayLabel(ymd, { day: "numeric", month: "short", year: "numeric" })

/** Admin : abonnés, semaines de révision (questions express) et offres membres. */
export function AdminMembershipTab() {
  const { data: stats } = useAdminMembershipStats()
  const periods = useAdminRevisionPeriods()
  const offers = useAdminOffers()
  const today = parisDate()

  const [label, setLabel] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [code, setCode] = useState("")
  const [bacOnly, setBacOnly] = useState(false)
  const [until, setUntil] = useState("")

  const addPeriod = async () => {
    if (label.trim().length < 2 || !from || !to) { toast.error("Nom, début et fin obligatoires"); return }
    try {
      await periods.add.mutateAsync({ label: label.trim(), starts_on: from, ends_on: to })
      setLabel(""); setFrom(""); setTo("")
      toast.success("Semaine de révision ajoutée")
    } catch (e) { toast.error(friendlyError(e, "Ajout impossible (31 jours maximum)")) }
  }
  const addOffer = async () => {
    if (title.trim().length < 2) { toast.error("Donne un titre à l'offre"); return }
    try {
      await offers.add.mutateAsync({
        title: title.trim(), body: body.trim() || null, code: code.trim() || null,
        plans: bacOnly ? ["bac"] : ["plus", "bac"], ends_at: until ? new Date(`${until}T23:59:00`).toISOString() : null,
      })
      setTitle(""); setBody(""); setCode(""); setUntil(""); setBacOnly(false)
      toast.success("Offre publiée pour les membres")
    } catch (e) { toast.error(friendlyError(e, "Publication impossible")) }
  }

  const tiles = [
    { label: "Abonnés Plus", value: stats?.plus_active ?? 0, tone: "bg-peri-soft" },
    { label: "Abonnés Bac", value: stats?.bac_active ?? 0, tone: "bg-sun-soft" },
    { label: "Finissent sous 7 j", value: stats?.ending_7d ?? 0, tone: "bg-hl-soft" },
    { label: "Encaissé (30 j)", value: formatEur(Number(stats?.revenue_30d_eur ?? 0)), tone: "bg-mint-soft" },
    { label: "Questions express (mois)", value: `${stats?.express_this_month ?? 0} · ${formatEur(Number(stats?.express_cost_eur ?? 0))}`, tone: "bg-sky-soft" },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className={cn("rounded-2xl border-2 border-ink-2 p-4", t.tone)}>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-2/70">{t.label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink-2">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="glass p-5">
          <h3 className="flex items-center gap-2 text-lg"><CalendarHeart className="h-5 w-5 text-peri" /> Semaines de révision</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Pendant ces dates, chaque abonné Bac a une question express gratuite par jour. Le prof qui la prend touche {EXPRESS_PAYOUT_EUR} €, payés par la plateforme.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1 sm:col-span-3"><Label>Nom</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Bac 2027 : philo" maxLength={80} /></div>
            <div className="space-y-1"><Label>Début</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>Fin</Label><Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
            <Button onClick={addPeriod} disabled={periods.add.isPending}>Ajouter</Button>
          </div>
          <ul className="mt-4 divide-y-2 divide-ink/5">
            {(periods.list.data ?? []).map((p) => {
              const live = p.starts_on <= today && today <= p.ends_on
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <b className="text-ink-2">{p.label}</b> · {fmtDay(p.starts_on)} → {fmtDay(p.ends_on)}
                    {live && <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-ink-2">en cours</span>}
                  </span>
                  <button onClick={() => periods.remove.mutate(p.id)} aria-label={`Supprimer ${p.label}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              )
            })}
            {!periods.list.isLoading && !(periods.list.data ?? []).length && <li className="py-4 text-sm text-muted-foreground">Aucune semaine prévue.</li>}
          </ul>
        </section>

        <section className="glass p-5">
          <h3 className="flex items-center gap-2 text-lg"><Gift className="h-5 w-5 text-hl" /> Offres membres</h3>
          <p className="mt-1 text-sm text-muted-foreground">Visibles seulement par les abonnés, sur leur page Abonnement (code promo, recharge bonus, vente flash…).</p>
          <div className="mt-4 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre : +10 € offerts sur ta recharge de 70 €" maxLength={100} />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Détail (facultatif)" maxLength={600} rows={2} />
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code (facultatif)" maxLength={40} />
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Fin de l'offre" />
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-2"><input type="checkbox" checked={bacOnly} onChange={(e) => setBacOnly(e.target.checked)} /> Bac seulement</label>
            </div>
            <Button onClick={addOffer} disabled={offers.add.isPending} className="w-full"><Crown /> Publier l'offre</Button>
          </div>
          <ul className="mt-4 divide-y-2 divide-ink/5">
            {(offers.list.data ?? []).map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span>
                  <b className="text-ink-2">{o.title}</b>{o.code && <span className="ml-2 rounded bg-sun-soft px-1.5 py-0.5 font-mono text-xs">{o.code}</span>}
                  <span className="block text-xs text-muted-foreground">
                    {o.plans.length === 1 ? "Bac seulement" : "Plus et Bac"}{o.ends_at ? ` · jusqu'au ${parisDayLabel(new Date(o.ends_at), { day: "numeric", month: "short" })}` : ""}
                  </span>
                </span>
                <button onClick={() => offers.remove.mutate(o.id)} aria-label={`Supprimer ${o.title}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!offers.list.isLoading && !(offers.list.data ?? []).length && <li className="py-4 text-sm text-muted-foreground">Aucune offre en cours.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
