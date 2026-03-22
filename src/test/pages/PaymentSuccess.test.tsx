import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => mockNavigate }
})

import PaymentSuccess from "@/pages/PaymentSuccess"

function renderPage(search = "?credits=5") {
  return render(
    <MemoryRouter initialEntries={[`/payment/success${search}`]}>
      <PaymentSuccess />
    </MemoryRouter>
  )
}

describe("PaymentSuccess page", () => {
  it("affiche 'Paiement réussi'", () => {
    renderPage()
    // Texte exact du h1 dans la page
    expect(screen.getByText(/paiement réussi/i)).toBeDefined()
  })

  it("affiche le nombre de crédits depuis le query param (?credits=10)", () => {
    renderPage("?credits=10")
    // La page affiche "+10" ou "10 crédits"
    expect(screen.getByText(/\+?10/)).toBeDefined()
  })

  it("affiche un bouton Dashboard", () => {
    renderPage()
    expect(
      screen.getByRole("button", { name: /dashboard|tableau de bord/i })
    ).toBeDefined()
  })

  it("affiche un bouton Trouver un tuteur", () => {
    renderPage()
    expect(
      screen.getByRole("button", { name: /tuteur|prof|trouver/i })
    ).toBeDefined()
  })
})
