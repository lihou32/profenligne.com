import "@testing-library/jest-dom"

// ── matchMedia (jsdom ne l'implémente pas) ────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// ── Silence les warnings React Router v7 future flags ────────────────────────
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("React Router Future Flag Warning")
  ) {
    return
  }
  originalWarn(...args)
}

// ── Silence les warnings act() dans les tests async ──────────────────────────
const originalError = console.error
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("not wrapped in act") ||
      args[0].includes("Warning: An update to"))
  ) {
    return
  }
  originalError(...args)
}
