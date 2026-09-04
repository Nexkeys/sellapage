// src/components/OtpVerifyModal.jsx
// Step-up verification prompt for sensitive actions (Phase 1 - see
// Docs/OTP-Verification-Plan.md).
//
// This modal is a UX affordance, NOT the security boundary. The server derives
// the challenge from the authenticated uid + purpose and burns it inside the
// action handler itself, so skipping this dialog from the console gains nothing.
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { auth } from '../firebase/auth'
import { getRecaptchaToken } from '../utils/recaptcha'

// `phone` is only used by SMS purposes (phone_verify) - the server ignores it
// for email purposes, where the destination is always read from the account.
export default function OtpVerifyModal({ open, purpose, title, description, phone, onVerified, onClose }) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [masked, setMasked] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRef = useRef(null)
  const requestedRef = useRef(false)

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
      const recaptchaToken = await getRecaptchaToken(`otp_send_${purpose}`)
      const { ok, data } = await authedFetch('/api/otp-send', { purpose, phone, recaptchaToken })
      if (!ok) {
        setError(data.message || 'Could not send the code.')
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds)
        return
      }
      setMasked(data.destinationMasked || '')
      setCooldown(data.resendAfterSeconds || 60)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }, [authedFetch, purpose, phone])

  // Request one code per opening. requestedRef guards React StrictMode's
  // double-invoke in development, which would otherwise burn the 60s cooldown
  // immediately and look like a bug.
  useEffect(() => {
    if (!open) {
      requestedRef.current = false
      setCode('')
      setError('')
      setMasked('')
      setCooldown(0)
      return
    }
    if (requestedRef.current) return
    requestedRef.current = true
    sendCode()
  }, [open, sendCode])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open, masked])

  const submit = async (e) => {
    e?.preventDefault()
    if (code.length !== 6 || verifying) return
    setVerifying(true)
    setError('')
    try {
      const { ok, data } = await authedFetch('/api/otp-verify', { purpose, code })
      if (!ok) {
        setError(
          typeof data.remainingAttempts === 'number' && data.remainingAttempts > 0
            ? `${data.message} ${data.remainingAttempts} attempt${data.remainingAttempts === 1 ? '' : 's'} left.`
            : data.message || 'Verification failed.',
        )
        setCode('')
        return
      }
      onVerified?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-tight">
                {title || 'Confirm it&apos;s you'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {description || 'This action needs email verification.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-5 pb-5">
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {sending && !masked
              ? 'Sending your code…'
              : masked
                ? <>We sent a 6-digit code to <span className="font-semibold text-gray-900">{masked}</span>. It expires in 10 minutes.</>
                : 'Enter the 6-digit code we emailed you.'}
          </p>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            placeholder="000000"
            className="w-full text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl py-3 px-4 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 placeholder:text-gray-300 placeholder:tracking-[0.5em]"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            {verifying ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : 'Verify & continue'}
          </button>

          <div className="mt-3 text-center">
            {cooldown > 0 ? (
              <span className="text-xs text-gray-400">Didn&apos;t get it? Resend in {cooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={sendCode}
                disabled={sending}
                className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:text-gray-400"
              >
                {sending ? 'Sending…' : 'Resend code'}
              </button>
            )}
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              Check your spam or promotions folder. Sellapage will never ask for this code by phone or WhatsApp.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
