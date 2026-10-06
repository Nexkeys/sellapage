// src/ops/OpsApp.jsx
//
// The Sellapage Ops console app: ops.sellapage.com.ng (or /ops on localhost
// and Vercel preview links). Its own sign-in, its own session, never a store
// login. Routes, relative to `base`:
//   /login                 password, then authenticator (OpsSignIn)
//   /join?token=           accept an invite (OpsJoin)
//   /lost-authenticator    ask for a reset (OpsLostAuthenticator)
//   everything else        the console, once signed in
//
// While signed in it also:
//   - asks for the authenticator code when the server wants "sudo mode",
//   - warns 2 minutes before the 30-minute idle sign-out, then signs out,
//   - signs out at once if the server ends the session (paused, removed,
//     ended by an admin, expired), and says why on the sign-in screen.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ShieldCheck, Loader2, X, TimerReset } from 'lucide-react'
import { auth } from '../firebase/config'
import OpsSignIn from './OpsSignIn'
import OpsJoin from './OpsJoin'
import OpsLostAuthenticator from './OpsLostAuthenticator'
import CodeBoxes from './CodeBoxes'
import { OPS_PRIMARY, OPS_INPUT, OpsError } from './OpsSignIn'
import { getOpsSession, clearOpsSession, opsHeaders, opsJson, installOpsFetchGuard, setOpsFetchHandlers } from './opsSession'

const Admin = lazy(() => import('../pages/Admin'))

const ENDED = {
  session_idle: 'You were signed out after 30 minutes without activity.',
  session_expired: 'Your 12-hour session ended. Sign in again.',
  session_ended: 'Your session was ended. Sign in again.',
  staff_paused: 'Your access is paused for now. Speak to a super admin.',
  staff_deleted: 'Your access has been removed.',
  idle: 'You were signed out after 30 minutes without activity.',
  logout: '',
}

function Loading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#f3f6f4]"><Loader2 className="animate-spin text-forest-600" aria-label="Loading" /></div>
}

/** "Confirm it's you" for risky actions (sudo mode, 15 minutes). */
function StepUpModal({ open, onDone }) {
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  useEffect(() => { if (open) { setCode(''); setError(''); setRecovery(false) } }, [open])
  if (!open) return null
  const submit = async (value = code) => {
    if (busy) return
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=step-up', { method: 'POST', body: { code: String(value).trim() } })
    setBusy(false)
    if (ok) { onDone(true); return }
    setError(data.message || 'That code is not right.')
    setShake((n) => n + 1)
    setCode('')
  }
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="stepup-title">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><ShieldCheck size={20} /></span>
          <button type="button" onClick={() => onDone(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cancel"><X size={18} /></button>
        </div>
        <h2 id="stepup-title" className="mt-3 font-display text-xl font-extrabold text-dash-ink">Confirm it&apos;s you</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">This is a sensitive action. {recovery ? 'Type one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.'} You won&apos;t be asked again for 15 minutes.</p>
        <form onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-4">
          <OpsError>{error}</OpsError>
          {recovery
            ? <input value={code} onChange={(e) => setCode(e.target.value.slice(0, 12))} autoFocus placeholder="abcd-efgh" className={`${OPS_INPUT} text-center font-mono tracking-[0.2em]`} aria-label="Recovery code" />
            : <CodeBoxes key={shake} value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={busy} error={!!error} />}
          <button type="submit" disabled={busy} className={`${OPS_PRIMARY} mt-4`}>{busy ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}</button>
        </form>
        <button type="button" onClick={() => { setRecovery((v) => !v); setCode(''); setError('') }} className="mt-3 w-full text-center text-[12.5px] font-semibold text-forest-600 hover:underline">
          {recovery ? 'Use my authenticator instead' : 'Use a recovery code'}
        </button>
      </div>
    </div>
  )
}

/** Signs out after 30 idle minutes, with a 2-minute warning. */
function IdleGuard({ idleMs, expiresAt, onTimeout, onKeepAlive }) {
  const last = useRef(Date.now())
  const [left, setLeft] = useState(null)
  useEffect(() => {
    const bump = () => { last.current = Date.now() }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = setInterval(() => {
      const now = Date.now()
      const idleLeft = idleMs - (now - last.current)
      const hardLeft = expiresAt - now
      const soonest = Math.min(idleLeft, hardLeft)
      if (soonest <= 0) { onTimeout(hardLeft <= 0 ? 'session_expired' : 'idle'); return }
      setLeft(soonest <= 2 * 60 * 1000 ? soonest : null)
    }, 1000)
    return () => { clearInterval(t); events.forEach((e) => window.removeEventListener(e, bump)) }
  }, [idleMs, expiresAt, onTimeout])
  if (left == null) return null
  const hard = expiresAt - Date.now() <= left + 1000
  const secs = Math.ceil(left / 1000)
  return (
    <div className="fixed inset-x-0 bottom-4 z-[125] flex justify-center px-4" role="alert">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
        <TimerReset size={20} className="flex-shrink-0 text-amber-300" />
        <p className="flex-1 text-[13px] leading-snug">{hard ? `Your 12-hour session ends in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}. Save your work.` : `Still there? For safety you'll be signed out in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}.`}</p>
        {!hard && <button type="button" onClick={() => { last.current = Date.now(); setLeft(null); onKeepAlive() }} className="rounded-xl bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-900">I&apos;m here</button>}
      </div>
    </div>
  )
}

function OpsConsole({ me, session, onSignOut, onRefresh }) {
  const [stepUp, setStepUp] = useState(null)
  const [toast, setToast] = useState('')
  useEffect(() => {
    setOpsFetchHandlers({
      onStepUp: () => new Promise((resolve) => setStepUp({ resolve })),
      onSessionEnded: (code) => onSignOut(code, { remote: true }),
      onTabRevoked: () => { setToast('Your access just changed. The menu has been updated.'); onRefresh() },
    })
  }, [onSignOut, onRefresh])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t) }, [toast])
  // Re-read who I am every 2 minutes: a tab revoked elsewhere disappears.
  useEffect(() => { const t = setInterval(onRefresh, 2 * 60 * 1000); return () => clearInterval(t) }, [onRefresh])

  return (
    <>
      <Suspense fallback={<Loading />}>
        <Admin ops={{ user: auth.currentUser, staff: me, session, authHeaders: opsHeaders, onSignOut: () => onSignOut('logout') }} />
      </Suspense>
      <StepUpModal open={!!stepUp} onDone={(ok) => { stepUp?.resolve(ok); setStepUp(null) }} />
      <IdleGuard idleMs={session.idleMs} expiresAt={session.expiresAt} onTimeout={(why) => onSignOut(why)} onKeepAlive={onRefresh} />
      {toast && <div className="fixed left-1/2 top-4 z-[126] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-[13px] text-white shadow-xl animate-in fade-in slide-in-from-top-2">{toast}</div>}
    </>
  )
}

