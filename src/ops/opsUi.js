// src/ops/opsUi.js
//
// Small display helpers shared by Team & Access and the Activity Log.
const AVATAR = ['bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800', 'bg-teal-100 text-teal-800']

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
export const avatarTone = (seed) => AVATAR[[...String(seed || 'x')].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR.length]

export function ago(ms) {
  if (!ms) return 'never'
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d}d ago` : new Date(ms).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
