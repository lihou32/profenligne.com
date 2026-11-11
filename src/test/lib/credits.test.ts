import { describe, it, expect } from "vitest";
import {
  CREDIT_PACKS, friendlyError, isFreeCancellation, isRoomOpen, lessonCreditCost, lessonPriceEur, referralCodeFor,
} from "@/lib/credits";

describe("credits", () => {
  it("coût d'un cours = prix / 5 €, arrondi au crédit supérieur (aligné sur lesson_credit_cost)", () => {
    expect(lessonCreditCost(40, 60)).toBe(8);   // 40 € → 8 crédits
    expect(lessonCreditCost(35, 60)).toBe(7);   // 35 € → 7 crédits
    expect(lessonCreditCost(35, 30)).toBe(4);   // 17,50 € → 4 crédits
    expect(lessonCreditCost(42, 90)).toBe(13);  // 63 € → 13 crédits
    expect(lessonCreditCost(0, 60)).toBe(1);    // jamais gratuit
    expect(lessonCreditCost(null, 60)).toBe(1);
  });

  it("prix en euros", () => {
    expect(lessonPriceEur(52.5, 60)).toBe(52.5);
    expect(lessonPriceEur(35, 20)).toBeCloseTo(11.67, 2);
  });

  it("packs alignés sur les edge functions Stripe", () => {
    expect(CREDIT_PACKS.map((p) => [p.credits, p.priceCents])).toEqual([[5, 2500], [10, 4500], [20, 8000]]);
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
