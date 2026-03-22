import { describe, it, expect, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = ""
  })

  it("définit le titre avec le séparateur — et le nom de l'app", () => {
    renderHook(() => useDocumentTitle("Tableau de bord"))
    expect(document.title).toBe("Tableau de bord — Prof en Ligne")
  })

  it("met à jour le titre quand le paramètre change", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Mes Leçons" },
    })
    expect(document.title).toBe("Mes Leçons — Prof en Ligne")

    rerender({ title: "Mes Certificats" })
    expect(document.title).toBe("Mes Certificats — Prof en Ligne")
  })

  it("restaure l'ancien titre au démontage", () => {
    document.title = "Titre précédent"
    const { unmount } = renderHook(() => useDocumentTitle("Nouveau titre"))
    expect(document.title).toBe("Nouveau titre — Prof en Ligne")
    unmount()
    expect(document.title).toBe("Titre précédent")
  })

  it("contient toujours Prof en Ligne dans le titre", () => {
    renderHook(() => useDocumentTitle("Parrainage"))
    expect(document.title).toContain("Prof en Ligne")
  })
})
