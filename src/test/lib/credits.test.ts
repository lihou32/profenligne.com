import {
  LESSON_DURATIONS, TOPUP_PACKS, friendlyError, isFreeCancellation, isRoomOpen, lessonPaidEur, lessonPriceEur,
  referralCodeFor, topupBonusEur, tutorShareEur, withdrawalBreakdown,
} from "@/lib/credits";

describe("prix et solde", () => {
  it("grille unique alignée sur public.lesson_price_cents", () => {
    expect(LESSON_DURATIONS.map((d) => [d.value, d.priceEur])).toEqual([
      [20, 15], [30, 25], [45, 30], [60, 35], [90, 50], [120, 65],
    ]);
    expect(lessonPriceEur(60)).toBe(35);
    expect(lessonPriceEur(50)).toBe(0); // durée hors grille
  });

  it("le prof touche 80 % du prix", () => {
    expect(tutorShareEur(60)).toBe(28);
    expect(tutorShareEur(120)).toBe(52);
  });

  it("bonus de recharge alignés sur public.topup_bonus_eur", () => {
    expect(TOPUP_PACKS.map((p) => [p.amountEur, p.bonusEur])).toEqual([[50, 5], [70, 7.5], [100, 15], [150, 25]]);
    expect(topupBonusEur(100)).toBe(15);
    expect(topupBonusEur(35)).toBe(0);
  });

  it("frais de retrait de 2 %", () => {
    expect(withdrawalBreakdown(50)).toEqual({ feeEur: 1, netEur: 49 });
    expect(withdrawalBreakdown(33.33)).toEqual({ feeEur: 0.67, netEur: 32.66 });
  });

  it("prix payé d'un cours : centimes, sinon anciens crédits à 5 €", () => {
    expect(lessonPaidEur({ price_cents: 5000 })).toBe(50);
    expect(lessonPaidEur({ price_cents: 0, credits_cost: 8 })).toBe(40);
    expect(lessonPaidEur({ duration_minutes: 30 })).toBe(25);
  });

  it("code parrainage = 8 premiers caractères de l'id, en majuscules (aligné sur referral_code_for)", () => {
    expect(referralCodeFor("2ede2e3b-0a15-401b-9695-bd46f27c05fb")).toBe("2EDE2E3B");
  });

  it("annulation gratuite : toujours si en attente, sinon > 24 h avant", () => {
    const now = Date.parse("2030-01-01T10:00:00Z");
    expect(isFreeCancellation("pending", "2030-01-01T11:00:00Z", now)).toBe(true);
    expect(isFreeCancellation("confirmed", "2030-01-02T11:00:00Z", now)).toBe(true);
    expect(isFreeCancellation("confirmed", "2030-01-01T20:00:00Z", now)).toBe(false);
  });

  it("salle ouverte 15 min avant le cours", () => {
    const start = "2030-01-01T10:00:00Z";
    expect(isRoomOpen(start, 60, Date.parse("2030-01-01T09:40:00Z"))).toBe(false);
    expect(isRoomOpen(start, 60, Date.parse("2030-01-01T09:46:00Z"))).toBe(true);
    expect(isRoomOpen(start, 60, Date.parse("2030-01-01T10:30:00Z"))).toBe(true);
  });

  it("messages d'erreur lisibles", () => {
    expect(friendlyError({ message: "new row violates row-level security policy" })).toBe("Action non autorisée");
    expect(friendlyError({ message: "Crédits insuffisants" })).toBe("Crédits insuffisants");
    expect(friendlyError(null, "Oups")).toBe("Oups");
  });
});
