// src/components/auth/OtpScreen.jsx
//
// The full-page code screen. One screen for both kinds of code:
//   - the SMS code that creates a store (purpose "signup", with the page's own
//     sendRequest / verifyRequest, since no account exists yet), and
//   - the emailed sign-in code (purpose "login", through /api/otp-send and
//     /api/otp-verify with the signed-in user's token).
// Same contract as OtpVerifyModal, which the dashboard keeps using for its
// in-page checks.
//
// Each digit gets a word of encouragement, the sixth submits by itself, and
// while the server checks, the boxes roll. The server is the security
// boundary; nothing here decides whether a code is right.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle, ArrowRight, Check, MessageSquareText, Mail, Lock, Zap, TrendingUp, ThumbsUp, Sparkles, Target, Star } from 'lucide-react'
import { auth } from '../../firebase/auth'
import { getRecaptchaToken } from '../../utils/recaptcha'
import AuthShell, { Brand } from './AuthShell'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'

// What the vendor sees after typing digit 1, 2, 3... The sixth is "Sharp!",
// and then the check starts.
const CHEERS = [
  null,
  { text: 'Good', icon: ThumbsUp },
  { text: 'Keep going', icon: Zap },
  { text: 'Just like that', icon: Sparkles },
  { text: 'Almost there', icon: Target },
  { text: 'One more, boss', icon: Target },
  { text: 'Sharp!', icon: Star },
]

const OTP_CSS = `
@keyframes sp-otp-roll { 0%, 100% { transform: translateY(0) rotate(0deg) } 25% { transform: translateY(-9px) rotate(-6deg) } 50% { transform: translateY(0) rotate(0deg) } }
@keyframes sp-otp-shake { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-7px) } 40% { transform: translateX(6px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(3px) } }
@keyframes sp-otp-pop { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
@keyframes sp-otp-caret { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
.sp-otp-roll { animation: sp-otp-roll 0.9s ease-in-out infinite }
.sp-otp-shake { animation: sp-otp-shake 0.45s ease-in-out }
.sp-otp-pop { animation: sp-otp-pop 0.28s ease-out }
.sp-otp-caret { animation: sp-otp-caret 1s step-end infinite }
@media (prefers-reduced-motion: reduce) { .sp-otp-roll, .sp-otp-shake, .sp-otp-pop { animation: none } }
`

function OtpAside({ isSms, masked, stepLabel }) {
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <p className="mt-14 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-500">{stepLabel}</p>
      <h1 className="mt-3 font-display text-[44px] font-extrabold leading-[1.05] tracking-tight text-dash-ink xl:text-[52px]">
        Just one more <span className="text-forest-600">step...</span>
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
        We&apos;ve sent a 6-digit code {isSms ? 'by SMS ' : ''}to<br />
        <span className="font-semibold text-dash-ink">{masked || (isSms ? 'your phone' : 'your email')}.</span>
      </p>
      {hasMedia('auth-otp-art') && (
        <MediaSlot name="auth-otp-art" alt="" priority className="mt-6 w-full max-w-[400px] animate-float mix-blend-multiply [mask-image:radial-gradient(ellipse_62%_62%_at_50%_50%,black_62%,transparent_100%)]" />
      )}
      <ul className="mt-6 space-y-5">
        {[
          { icon: Lock, t: 'Secure Access', s: 'Keeps your account safe and protected.' },
          { icon: Zap, t: 'Full Store Control', s: 'Manage your store, products and customers.' },
          { icon: TrendingUp, t: 'Start Selling Faster', s: 'Get your business online in minutes.' },
        ].map((x) => (
          <li key={x.t} className="flex items-start gap-4">
            <span className="mt-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"><Check size={12} strokeWidth={3} /></span>
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-forest-600 shadow-sm ring-1 ring-black/5"><x.icon size={19} /></span>
            <span><span className="block text-[14px] font-semibold text-dash-ink">{x.t}</span><span className="block text-[12.5px] text-dash-muted">{x.s}</span></span>
          </li>
        ))}
      </ul>
      {hasMedia('auth-script') && <MediaSlot name="auth-script" alt="Almost there!" className="mt-8 w-[210px] mix-blend-multiply [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_55%,transparent_100%)]" />}
    </div>
  )
}

