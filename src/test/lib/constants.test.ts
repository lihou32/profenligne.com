import { describe, it, expect } from "vitest"
import { SUBJECTS, GRADE_LEVELS, SCHOOL_TYPES } from "@/lib/constants"

describe("SUBJECTS", () => {
  it("est un tableau non vide", () => {
    expect(Array.isArray(SUBJECTS)).toBe(true)
    expect(SUBJECTS.length).toBeGreaterThan(0)
  })

  it("contient les matières principales", () => {
    expect(SUBJECTS).toContain("Mathématiques")
    expect(SUBJECTS).toContain("Français")
    expect(SUBJECTS).toContain("Anglais")
    expect(SUBJECTS).toContain("Physique-Chimie")
  })

  it("ne contient que des strings non vides", () => {
    SUBJECTS.forEach((s) => {
      expect(typeof s).toBe("string")
      expect(s.length).toBeGreaterThan(0)
    })
  })

  it("n'a pas de doublons", () => {
    const unique = new Set(SUBJECTS)
    expect(unique.size).toBe(SUBJECTS.length)
  })
})

describe("GRADE_LEVELS", () => {
  it("est un tableau d'objets { value, label }", () => {
    expect(Array.isArray(GRADE_LEVELS)).toBe(true)
    GRADE_LEVELS.forEach((g) => {
      expect(g).toHaveProperty("value")
      expect(g).toHaveProperty("label")
    })
  })

  it("contient les niveaux scolaires français essentiels", () => {
    const values = GRADE_LEVELS.map((g) => g.value)
    expect(values).toContain("terminale")
    expect(values).toContain("3eme")
    expect(values).toContain("6eme")
  })

  it("les values sont en snake_case sans espaces", () => {
    GRADE_LEVELS.forEach(({ value }) => {
      expect(value).not.toMatch(/\s/)
    })
  })

  it("les labels sont des strings non vides", () => {
    GRADE_LEVELS.forEach(({ label }) => {
      expect(typeof label).toBe("string")
      expect(label.length).toBeGreaterThan(0)
    })
  })
})

describe("SCHOOL_TYPES", () => {
  it("est un tableau d'objets { value, label }", () => {
    expect(Array.isArray(SCHOOL_TYPES)).toBe(true)
    SCHOOL_TYPES.forEach((s) => {
      expect(s).toHaveProperty("value")
      expect(s).toHaveProperty("label")
    })
  })

  it("contient au moins Public et Privé", () => {
    const values = SCHOOL_TYPES.map((s) => s.value)
    expect(values).toContain("public")
    expect(values).toContain("prive")
  })
})
