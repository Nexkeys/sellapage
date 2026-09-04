// src/components/dashboard/PhoneVerifyCard.jsx
// Self-service phone verification (OTP plan, Phase 3).
//
// Deliberately NOT attached to any payout/bank flow - those are out of scope.
// This is a vendor-initiated trust signal that sits alongside CAC verification,
// so the capability is live and testable the moment Termii approves our sender
// ID, without wiring SMS into a money path.
//
// While the sender ID is unapproved, /api/phone-verify?action=status reports
// available:false and this renders an honest "not available yet" state instead
// of a button that always fails.
import { useState, useEffect, useCallback } from 'react'
import { Phone, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { auth } from '../../firebase/auth'
import OtpVerifyModal from '../OtpVerifyModal'

async function authedFetch(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  const token = await user.getIdToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export default function PhoneVerifyCard({ store }) {
  const [status, setStatus] = useState(null)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [otpOpen, setOtpOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const { ok, data } = await authedFetch('/api/phone-verify?action=status')
      if (ok) setStatus(data)
    } catch { /* card simply stays hidden */ }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  // Prefill from the store's existing WhatsApp number - most vendors will
  // verify the number they already trade on.
  useEffect(() => {
    if (!phone && store?.whatsappNumber) setPhone(store.whatsappNumber)
  }, [store?.whatsappNumber, phone])

  const startVerification = () => {
    setError('')
    if (!phone.trim()) { setError('Enter your phone number first.'); return }
    setOtpOpen(true)
  }

  const onVerified = async () => {
    setOtpOpen(false)
    setCompleting(true)
    setError('')
    try {
      const { ok, data } = await authedFetch('/api/phone-verify?action=complete', { method: 'POST' })
      if (!ok) { setError(data.message || 'Could not complete verification.'); return }
      await loadStatus()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  if (!status) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
          {status.phoneVerified ? <ShieldCheck size={18} className="text-green-600" /> : <Phone size={17} className="text-green-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Phone verification</h3>

          {status.phoneVerified ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <CheckCircle2 size={11} /> Verified
              </span>
              <span className="text-xs text-gray-500 font-mono">{status.phoneVerifiedMasked}</span>
            </div>
          ) : !status.available ? (
            <>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Phone verification isn&apos;t available yet - we&apos;re completing setup with our SMS provider. It&apos;ll appear here automatically once it&apos;s ready.
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                Coming soon
              </span>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Verify your number to add a trust signal to your store, alongside CAC verification.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError('') }}
                  placeholder="08012345678"
                  className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
                <button
                  onClick={startVerification}
                  disabled={completing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {completing ? <><Loader2 size={14} className="animate-spin" /> Finishing…</> : 'Send code'}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <OtpVerifyModal
        open={otpOpen}
        purpose="phone_verify"
        phone={phone}
        title="Verify your phone"
        description="Enter the 6-digit code we sent by SMS."
        onClose={() => setOtpOpen(false)}
        onVerified={onVerified}
      />
    </div>
  )
}
