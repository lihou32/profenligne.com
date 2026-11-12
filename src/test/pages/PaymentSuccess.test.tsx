import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, profile: null, roles: [], loading: false }),
}))

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import PaymentSuccess from "@/pages/PaymentSuccess"

function renderPage(search = "?amount=50") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/payment/success${search}`]}>
        <PaymentSuccess />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("PaymentSuccess page", () => {
  it("affiche 'Paiement réussi'", () => {
    renderPage()
    // Texte exact du h1 dans la page
    expect(screen.getByText(/paiement réussi/i)).toBeDefined()
  })

  it("affiche le montant rechargé depuis le query param (?amount=100)", () => {
    renderPage("?amount=100")
    expect(screen.getByText(/\+100,00/)).toBeDefined()
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
