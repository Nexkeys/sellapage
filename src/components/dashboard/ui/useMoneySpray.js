// src/components/dashboard/ui/useMoneySpray.js
//
// "Spraying" money, the Nigerian party way: green naira notes burst up from
// the bottom of the screen and flutter down. Drawn on one canvas, no package,
// no images to download, and it stops itself after a few seconds. Used when a
// vendor creates their referral code and when a withdrawal goes through.
// Nothing runs with reduced motion switched on; the caller checks that.
import { useEffect } from 'react'

const RUN_MS = 5200
const DENOMS = ['1000', '500', '200', '1000', '500']

function drawNote(ctx, w, h, denom) {
  const r = 4
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
  g.addColorStop(0, '#2fa564')
  g.addColorStop(0.55, '#16834a')
  g.addColorStop(1, '#0b5e34')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-w / 2 + r, -h / 2)
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r)
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r)
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r)
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.arc(w * 0.22, 0, h * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(h * 0.42)}px "DM Sans", Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`₦${denom}`, -w / 2 + 7, 0)
}

export default function useMoneySpray(canvasRef, enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return undefined
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    const size = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    window.addEventListener('resize', size)

    const notes = []
    const scale = Math.min(1, W / 900) * 0.35 + 0.65
    const burst = (x, count, delay) => {
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.3
        const v = (14 + Math.random() * 9) * scale
        notes.push({
          x, y: H + 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 54 * scale, h: 26 * scale, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.12,
          flip: Math.random() * Math.PI * 2, sway: 0.6 + Math.random() * 0.9, denom: DENOMS[i % DENOMS.length],
          born: delay + Math.random() * 350,
        })
      }
    }
    burst(W * 0.5, 34, 0)
    burst(W * 0.2, 16, 380)
    burst(W * 0.8, 16, 620)

    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      const age = now - start
      ctx.clearRect(0, 0, W, H)
      const fade = age > RUN_MS - 1000 ? Math.max(0, (RUN_MS - age) / 1000) : 1
      for (const n of notes) {
        if (age < n.born) continue
        // Up fast, then drift down like paper: gravity, strong air drag once
        // falling, and a side-to-side sway.
        n.vy += 0.34
        if (n.vy > 0) { n.vy *= 0.9; n.vx *= 0.96 }
        n.x += n.vx + Math.sin(age / 260 + n.flip) * n.sway * (n.vy > 0 ? 1 : 0)
        n.y += n.vy
        n.rot += n.vr
        n.flip += 0.07
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(n.x, n.y)
        ctx.rotate(n.rot)
        ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(n.flip))))
        drawNote(ctx, n.w, n.h, n.denom)
        ctx.restore()
      }
      if (age < RUN_MS) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [canvasRef, enabled])
}
