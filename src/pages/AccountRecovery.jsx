// src/pages/AccountRecovery.jsx
// Public, unauthenticated recovery for a vendor locked out of their account
// email. Two views on one route:
//   /account-recovery          -> submit a request for admin review
//   /account-recovery/redeem   -> set a new email + password with an approved token
//
// Deliberately never confirms whether an account exists: the success screen is
// identical either way (the server enforces this too).
import { useState, useEffect } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="text-2xl font-black tracking-tight text-green-600 mb-6">sellapage</Link>
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {children}
      </div>
      <Link to="/login" className="mt-5 text-xs font-semibold text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft size={13} /> Back to sign in
      </Link>
    </div>
  )
}

function RequestView() {
  const [identifier, setIdentifier] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account-recovery?action=request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, contactEmail, contactPhone, reason }),
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
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={22} className="text-green-600" />
        </div>
        <h1 className="font-bold text-gray-900 text-lg">Request received</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          If an account matches those details, our team will review your request and contact you.
          This usually takes 1–2 business days.
        </p>
        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          For security, we also alert the account&apos;s current email address about every recovery request.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-green-600" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-tight">Recover your account</h1>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Lost access to the email on your store? Tell us how to reach you and our team will verify you manually.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Your store link or account email</label>
          <input
            required value={identifier} onChange={e => setIdentifier(e.target.value)}
            placeholder="mystore  or  you@example.com"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">An email we can reach you on</label>
          <input
            required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
            placeholder="new@example.com"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone / WhatsApp <span className="font-normal text-gray-400">(optional)</span></label>
          <input
            value={contactPhone} onChange={e => setContactPhone(e.target.value)}
            placeholder="+234..."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">What happened?</label>
          <textarea
            rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Anything that helps us confirm the store is yours — CAC name, recent orders, etc."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <button
          type="submit" disabled={busy}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2"
        >
          {busy ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : 'Submit request'}
        </button>
      </form>
    </>
  )
}

function RedeemView({ token }) {
  const navigate = useNavigate()
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account-recovery?action=redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newEmail, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.message || 'Recovery failed.'); return }
      setDone(true)
      setTimeout(() => navigate('/login'), 4000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <AlertCircle size={22} className="text-red-500 mx-auto mb-3" />
        <h1 className="font-bold text-gray-900 text-lg">Invalid recovery link</h1>
        <p className="text-sm text-gray-500 mt-2">This link is missing its token. Request recovery again.</p>
        <Link to="/account-recovery" className="inline-block mt-4 text-sm font-bold text-green-600">Start over</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={22} className="text-green-600" />
        </div>
        <h1 className="font-bold text-gray-900 text-lg">Account recovered</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Sign in with your new email and password. All other devices have been signed out.
        </p>
        <Link to="/login" className="inline-block mt-4 text-sm font-bold text-green-600">Go to sign in</Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="font-bold text-gray-900 text-base">Set your new sign-in details</h1>
      <p className="text-xs text-gray-500 mt-1 mb-5 leading-relaxed">
        This link works once and expires 30 minutes after approval. All devices will be signed out.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">New email address</label>
          <input
            required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">New password</label>
          <input
            required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm password</label>
          <input
            required type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <button
          type="submit" disabled={busy}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-sm inline-flex items-center justify-center gap-2"
        >
          {busy ? <><Loader2 size={15} className="animate-spin" /> Recovering…</> : 'Recover my account'}
        </button>
      </form>
    </>
  )
}

export default function AccountRecovery() {
  const [params] = useSearchParams()
  const location = useLocation()
  const isRedeem = location.pathname.endsWith('/redeem')

  useEffect(() => {
    document.title = isRedeem ? 'Recover your account — Sellapage' : 'Account recovery — Sellapage'
  }, [isRedeem])

  return (
    <Shell>
      {isRedeem ? <RedeemView token={params.get('token')} /> : <RequestView />}
    </Shell>
  )
}
