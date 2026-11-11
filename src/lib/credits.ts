/**
 * Règles économiques de Prof en Ligne — côté front.
 *
 * ⚠️ La source de vérité est la base (public.app_setting, book_lesson…).
 * Ces valeurs servent uniquement à l'affichage et doivent rester alignées avec :
 *   - supabase/migrations/20261111000000_security_credits_lifecycle.sql
 *   - supabase/functions/create-checkout-session (CREDIT_PACKS)
 *   - supabase/functions/stripe-webhook (CREDIT_PACKS)
 */

/** Valeur faciale d'un crédit, en euros. */
export const CREDIT_VALUE_EUR = 5;

/** Part reversée à la plateforme sur chaque cours. */
export const PLATFORM_COMMISSION = 0.2;

/** Bornes du tarif horaire d'un professeur. */
export const MIN_HOURLY_RATE = 10;
export const MAX_HOURLY_RATE = 150;

/** Annulation gratuite par l'élève jusqu'à N heures avant le cours. */
export const FREE_CANCEL_HOURS = 24;

/** La salle de cours ouvre N minutes avant le début. */
export const ROOM_OPEN_MINUTES_BEFORE = 15;

/** Retrait minimum pour un professeur, en euros. */
export const MIN_WITHDRAWAL_EUR = 20;

/** Bonus de parrainage (crédits, pour chacun des deux). */
export const REFERRAL_BONUS_CREDITS = 2;

export const LESSON_DURATIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 heures" },
] as const;

export interface CreditPack {
  credits: number;
  /** Prix en centimes (Stripe). */
  priceCents: number;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { credits: 5, priceCents: 2500, description: "Parfait pour essayer" },
  { credits: 10, priceCents: 4500, description: "Le bon équilibre", popular: true },
  { credits: 20, priceCents: 8000, description: "Meilleure valeur" },
];

/** Prix d'un cours en euros (avant conversion en crédits). */
export function lessonPriceEur(hourlyRate: number | null | undefined, durationMinutes: number): number {
  return Math.round((Number(hourlyRate) || 0) * durationMinutes / 60 * 100) / 100;
}

/** Coût d'un cours en crédits — même formule que public.lesson_credit_cost. */
export function lessonCreditCost(hourlyRate: number | null | undefined, durationMinutes: number): number {
  return Math.max(1, Math.ceil(lessonPriceEur(hourlyRate, durationMinutes) / CREDIT_VALUE_EUR));
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
