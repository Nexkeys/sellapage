// src/pages/AccountRecovery.jsx
// Public, unauthenticated recovery for a vendor locked out of their account
// email. Two views on one route:
//   /account-recovery          -> submit a request for admin review
//   /account-recovery/redeem   -> set a new email + password with an approved token
//
// Deliberately never confirms whether an account exists: the success screen is
// identical either way (the server enforces this too).
//
// 2026-10-06: moved onto the auth design (AuthShell, shared fields, the
// Weak / Good / Strong / Perfect meter). The requests and rules are unchanged.
import { useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle, ArrowRight, Mail, Store, Phone, Lock, Eye, EyeOff, Send, UserCheck, KeyRound, BellRing } from 'lucide-react'
import { getRecaptchaToken } from '../utils/recaptcha'
import AuthShell from '../components/auth/AuthShell'
import { Field, IconInput, PRIMARY, ErrorBanner, PasswordMeter } from '../components/auth/AuthFields'
import { passwordStrength } from '../components/auth/authUtils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const back = { to: '/login', label: 'Back to sign in', short: 'Sign in' }

const STEPS = [
  { icon: Send, t: 'Send this request', s: 'Tell us which store is yours and how to reach you.' },
  { icon: UserCheck, t: 'Our team checks it', s: 'A real person confirms the store is yours, usually within 1-2 business days.' },
  { icon: KeyRound, t: 'You set new details', s: 'We send a one-time link to choose a new email and password.' },
]

function RequestView() {
  const [identifier, setIdentifier] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [done, setDone] = useState(false)

  const errs = showErrors ? {
    identifier: identifier.trim() ? '' : 'Enter your store link or the email you signed up with.',
    contactEmail: EMAIL_RE.test(contactEmail.trim()) ? '' : 'Enter an email you can open right now.',
  } : {}

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim() || !EMAIL_RE.test(contactEmail.trim())) { setShowErrors(true); return }
    setBusy(true)
    try {
      // Returns null if reCAPTCHA is unavailable (blocked, offline, v2 keys).
      // The server allows a missing token but rejects an invalid one.
      const recaptchaToken = await getRecaptchaToken('account_recovery_request')
      const res = await fetch('/api/account-recovery?action=request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, contactEmail, contactPhone, reason, recaptchaToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || 'Could not submit your request.'); return }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-300">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest/20"><CheckCircle2 size={28} /></span>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Request received, boss</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
          If an account matches those details, our team will review your request and contact you at{' '}
          <span className="font-semibold text-dash-ink">{contactEmail.trim()}</span>. This usually takes 1-2 business days.
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-[12.5px] leading-relaxed text-slate-500">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-forest-600 ring-1 ring-black/5"><BellRing size={16} /></span>
          For your security, we also alert the account&apos;s current email address about every recovery request.
        </div>
        <Link to="/login" className={`${PRIMARY} mt-6`}>Back to sign in <ArrowRight size={16} /></Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="animate-in fade-in duration-300">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><ShieldCheck size={26} /></span>
      <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Recover your account</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
        Lost access to the email on your store? No wahala. Tell us how to reach you and our team will verify you manually.
      </p>

      <ol className="mb-6 mt-5 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex items-start gap-3">
            <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600">
              <s.icon size={16} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-forest-600 text-[9px] font-bold text-white">{i + 1}</span>
            </span>
            <span><span className="block text-[13px] font-semibold text-dash-ink">{s.t}</span><span className="block text-[12px] leading-snug text-dash-muted">{s.s}</span></span>
          </li>
        ))}
      </ol>

      <ErrorBanner>{error}</ErrorBanner>
      <div className="space-y-5">
        <Field id="ar-identifier" label="Your store link or account email" required error={errs.identifier}>
          <IconInput icon={Store} id="ar-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="mystore  or  you@example.com" maxLength={200} aria-invalid={!!errs.identifier} invalid={!!errs.identifier} />
        </Field>
        <Field id="ar-contact" label="An email we can reach you on" required error={errs.contactEmail} hint="Use one you can open today. We use it to contact you about this request.">
          <IconInput icon={Mail} id="ar-contact" type="email" autoComplete="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="new@example.com" maxLength={200} aria-invalid={!!errs.contactEmail} invalid={!!errs.contactEmail} />
        </Field>
        <Field id="ar-phone" label="Phone / WhatsApp" optional>
          <IconInput icon={Phone} id="ar-phone" type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 08012345678" maxLength={40} />
        </Field>
        <Field id="ar-reason" label="What happened?" optional hint="Anything that helps us confirm the store is yours: CAC name, recent orders, the phone on the store.">
          <textarea id="ar-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="e.g. I lost access to my old Gmail. My store sells fabrics in Lagos."
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14.5px] text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10" />
        </Field>
      </div>
      <button type="submit" disabled={busy} className={`${PRIMARY} mt-6`}>
        {busy ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <>Send my request <ArrowRight size={16} /></>}
      </button>
      <p className="mt-4 text-center text-[13px] text-slate-500">
        Still have your email? <Link to="/login?forgot=1" className="font-semibold text-forest-600 hover:underline">Reset your password instead</Link>
      </p>
    </form>
  )
}

