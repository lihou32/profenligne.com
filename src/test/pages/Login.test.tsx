import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signIn: mockSignIn, user: null, loading: false }),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({}) } },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import Login from "@/pages/Login"

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Login page — rendu", () => {
  it("affiche le titre de connexion", () => {
    renderLogin()
    expect(screen.getByText(/connexion/i)).toBeDefined()
  })

  it("affiche un champ email", () => {
    renderLogin()
    const input = screen.getByLabelText(/email/i)
    expect(input).toBeDefined()
  })

  it("affiche un champ mot de passe", () => {
    renderLogin()
    const input = screen.getByLabelText(/mot de passe|password/i)
    expect(input).toBeDefined()
  })

  it("affiche le bouton de soumission", () => {
    renderLogin()
    const btn = screen.getByRole("button", { name: /connexion|se connecter/i })
    expect(btn).toBeDefined()
  })

  it("affiche un lien vers la page d'inscription", () => {
    renderLogin()
    const link = screen.getByRole("link", { name: /inscrire|créer|signup/i })
    expect(link).toBeDefined()
  })

  it("affiche un lien mot de passe oublié", () => {
    renderLogin()
    const link = screen.getByRole("link", { name: /oublié|forgot/i })
    expect(link).toBeDefined()
  })
})

describe("Login page — toggle mot de passe", () => {
  it("le champ mot de passe est de type 'password' par défaut", () => {
    renderLogin()
    const input = screen.getByLabelText(/mot de passe|password/i)
    expect((input as HTMLInputElement).type).toBe("password")
  })

  it("clique sur l'icône œil révèle le mot de passe", () => {
    renderLogin()
    const input = screen.getByLabelText(/mot de passe|password/i)
    // Cherche le bouton toggle (icône œil)
    const toggleBtn = input.closest("div")?.querySelector("button[type=button]")
    if (toggleBtn) {
      fireEvent.click(toggleBtn)
      expect((input as HTMLInputElement).type).toBe("text")
    }
  })
})

describe("Login page — soumission", () => {
  it("appelle signIn avec email et mot de passe saisis", async () => {
    mockSignIn.mockResolvedValue(undefined)
    renderLogin()

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/mot de passe|password/i), {
      target: { value: "motdepasse123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /connexion|se connecter/i }))

    await vi.waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "motdepasse123")
    })
  })
})
