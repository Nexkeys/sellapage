// src/pages/ResetPassword.jsx
//
// Where the "reset your password" email lands (/reset-password?oobCode=...).
// Rebuilt on 2026-10-06 on the auth design (AuthShell): the link is checked
// first, so an expired one says so before anyone types a password; the new
// password uses the same Weak / Good / Strong / Perfect meter as signup and
// needs at least "Good" (8+ characters, a letter and a number).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, KeyRound, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '../firebase/config'
import AuthShell from '../components/auth/AuthShell'
import { Field, IconInput, PRIMARY, ErrorBanner, PasswordMeter } from '../components/auth/AuthFields'
import { passwordStrength } from '../components/auth/authUtils'

const LINK_ERRORS = {
  'auth/expired-action-code': 'This reset link has expired. Links only work for a short while, so request a fresh one.',
  'auth/invalid-action-code': 'This reset link has already been used or is not valid. Request a fresh one.',
  'auth/user-disabled': 'This account has been disabled. Contact support and we will help you.',
  'auth/user-not-found': 'We could not find the account for this link. Request a fresh one.',
}

const maskEmail = (email) => {
  const [name, domain] = String(email || '').split('@')
  if (!domain) return ''
  return `${name.slice(0, 1)}${'*'.repeat(Math.max(2, name.length - 1))}@${domain}`
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode')

  // 'checking' -> 'ready' | 'bad'; then 'done' after a successful reset.
  const [linkState, setLinkState] = useState(oobCode ? 'checking' : 'bad')
  const [linkError, setLinkError] = useState(oobCode ? '' : 'This reset link is incomplete. Request a fresh one.')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!oobCode) return
    let cancelled = false
    verifyPasswordResetCode(auth, oobCode)
      .then((addr) => { if (!cancelled) { setEmail(addr); setLinkState('ready') } })
      .catch((err) => {
        if (cancelled) return
        setLinkState('bad')
        setLinkError(LINK_ERRORS[err.code] || 'This reset link is not working. Request a fresh one.')
      })
    return () => { cancelled = true }
  }, [oobCode])

  useEffect(() => {
    if (linkState !== 'done') return
    if (countdown <= 0) { navigate('/login'); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [linkState, countdown, navigate])

  const strength = passwordStrength(password)
  const errs = showErrors ? {
    password: strength.ok ? '' : 'Use at least 8 characters with a letter and a number.',
    confirm: confirm && confirm === password ? '' : 'The two passwords do not match yet.',
  } : {}

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!strength.ok || confirm !== password) { setShowErrors(true); return }
    setLoading(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setLinkState('done')
    } catch (err) {
      if (LINK_ERRORS[err.code]) { setLinkState('bad'); setLinkError(LINK_ERRORS[err.code]) }
      else if (err.code === 'auth/weak-password') setError('That password is too weak. Make it longer, with a letter and a number.')
      else setError('We could not save your new password. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const back = { to: '/login', label: 'Back to sign in', short: 'Sign in' }

  if (linkState === 'checking') {
    return (
      <AuthShell mode="login" back={back}>
        <div className="flex flex-col items-center py-10 text-center" role="status">
          <Loader2 size={28} className="animate-spin text-forest-600" />
          <p className="mt-4 text-[15px] font-semibold text-dash-ink">Checking your reset link...</p>
        </div>
      </AuthShell>
    )
  }

  if (linkState === 'bad') {
    return (
      <AuthShell mode="login" back={back}>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><AlertCircle size={26} /></span>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">This link can&apos;t be used</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{linkError}</p>
        <Link to="/login?forgot=1" className={`${PRIMARY} mt-6`}>Send me a new link <ArrowRight size={16} /></Link>
        <Link to="/account-recovery" className="mt-5 block text-center text-[13px] text-slate-500 hover:text-dash-ink">
          Lost access to your email? <span className="font-semibold text-forest-600">Recover your account</span>
        </Link>
      </AuthShell>
    )
  }

  if (linkState === 'done') {
    return (
      <AuthShell mode="login" back={back}>
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-600 text-white shadow-lg shadow-forest/20"><CheckCircle2 size={28} /></span>
          <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">New password saved!</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
            You&apos;re all set, boss. Sign in with your new password{email ? <> for <span className="font-semibold text-dash-ink">{maskEmail(email)}</span></> : ''}.
          </p>
          <Link to="/login" className={`${PRIMARY} mt-6`}>Sign in now <ArrowRight size={16} /></Link>
          <p className="mt-3 text-center text-[12.5px] text-slate-400">Taking you there in {countdown}s...</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell mode="login" back={back}>
      <form onSubmit={submit} noValidate className="animate-in fade-in duration-300">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><KeyRound size={26} /></span>
        <h1 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Choose a new password</h1>
        <p className="mb-6 mt-2 text-[14.5px] leading-relaxed text-slate-600">
          {email ? <>For <span className="font-semibold text-dash-ink">{maskEmail(email)}</span>. </> : null}Make it one you haven&apos;t used here before.
        </p>
        <ErrorBanner>{error}</ErrorBanner>
        <div className="space-y-5">
          <Field id="rp-password" label="New password" required error={errs.password}>
            <IconInput icon={Lock} id="rp-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password" maxLength={128} aria-invalid={!!errs.password} invalid={!!errs.password}
              right={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="px-4 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
            <PasswordMeter password={password} />
          </Field>
          <Field id="rp-confirm" label="Type it again" required error={errs.confirm}
            hint={confirm && confirm === password ? <span className="flex items-center gap-1 font-medium text-forest-600"><CheckCircle2 size={13} /> They match</span> : null}>
            <IconInput icon={Lock} id="rp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same password again" maxLength={128} aria-invalid={!!errs.confirm} invalid={!!errs.confirm} />
          </Field>
        </div>
        <button type="submit" disabled={loading} className={`${PRIMARY} mt-6`}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <>Save new password <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthShell>
  )
}
