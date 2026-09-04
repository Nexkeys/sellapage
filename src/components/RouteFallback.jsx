// src/components/RouteFallback.jsx/
// Shown while a lazily-loaded route chunk is still downloading.
//
// Deliberately delayed: on a warm connection a route chunk resolves in well
// under 200ms, and rendering a loader instantly makes every navigation flash
// a spinner, which reads as *slower* than showing nothing at all. So we hold
// the frame briefly and only surface an indicator if the chunk is genuinely
// taking time (slow network, cold cache, low-end device).
import { useEffect, useState } from 'react'

export default function RouteFallback({ delay = 200 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return null

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-end gap-1.5" aria-hidden="true">
        {[0, 140, 280].map((offset) => (
          <span
            key={offset}
            className="w-1.5 h-5 rounded-full bg-brand-500 animate-pulse"
            style={{ animationDelay: `${offset}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
