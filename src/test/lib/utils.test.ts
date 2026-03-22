import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn() — class merger", () => {
  it("retourne une chaîne vide sans arguments", () => {
    expect(cn()).toBe("")
  })

  it("retourne la classe seule quand un seul argument", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("fusionne plusieurs classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("ignore les valeurs falsy (undefined, null, false)", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar")
  })

  it("gère les objets conditionnels clsx", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
  })

  it("gère les tableaux", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("tailwind-merge : la dernière classe gagne sur un conflit", () => {
    // p-2 et p-4 sont en conflit — p-4 doit gagner
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("tailwind-merge : pas de doublon sur text-center", () => {
    expect(cn("text-center", "text-center")).toBe("text-center")
  })

  it("combine objets, tableaux et strings", () => {
    expect(cn("base", ["extra"], { active: true, disabled: false })).toBe(
      "base extra active"
    )
  })

  it("tailwind-merge : résout les conflits bg-color", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")
  })
})