export default function OtpScreen({
  purpose, title, description, phone, onVerified, onBack, backLabel = 'Back',
  sendRequest = null, verifyRequest = null, initialMasked = '', initialCooldown = 0,
  verifyLabel = 'Verify & continue', stepLabel = 'Step 3 of 3',
}) {
  const isSms = purpose === 'phone_verify' || purpose === 'signup'
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [masked, setMasked] = useState(initialMasked || '')
  const [cooldown, setCooldown] = useState(initialMasked ? initialCooldown || 60 : 0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)
  const requestedRef = useRef(false)
  const submittedRef = useRef('')
  // The "clear the boxes after a wrong code" timer, cancelled the moment the
  // vendor starts typing again so it cannot wipe their new digits.
  const clearTimerRef = useRef(0)
  // Set when the code was right but the step after it failed: retrying then
  // re-runs that step instead of re-sending a code the server already used.
  const [finishData, setFinishData] = useState(null)
  useEffect(() => () => clearTimeout(clearTimerRef.current), [])

  const authedFetch = useCallback(async (path, body) => {
    const user = auth.currentUser
    if (!user) throw new Error('Not signed in')
    const token = await user.getIdToken()
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  }, [])

  const sendCode = useCallback(async () => {
    setSending(true)
    setError('')
    try {
      const { ok, data } = sendRequest
        ? await sendRequest()
        : await authedFetch('/api/otp-send', { purpose, phone, recaptchaToken: await getRecaptchaToken(`otp_send_${purpose}`) })
      if (!ok) {
        setError(data.message || 'Could not send the code.')
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds)
        return
      }
      setMasked(data.destinationMasked || '')
      setCooldown(data.resendAfterSeconds || 60)
      setCode('')
      submittedRef.current = ''
      inputRef.current?.focus()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }, [authedFetch, purpose, phone, sendRequest])

  // One code per screen. The ref stops React StrictMode's double run in
  // development from burning the resend cooldown straight away.
  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    if (!initialMasked) sendCode()
  }, [sendCode, initialMasked])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => { inputRef.current?.focus() }, [])

  const finish = useCallback(async (data) => {
    setVerified(true)
    setVerifying(false)
    setError('')
    try {
      await onVerified?.(data)
      setFinishData(null)
    } catch (err) {
      console.error('[otp] after verify', err)
      setVerified(false)
      setFinishData(data)
      setError('Your code was right, but we could not finish signing you in. Check your connection and tap Try again.')
    }
  }, [onVerified])

  const submit = useCallback(async (value) => {
    if (finishData) { finish(finishData); return }
    if (value.length !== 6 || verifying || submittedRef.current === value) return
    submittedRef.current = value
    setVerifying(true)
    setError('')
    let data
    try {
      const res = verifyRequest
        ? await verifyRequest(value)
        : await authedFetch('/api/otp-verify', { purpose, code: value })
      data = res.data
      if (!res.ok) {
        setError(
          typeof data.remainingAttempts === 'number' && data.remainingAttempts > 0
            ? `${data.message} ${data.remainingAttempts} attempt${data.remainingAttempts === 1 ? '' : 's'} left.`
            : data.message || 'Verification failed.',
        )
        setShake((n) => n + 1)
        setVerifying(false)
        clearTimeout(clearTimerRef.current)
        clearTimerRef.current = setTimeout(() => { setCode(''); submittedRef.current = ''; inputRef.current?.focus() }, 650)
        return
      }
    } catch {
      setError('Network error. Please try again.')
      submittedRef.current = ''
      setVerifying(false)
      return
    }
    // The code was right. What happens next (signing in, setting up the
    // session) is the page's job; if that fails, `finish` says so and offers
    // a retry instead of leaving a frozen "You're in" screen.
    await finish(data)
  }, [authedFetch, finish, finishData, purpose, verifyRequest, verifying])

  // The sixth digit gets its "Sharp!" moment, then the check starts on its own.
  useEffect(() => {
    if (code.length !== 6 || verifying || verified || finishData) return
    const t = setTimeout(() => submit(code), 650)
    return () => clearTimeout(t)
  }, [code, submit, verifying, verified])

  const onChange = (e) => {
    if (verifying || verified || finishData) return
    clearTimeout(clearTimerRef.current)
    // Digits only, so a pasted "123 456" or "123-456" still fills all six.
    const next = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(next)
    if (next !== code) setError('')
    if (next.length < 6) submittedRef.current = ''
  }
  // The boxes always fill left to right, so the cursor lives at the end:
  // tapping a middle box must not start inserting digits in the middle.
  const keepCaretAtEnd = (e) => {
    const el = e.currentTarget
    const end = el.value.length
    if (el.selectionStart !== end || el.selectionEnd !== end) {
      try { el.setSelectionRange(end, end) } catch { /* some inputs refuse; harmless */ }
    }
  }

  const cheer = CHEERS[code.length]
  const status = verified ? 'done' : verifying ? 'checking' : error ? 'error' : cheer ? 'cheer' : 'idle'

  return (
    <AuthShell aside={<OtpAside isSms={isSms} masked={masked} stepLabel={stepLabel} />} mobileArt="auth-otp-art" back={{ onClick: onBack, label: backLabel, short: 'Back' }}>
      <style>{OTP_CSS}</style>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><ShieldCheck size={26} /></span>
      <h2 className="mt-5 font-display text-[28px] font-extrabold leading-tight tracking-tight text-dash-ink sm:text-[34px]">{title || (isSms ? 'Verify your phone' : 'Verify your email')}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        {sending && !masked ? 'Sending your code...' : <>We&apos;ve sent a 6-digit code to <span className="font-semibold text-dash-ink">{masked || (isSms ? 'your phone' : 'your email')}</span>.</>}
        <span className="block text-[13.5px] text-slate-500">It expires in {isSms ? 5 : 10} minutes.</span>
      </p>
      {description && <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{description}</p>}

      <form onSubmit={(e) => { e.preventDefault(); submit(code) }} className="mt-6">
        {/* One real input (so SMS autofill and paste work) under six boxes. */}
        <div className="relative" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            value={code}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            inputMode="numeric"
            autoComplete="one-time-code"
            onSelect={keepCaretAtEnd}
            onClick={keepCaretAtEnd}
            aria-label="6-digit code"
            aria-describedby="otp-status"
            disabled={verified}
            className="absolute inset-0 z-[1] h-full w-full cursor-text bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent"
          />
          <div key={shake} className={`grid grid-cols-6 gap-2 sm:gap-3 ${shake && status === 'error' ? 'sp-otp-shake' : ''}`}>
            {Array.from({ length: 6 }).map((_, i) => {
              const digit = code[i]
              const active = focused && i === Math.min(code.length, 5) && !verifying && !verified
              const tone = verified ? 'border-forest-600 bg-forest-600 text-white'
                : status === 'error' && digit ? 'border-red-300 bg-red-50 text-red-600'
                  : digit ? 'border-forest-600/60 bg-forest-50/60 text-dash-ink'
                    : active ? 'border-forest-600 bg-white ring-4 ring-forest-600/10' : 'border-gray-200 bg-white'
              return (
                <div key={i} style={verifying ? { animationDelay: `${i * 0.1}s` } : undefined}
                  className={`relative flex aspect-[5/6] items-center justify-center rounded-2xl border-2 font-display text-[24px] font-bold transition-colors sm:text-[28px] ${tone} ${verifying ? 'sp-otp-roll' : ''}`}>
                  {verified ? <Check size={22} strokeWidth={3} className="sp-otp-pop" style={{ animationDelay: `${i * 0.05}s` }} />
                    : digit ? <span key={`${i}${digit}`} className="sp-otp-pop">{digit}</span>
                      : active ? <span className="sp-otp-caret h-7 w-[2px] rounded bg-forest-600" /> : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* The running commentary. */}
        <div id="otp-status" aria-live="polite" className="mt-4 flex min-h-[40px] items-center justify-center">
          {status === 'checking' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-4 py-2 text-[13.5px] font-semibold text-forest-600">
              <Loader2 size={15} className="animate-spin" /> Hold on, let&apos;s check...
            </span>
          ) : status === 'done' ? (
            <span className="sp-otp-pop inline-flex items-center gap-2 rounded-full bg-forest-600 px-4 py-2 text-[13.5px] font-semibold text-white">
              <Check size={15} strokeWidth={3} /> That&apos;s it! You&apos;re in.
            </span>
          ) : status === 'error' ? (
            <span className="inline-flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
            </span>
          ) : status === 'cheer' ? (
            <span key={code.length} className={`sp-otp-pop inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold ${code.length >= 5 ? 'bg-forest-600 text-white' : 'bg-forest-50 text-forest-600'}`}>
              <cheer.icon size={15} /> {cheer.text}
            </span>
          ) : (
            <span className="text-[13px] text-slate-400">Type or paste the code. We&apos;ll check it for you.</span>
          )}
        </div>

        <button type="submit" disabled={(code.length !== 6 && !finishData) || verifying || verified}
          className="mt-3 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 text-[16px] font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none">
          {verifying ? <><Loader2 size={17} className="animate-spin" /> Checking...</> : finishData ? <>Try again <ArrowRight size={17} /></> : <>{verifyLabel} <ArrowRight size={17} /></>}
        </button>

        <p className="mt-5 text-center text-[14px] text-slate-500">
          Didn&apos;t get it?{' '}
          {cooldown > 0 ? (
            <span className="font-semibold text-forest-600">Resend in {cooldown}s</span>
          ) : (
            <button type="button" onClick={sendCode} disabled={sending} className="font-semibold text-forest-600 hover:underline disabled:text-slate-400">
              {sending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </p>
      </form>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-[12.5px] leading-relaxed text-slate-500">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-forest-600 ring-1 ring-black/5">{isSms ? <MessageSquareText size={16} /> : <Mail size={16} />}</span>
        <p>
          {isSms
            ? 'The SMS can take up to a minute to arrive. You can request 3 codes a day. Sellapage will never ask for this code by phone or WhatsApp.'
            : 'Check your spam or promotions folder. Sellapage will never ask for this code by phone or WhatsApp.'}
        </p>
      </div>
    </AuthShell>
  )
}
