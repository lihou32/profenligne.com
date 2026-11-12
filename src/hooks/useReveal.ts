import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * Fait apparaître les éléments `.reveal` quand ils entrent à l'écran (classe `.in`),
 * avec un léger décalage entre voisins. À appeler une fois par layout : il se relance
 * à chaque changement de page et observe aussi les éléments ajoutés plus tard
 * (données chargées après coup).
 */
export function useReveal() {
  const { pathname } = useLocation()

  useEffect(() => {
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const reveal = (el: Element) => el.classList.add("in")

    if (calm || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach(reveal)
      const mo = new MutationObserver(() => document.querySelectorAll(".reveal:not(.in)").forEach(reveal))
      mo.observe(document.body, { childList: true, subtree: true })
      return () => mo.disconnect()
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    const seen = new WeakSet<Element>()
    const scan = () => {
      let i = 0
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        if (seen.has(el)) return
        seen.add(el)
        const h = el as HTMLElement
        if (!h.style.transitionDelay) h.style.transitionDelay = `${(i++ % 4) * 70}ms`
        io.observe(el)
      })
    }
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [pathname])
}

/** Compteur qui monte de 0 à `end` quand l'élément devient visible. */
export function countUp(el: HTMLElement, end: number, duration = 1200) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { el.textContent = String(end); return }
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / duration)
    el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))))
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
