// src/components/RouteFallback.jsx/
// Shown while a lazily-loaded route chunk is still downloading.
//
// Deliberately delayed: on a warm connection a route chunk resolves in well
// under 200ms, and rendering a loader instantly makes every navigation flash
// a spinner, which reads as *slower* than showing nothing at all. So we hold
// the frame briefly and only surface an indicator if the chunk is genuinely
// taking time (slow network, cold cache, low-end device).
import { useEffect, useState } from 'react'
import BrandLoader from './BrandLoader'

export default function RouteFallback({ delay = 200 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return null

  // The branded bag loader (BrandLoader.jsx) replaced three pulsing bars
  // on 2026-09-26.
  return <BrandLoader />
}
