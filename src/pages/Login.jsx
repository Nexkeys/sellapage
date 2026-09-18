//src/pages/Login.jsx/
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft, ShieldAlert } from 'lucide-react'
import { loginSeller, loginWithCustomToken, resetPassword, logoutSeller, auth } from '../firebase/auth'
import { registerSession, confirmLoginOtp, setOtpPendingHint, clearOtpPendingHint, consumeLoginNotice, getSessionId } from '../utils/sessionTracking'
import OtpVerifyModal from '../components/OtpVerifyModal'
import { getRecaptchaToken } from '../utils/recaptcha'
import RecaptchaCheckbox from '../components/RecaptchaCheckbox'
import { isReservedSlug } from '../utils/reservedSlugs'
import { normaliseNgMobile } from '../utils/phone'

const postJson = async (path, body) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

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

  // Explains why someone was sent back here, so a returning vendor is not
  // dropped on a bare form wondering what went wrong.
  useEffect(() => {
    const notice = consumeLoginNotice()
    if (notice) setError(notice)
  }, [])
  const refCode = searchParams.get('ref')

  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  // Phase 2 login challenge: { reason } while an emailed code is outstanding.
  const [loginOtp, setLoginOtp] = useState(null)
  // Account locked after repeated failed sign-ins - recovery is the way back.
  const [lockedOut, setLockedOut] = useState(false)
  // Signup: { masked, cooldown } once the SMS code has gone out. Nothing exists
  // in Firebase until that code is entered.
  const [signupCode, setSignupCode] = useState(null)
  const signupTokenRef = useRef('')
  // Live "is this number free?" result for the signup phone field.
  const [phoneCheck, setPhoneCheck] = useState(null)
  // Visible reCAPTCHA v2 checkbox state. Tokens are single use, so the widget
  // is remounted (captchaKey) after a failed signup that spent one.
  const [captchaToken, setCaptchaToken] = useState(null)
  const [captchaKey, setCaptchaKey] = useState(0)
  const [captchaSiteKey, setCaptchaSiteKey] = useState(null)
  // True when the widget can't render (v3 key, blocked, offline) - the form
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

  // The number is checked the moment it is a complete Nigerian mobile, so a
  // number already verified on another store is refused while the vendor is
  // still filling the form, not after they press Create.
  const signupPhone = mode === 'register' ? normaliseNgMobile(form.whatsappNumber) : null
  useEffect(() => {
    if (!signupPhone) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/signup-phone?action=check&phone=${signupPhone}`)
        const d = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok) { setPhoneCheck({ phone: signupPhone, state: 'unknown' }); return }
        setPhoneCheck(d.available
          ? { phone: signupPhone, state: 'free' }
          : { phone: signupPhone, state: 'taken', message: d.message })
      } catch {
        // Unknown is not a block: the server checks again before any SMS.
        if (!cancelled) setPhoneCheck({ phone: signupPhone, state: 'unknown' })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [signupPhone])
  // A result only counts for the number it was fetched for.
  const phoneStatus = !signupPhone ? null : phoneCheck?.phone === signupPhone ? phoneCheck.state : 'checking'

  // Texts the signup code. Creates nothing. Also used by "Resend code".
  const requestSignupCode = async (recaptchaToken = null) => {
    const { ok, data } = await postJson('/api/signup-phone?action=send', {
      phone: form.whatsappNumber.trim(),
      email: form.email.trim(),
      storeName: form.storeName.trim(),
      businessName: form.businessName.trim(),
      recaptchaToken,
    })
    if (ok && data.token) signupTokenRef.current = data.token
    return { ok: ok && !!data.token, data }
  }

  // Sends the code with the whole form. The server checks the code with
  // Termii and only then creates the account and the store, already
  // phone-verified, and hands back a token to sign in with.
  const completeSignup = async (code) => {
    const { ok, data } = await postJson('/api/signup-phone?action=complete', {
      token: signupTokenRef.current,
      code,
      email: form.email.trim(),
      password: form.password,
      businessName: form.businessName.trim(),
      whatsappNumber: form.whatsappNumber.trim(),
      storeName: form.storeName.trim(),
      description: form.description.trim(),
      vendorType: form.vendorType || 'products',
      referralCode: form.referralCode.trim() || localStorage.getItem('vendor_referral_code') || '',
      sessionId: getSessionId(),
    })
    if (!ok || !data.customToken) return { ok: false, data }
    try {
      await loginWithCustomToken(data.customToken)
    } catch {
      return {
        ok: false,
        data: { message: 'Your store was created but we could not sign you in. Go back and sign in with your email and password.' },
      }
    }
    return { ok: true, data }
  }

  const finishSignup = async (data) => {
    const token = await auth.currentUser.getIdToken()
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

    // The server pre-trusted this browser's session when the phone was
    // verified, so this normally returns otpRequired: false and no email code
    // is asked for at signup.
    let risk = { otpRequired: false }
    try { risk = await registerSession(token) } catch (err) { console.error('Failed to register session:', err) }

    await Promise.all([
      fetch('/api/notify', { method: 'POST', headers, body: JSON.stringify({ type: 'welcome' }) })
        .catch((err) => console.error('Error sending welcome notification:', err)),
      data?.referrerId
        ? fetch('/api/referral-signup', { method: 'POST', headers, body: JSON.stringify({ referrerId: data.referrerId }) })
          .catch((err) => console.error('Failed to notify referrer:', err))
        : null,
    ])
    localStorage.removeItem('vendor_referral_code')
    setSignupCode(null)

    // Only if the pre-trust was lost (storage blocked, a different session id).
    if (risk?.otpRequired) {
      setOtpPendingHint()
      setLoginOtp({ reason: risk.otpReason, isSignup: true })
      return
    }
    clearOtpPendingHint()
    navigate('/dashboard')
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
        // what a lock must prevent - knowing the password is what's locked out.
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
        } catch { /* network only - don't block sign-in on this check */ }

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
        // Firebase session straight back out - leaving a valid token alive
        // would let the dashboard load before the heartbeat caught up.
        if (sessionRisk?.locked) {
          await logoutSeller().catch(() => {})
          setLockedOut(true)
          setLoading(false)
          return
        }

        if (sessionRisk?.otpRequired) {
          setOtpPendingHint()
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
        // PHONE FIRST. This only texts a code. The account and the store are
        // created by the server after the code is entered (completeSignup), so
        // a signup abandoned here leaves nothing behind.
        if (!signupPhone) {
          setError('Enter a valid Nigerian mobile number for your business, e.g. 08012345678.')
          return
        }
        if (phoneStatus === 'taken') {
          setError(phoneCheck.message)
          return
        }

        const codeToValidate = form.referralCode.trim() || localStorage.getItem('vendor_referral_code') || null
        if (codeToValidate) {
          const result = await validateReferralCode(codeToValidate)
          if (!result.valid) return
        }

        const { ok, data } = await requestSignupCode(captchaToken || await getRecaptchaToken('signup'))
        if (!ok) {
          setError(data.message || 'Could not send the code. Please try again.')
          if (data.error === 'phone_taken') setPhoneCheck({ phone: signupPhone, state: 'taken', message: data.message })
          // Errors that name a field are raised before the server checks
          // reCAPTCHA, so the tick is still good. Anything else spent it.
          if (!data.field) { setCaptchaToken(null); setCaptchaKey((k) => k + 1) }
          return
        }
        setSignupCode({ masked: data.destinationMasked, cooldown: data.resendAfterSeconds || 60 })
        return
      }
      // Successful sign-in clears any accumulated failed-attempt counter.
      if (mode === 'login') {
        fetch('/api/login-attempt?action=clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        }).catch(() => {})
      }
      clearOtpPendingHint()
      navigate('/dashboard')
    } catch (err) {
      // Wrong password / unknown user - count it toward the lockout. Firebase
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
        } catch { /* fail open - never block sign-in on the counter */ }
      }

      setError(ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Account locked after too many failed sign-ins. Deliberately a dead end
  // except for recovery - offering "try again" here would defeat the lock.
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

  // Signup code step. Closing it goes back to the form with nothing created.
  if (signupCode) {
    return (
      <OtpVerifyModal
        open
        purpose="signup"
        title="Verify your phone number"
        description={`Enter the code we sent by SMS to finish creating ${form.businessName.trim() || 'your store'}. Your store is created once the code is right.`}
        initialMasked={signupCode.masked}
        initialCooldown={signupCode.cooldown}
        sendRequest={() => requestSignupCode(null)}
        verifyRequest={completeSignup}
        verifyLabel="Verify & create my store"
        onClose={() => setSignupCode(null)}
        onVerified={finishSignup}
      />
    )
  }

  // Login OTP challenge - blocks the dashboard until the emailed code clears.
  // Cancelling signs out, so an unverified session never proceeds.
  if (loginOtp) {
    return (
      <OtpVerifyModal
        open
        purpose="login"
        title={loginOtp.isSignup ? 'Confirm your email' : "Confirm it's you"}
        description={
          loginOtp.isSignup
            ? "Your store is created. Enter the 6-digit code we just emailed you to finish setting up."
            : loginOtp.reason === 'country_change'
              ? "You're signing in from a new location, so we've emailed you a code."
              : loginOtp.reason === 'stale_verification'
                ? "It's been a while since we confirmed this device. We've emailed you a code."
                : "We don't recognise this device, so we've emailed you a code."
        }
        onClose={async () => {
          const wasSignup = loginOtp.isSignup
          setLoginOtp(null)
          await logoutSeller().catch(() => {})
          // Their account DOES exist by this point. Dropping them back on the
          // signup form with no word would send them to create it again and hit
          // "email already in use", so send them to sign-in and say so.
          if (wasSignup) {
            setMode('login')
            setError('Your store was created. Sign in and enter the code we emailed you to finish.')
          }
        }}
        onVerified={async () => {
          const user = auth.currentUser
          if (user) {
            const token = await user.getIdToken()
            await confirmLoginOtp(token)
          }
          clearOtpPendingHint()
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
                    type="tel"
                    inputMode="tel"
                    value={form.whatsappNumber}
                    onChange={update}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                      phoneStatus === 'taken'
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-100'
                    }`}
                    placeholder="e.g. 08012345678"
                    required
                  />
                  {phoneStatus === 'checking' ? (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> Checking number…
                    </p>
                  ) : phoneStatus === 'taken' ? (
                    <p className="text-xs text-red-500 mt-1">{phoneCheck.message}</p>
                  ) : phoneStatus === 'free' ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={12} /> We&apos;ll text a code to this number to create your store.
                    </p>
                  ) : form.whatsappNumber.replace(/\D/g, '').length >= 11 && !signupPhone ? (
                    <p className="text-xs text-red-500 mt-1">Enter a valid Nigerian mobile number, e.g. 08012345678.</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">We&apos;ll text a code to this number to create your store.</p>
                  )}
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

            {/* Password reset emails the account address - useless if the vendor
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
                key={captchaKey}
                siteKey={captchaSiteKey}
                onChange={setCaptchaToken}
                onUnavailable={() => setCaptchaUnavailable(true)}
              />
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (!captchaUnavailable && captchaSiteKey && !captchaToken) ||
                (mode === 'register' && phoneStatus === 'taken')
              }
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
