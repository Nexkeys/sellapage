// src/ops/OpsJoin.jsx
//
// Where an invite link lands (/join?token=...). Shows who invited whom and as
// what, asks for a password (10+ characters with a letter and a number), then
// goes straight to setting up the authenticator: the link already proved the
// inbox. Staff accounts are never store logins (ops-auth.js refuses an email
// that already has one).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ArrowRight, Eye, EyeOff, Crown, AlertCircle, PartyPopper, Check } from 'lucide-react'
import OpsShell from './OpsShell'
import { SecondSteps, OpsError, OPS_PRIMARY, OPS_INPUT } from './OpsSignIn'
import { opsJson } from './opsSession'

const REASONS = {
  unknown: 'This invite link is not valid. Check that you opened the whole link from the email.',
  cancelled: 'This invite was cancelled. Ask the person who invited you for a new one.',
  used: 'This invite was already used. Sign in instead.',
  expired: 'This invite has expired (they last 48 hours). Ask for a new one.',
}

export default function OpsJoin({ base, onSignedIn }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [invite, setInvite] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(null)

  useEffect(() => {
    let alive = true
    opsJson(`/api/ops-auth?action=invite&token=${encodeURIComponent(token)}`, { headers: false }).then(({ data }) => { if (alive) setInvite(data) })
    return () => { alive = false }
  }, [token])

  const checks = [
    [password.length >= 10, 'At least 10 characters'],
    [/[a-z]/i.test(password), 'A letter'],
    [/\d/.test(password), 'A number'],
    [password && password === confirm, 'Both match'],
  ]
  const ready = checks.every(([ok]) => ok)

  const submit = async (e) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=accept-invite', { method: 'POST', body: { token, password }, headers: false })
    setBusy(false)
    if (!ok) { setError(data.message || 'Could not accept the invite.'); return }
    setPassword('')
    setConfirm('')
    setStep(data)
  }

  let body
  if (step) {
    // The account and password exist by now, so starting again is a normal
    // sign-in (password, email code, authenticator). No page reload.
    body = <SecondSteps step={step} onSignedIn={onSignedIn} onRestart={() => navigate(`${base}/login`, { replace: true, state: { email: invite?.email || '', notice: 'Your account is ready. Sign in with your email and the password you just chose to finish setting up your authenticator.' } })} />
  } else if (!invite) {
    body = <div className="flex flex-col items-center py-10" role="status"><Loader2 className="animate-spin text-forest-600" /><p className="mt-3 text-[14px] text-slate-600">Checking your invite...</p></div>
  } else if (!invite.valid) {
    body = (
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><AlertCircle size={22} /></span>
        <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-dash-ink">This invite can&apos;t be used</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{REASONS[invite.reason] || REASONS.unknown}</p>
        <Link to={`${base}/login`} className={`${OPS_PRIMARY} mt-6`}>Go to sign in <ArrowRight size={16} /></Link>
      </div>
    )
  } else {
    body = (
      <form onSubmit={submit} className="animate-in fade-in duration-300">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100">{invite.isSuper ? <Crown size={22} /> : <PartyPopper size={22} />}</span>
        <h1 className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-tight text-dash-ink">Welcome to the team, {invite.name.split(' ')[0]}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
          {invite.invitedByName || 'A super admin'} invited you to Sellapage Ops{invite.title ? <> as <strong className="text-dash-ink">{invite.title}</strong></> : null}{invite.isSuper ? <> with <strong className="text-dash-ink">super admin</strong> access</> : null}.
          Choose a password, then set up your authenticator. Two minutes, tops.
        </p>
        <div className="mb-5 mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] ring-1 ring-slate-100">
          <span className="text-slate-500">Your sign-in email</span>
          <span className="block font-semibold text-dash-ink">{invite.email}</span>
        </div>
        <OpsError>{error}</OpsError>
        <label htmlFor="join-pw" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Choose a password</label>
        <div className="relative">
          <input id="join-pw" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${OPS_INPUT} pr-12`} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <label htmlFor="join-pw2" className="mb-1.5 mt-4 block text-[13px] font-semibold text-dash-ink">Type it again</label>
        <input id="join-pw2" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={OPS_INPUT} />
        <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[12.5px]">
          {checks.map(([ok, label]) => (
            <li key={label} className={`flex items-center gap-1.5 ${ok ? 'text-forest-600' : 'text-slate-400'}`}><Check size={13} strokeWidth={ok ? 3 : 2} /> {label}</li>
          ))}
        </ul>
        <button type="submit" disabled={!ready || busy} className={`${OPS_PRIMARY} mt-6`}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Creating your account...</> : <>Create my account <ArrowRight size={16} /></>}
        </button>
      </form>
    )
  }
  return <OpsShell>{body}</OpsShell>
}
