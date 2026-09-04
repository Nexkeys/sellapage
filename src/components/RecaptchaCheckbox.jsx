// src/components/RecaptchaCheckbox.jsx
// VISIBLE reCAPTCHA v2 "I'm not a robot" checkbox.
//
// This is the tick-box Nex asked for. An earlier pass used reCAPTCHA v3, which
// is invisible by design and therefore showed nothing on the page - that was
// the wrong choice for the requirement.
//
// ⚠️ KEY TYPE MATTERS: v2 keys and v3 keys are NOT interchangeable. This widget
// needs a key created as "reCAPTCHA v2 → I'm not a robot Checkbox". If the
// configured key is v3, the widget cannot render - onUnavailable() fires and
// the form stays usable rather than trapping real vendors behind a box that
// will never appear.
import { useEffect, useRef, useState } from 'react'

let scriptPromise = null

function loadScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.grecaptcha?.render) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
    setTimeout(() => resolve(!!window.grecaptcha?.render), 6000)
  })
  return scriptPromise
}

/**
 * @param {(token: string|null) => void} onChange fires with the token, or null
 *        when it expires - the parent should clear its stored token on null.
 * @param {() => void} [onUnavailable] fires when the widget cannot render, so
 *        the parent can stop requiring it.
 */
export default function RecaptchaCheckbox({ siteKey, onChange, onUnavailable }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!siteKey) { onUnavailable?.(); setFailed(true); return }

    ;(async () => {
      const loaded = await loadScript()
      if (cancelled) return
      if (!loaded || !window.grecaptcha?.render || !containerRef.current) {
        setFailed(true); onUnavailable?.(); return
      }
      // Already rendered (StrictMode double-invoke in dev) - don't duplicate.
      if (widgetIdRef.current !== null) return

      try {
        window.grecaptcha.ready(() => {
          if (cancelled || !containerRef.current) return
          try {
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token) => onChange?.(token),
              'expired-callback': () => onChange?.(null),
              'error-callback': () => onChange?.(null),
            })
          } catch {
            // Throws when the key is v3 rather than v2.
            setFailed(true); onUnavailable?.()
          }
        })
      } catch {
        setFailed(true); onUnavailable?.()
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (failed) return null

  return (
    <div className="flex justify-center my-3">
      <div ref={containerRef} />
    </div>
  )
}
