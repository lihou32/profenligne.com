import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => mockNavigate }
})

import PaymentCancel from "@/pages/PaymentCancel"

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/payment/cancel"]}>
      <PaymentCancel />
    </MemoryRouter>
  )
}

describe("PaymentCancel page", () => {
  it("affiche un message d'annulation", () => {
    renderPage()
    // Vérifie qu'il y a au moins un élément qui parle d'annulation
    const matches = screen.getAllByText(/annul/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it("propose de réessayer (bouton vers crédits)", () => {
    renderPage()
    const btn = screen.getByRole("button", {
      name: /réessayer|crédits|acheter|essayer/i,
    })
    expect(btn).toBeDefined()
  })

  it("propose de revenir au dashboard", () => {
    renderPage()
    const btn = screen.getByRole("button", {
      name: /tableau de bord|dashboard/i,
    })
    expect(btn).toBeDefined()
  })
})
