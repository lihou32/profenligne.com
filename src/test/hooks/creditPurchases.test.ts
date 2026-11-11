import { describe, expect, it } from "vitest"
import { availableMethods, formatIban, revolutLink, whatsappLink, type PaymentSettings } from "@/hooks/useCreditPurchases"

const base: PaymentSettings = {
  id: 1, whatsapp_number: null, account_holder: null, iban: null, bic: null,
  revolut_tag: null, instructions: null, updated_at: "2026-11-11T00:00:00Z",
}

describe("paiement manuel", () => {
  it("n'affiche que les moyens renseignés", () => {
    expect(availableMethods(null)).toEqual([])
    expect(availableMethods(base)).toEqual([])
    expect(availableMethods({ ...base, iban: "FR76", revolut_tag: "lihou" })).toEqual(["virement", "revolut"])
    expect(availableMethods({ ...base, whatsapp_number: "33612345678" })).toEqual(["whatsapp"])
  })

  it("pré-remplit le message WhatsApp avec la référence", () => {
    const url = whatsappLink("33612345678", { amount_eur: 45, reference: "PEL-ABC123" })
    expect(url.startsWith("https://wa.me/33612345678?text=")).toBe(true)
    expect(decodeURIComponent(url.split("text=")[1])).toContain("PEL-ABC123")
    expect(decodeURIComponent(url.split("text=")[1])).toContain("45 €")
  })

  it("formate l'IBAN et le lien Revolut", () => {
    expect(formatIban("FR7630006000011234567890189")).toBe("FR76 3000 6000 0112 3456 7890 189")
    expect(revolutLink("lihou")).toBe("https://revolut.me/lihou")
  })
})
