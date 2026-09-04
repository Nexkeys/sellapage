// src/hooks/useInView.js
import { useEffect, useRef, useState } from 'react'

// Reveals once and stays revealed (no re-hiding on scroll away - that reads
// as gimmicky on repeat visits). Respects prefers-reduced-motion by
// revealing immediately instead of animating.
export function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setInView(true)
      return
    }

    // No IntersectionObserver (old browser / odd webview): reveal immediately.
    // Failing closed here would leave content permanently invisible.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      // threshold MUST stay 0 - it's a fraction of the OBSERVED ELEMENT's own
      // area, so anything taller than (viewport / threshold) can never satisfy
      // it and stays opacity-0 forever. A 5000px-tall blog article on a 640px
      // mobile viewport tops out at 12.8% visible, so the old 0.15 threshold
      // silently blanked long articles. The negative bottom rootMargin already
      // gives the "scrolled meaningfully into view" feel without that risk.
      { threshold: 0, rootMargin: '0px 0px -60px 0px', ...options },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}
