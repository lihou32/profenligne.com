// Abonnements élèves — mêmes règles que la base (migration 20261112000700_member_plans.sql).

export type PlanId = "plus" | "bac"

export interface Plan {
  id: PlanId
  name: string
  priceEur: number
  tagline: string
  perks: string[]
}

export const MEMBER_CANCEL_HOURS = 2
export const EXPRESS_MINUTES = 10
export const EXPRESS_PER_DAY = 1
export const EXPRESS_PAYOUT_EUR = 5
export const PERIOD_DAYS = 30

export const PLANS: Plan[] = [
  {
    id: "plus",
    name: "Plus",
    priceEur: 9.99,
    tagline: "Pour passer devant quand ça presse.",
    perks: [
      "Prioritaire dans la file « Rejoindre un cours » : tu passes devant les élèves sans abonnement",
      `Annulation gratuite jusqu'à ${MEMBER_CANCEL_HOURS} h avant le cours (au lieu de 24 h)`,
      "Offres réservées aux membres (recharges bonus, codes, ventes flash)",
      "Les nouveautés du site en avant-première",
    ],
  },
  {
    id: "bac",
    name: "Bac",
    priceEur: 15.99,
    tagline: "Pour les semaines où tout se joue.",
    perks: [
      "Tout ce que donne Plus",
      "Priorité maximale dans la file, devant les membres Plus",
      `Semaines de révision (bac, brevet, partiels) : ${EXPRESS_PER_DAY} question express gratuite par jour, ${EXPRESS_MINUTES} min avec un prof de permanence, à toute heure`,
    ],
  },
]

export const planName = (p?: string | null) => (p === "bac" ? "Bac" : p === "plus" ? "Plus" : "")
export const UPGRADE_PRICE_EUR = Math.round((PLANS[1].priceEur - PLANS[0].priceEur) * 100) / 100
