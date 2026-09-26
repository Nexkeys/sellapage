// src/components/dashboard/ui/useConfetti.js
//
// The hand-drawn canvas confetti used by the first-listing party
// (Celebration.jsx) and the "payment went through" celebration
// (billing/PlanMoments.jsx). No package, about 160 pieces, and it stops
// itself after a few seconds so a cheap phone is not left animating.
import { useEffect } from 'react'

const COLORS = ['#16a34a', '#22c55e', '#86efac', '#034e22', '#facc15', '#f97316', '#ec4899', '#60a5fa', '#a78bfa']
const RUN_MS = 4200

export default function useConfetti(canvasRef, enabled, colors = COLORS) {
  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    const size = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)

    const parts = []
    // Two cannons from the bottom corners, then a burst from the middle.
    const launch = (x, y, angle, spread, count, speed) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread
        const v = speed * (0.55 + Math.random() * 0.6)
        parts.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          r: 4 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          tilt: Math.random() * Math.PI,
          color: colors[(Math.random() * colors.length) | 0],
          shape: Math.random() < 0.25 ? 'circle' : Math.random() < 0.5 ? 'strip' : 'square',
        })
      }
    }
    const scale = Math.min(1, w / 900) * 0.4 + 0.6
    launch(0, h, -Math.PI / 3.1, 0.7, 60, 19 * scale)
    launch(w, h, -Math.PI + Math.PI / 3.1, 0.7, 60, 19 * scale)
    const t2 = setTimeout(() => launch(w / 2, h * 0.38, -Math.PI / 2, Math.PI * 2, 50, 11 * scale), 350)

    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const age = now - start
      ctx.clearRect(0, 0, w, h)
      const fade = age > RUN_MS - 900 ? Math.max(0, (RUN_MS - age) / 900) : 1
      for (const p of parts) {
        p.vy += 0.32
        p.vx *= 0.99
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.tilt += 0.08
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.r * 0.55, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'strip') {
          ctx.fillRect(-p.r * 0.25, -p.r, p.r * 0.5, p.r * 2 * Math.abs(Math.cos(p.tilt)) + 1)
        } else {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * Math.abs(Math.cos(p.tilt)) + 1)
        }
        ctx.restore()
      }
      if (age < RUN_MS) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t2)
      window.removeEventListener('resize', size)
    }
  }, [canvasRef, enabled, colors])
}
