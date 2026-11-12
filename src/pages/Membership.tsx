import { Link, useNavigate } from "react-router-dom"
import { CalendarHeart, Check, Crown, Gift, Loader2, Sparkles, Ticket, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SEO } from "@/components/SEO"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useMemberOffers, useMyMembership, useRevisionPeriods, useSubscribe } from "@/hooks/useMembership"
import { EXPRESS_MINUTES, PERIOD_DAYS, PLANS, UPGRADE_PRICE_EUR, planName, type PlanId } from "@/lib/membership"
import { formatEur, friendlyError } from "@/lib/credits"
import { parisDayLabel } from "@/lib/agenda"
import { cn } from "@/lib/utils"

const dayLabel = (ymd: string) => parisDayLabel(ymd, { day: "numeric", month: "long" })

export default function Membership() {
  useDocumentTitle("Abonnement")
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const { data: m } = useMyMembership()
  const { data: credits } = useUserCredits()
  const { data: periods = [] } = useRevisionPeriods()
  const { data: offers = [] } = useMemberOffers(!!m?.active)
  const subscribe = useSubscribe()

  const balance = credits?.balanceEur ?? 0
  const current = m?.active ? m.plan : null
  const daysLeft = m?.active && m.ends_at ? Math.max(0, Math.ceil((new Date(m.ends_at).getTime() - Date.now()) / 86_400_000)) : 0
  const tutorOnly = !!user && hasRole("tutor") && !hasRole("student")

  const buy = async (plan: PlanId) => {
    if (!user) { navigate("/signup", { state: { from: "/abonnement" } }); return }
    try {
      await subscribe.mutateAsync(plan)
      toast.success(`Abonnement ${planName(plan)} actif ⭐`)
    } catch (e) {
      toast.error(friendlyError(e, "Abonnement impossible"))
    }
  }

  const action = (plan: PlanId, price: number) => {
    if (tutorOnly) return null
    const isUpgrade = current === "plus" && plan === "bac"
    const cost = isUpgrade ? UPGRADE_PRICE_EUR : price
    if (current === "bac" && plan === "plus") return <p className="rounded-xl bg-white/70 p-3 text-center text-sm font-semibold text-muted-foreground">Compris dans ton abonnement Bac</p>
    const label = !user ? "Créer un compte" : isUpgrade ? `Passer à Bac pour ${formatEur(cost)}` : current === plan ? `Prolonger de ${PERIOD_DAYS} jours · ${formatEur(cost)}` : `Payer ${formatEur(cost)} depuis mon solde`
    if (user && balance < cost) {
      return <Button asChild size="lg" variant="outline" className="w-full"><Link to="/credits">Recharger mon solde ({formatEur(Math.round((cost - balance) * 100) / 100)} manquants)</Link></Button>
    }
    return (
      <Button size="lg" variant={plan === "bac" ? "highlight" : "default"} className="w-full" disabled={subscribe.isPending} onClick={() => buy(plan)}>
        {subscribe.isPending ? <Loader2 className="animate-spin" /> : <Crown />} {label}
      </Button>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-4">
      <SEO title="Abonnement Plus et Bac" path="/abonnement"
        description="Passe devant dans la file des cours en direct, annule jusqu'à 2 h avant, et pendant les semaines de révision : une question express gratuite par jour." />

      <header className="reveal text-center">
        <span className="eyebrow"><Crown className="h-3.5 w-3.5" /> Abonnement</span>
        <h1 className="mt-5 text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[1.03]">Passe <span className="hl-mark">devant</span> quand ça presse.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-2/75">
          Sans engagement : {PERIOD_DAYS} jours payés depuis ton solde, <b>pas de renouvellement automatique</b>. Tu prolonges seulement si tu veux.
        </p>
      </header>

      {current && m && (
        <section className="sticker reveal flex flex-col gap-4 rounded-[1.5rem] bg-sun-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink-2 bg-sun"><Crown className="h-6 w-6" /></span>
            <div>
              <p className="font-display text-xl font-extrabold text-ink-2">Tu es membre {planName(current)}</p>
              <p className="text-sm text-ink-2/75">Jusqu'au {m.ends_at && parisDayLabel(new Date(m.ends_at), { day: "numeric", month: "long", year: "numeric" })} · encore {daysLeft} jour{daysLeft > 1 ? "s" : ""}. Annulation gratuite jusqu'à {m.cancel_hours} h avant tes cours.</p>
            </div>
          </div>
          {daysLeft <= 5 && <Button size="sm" onClick={() => buy(current)} disabled={subscribe.isPending}>Prolonger</Button>}
        </section>
      )}

      {m?.revision_label && (
        <section className="reveal flex flex-col gap-4 rounded-[1.5rem] border-2 border-ink-2 bg-mint-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarHeart className="h-8 w-8 shrink-0 text-ink-2" />
            <div>
              <p className="font-display text-lg font-extrabold text-ink-2">{m.revision_label} : c'est maintenant</p>
              <p className="text-sm text-ink-2/75">
                {current === "bac"
                  ? `Il te reste ${m.express_left_today} question express gratuite aujourd'hui (${EXPRESS_MINUTES} min avec un prof de permanence).`
                  : `Avec l'abonnement Bac : une question express gratuite par jour jusqu'au ${m.revision_ends_on ? dayLabel(m.revision_ends_on) : "bout de la semaine"}.`}
              </p>
            </div>
          </div>
          {current === "bac" && m.express_left_today > 0 && (
            <Button asChild variant="highlight"><Link to="/rejoindre?express=1"><Zap /> Poser ma question</Link></Button>
          )}
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
        {PLANS.map((p) => (
          <article key={p.id} className={cn("reveal relative flex flex-col rounded-[1.75rem] border-2 border-ink-2 p-6 sm:p-7",
            p.id === "bac" ? "bg-peri-soft shadow-hard" : "bg-white")}>
            {p.id === "bac" && <span className="absolute -top-3 left-6 rounded-full border-2 border-ink-2 bg-hl px-3 py-0.5 text-xs font-extrabold uppercase text-white">Spécial examens</span>}
            {current === p.id && <span className="absolute -top-3 right-6 rounded-full border-2 border-ink-2 bg-sun px-3 py-0.5 text-xs font-extrabold text-ink-2">Ta formule</span>}
            <p className="font-display text-2xl font-extrabold text-ink-2">{p.name}</p>
            <p className="mt-1 text-sm text-ink-2/70">{p.tagline}</p>
            <p className="mt-4 font-display text-5xl font-extrabold text-ink-2">{formatEur(p.priceEur).replace(",00", "")}<span className="font-sans text-base font-semibold text-muted-foreground"> / {PERIOD_DAYS} jours</span></p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2.5 text-[0.95rem] text-ink-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>{perk}
                </li>
              ))}
            </ul>
            <div className="mt-6">{action(p.id, p.priceEur)}</div>
          </article>
        ))}
      </div>
      {tutorOnly && <p className="text-center text-sm text-muted-foreground">L'abonnement est réservé aux comptes élèves.</p>}

      <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
        <section className="glass reveal p-6">
          <h2 className="flex items-center gap-2 text-xl"><CalendarHeart className="h-5 w-5 text-peri" /> Semaines de révision</h2>
          <p className="mt-1 text-sm text-muted-foreground">Des profs sont de permanence pour les membres Bac, jour et nuit.</p>
          {periods.length === 0
            ? <p className="mt-4 rounded-2xl bg-white/60 p-4 text-sm text-muted-foreground">Les prochaines dates seront annoncées ici (bac blanc, brevet, bac, partiels).</p>
            : (
              <ul className="mt-4 space-y-2">
                {periods.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm">
                    <span className="font-bold text-ink-2">{p.label}</span>
                    <span className="text-muted-foreground">du {dayLabel(p.starts_on)} au {dayLabel(p.ends_on)}</span>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <section className="glass reveal p-6">
          <h2 className="flex items-center gap-2 text-xl"><Gift className="h-5 w-5 text-hl" /> Offres membres</h2>
          {!current ? (
            <p className="mt-3 text-sm text-muted-foreground">Recharges bonus, codes et ventes flash : réservés aux membres Plus et Bac, publiés ici au fil de l'année.</p>
          ) : offers.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white/60 p-4 text-sm text-muted-foreground">Pas d'offre en ce moment. Tu seras prévenu dès la prochaine.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {offers.map((o) => (
                <li key={o.id} className="rounded-2xl border-2 border-ink-2 bg-white p-4">
                  <p className="flex items-center gap-2 font-bold text-ink-2"><Sparkles className="h-4 w-4 text-hl" />{o.title}</p>
                  {o.body && <p className="mt-1 text-sm text-ink-2/75">{o.body}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {o.code && <span className="flex items-center gap-1 rounded-full bg-sun px-2.5 py-1 font-extrabold"><Ticket className="h-3.5 w-3.5" />{o.code}</span>}
                    {o.ends_at && <span className="text-muted-foreground">jusqu'au {parisDayLabel(new Date(o.ends_at), { day: "numeric", month: "long" })}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass reveal p-6 text-sm text-ink-2/80">
        <h2 className="text-lg text-ink-2">Questions fréquentes</h2>
        <dl className="mt-3 space-y-3">
          <div><dt className="font-bold text-ink-2">Comment je paie ?</dt><dd>Avec ton solde sur le site. Recharge-le d'abord si besoin, puis clique sur « Payer ».</dd></div>
          <div><dt className="font-bold text-ink-2">Ça se renouvelle tout seul ?</dt><dd>Non. Ton abonnement s'arrête au bout de {PERIOD_DAYS} jours. Tu peux le prolonger quand tu veux, jusqu'à 2 mois d'avance.</dd></div>
          <div><dt className="font-bold text-ink-2">Je peux passer de Plus à Bac ?</dt><dd>Oui : tu paies seulement la différence ({formatEur(UPGRADE_PRICE_EUR)}) et ta date de fin ne change pas.</dd></div>
          <div><dt className="font-bold text-ink-2">C'est quoi une question express ?</dt><dd>Pendant une semaine de révision, les membres Bac rejoignent un prof de permanence pendant {EXPRESS_MINUTES} min, gratuitement, une fois par jour, à n'importe quelle heure. Les cours normaux restent au prix habituel.</dd></div>
        </dl>
      </section>
    </div>
  )
}
