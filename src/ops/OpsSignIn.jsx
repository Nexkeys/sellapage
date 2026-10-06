// src/ops/OpsSignIn.jsx
//
// Ops sign-in, step by step (the server decides each step, ops-auth.js):
//   password -> totp                        (normal day)
//   password -> email code -> enroll        (first time, or after a reset)
//   invite   -> enroll                      (from OpsJoin, the link proved the inbox)
// then recovery codes (only right after enrolling), then the console.
// `SecondSteps` is shared with the invite screen.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { signInWithCustomToken, signOut } from 'firebase/auth'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Smartphone, Copy, Check, KeyRound, AlertCircle, Download } from 'lucide-react'
import { auth } from '../firebase/config'
import OpsShell from './OpsShell'
import CodeBoxes from './CodeBoxes'
import { opsJson, saveOpsSession } from './opsSession'

export const OPS_PRIMARY = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 px-5 text-[15px] font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none'
export const OPS_INPUT = 'h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-[15px] text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10'

export function OpsError({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] leading-snug text-red-700 animate-in fade-in duration-200">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> <span>{children}</span>
    </p>
  )
}

function StepIcon({ icon: Icon }) {
  return <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><Icon size={22} /></span>
}

/** Turns the server's final answer into a signed-in console. */
async function completeSignIn(data) {
  await signInWithCustomToken(auth, data.customToken)
  saveOpsSession({ token: data.session, expiresAt: data.expiresAt, idleMs: data.idleMs })
}

function RecoveryCodes({ codes, onDone }) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = `Sellapage Ops recovery codes\nEach works once. Keep them somewhere safe and offline.\n\n${codes.join('\n')}\n`
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sellapage-ops-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="animate-in fade-in duration-300">
      <StepIcon icon={KeyRound} />
      <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-dash-ink">Save your recovery codes</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">If you lose your phone, each of these lets you in once instead of the authenticator code. You will not see them again.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-4 font-mono text-[15px] tracking-wider text-dash-ink ring-1 ring-slate-100">
        {codes.map((c) => <span key={c} className="rounded-lg bg-white px-3 py-1.5 text-center ring-1 ring-slate-100">{c}</span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600) }}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
        <button type="button" onClick={download} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
          <Download size={14} /> Download
        </button>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[13.5px] text-slate-700">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0b6b35]" />
        I have saved these codes somewhere safe (not in my email).
      </label>
      <button type="button" disabled={!saved} onClick={onDone} className={`${OPS_PRIMARY} mt-5`}>Open the console <ArrowRight size={16} /></button>
    </div>
  )
}

/**
 * Everything after the password: email code, authenticator set-up, the
 * authenticator code, recovery codes. `step` is the server's last answer.
 */
