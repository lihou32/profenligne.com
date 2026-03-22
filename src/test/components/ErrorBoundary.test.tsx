import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function BrokenChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error")
  return <p>Contenu normal</p>
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("ErrorBoundary", () => {
  it("rend les enfants normalement quand tout va bien", () => {
    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Contenu normal")).toBeDefined()
  })

  it("affiche le titre de fallback quand un enfant lève une erreur", () => {
    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.queryByText("Contenu normal")).toBeNull()
    // Vérifie le titre h2 spécifiquement
    expect(screen.getByText(/une erreur inattendue/i)).toBeDefined()
  })

  it("affiche le message d'erreur dans un <pre>", () => {
    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText("Test error")).toBeDefined()
  })

  it("affiche un bouton de récupération", () => {
    render(
      <ErrorBoundary>
        <BrokenChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole("button")).toBeDefined()
  })

  it("ne montre pas l'UI de fallback sans erreur", () => {
    render(
      <ErrorBoundary>
        <p>Tout va bien</p>
      </ErrorBoundary>
    )
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByText("Tout va bien")).toBeDefined()
  })
})
