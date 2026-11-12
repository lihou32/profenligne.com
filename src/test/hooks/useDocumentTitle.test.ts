import { describe, it, expect, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = ""
  })

  it("définit le titre avec le séparateur — et le nom de l'app", () => {
    renderHook(() => useDocumentTitle("Tableau de bord"))
    expect(document.title).toBe("Tableau de bord — Ton Prof en Ligne")
  })

  it("met à jour le titre quand le paramètre change", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Mes Leçons" },
    })
    expect(document.title).toBe("Mes Leçons — Ton Prof en Ligne")

    rerender({ title: "Mes Certificats" })
    expect(document.title).toBe("Mes Certificats — Ton Prof en Ligne")
  })

  it("restaure l'ancien titre au démontage", () => {
    document.title = "Titre précédent"
    const { unmount } = renderHook(() => useDocumentTitle("Nouveau titre"))
    expect(document.title).toBe("Nouveau titre — Ton Prof en Ligne")
    unmount()
    expect(document.title).toBe("Titre précédent")
  })

  it("contient toujours Ton Prof en Ligne dans le titre", () => {
    renderHook(() => useDocumentTitle("Parrainage"))
    expect(document.title).toContain("Ton Prof en Ligne")
  })
})
