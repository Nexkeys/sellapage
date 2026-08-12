//src/pages/Login.jsx/
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft, ShieldAlert } from 'lucide-react'
import { loginSeller, registerSeller, resetPassword, logoutSeller, auth } from '../firebase/auth'
import { registerSession, confirmLoginOtp } from '../utils/sessionTracking'
import OtpVerifyModal from '../components/OtpVerifyModal'
import { getRecaptchaToken } from '../utils/recaptcha'
import RecaptchaCheckbox from '../components/RecaptchaCheckbox'
import { isReservedSlug } from '../utils/reservedSlugs'

const ERROR_MESSAGES = {
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
}

export default function Login() {
  const navigate = useNavigate()
  // 2. Initialize the search parameter hook
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  // Phase 2 login challenge: { reason } while an emailed code is outstanding.
  const [loginOtp, setLoginOtp] = useState(null)
  // Account locked after repeated failed sign-ins — recovery is the way back.
  const [lockedOut, setLockedOut] = useState(false)
  // Set only when SMS is live: the number to verify before finishing signup.
  const [signupPhone, setSignupPhone] = useState(null)
  // Visible reCAPTCHA v2 checkbox state.
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaSiteKey, setCaptchaSiteKey] = useState(null)
  // True when the widget can't render (v3 key, blocked, offline) — the form
  // then stops requiring it rather than trapping a real vendor.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)

  useEffect(() => {
    fetch('/api/public-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.recaptchaSiteKey) setCaptchaSiteKey(d.recaptchaSiteKey); else setCaptchaUnavailable(true) })
      .catch(() => setCaptchaUnavailable(true))
  }, [])
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    businessName: '',
    whatsappNumber: '',
    storeName: '',
    description: '',
    vendorType: 'products',
    referralCode: '',
  })
  const [referralValidated, setReferralValidated] = useState(false)
  const [referralError, setReferralError] = useState('')
  const [referralChecking, setReferralChecking] = useState(false)

  // 3. Cache the referral tracking code safely if found in the link
  useEffect(() => {
    if (refCode) {
      const code = refCode.trim()
      localStorage.setItem('vendor_referral_code', code)
      setForm(prev => ({ ...prev, referralCode: code }))
      fetch('/api/referral-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).catch(() => {})
    } else {
      const saved = localStorage.getItem('vendor_referral_code') || ''
      if (saved) {
        setForm(prev => ({ ...prev, referralCode: saved }))
      }
    }
  }, [refCode])

  const update = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'storeName'
        ? value.toLowerCase().replace(/[^a-z0-9-]/g, '')
        : value,
    }))
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setResetSent(false)
    setReferralError('')
  }

  const validateReferralCode = async (code) => {
    if (!code || !code.trim()) return { valid: false, referrerId: null }
    setReferralChecking(true)
    setReferralError('')
    try {
      const res = await fetch('/api/referral-resolve-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.success && data.referrerId) {
        setReferralValidated(true)
        setReferralChecking(false)
        return { valid: true, referrerId: data.referrerId }
      }
      setReferralError('This referral code doesn\'t exist. Please check the code or sign up without one.')
      setReferralChecking(false)
      return { valid: false, referrerId: null }
    } catch {
      setReferralError('Could not verify referral code. Please try again.')
      setReferralChecking(false)
      return { valid: false, referrerId: null }
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) { setError('Please enter your email address.'); return }
    setLoading(true)
    setError('')
    try {
      await resetPassword(resetEmail.trim())
      setResetSent(true)
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Could not send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (!form.businessName.trim()) return setError('Please enter your business name.')
      if (!form.whatsappNumber.trim()) return setError('Please enter your WhatsApp number.')
      if (!form.storeName.trim()) return setError('Please choose a store URL name.')
      if (form.storeName.length < 3) return setError('Store name must be at least 3 characters.')
      if (isReservedSlug(form.storeName)) return setError('That store name is reserved. Please choose another.')
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        // Check the lock BEFORE authenticating. Doing it after meant a correct
        // password produced a real Firebase session first, which is precisely
        // what a lock must prevent — knowing the password is what's locked out.
        try {
          const lockRes = await fetch('/api/login-attempt?action=status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email }),
          })
          const lockData = await lockRes.json().catch(() => ({}))
          if (lockData.locked) {
            setLockedOut(true)
            setLoading(false)
            return
          }
        } catch { /* network only — don't block sign-in on this check */ }

        const credential = await loginSeller(form.email, form.password)
        const token = await credential.user.getIdToken()

        // Phase 2: registering the session also evaluates device/location risk.
        // If this device isn't recognised (or the verification is stale, or the
        // country changed) the vendor must clear an emailed code before the
        // dashboard loads. Inert unless ENABLE_LOGIN_OTP is on server-side.
        let sessionRisk = { otpRequired: false }
        try {
          sessionRisk = await registerSession(token)
        } catch (err) {
          console.error('Failed to register session:', err)
        }

        // Server refused the session because the account is locked. Sign the
        // Firebase session straight back out — leaving a valid token alive
        // would let the dashboard load before the heartbeat caught up.
        if (sessionRisk?.locked) {
          await logoutSeller().catch(() => {})
          setLockedOut(true)
          setLoading(false)
          return
        }

        if (sessionRisk?.otpRequired) {
          setLoginOtp({ reason: sessionRisk.otpReason })
          setLoading(false)
          return
        }

        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ type: 'login_alert' }),
          })
        } catch (err) {
          console.error('Error sending login alert notification:', err)
        }
      } else {
        // Validate referral code if provided
        // Human check before creating anything. Invalid token stops the signup;
        // an unavailable reCAPTCHA does not (see utils/recaptcha.js).
        try {
          const rcToken = captchaToken || await getRecaptchaToken('signup')
          const rc = await fetch('/api/login-attempt?action=verify-human', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, recaptchaToken: rcToken }),
          })
          const rcData = await rc.json().catch(() => ({}))
          if (!rc.ok && rcData.error === 'captcha_failed') {
            setError(rcData.message || "We couldn't verify that you're human. Please refresh and try again.")
            setLoading(false)
            return
          }
        } catch { /* network issue — don't block a real signup */ }

        const codeToValidate = form.referralCode.trim() || localStorage.getItem('vendor_referral_code') || null
        let resolvedReferrerId = null

        if (codeToValidate) {
          const result = await validateReferralCode(codeToValidate)
          if (!result.valid) {
            setLoading(false)
            return
          }
          resolvedReferrerId = result.referrerId
        }

        await registerSeller(form.email, form.password, {
          businessName: form.businessName.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          storeName: form.storeName.trim(),
          description: form.description.trim(),
          vendorType: form.vendorType || 'products',
          referredBy: resolvedReferrerId,
        })

        if (resolvedReferrerId) {
          try {
            const token = await auth.currentUser.getIdToken()
            await fetch('/api/referral-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ referrerId: resolvedReferrerId }),
            })
          } catch (err) {
            console.error('Failed to notify referrer:', err)
          }
        }

        // Clear tracking cache
        localStorage.removeItem('vendor_referral_code')

        try {
          const token = await auth.currentUser.getIdToken()
          await registerSession(token)
        } catch (err) {
          console.error('Failed to register session:', err)
        }

        // Phone verification at signup — SELF-ACTIVATING.
        //
        // Reads smsAvailable from /api/public-config, which is false while the
        // Termii sender ID is unapproved. So today this branch never runs and
        // signup is byte-for-byte unchanged; the moment Termii is live it turns
        // itself on with no redeploy. Checked AFTER the account exists so the
        // authenticated OTP endpoints can be reused as-is.
        try {
          const cfg = await fetch('/api/public-config').then(r => r.ok ? r.json() : null).catch(() => null)
          if (cfg?.smsAvailable && form.whatsappNumber.trim()) {
            setSignupPhone(form.whatsappNumber.trim())
            setLoading(false)
            return
          }
        } catch { /* never block a signup on this check */ }
      }
      // Successful sign-in clears any accumulated failed-attempt counter.
      if (mode === 'login') {
        fetch('/api/login-attempt?action=clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        }).catch(() => {})
      }
      navigate('/dashboard')
    } catch (err) {
      // Wrong password / unknown user — count it toward the lockout. Firebase
      // has its own per-IP throttling; this adds an ACCOUNT-level lock the
      // owner can actually see and recover from.
      const isCredentialFailure = [
        'auth/wrong-password', 'auth/invalid-credential',
        'auth/user-not-found', 'auth/invalid-login-credentials',
      ].includes(err.code)

      if (mode === 'login' && isCredentialFailure) {
        try {
          const recaptchaToken = await getRecaptchaToken('login_failed')
          const r = await fetch('/api/login-attempt?action=record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, recaptchaToken }),
          })
          const d = await r.json().catch(() => ({}))
          if (d.locked) { setLockedOut(true); setError(''); return }
          if (d.warn) {
            setError(`${ERROR_MESSAGES[err.code] || 'Incorrect email or password.'} ${d.remaining} attempt${d.remaining === 1 ? '' : 's'} left before this account is locked.`)
            return
          }
        } catch { /* fail open — never block sign-in on the counter */ }
      }

      setError(ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Account locked after too many failed sign-ins. Deliberately a dead end
  // except for recovery — offering "try again" here would defeat the lock.
  if (lockedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={22} className="text-red-600" />
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Account locked</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            For your security, this account has been locked after too many failed sign-in attempts.
            To get back in, request account recovery and our team will verify it&apos;s you.
          </p>
          <Link
            to="/account-recovery"
            className="inline-block w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm"
          >
            Recover my account
          </Link>
          <button
            onClick={() => { setLockedOut(false); setError('') }}
            className="mt-3 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // Signup phone verification. Only reachable when SMS is live, so it is
  // unreachable today and cannot affect current signups.
  if (signupPhone) {
    return (
      <OtpVerifyModal
        open
        purpose="phone_verify"
        phone={signupPhone}
        title="Verify your phone number"
        description={`We sent a code by SMS to ${signupPhone}. Enter it to finish setting up your store.`}
        onClose={() => {
          // The account exists at this point, so don't strand them — let them
          // in and let Settings prompt for verification instead of losing the
          // signup entirely.
          setSignupPhone(null)
          navigate('/dashboard')
        }}
        onVerified={async () => {
          try {
            const token = await auth.currentUser?.getIdToken()
            if (token) {
              await fetch('/api/phone-verify?action=complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              })
            }
          } catch { /* verified either way; Settings can retry the write */ }
          setSignupPhone(null)
          navigate('/dashboard')
        }}
      />
    )
  }

  // Login OTP challenge — blocks the dashboard until the emailed code clears.
  // Cancelling signs out, so an unverified session never proceeds.
  if (loginOtp) {
    return (
      <OtpVerifyModal
        open
        purpose="login"
        title="Confirm it's you"
        description={
          loginOtp.reason === 'country_change'
            ? "You're signing in from a new location, so we've emailed you a code."
            : loginOtp.reason === 'stale_verification'
              ? "It's been a while since we confirmed this device. We've emailed you a code."
              : "We don't recognise this device, so we've emailed you a code."
        }
        onClose={async () => {
          setLoginOtp(null)
          await logoutSeller().catch(() => {})
        }}
        onVerified={async () => {
          const user = auth.currentUser
          if (user) {
            const token = await user.getIdToken()
            await confirmLoginOtp(token)
          }
          setLoginOtp(null)
          navigate('/dashboard')
        }}
      />
    )
  }

  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <img src="/og-image.png" alt="Sellapage logo" className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-gray-100" />
              <span className="font-bold text-lg text-gray-900 tracking-tight">Sellapage</span>
            </div>

            {resetSent ? (
              <div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle size={24} className="text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
                <p className="text-gray-500 text-sm mb-1">
                  We sent a reset link to <span className="font-medium text-gray-700">{resetEmail}</span>.
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  Didn't receive it? Check your spam folder, or{' '}
                  <button onClick={() => setResetSent(false)} className="text-green-600 hover:underline">try again</button>.
                </p>
                <button
                  onClick={() => switchMode('login')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Enter the email you signed up with and we'll send you a reset link.
                </p>
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                    <AlertCircle size={15} /> {error}
                  </div>
                )}
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Send Reset Link
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/og-image.png" alt="Sellapage logo" className="w-9 h-9 rounded-xl object-cover shadow-sm ring-1 ring-gray-100" />
            <span className="font-bold text-lg text-gray-900 tracking-tight">Sellapage</span>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Create Store
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login'
              ? 'Sign in to manage your Sellapage commerce workspace.'
              : 'Create your live store workspace for products, services, orders, customers, and payments.'}
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                  <input
                    name="businessName"
                    value={form.businessName}
                    onChange={update}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="e.g. Chioma Fabrics"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Contact Number</label>
                  <input
                    name="whatsappNumber"
                    value={form.whatsappNumber}
                    onChange={update}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="e.g. 08012345678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Store URL Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                      sellapage.com.ng/
                    </span>
                    <input
                      name="storeName"
                      value={form.storeName}
                      onChange={update}
                      className="w-full border border-gray-200 rounded-xl pl-36 pr-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                      placeholder="yourstore"
                      required
                      minLength={3}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Only lowercase letters, numbers, and hyphens</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Store Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={update}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all resize-none"
                    placeholder="Tell customers what you sell…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Referral Code <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    name="referralCode"
                    value={form.referralCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                      setForm(prev => ({ ...prev, referralCode: val }))
                      setReferralError('')
                      setReferralValidated(false)
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="e.g. SP-ABC123"
                    disabled={referralChecking}
                  />
                  {referralChecking && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Checking code…
                    </p>
                  )}
                  {referralError && (
                    <p className="text-xs text-red-500 mt-1">{referralError}</p>
                  )}
                  {referralValidated && form.referralCode && !referralError && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> Valid referral code
                    </p>
                  )}
                </div>
              </>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you sell?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'products', label: '📦 Products', sub: 'Physical items' },
                    { value: 'services', label: '🛠 Services', sub: 'Skills & bookings' },
                    { value: 'both', label: '✨ Both', sub: 'Mixed offering' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, vendorType: opt.value }))}
                      className={`flex flex-col items-center justify-center px-2 py-3 rounded-xl border text-center transition-all ${
                        form.vendorType === opt.value
                          ? 'bg-green-50 border-green-400 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/40'
                      }`}
                    >
                      <span className="text-lg leading-none mb-1">{opt.label.split(' ')[0]}</span>
                      <span className={`text-xs font-semibold leading-tight ${form.vendorType === opt.value ? 'text-green-700' : 'text-gray-600'}`}>
                        {opt.label.split(' ').slice(1).join(' ')}
                      </span>
                      <span className={`text-[10px] leading-tight mt-0.5 ${form.vendorType === opt.value ? 'text-green-500' : 'text-gray-400'}`}>
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={update}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-green-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Password reset emails the account address — useless if the vendor
                has lost that inbox. This is the escape hatch for that case. */}
            {mode === 'forgot' && (
              <div className="text-center">
                <Link to="/account-recovery" className="text-xs text-gray-500 hover:text-gray-700">
                  Lost access to your email? <span className="font-semibold text-green-600">Recover your account</span>
                </Link>
              </div>
            )}

            {/* Visible "I'm not a robot" checkbox. Renders on both sign-in and
                registration. Hides itself if the key is v3 or the script is
                blocked, and the submit button stops requiring it in that case. */}
            {!captchaUnavailable && captchaSiteKey && (
              <RecaptchaCheckbox
                siteKey={captchaSiteKey}
                onChange={setCaptchaToken}
                onUnavailable={() => setCaptchaUnavailable(true)}
              />
            )}

            <button
              type="submit"
              disabled={loading || (!captchaUnavailable && captchaSiteKey && !captchaToken)}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create My Store'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              By creating a store you agree to our{' '}
              <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy-policy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
