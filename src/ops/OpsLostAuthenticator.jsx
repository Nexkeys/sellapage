// src/ops/OpsLostAuthenticator.jsx
//
// "I lost my phone." First choice: a recovery code (works at the normal
// sign-in). Otherwise ask for a reset: a super admin must approve it after
// confirming it is really you, then you sign in, confirm an emailed code and
// set up a new authenticator. The answer never says whether the email is
// a staff account.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, KeyRound, Loader2, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react'
import OpsShell from './OpsShell'
import { OpsError, OPS_PRIMARY, OPS_INPUT } from './OpsSignIn'
import { opsJson } from './opsSession'

export default function OpsLostAuthenticator({ base }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=reset-request', { method: 'POST', body: { email: email.trim() }, headers: false })
    setBusy(false)
    if (!ok) { setError(data.message || 'Could not send your request.'); return }
    setDone(data.message)
  }

  return (
    <OpsShell>
      {done ? (
        <div className="animate-in fade-in duration-300">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-600 text-white"><CheckCircle2 size={22} /></span>
          <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-dash-ink">Request sent</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{done}</p>
          <p className="mt-2 text-[13px] text-slate-500">Once it is approved you will get an email. Then sign in as usual: we will email you a code and you will set up your new phone.</p>
          <Link to={`${base}/login`} className={`${OPS_PRIMARY} mt-6`}>Back to sign in <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="animate-in fade-in duration-300">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><Smartphone size={22} /></span>
          <h1 className="mt-4 font-display text-[26px] font-extrabold tracking-tight text-dash-ink">Lost your authenticator?</h1>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-forest-50/70 p-4 ring-1 ring-forest-100">
            <KeyRound size={18} className="mt-0.5 flex-shrink-0 text-forest-600" />
            <p className="text-[13.5px] leading-relaxed text-forest-700">
              <strong>Have your recovery codes?</strong> Sign in as usual and choose &quot;Use a recovery code&quot;. That is the fastest way back in.
            </p>
          </div>
          <p className="mb-4 mt-5 text-[14px] leading-relaxed text-slate-600">No codes either? Ask for a reset. A super admin will confirm it is really you (they will call you, not email) before approving it.</p>
          <OpsError>{error}</OpsError>
          <label htmlFor="lost-email" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Your work email</label>
          <input id="lost-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={OPS_INPUT} required />
          <button type="submit" disabled={busy || !email} className={`${OPS_PRIMARY} mt-5`}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <>Ask for a reset <ArrowRight size={16} /></>}
          </button>
          <Link to={`${base}/login`} className="mt-4 flex items-center justify-center gap-1 text-[13px] text-slate-500 hover:text-dash-ink"><ArrowLeft size={13} /> Back to sign in</Link>
        </form>
      )}
    </OpsShell>
  )
}