export function SecondSteps({ step: initial, onSignedIn, onRestart }) {
  const [step, setStep] = useState(initial)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [qr, setQr] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [final, setFinal] = useState(null)
  const [resent, setResent] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const boxes = useRef(null)

  useEffect(() => {
    if (step.next !== 'enroll' || !step.otpauth) return
    QRCode.toDataURL(step.otpauth, { margin: 1, width: 220, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [step])

  const submit = async (value = code) => {
    const v = String(value || '').trim()
    if (busy || (!useRecovery && v.length !== 6) || (useRecovery && v.replace(/[^a-z0-9]/gi, '').length !== 8)) return
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=verify', { method: 'POST', body: { challengeId: step.challengeId, code: v }, headers: false })
    setBusy(false)
    if (!ok) {
      setError(data.message || 'That code is not right.')
      setShake((n) => n + 1)
      setCode('')
      if (data.error === 'expired' || data.error === 'too_many' || data.error === 'not_active') setTimeout(onRestart, 1800)
      setTimeout(() => boxes.current?.focus(), 50)
      return
    }
    if (data.customToken) {
      try {
        await completeSignIn(data)
      } catch {
        setError('Your code was right, but signing in failed. Check your connection and start again.')
        return
      }
      if (data.recoveryCodes) { setRecoveryCodes(data.recoveryCodes); setFinal(data) } else onSignedIn(data)
      return
    }
    setCode('')
    setStep({ ...step, ...data })
  }

  const resend = async () => {
    const { ok, data } = await opsJson('/api/ops-auth?action=resend-email', { method: 'POST', body: { challengeId: step.challengeId }, headers: false })
    if (ok) { setResent(true); setTimeout(() => setResent(false), 4000) } else setError(data.message || 'Could not send another code.')
  }

  if (recoveryCodes) return <RecoveryCodes codes={recoveryCodes} onDone={() => onSignedIn(final)} />

  const title = step.next === 'email' ? 'Check your email' : step.next === 'enroll' ? 'Set up your authenticator' : 'Enter your authenticator code'
  return (
    <div key={step.next} className="animate-in fade-in slide-in-from-right-3 duration-300">
      <StepIcon icon={step.next === 'email' ? Mail : step.next === 'enroll' ? Smartphone : ShieldCheck} />
      <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-dash-ink">{title}</h1>

      {step.next === 'email' && (
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">We sent a 6-digit code to <span className="font-semibold text-dash-ink">{step.emailMasked}</span>. It proves this inbox is yours before you set up an authenticator.</p>
      )}
      {step.next === 'enroll' && (
        <>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone, tap <strong>+</strong>, and scan this code. Then type the 6 digits it shows.</p>
          <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:flex-row sm:items-start">
            {qr ? <img src={qr} alt="QR code for your authenticator app" className="h-[150px] w-[150px] flex-shrink-0 rounded-xl bg-white p-1.5 ring-1 ring-slate-200" /> : <span className="flex h-[150px] w-[150px] items-center justify-center rounded-xl bg-white ring-1 ring-slate-200"><Loader2 className="animate-spin text-slate-300" /></span>}
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-[12px] font-semibold text-dash-ink">Can&apos;t scan? Enter this key:</p>
              <p className="mt-1 break-all font-mono text-[13px] tracking-wider text-slate-700">{step.secret?.match(/.{1,4}/g)?.join(' ')}</p>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(step.secret).catch(() => {}); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 1500) }}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-600 hover:underline">{keyCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy key</>}</button>
              <p className="mt-2 text-[11.5px] text-slate-500">Account: {step.email}</p>
            </div>
          </div>
        </>
      )}
      {step.next === 'totp' && (
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{useRecovery ? 'Type one of the recovery codes you saved when you set up your authenticator. Each works once.' : `Welcome back${step.name ? `, ${step.name.split(' ')[0]}` : ''}. Open your authenticator app and type the 6-digit code for Sellapage Ops.`}</p>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-5">
        <OpsError>{error}</OpsError>
        {useRecovery ? (
          <input value={code} onChange={(e) => setCode(e.target.value.slice(0, 12))} placeholder="abcd-efgh" autoFocus autoComplete="off" spellCheck={false}
            className={`${OPS_INPUT} text-center font-mono text-[18px] tracking-[0.2em]`} aria-label="Recovery code" />
        ) : (
          <CodeBoxes key={shake} ref={boxes} value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={busy} error={!!error} />
        )}
        <button type="submit" disabled={busy} className={`${OPS_PRIMARY} mt-5`}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Checking...</> : step.next === 'enroll' ? <>Turn on and continue <ArrowRight size={16} /></> : <>Continue <ArrowRight size={16} /></>}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        {step.next === 'email' && <button type="button" onClick={resend} className="font-semibold text-forest-600 hover:underline">{resent ? 'Sent. Check your inbox.' : 'Send another code'}</button>}
        {step.next === 'totp' && (
          <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(''); setError('') }} className="font-semibold text-forest-600 hover:underline">
            {useRecovery ? 'Use my authenticator instead' : 'Use a recovery code'}
          </button>
        )}
        <button type="button" onClick={onRestart} className="text-slate-500 hover:text-dash-ink">Start again</button>
      </div>
    </div>
  )
}

export default function OpsSignIn({ base, notice, onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(null)

  // A half-finished sign-in in another tab must not leave a Firebase user
  // behind without a session.
  useEffect(() => { signOut(auth).catch(() => {}) }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=password', { method: 'POST', body: { email: email.trim(), password }, headers: false })
    setBusy(false)
    if (!ok) { setError(data.message || 'Could not sign you in.'); return }
    setPassword('')
    setStep(data)
  }

  return (
    <OpsShell>
      {step ? (
        <SecondSteps step={step} onSignedIn={onSignedIn} onRestart={() => { setStep(null); setError('') }} />
      ) : (
        <form onSubmit={submit} className="animate-in fade-in duration-300">
          <StepIcon icon={Lock} />
          <h1 className="mt-4 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Sign in to Ops</h1>
          <p className="mb-6 mt-1.5 text-[14px] text-slate-600">Use your staff email, not a store login.</p>
          {notice && <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] leading-snug text-amber-900 ring-1 ring-amber-100">{notice}</p>}
          <OpsError>{error}</OpsError>
          <label htmlFor="ops-email" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Work email</label>
          <input id="ops-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sellapage.com.ng" className={OPS_INPUT} required />
          <label htmlFor="ops-password" className="mb-1.5 mt-4 block text-[13px] font-semibold text-dash-ink">Password</label>
          <div className="relative">
            <input id="ops-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${OPS_INPUT} pr-12`} required />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <button type="submit" disabled={busy || !email || !password} className={`${OPS_PRIMARY} mt-6`}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Checking...</> : <>Continue <ArrowRight size={16} /></>}
          </button>
          <p className="mt-5 text-center text-[13px] text-slate-500">
            Lost your phone? <Link to={`${base}/lost-authenticator`} className="font-semibold text-forest-600 hover:underline">Get help signing in</Link>
          </p>
        </form>
      )}
    </OpsShell>
  )
}
