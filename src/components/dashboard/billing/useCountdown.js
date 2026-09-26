// src/components/dashboard/billing/useCountdown.js
//
// Days, hours, minutes and seconds until a moment, ticking once a second.
// Stops ticking (and reports done) once the moment has passed, so an open
// tab does not keep a timer running for nothing.
import { useEffect, useState } from 'react'

export function splitMs(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor((t % 86400) / 3600),
    minutes: Math.floor((t % 3600) / 60),
    seconds: t % 60,
  }
}

export default function useCountdown(targetMs) {
  const [now, setNow] = useState(() => Date.now())
  const done = !targetMs || targetMs <= now
  useEffect(() => {
    if (!targetMs || targetMs <= Date.now()) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [targetMs])
  const left = targetMs ? targetMs - now : 0
  return { ...splitMs(left), left: Math.max(0, left), done }
}