export default function OpsApp({ base = '' }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading')
  const [me, setMe] = useState(null)
  const [session, setSession] = useState(null)
  const [notice, setNotice] = useState('')
  const home = base || '/'

  useEffect(() => { installOpsFetchGuard() }, [])
  useEffect(() => {
    document.title = 'Sellapage Ops'
    // The console must never be indexed or framed by anyone.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const loadMe = useCallback(async () => {
    const { ok, data } = await opsJson('/api/ops-auth?action=me')
    if (ok) {
      setMe(data.staff)
      setSession({ ...data.session, idleMs: data.session.idleMs || 30 * 60 * 1000 })
      setPhase('ready')
      return true
    }
    return data.endReason || data.error || 'session_ended'
  }, [])

  const doSignOut = useCallback(async (reason = 'logout', { remote = false } = {}) => {
    if (!remote && getOpsSession()) await opsJson('/api/ops-auth?action=logout', { method: 'POST' })
    await signOut(auth).catch(() => {})
    clearOpsSession()
    setMe(null)
    setSession(null)
    setNotice(ENDED[reason] ?? '')
    setPhase('out')
    navigate(`${base}/login`, { replace: true })
  }, [base, navigate])

  // A background check found the session gone: sign out with the reason.
  const refresh = useCallback(async () => {
    const result = await loadMe()
    if (result === true) return
    const why = { paused: 'staff_paused', deleted: 'staff_deleted', idle: 'session_idle', expired: 'session_expired' }[result] || (ENDED[result] !== undefined ? result : 'session_ended')
    doSignOut(why, { remote: true })
  }, [loadMe, doSignOut])

  useEffect(() => {
    const stop = onAuthStateChanged(auth, async (user) => {
      stop()
      if (user && getOpsSession() && (await loadMe()) === true) return
      clearOpsSession()
      setPhase('out')
    })
    return () => stop()
  }, [loadMe])

  const signedIn = async () => {
    setNotice('')
    if ((await loadMe()) === true) navigate(home, { replace: true })
  }

  return (
    <Routes>
      <Route path="login" element={phase === 'ready' ? <Navigate to={home} replace /> : <OpsSignIn base={base} notice={notice} onSignedIn={signedIn} />} />
      <Route path="join" element={<OpsJoin base={base} onSignedIn={signedIn} />} />
      <Route path="lost-authenticator" element={<OpsLostAuthenticator base={base} />} />
      <Route path="*" element={
        phase === 'loading' ? <Loading />
          : phase === 'ready' && me && session ? <OpsConsole me={me} session={session} onSignOut={doSignOut} onRefresh={refresh} />
            : <Navigate to={`${base}/login`} replace />
      } />
    </Routes>
  )
}
