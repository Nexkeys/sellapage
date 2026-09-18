// src/components/dashboard/PhoneVerifyCard.jsx
// Phone verification from Settings, for stores that did not verify at signup
// (every store created before phone signup existed) and for a vendor who has
// changed their WhatsApp number since.
//
// A store that verified at signup lands here already verified and is never
// asked again, so no second SMS is spent on it.
//
// The number is checked as the vendor types, so one already verified on
// another store is refused before any code is sent. Verifying also makes the
// number the store's WhatsApp number, because the storefront badge only shows
// while those two are the same.
import { useState, useEffect, useCallback, useRef } from 'react'
import { Phone, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { auth } from '../../firebase/auth'
import OtpVerifyModal from '../OtpVerifyModal'
import { normaliseNgMobile } from '../../utils/phone'

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
  // { phone, state: 'free' | 'taken' | 'mine' | 'unknown', message }
  const [check, setCheck] = useState(null)

  const loadStatus = useCallback(async () => {
    try {
      const { ok, data } = await authedFetch('/api/phone-verify?action=status')
      if (ok) setStatus(data)
    } catch { /* card simply stays hidden */ }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus, store?.whatsappNumber])

  // Prefill ONCE from the store's WhatsApp number - most vendors verify the
  // number they already trade on. Only once, so clearing the field to type a
  // different number does not paste the old one straight back in.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !store?.whatsappNumber) return
    prefilled.current = true
    setPhone(store.whatsappNumber)
  }, [store?.whatsappNumber])

  const normalised = normaliseNgMobile(phone)

  // Checked the moment the number is complete, so a taken number is refused
  // before the vendor presses anything and before any SMS is paid for.
  const smsAvailable = status?.available === true
  useEffect(() => {
    if (!normalised || !smsAvailable) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const { ok, data } = await authedFetch(`/api/phone-verify?action=check&phone=${normalised}`)
        if (cancelled) return
        if (!ok) setCheck({ phone: normalised, state: 'unknown' })
        else if (!data.available) setCheck({ phone: normalised, state: 'taken', message: data.message })
        else if (data.ownedBySelf) setCheck({ phone: normalised, state: 'mine' })
        else setCheck({ phone: normalised, state: 'free' })
      } catch {
        // Unknown is not a block: otp-send checks again before any SMS.
        if (!cancelled) setCheck({ phone: normalised, state: 'unknown' })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [normalised, smsAvailable])
  // A result only counts for the number it was fetched for.
  const checkState = !normalised || !smsAvailable ? null : check?.phone === normalised ? check.state : 'checking'
  const blocked = checkState === 'taken' || checkState === 'mine' || checkState === 'checking'

  const startVerification = () => {
    setError('')
    if (!normalised) { setError('Enter a valid Nigerian mobile number, e.g. 08012345678.'); return }
    if (blocked) return
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

  const verifiedAndCurrent = status.phoneVerified && status.matchesContact

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
          {verifiedAndCurrent ? <ShieldCheck size={18} className="text-green-600" /> : <Phone size={17} className="text-green-600" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Phone verification</h3>

          {verifiedAndCurrent ? (
            <>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={11} /> Verified
                </span>
                <span className="text-xs text-gray-500 font-mono">{status.phoneVerifiedMasked}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Customers see &ldquo;Phone Verified&rdquo; on your storefront. If you change your WhatsApp number, the badge hides until the new number is verified.
              </p>
            </>
          ) : !status.available ? (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Phone verification is temporarily unavailable. Please check back shortly.
            </p>
          ) : (
            <>
              {status.phoneVerified ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mt-1.5 leading-relaxed">
                  Your WhatsApp number has changed since it was verified, so the Phone Verified badge is hidden. Verify the new number to bring it back.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Verify your number to show a &ldquo;Phone Verified&rdquo; badge on your storefront, alongside CAC verification.
                </p>
              )}
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError('') }}
                  placeholder="08012345678"
                  className={`flex-1 border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 ${
                    checkState === 'taken'
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500/20'
                  }`}
                />
                <button
                  onClick={startVerification}
                  disabled={completing || blocked}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {completing ? <><Loader2 size={14} className="animate-spin" /> Finishing…</> : 'Send code'}
                </button>
              </div>

              {checkState === 'checking' && (
                <p className="mt-1.5 text-[11px] text-gray-400 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Checking number…
                </p>
              )}
              {checkState === 'taken' && (
                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1.5">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /><span>{check.message}</span>
                </p>
              )}
              {checkState === 'mine' && (
                <p className="mt-1.5 text-xs text-gray-600 flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-green-600" />
                  <span>This number is already verified on your store. Set it as your WhatsApp number in Business Information below and the badge comes back, no code needed.</span>
                </p>
              )}
              <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                Verifying also makes this your store&apos;s WhatsApp number. Up to 3 codes a day.
              </p>
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
        phone={normalised || phone}
        title="Verify your phone"
        description="Enter the 6-digit code we sent by SMS."
        onClose={() => setOtpOpen(false)}
        onVerified={onVerified}
      />
    </div>
  )
}
