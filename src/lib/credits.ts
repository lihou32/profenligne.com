/**
 * Règles économiques de Prof en Ligne — côté front.
 *
 * ⚠️ La source de vérité est la base (public.app_setting, lesson_price_cents,
 * topup_bonus_eur, book_lesson…) : supabase/migrations/20261111000300_fixed_prices_euro_wallet.sql.
 * Ces valeurs servent uniquement à l'affichage et doivent rester alignées.
 *
 * Modèle (Excel « prof en ligne ») : prix identique pour tous les profs selon la
 * durée, solde en euros rechargeable avec bonus, commission 20 %, frais de retrait 2 %.
 * En base, le solde et les mouvements sont stockés en centimes.
 */

/** Part gardée par la plateforme sur chaque cours. */
export const PLATFORM_COMMISSION = 0.2;

/** Frais prélevés sur un retrait de prof. */
export const WITHDRAWAL_FEE_RATE = 0.02;

/** Annulation gratuite par l'élève jusqu'à N heures avant le cours. */
export const FREE_CANCEL_HOURS = 24;

/** La salle de cours ouvre N minutes avant le début. */
export const ROOM_OPEN_MINUTES_BEFORE = 15;

/** Retrait minimum pour un professeur, en euros. */
export const MIN_WITHDRAWAL_EUR = 20;

/** Bonus de parrainage, en euros, pour chacun des deux. */
export const REFERRAL_BONUS_EUR = 10;

/** Recharge libre : bornes en euros (sans bonus). */
export const MIN_TOPUP_EUR = 15;
export const MAX_TOPUP_EUR = 500;

/** Grille de prix unique (en euros), la même pour tous les profs. */
export const LESSON_DURATIONS = [
  { value: 20, label: "20 min", priceEur: 15 },
  { value: 30, label: "30 min", priceEur: 25 },
  { value: 45, label: "45 min", priceEur: 30 },
  { value: 60, label: "1 heure", priceEur: 35 },
  { value: 90, label: "1h30", priceEur: 50 },
  { value: 120, label: "2 heures", priceEur: 65 },
] as const;

/** Prix le plus bas (pour « dès 15 € »). */
export const MIN_LESSON_PRICE_EUR = LESSON_DURATIONS[0].priceEur;

/** Cours en direct (sans réservation) : supplément le soir — même règle que public.late_surcharge_cents. */
export const LATE_SURCHARGE_EUR = 5;
export const LATE_START_HOUR = 21;
export const LATE_END_HOUR = 6;
/** Un cours « en direct » commence dans les N minutes. */
export const INSTANT_WINDOW_MINUTES = 15;

/** Heure de Paris (0–23) d'un instant donné. */
export function parisHour(at: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).format(at));
}

/** Supplément d'un cours en direct (5 € entre 21 h et 6 h, heure de Paris), 0 sinon. */
export function lateSurchargeEur(instant: boolean, at: Date = new Date()): number {
  if (!instant) return 0;
  const h = parisHour(at);
  return h >= LATE_START_HOUR || h < LATE_END_HOUR ? LATE_SURCHARGE_EUR : 0;
}

/** Prix d'un cours selon sa durée (0 si la durée n'existe pas). */
export function lessonPriceEur(durationMinutes: number): number {
  return LESSON_DURATIONS.find((d) => d.value === durationMinutes)?.priceEur ?? 0;
}

/** Ce que touche le prof sur un cours (avant frais de retrait). */
export function tutorShareEur(durationMinutes: number): number {
  return Math.round(lessonPriceEur(durationMinutes) * (1 - PLATFORM_COMMISSION) * 100) / 100;
}

/** Prix payé pour un cours déjà réservé (centimes en base ; anciens cours en crédits à 5 €). */
export function lessonPaidEur(lesson: { price_cents?: number | null; credits_cost?: number | null; duration_minutes?: number }): number {
  if (lesson.price_cents) return lesson.price_cents / 100;
  if (lesson.credits_cost) return lesson.credits_cost * 5;
  return lesson.duration_minutes ? lessonPriceEur(lesson.duration_minutes) : 0;
}

export interface TopupPack {
  /** Montant payé, en euros. */
  amountEur: number;
  /** Montant offert en plus, en euros. */
  bonusEur: number;
  description: string;
  recommended?: boolean;
}

/** Recharges avec bonus de fidélité — même grille que public.topup_bonus_eur. */
export const TOPUP_PACKS: TopupPack[] = [
  { amountEur: 50, bonusEur: 5, description: "Pour démarrer" },
  { amountEur: 70, bonusEur: 7.5, description: "Deux heures et plus" },
  { amountEur: 100, bonusEur: 15, description: "Le bon équilibre", recommended: true },
  { amountEur: 150, bonusEur: 25, description: "Le plus avantageux" },
];

/** Bonus offert pour une recharge (0 hors packs). */
export function topupBonusEur(amountEur: number): number {
  return TOPUP_PACKS.find((p) => p.amountEur === amountEur)?.bonusEur ?? 0;
}

/** Solde (centimes en base) → euros. */
export function centsToEur(cents: number | null | undefined): number {
  return (Number(cents) || 0) / 100;
}

/** Frais et montant net d'un retrait. */
export function withdrawalBreakdown(amountEur: number): { feeEur: number; netEur: number } {
  const feeEur = Math.round(amountEur * WITHDRAWAL_FEE_RATE * 100) / 100;
  return { feeEur, netEur: Math.round((amountEur - feeEur) * 100) / 100 };
}

/** Code de parrainage — même formule que public.referral_code_for. */
export function referralCodeFor(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Le cours peut-il encore être annulé avec remboursement par l'élève ? */
export function isFreeCancellation(status: string, scheduledAt: string, now = Date.now()): boolean {
  if (status === "pending") return true;
  return new Date(scheduledAt).getTime() - now > FREE_CANCEL_HOURS * 3600 * 1000;
}

/** La salle est-elle ouverte (on peut démarrer le cours) ? */
export function isRoomOpen(scheduledAt: string, durationMinutes: number, now = Date.now()): boolean {
  const start = new Date(scheduledAt).getTime();
  return now >= start - ROOM_OPEN_MINUTES_BEFORE * 60 * 1000 && now <= start + (durationMinutes + 60) * 60 * 1000;
}

/** Traduit une erreur Supabase / Postgres en message lisible. */
export function friendlyError(error: unknown, fallback = "Une erreur est survenue"): string {
  const msg = (error as { message?: string } | null)?.message;
  if (!msg) return fallback;
  if (/row-level security|permission denied|JWT/i.test(msg)) return "Action non autorisée";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Connexion impossible, vérifiez votre réseau";
  return msg;
}

/** Montant en euros au format français (« 32,00 € »). */
export function formatEur(amount: number | string | null | undefined): string {
  return (Number(amount) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