function RedeemView({ token }) {
  const navigate = useNavigate()
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [done, setDone] = useState(false)

  const strength = passwordStrength(newPassword)
  const errs = showErrors ? {
    newEmail: EMAIL_RE.test(newEmail.trim()) ? '' : 'Enter the email you want to sign in with from now on.',
    newPassword: strength.ok ? '' : 'Use at least 8 characters with a letter and a number.',
    confirm: confirm && confirm === newPassword ? '' : 'The two passwords do not match yet.',
  } : {}

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate('/login'), 5000)
    return () => clearTimeout(t)
  }, [done, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(newEmail.trim()) || !strength.ok || confirm !== newPassword) { setShowErrors(true); return }
    setBusy(true)
    try {
      const res = await fetch('/api/account-recovery?action=redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newEmail: newEmail.trim(), newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || 'Recovery failed.'); return }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><AlertCircle size={26} /></span>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">This link is incomplete</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">It is missing its security token. Open the link from your email again, or start a new request.</p>
        <Link to="/account-recovery" className={`${PRIMARY} mt-6`}>Start a new request <ArrowRight size={16} /></Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-300">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest/20"><CheckCircle2 size={28} /></span>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Welcome back, Your Highness</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
          Your account is recovered. Sign in with <span className="font-semibold text-dash-ink">{newEmail.trim()}</span> and your new password. All other devices have been signed out.
        </p>
        <Link to="/login" className={`${PRIMARY} mt-6`}>Go to sign in <ArrowRight size={16} /></Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="animate-in fade-in duration-300">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><KeyRound size={26} /></span>
      <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Set your new sign-in details</h1>
      <p className="mb-6 mt-2 text-[14.5px] leading-relaxed text-slate-600">
        You&apos;re verified. This link works once and expires 30 minutes after approval, and every device will be signed out.
      </p>
      <ErrorBanner>{error}</ErrorBanner>
      <div className="space-y-5">
        <Field id="rd-email" label="New email address" required error={errs.newEmail}>
          <IconInput icon={Mail} id="rd-email" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="e.g. funmi@gmail.com" maxLength={200} aria-invalid={!!errs.newEmail} invalid={!!errs.newEmail} />
        </Field>
        <Field id="rd-password" label="New password" required error={errs.newPassword}>
          <IconInput icon={Lock} id="rd-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create a strong password" maxLength={128} aria-invalid={!!errs.newPassword} invalid={!!errs.newPassword}
            right={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="px-4 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
          <PasswordMeter password={newPassword} />
        </Field>
        <Field id="rd-confirm" label="Type it again" required error={errs.confirm}
          hint={confirm && confirm === newPassword ? <span className="flex items-center gap-1 font-medium text-forest-600"><CheckCircle2 size={13} /> They match</span> : null}>
          <IconInput icon={Lock} id="rd-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Same password again" maxLength={128} aria-invalid={!!errs.confirm} invalid={!!errs.confirm} />
        </Field>
      </div>
      <button type="submit" disabled={busy} className={`${PRIMARY} mt-6`}>
        {busy ? <><Loader2 size={16} className="animate-spin" /> Recovering...</> : <>Recover my account <ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

export default function AccountRecovery() {
  const [params] = useSearchParams()
  const location = useLocation()
  const isRedeem = location.pathname.endsWith('/redeem')

  useEffect(() => {
    document.title = isRedeem ? 'Recover your account - Sellapage' : 'Account recovery - Sellapage'
  }, [isRedeem])

  return (
    <AuthShell mode="login" back={back}>
      {isRedeem ? <RedeemView token={params.get('token')} /> : <RequestView />}
    </AuthShell>
  )
}
