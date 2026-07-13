import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Building2,
  RefreshCw,
  Clock,
} from 'lucide-react'

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

export default function CACVerificationTab({ store, user, isPro, navigateTo }) {
  const [rcNumber, setRcNumber] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const isVerified = store?.cacVerified === true

  const handleVerify = async () => {
    const trimmed = rcNumber.trim()
    if (!trimmed) {
      setError('Please enter your RC number.')
      setErrorType('')
      return
    }
    setError('')
    setErrorType('')
    setVerifyResult(null)
    setVerifying(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/verify-cac', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: store.id, rcNumber: trimmed }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerifyResult(data)
      } else {
        setErrorType(data.error || '')
        setError(data.message || 'Verification failed. Please try again.')
      }
    } catch {
      setErrorType('network_error')
      setError('Network error. Please check your connection and try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleConfirm = async () => {
    if (!verifyResult) return
    setConfirming(true)
    setError('')
    try {
      const token = await user?.getIdToken()
      const { getFirestore, doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('../../firebase/config.js')
      await updateDoc(doc(db, 'stores', store.id), {
        cacVerified: true,
        cacBusinessName: verifyResult.cacBusinessName,
        cacRcNumber: verifyResult.rcNumber,
        cacStatus: verifyResult.cacStatus,
        cacRegistrationDate: verifyResult.registrationDate || '',
        cacVerifiedAt: new Date().toISOString(),
      })
      setConfirmed(true)
    } catch (err) {
      console.error('[CACVerificationTab] confirm error:', err)
      setError('Failed to save verification. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (!isPro) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 border border-green-100">
              <Lock size={22} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Pro & Premium Only</p>
            <h1 className="mb-3 text-xl font-bold tracking-tight text-gray-900">CAC Verification</h1>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-gray-500">
              Verify your business with the Corporate Affairs Commission to earn a trust badge on your storefront. Upgrade to Pro to unlock this.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5">

      {/* Header */}
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Trust & Credibility</p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">CAC Verification</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Verify your business registration to earn a trust badge on your storefront.
        </p>
      </div>

      {/* Already verified */}
      {(isVerified || confirmed) && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-800 text-sm">Business Verified ✓</p>
              <p className="text-green-700 text-xs mt-0.5 leading-relaxed">
                <span className="font-semibold">{store?.cacBusinessName || verifyResult?.cacBusinessName}</span> is verified with the CAC.
                Your storefront now shows a verified business badge.
              </p>
              {store?.cacRcNumber && (
                <p className="text-green-600 text-[11px] mt-1.5">RC Number: {store.cacRcNumber}</p>
              )}
              {store?.cacVerifiedAt && (
                <p className="text-green-600 text-[11px]">
                  Verified on {new Date(store.cacVerifiedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification form — only show if not verified */}
      {!isVerified && !confirmed && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Enter Your RC Number</h2>
              <p className="text-gray-400 text-[11px] mt-0.5">Your Corporate Affairs Commission registration number.</p>
            </div>
          </div>

          {error && (
            <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
              errorType === 'insufficient_funds' || errorType === 'pending_payment'
                ? 'border-amber-200 bg-amber-50'
                : 'border-red-100 bg-red-50'
            }`}>
              {(errorType === 'insufficient_funds' || errorType === 'pending_payment') ? (
                <Clock size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
              ) : (
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-red-500" />
              )}
              <div>
                <p className={`text-xs font-semibold ${
                  errorType === 'insufficient_funds' || errorType === 'pending_payment'
                    ? 'text-amber-700' : 'text-red-600'
                }`}>{error}</p>
                {errorType === 'rc_not_found' && (
                  <p className="text-[11px] text-red-500 mt-0.5">Make sure the number matches your CAC registration exactly.</p>
                )}
                {errorType === 'invalid_request' && (
                  <p className="text-[11px] text-red-500 mt-0.5">Enter a valid number like RC1234567 or BN9537181.</p>
                )}
                {(errorType === 'insufficient_funds' || errorType === 'pending_payment') && (
                  <p className="text-[11px] text-amber-600 mt-0.5">This usually resolves automatically. You can also try again in a few minutes.</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              RC Number <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={rcNumber}
                onChange={(e) => { setRcNumber(e.target.value); setError('') }}
                placeholder="e.g. RC1234567, BN9537181, or 1234567"
                className={INPUT_CLASS}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || !rcNumber.trim()}
                className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {verifying ? (
                  <><Loader2 size={13} className="animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck size={13} /> Verify</>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              You can enter with or without the prefix — RC1234567, BN9537181, and 1234567 all work.
            </p>
          </div>

          {/* Verification result — confirm step */}
          {verifyResult && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Business Found — Please Confirm</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    We found a business registered under RC {verifyResult.rcNumber}. Is this your business?
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-white border border-amber-200 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Business Name</span>
                  <span className="text-xs font-bold text-gray-900">{verifyResult.cacBusinessName}</span>
                </div>
                {verifyResult.cacStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Status</span>
                    <span className="text-xs font-semibold text-green-600 capitalize">{verifyResult.cacStatus}</span>
                  </div>
                )}
                {verifyResult.registrationDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Registered</span>
                    <span className="text-xs text-gray-700">{verifyResult.registrationDate}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => { setVerifyResult(null); setRcNumber('') }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Not My Business
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  {confirming ? (
                    <><Loader2 size={13} className="animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle size={13} /> Yes, This Is My Business</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* What the badge looks like */}
      {!isVerified && !confirmed && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">What your customers will see</h3>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl w-fit">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <ShieldCheck size={12} className="text-green-600" />
              <span className="text-[11px] font-bold text-green-700">CAC Verified</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            This badge appears next to your store name on your storefront, visible to all customers.
          </p>
        </div>
      )}

      {/* Info card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Why verify your business?</h3>
        <div className="space-y-2.5">
          {[
            'Builds trust with customers who want to shop from registered businesses',
            'Displays a verified badge on your storefront',
            'One-time verification — no renewals needed',
            'Powered by the Corporate Affairs Commission (CAC) database',
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle size={13} className="mt-0.5 flex-shrink-0 text-green-500" />
              <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
