// src/pages/Login.jsx
//
// Sign in and Create Store, rebuilt on 2026-09-29 to the sign-up design.
//
// Create Store is three short steps instead of one long form:
//   1. Your business: your name, the business name, and its store link,
//      checked live ("This name is available").
//   2. About it: description, category, products or services, referral.
//   3. Secure it: email, password (Weak / Good / Strong / Perfect), the
//      business phone, checked live, then the SMS code.
// What is typed is kept as a draft (never the password), so a refresh or a
// closed tab does not throw it away.
//
// The flow underneath is unchanged: PHONE FIRST. Pressing Create only texts a
// code; the server creates the account and the store once that code is right
// (/api/signup-phone). The code screen (OtpScreen) is shared with the emailed
// sign-in code, and a right code ends on the welcome celebration.
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, ArrowLeft, Mail, Lock, UserRound, Store,
  Gift, BadgeCheck, Package, Wrench, Layers, Smile, PenLine, Check, KeyRound, Tag, Hand, MailCheck, Info, RotateCcw,
} from 'lucide-react'
import { loginSeller, loginWithCustomToken, resetPassword, logoutSeller, auth } from '../firebase/auth'
import { registerSession, confirmLoginOtp, setOtpPendingHint, clearOtpPendingHint, consumeLoginNotice, getSessionId } from '../utils/sessionTracking'
import { getRecaptchaToken } from '../utils/recaptcha'
import RecaptchaCheckbox from '../components/RecaptchaCheckbox'
import { isReservedSlug } from '../utils/reservedSlugs'
import { normaliseNgMobile } from '../utils/phone'
import { NIGERIAN_MARKET_CATEGORIES } from '../utils/categories'
import AuthShell from '../components/auth/AuthShell'
import OtpScreen from '../components/auth/OtpScreen'
import WelcomeCelebration from '../components/auth/WelcomeCelebration'
import { slugify, isValidSlug, slugAlternatives, passwordStrength, readSignupDraft, saveSignupDraft, clearSignupDraft } from '../components/auth/authUtils'

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_TAKEN = "Sorry boss, this number's already been verified on a Sellapage account."
const EMPTY_FORM = {
  email: '', password: '', ownerName: '', businessName: '', storeName: '', description: '', businessCategory: '',
  vendorType: 'products', whatsappNumber: '', referralCode: '', marketplaceInterest: { supply: false, dropship: false },
}
const STEPS = [
  { n: 1, title: 'Your business', icon: Store },
  { n: 2, title: 'About it', icon: PenLine },
  { n: 3, title: 'Secure it', icon: KeyRound },
]
// Which step holds the field a server error names.
const FIELD_STEP = { businessName: 1, storeName: 1, referralCode: 2, email: 3, password: 3, phone: 3 }
const FIELD_KEY = { phone: 'whatsappNumber' }
const STEP_FIELDS = { 1: ['ownerName', 'businessName', 'storeName'], 2: ['businessCategory', 'referralCode'], 3: ['email', 'password', 'whatsappNumber', 'agreed'] }
const METER = {
  red: ['bg-red-500', 'text-red-600 bg-red-50'],
  amber: ['bg-amber-400', 'text-amber-700 bg-amber-50'],
  green: ['bg-green-500', 'text-green-700 bg-green-50'],
  forest: ['bg-forest-600', 'text-white bg-forest-600'],
}
const HAND_CSS = '@keyframes sp-wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(16deg)}20%,40%{transform:rotate(-8deg)}}.sp-wave{animation:sp-wave 2.4s ease-in-out 0.4s 2;transform-origin:70% 80%}@media (prefers-reduced-motion: reduce){.sp-wave{animation:none}}'

function Field({ id, label, required, optional, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold text-dash-ink">
        {label}{required && <span className="text-red-500"> *</span>}{optional && <span className="font-normal text-dash-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-red-600 animate-in fade-in slide-in-from-top-1 duration-200"><AlertCircle size={14} className="mt-px flex-shrink-0" />{error}</p>
      ) : hint ? <div className="mt-1.5 text-[12px] leading-snug text-dash-muted">{hint}</div> : null}
    </div>
  )
}

function IconInput({ icon: Icon, invalid, right, prefix, inputRef, ...props }) {
  return (
    <div className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-4 ${invalid ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100' : 'border-gray-200 focus-within:border-forest-600 focus-within:ring-forest-600/10'}`}>
      <span className="flex h-full w-12 flex-shrink-0 items-center justify-center border-r border-gray-100 text-slate-400"><Icon size={17} /></span>
      {prefix}
      <input ref={inputRef} {...props} className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[14.5px] text-dash-ink outline-none placeholder:text-slate-400" />
      {right}
    </div>
  )
}

const NgFlag = () => (
  <span aria-hidden="true" className="inline-flex h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-black/10">
    <span className="w-1/3 bg-[#008751]" /><span className="w-1/3 bg-white" /><span className="w-1/3 bg-[#008751]" />
  </span>
)

const PRIMARY = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-forest-600 px-5 text-[15px] font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none'

function ErrorBanner({ children }) {
  if (!children) return null
  return (
    <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] leading-snug text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> <span>{children}</span>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const host = typeof window !== 'undefined' ? window.location.host : 'sellapage.com.ng'

  // Explains why someone was sent back here, so a returning vendor is not
  // dropped on a bare form wondering what went wrong.
  useEffect(() => {
    const notice = consumeLoginNotice()
    if (notice) setError(notice)
  }, [])

  const [mode, setMode] = useState(() => (location.pathname === '/register' || refCode ? 'register' : 'login'))
  const [loading, setLoading] = useState(false)
  // Phase 2 login challenge: { reason } while an emailed code is outstanding.
  const [loginOtp, setLoginOtp] = useState(null)
  // Account locked after repeated failed sign-ins - recovery is the way back.
  const [lockedOut, setLockedOut] = useState(false)
  // Signup: { masked, cooldown } once the SMS code has gone out. Nothing exists
  // in Firebase until that code is entered.
  const [signupCode, setSignupCode] = useState(null)
  const signupTokenRef = useRef('')
  // { variant: 'new' | 'back' } once a code is right: the welcome moment.
  const [celebration, setCelebration] = useState(null)
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

  // The signup draft, if one was left behind in the last 7 days.
  const [draft] = useState(() => readSignupDraft())
  const [draftNotice, setDraftNotice] = useState(() => !!draft)
  const [form, setForm] = useState(() => {
    if (!draft) return EMPTY_FORM
    const next = { ...EMPTY_FORM }
    for (const k of Object.keys(EMPTY_FORM)) if (k !== 'password' && draft[k] != null) next[k] = draft[k]
    return next
  })
  const [step, setStep] = useState(() => (draft?.step >= 1 && draft.step <= 3 ? draft.step : 1))
  const [slugEdited, setSlugEdited] = useState(() => !!(draft?.storeName && draft.storeName !== slugify(draft.businessName)))
  const [slugEditorOpen, setSlugEditorOpen] = useState(false)
  const [slugCheck, setSlugCheck] = useState(null)
  const [altSlugs, setAltSlugs] = useState([])
  const [agreed, setAgreed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [referralValidated, setReferralValidated] = useState(false)
  const [referralError, setReferralError] = useState('')
  const [referralChecking, setReferralChecking] = useState(false)
  const stepRef = useRef(null)
  const cardTopRef = useRef(null)

  // Cache the referral tracking code safely if found in the link
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
        setForm(prev => ({ ...prev, referralCode: prev.referralCode || saved }))
      }
    }
  }, [refCode])

  // Keep the draft as they type (the password is never saved).
  useEffect(() => {
    if (mode !== 'register' || signupCode || celebration) return
    const t = setTimeout(() => saveSignupDraft(form, step), 400)
    return () => clearTimeout(t)
  }, [form, step, mode, signupCode, celebration])

  const setField = (name, value) => {
    setForm(prev => {
      const next = { ...prev, [name]: value }
      // The store link follows the business name until they pick their own.
      if (name === 'businessName' && !slugEdited) next.storeName = slugify(value)
      return next
    })
    // A server complaint about a field goes away once that field changes
    // (and a new business name means a new store link).
    if (serverErrors[name] || (name === 'businessName' && serverErrors.storeName)) {
      setServerErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        if (name === 'businessName') delete next.storeName
        return next
      })
    }
  }
  const update = (e) => {
    const { name, value } = e.target
    setField(name, name === 'storeName' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value)
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setResetSent(false)
    setReferralError('')
    setShowErrors(false)
    setCaptchaToken(null)
    setCaptchaKey((k) => k + 1)
  }

  const goStep = (n) => {
    setStep(n)
    setShowErrors(false)
    setError('')
    setDraftNotice(false)
    cardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  // Desktop: put the cursor in the first box of the new step. On phones that
  // would throw the keyboard up over the step header, so it is left alone.
  useEffect(() => {
    if (mode !== 'register' || !window.matchMedia?.('(min-width: 1024px)').matches) return
    stepRef.current?.querySelector('input:not([type=checkbox]), textarea, select')?.focus()
  }, [step, mode])

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

  // ── Store link: is it free? ─────────────────────────────────────────────
  const slug = form.storeName
  useEffect(() => {
    if (mode !== 'register' || !isValidSlug(slug) || isReservedSlug(slug)) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/signup-phone?action=slug&slug=${encodeURIComponent(slug)}`)
        const d = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok || !d.success) { setSlugCheck({ slug, state: 'unknown' }); return }
        if (d.available) { setSlugCheck({ slug, state: 'free' }); setAltSlugs([]); return }
        setSlugCheck({ slug, state: d.error === 'reserved_slug' ? 'reserved' : 'taken', message: d.message })
        const alts = slugAlternatives(slug).filter((s) => !isReservedSlug(s))
        const free = await Promise.all(alts.map(async (s) => {
          try {
            const rr = await fetch(`/api/signup-phone?action=slug&slug=${encodeURIComponent(s)}`)
            const dd = await rr.json()
            return dd.available ? s : null
          } catch { return null }
        }))
        if (!cancelled) setAltSlugs(free.filter(Boolean).slice(0, 3))
      } catch {
        // Unknown is not a block: the server checks again before any SMS.
        if (!cancelled) setSlugCheck({ slug, state: 'unknown' })
      }
    }, 450)
    return () => { cancelled = true; clearTimeout(t) }
  }, [slug, mode])
  const slugStatus = !slug ? null : !isValidSlug(slug) ? 'invalid' : isReservedSlug(slug) ? 'reserved' : slugCheck?.slug === slug ? slugCheck.state : 'checking'

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
          : { phone: signupPhone, state: 'taken', error: d.error, message: d.message })
      } catch {
        // Unknown is not a block: the server checks again before any SMS.
        if (!cancelled) setPhoneCheck({ phone: signupPhone, state: 'unknown' })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [signupPhone])
  // A result only counts for the number it was fetched for.
  const phoneStatus = !signupPhone ? null : phoneCheck?.phone === signupPhone ? phoneCheck.state : 'checking'
  const phoneInvalid = !signupPhone && form.whatsappNumber.replace(/\D/g, '').length >= 11
  const phoneIsDuplicate = phoneStatus === 'taken' && (!phoneCheck.error || phoneCheck.error === 'phone_taken')
  const phoneRefusal = phoneStatus !== 'taken' ? '' : phoneIsDuplicate ? PHONE_TAKEN : phoneCheck.message || PHONE_TAKEN

  const strength = passwordStrength(form.password)

  // ── Step checks ──────────────────────────────────────────────────────────
  const stepErrors = (n) => {
    const e = {}
    if (n === 1) {
      if (form.ownerName.trim().length < 2) e.ownerName = 'Tell us your name, boss.'
      if (!form.businessName.trim()) e.businessName = 'Your business needs a name.'
      else if (slugStatus === 'invalid') e.storeName = 'Your store link needs at least 3 letters or numbers.'
      else if (slugStatus === 'reserved') e.storeName = 'That link is reserved. Try adding your city or a word like "store".'
      else if (slugStatus === 'taken') e.storeName = 'Another store already uses this link. Pick a free one below or type your own.'
    }
    if (n === 2) {
      if (!form.businessCategory) e.businessCategory = 'Pick the category that fits best. You can change it later in Settings.'
    }
    if (n === 3) {
      if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address, e.g. funmi@gmail.com.'
      if (!strength.ok) e.password = 'Use at least 8 characters with a letter and a number.'
      if (!signupPhone) e.whatsappNumber = 'Enter a valid Nigerian mobile number, e.g. 08012345678.'
      else if (phoneStatus === 'taken') e.whatsappNumber = phoneRefusal
      if (!agreed) e.agreed = 'Please agree to the Terms and Privacy Policy to continue.'
    }
    return e
  }
  const liveErrors = showErrors ? stepErrors(step) : {}
  const errs = { ...liveErrors, ...serverErrors }
  // Taken / reserved links are shown straight away, not only after Continue.
  if (!errs.storeName && (slugStatus === 'taken' || slugStatus === 'reserved')) errs.storeName = stepErrors(1).storeName

  const stepFill = (() => {
    if (step === 1) return [form.ownerName.trim().length >= 2, !!form.businessName.trim(), slugStatus === 'free'].filter(Boolean).length / 3
    if (step === 2) return [form.description.trim().length >= 10, !!form.businessCategory, !!form.vendorType].filter(Boolean).length / 3
    return [EMAIL_RE.test(form.email.trim()), strength.ok, phoneStatus === 'free', agreed].filter(Boolean).length / 4
  })()

  const firstName = form.ownerName.trim().split(/\s+/)[0]
  const coach = (() => {
    if (step === 1) {
      if (form.ownerName.trim().length < 2) return "Let's start with you. What should we call you?"
      if (!form.businessName.trim()) return `Nice to meet you, ${firstName}! Now, what's your business called?`
      if (slugStatus === 'free') return "Love that name, boss. It's all yours."
      if (slugStatus === 'taken' || slugStatus === 'reserved') return "So close! That link is taken, but there are free ones below."
      if (slugStatus === 'checking') return 'Checking if the name is free...'
      return 'Looking good. Keep going.'
    }
    if (step === 2) {
      if (form.description.trim().length >= 30 && form.businessCategory) return 'That sounds like a store people will love.'
      if (!form.description.trim()) return "Tell customers what you're about. A line or two is plenty."
      return 'Pick a category so shoppers can find you on Explore Stores.'
    }
    if (phoneIsDuplicate) return 'Hmm, that number is already on a Sellapage store.'
    if (strength.level === 3 && phoneStatus === 'free' && agreed) return "Perfect. Press Create and we'll text you a code."
    if (strength.level === 3) return "Perfect password! You're nearly done."
    return "Last step. Lock it down and we'll text you a code."
  })()

  // Puts the cursor in the first box that needs fixing, once it is marked.
  const focusFirstInvalid = () => requestAnimationFrame(() => stepRef.current?.querySelector('[aria-invalid="true"]')?.focus())

  const nextStep = async () => {
    const e = stepErrors(step)
    if (Object.keys(e).length || STEP_FIELDS[step].some((k) => serverErrors[k])) {
      setShowErrors(true)
      focusFirstInvalid()
      return
    }
    if (step === 1 && slugStatus === 'checking') return
    if (step === 2) {
      const code = form.referralCode.trim()
      if (code && !referralValidated) {
        const result = await validateReferralCode(code)
        if (!result.valid) return
      }
    }
    goStep(step + 1)
  }

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
      ownerName: form.ownerName.trim(),
      businessName: form.businessName.trim(),
      businessCategory: form.businessCategory,
      whatsappNumber: form.whatsappNumber.trim(),
      storeName: form.storeName.trim(),
      description: form.description.trim(),
      vendorType: form.vendorType || 'products',
      marketplaceInterest: form.marketplaceInterest,
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
    clearSignupDraft()
    setSignupCode(null)

    // Only if the pre-trust was lost (storage blocked, a different session id).
    if (risk?.otpRequired) {
      setOtpPendingHint()
      setLoginOtp({ reason: risk.otpReason, isSignup: true })
      return
    }
    clearOtpPendingHint()
    setCelebration({ variant: 'new' })
  }

  // A server answer that names a field goes back to that field's step.
  const showServerError = (data) => {
    const message = data.error === 'phone_taken' ? PHONE_TAKEN : data.message || 'Could not send the code. Please try again.'
    const target = FIELD_STEP[data.field]
    if (target) {
      setServerErrors({ [FIELD_KEY[data.field] || data.field]: message })
      if (target !== step) goStep(target)
    } else {
      setError(message)
    }
  }

  const createStore = async () => {
    setError('')
    const e = stepErrors(3)
    if (Object.keys(e).length) {
      setShowErrors(true)
      focusFirstInvalid()
      return
    }
    setLoading(true)
    try {
      // PHONE FIRST. This only texts a code. The account and the store are
      // created by the server after the code is entered (completeSignup), so
      // a signup abandoned here leaves nothing behind.
      const codeToValidate = form.referralCode.trim() || localStorage.getItem('vendor_referral_code') || null
      if (codeToValidate && !referralValidated) {
        const result = await validateReferralCode(codeToValidate)
        if (!result.valid) { goStep(2); return }
      }
      const { ok, data } = await requestSignupCode(captchaToken || await getRecaptchaToken('signup'))
      if (!ok) {
        if (data.error === 'phone_taken') setPhoneCheck({ phone: signupPhone, state: 'taken', error: 'phone_taken', message: data.message })
        // Errors that name a field are raised before the server checks
        // reCAPTCHA, so the tick is still good. Anything else spent it.
        if (!data.field) { setCaptchaToken(null); setCaptchaKey((k) => k + 1) }
        showServerError(data)
        return
      }
      setSignupCode({ masked: data.destinationMasked, cooldown: data.resendAfterSeconds || 60 })
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
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

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
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
      // Successful sign-in clears any accumulated failed-attempt counter.
      fetch('/api/login-attempt?action=clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      }).catch(() => {})
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

      if (isCredentialFailure) {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'login') handleLogin()
    else if (step < 3) nextStep()
    else createStore()
  }

  const captchaBlocks = !captchaUnavailable && captchaSiteKey && !captchaToken
  const captcha = !captchaUnavailable && captchaSiteKey && (
    <RecaptchaCheckbox
      key={captchaKey}
      siteKey={captchaSiteKey}
      onChange={setCaptchaToken}
      onUnavailable={() => setCaptchaUnavailable(true)}
    />
  )

  // ── The welcome moment ───────────────────────────────────────────────────
  if (celebration) {
    return (
      <WelcomeCelebration
        variant={celebration.variant}
        storeName={form.businessName.trim()}
        storeLink={celebration.variant === 'new' && form.storeName ? `${host}/${form.storeName}` : ''}
        onContinue={() => navigate('/dashboard')}
      />
    )
  }

  // Account locked after too many failed sign-ins. Deliberately a dead end
  // except for recovery - offering "try again" here would defeat the lock.
  if (lockedOut) {
    return (
      <AuthShell mode="login">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100"><ShieldAlert size={26} /></span>
        <h2 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Account locked</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
          For your security, this account has been locked after too many failed sign-in attempts.
          To get back in, request account recovery and our team will verify it&apos;s you.
        </p>
        <Link to="/account-recovery" className={`${PRIMARY} mt-6`}>Recover my account <ArrowRight size={16} /></Link>
        <button type="button" onClick={() => { setLockedOut(false); setError('') }} className="mt-3 w-full py-2 text-[13.5px] font-semibold text-slate-500 hover:text-dash-ink">
          Back to sign in
        </button>
      </AuthShell>
    )
  }

  // Signup code step. Going back returns to the form with nothing created.
  if (signupCode) {
    return (
      <OtpScreen
        purpose="signup"
        title="Verify your phone"
        description={`Your store, ${form.businessName.trim() || 'your store'}, is created the moment the code is right.`}
        initialMasked={signupCode.masked}
        initialCooldown={signupCode.cooldown}
        sendRequest={() => requestSignupCode(null)}
        verifyRequest={completeSignup}
        verifyLabel="Verify & create my store"
        backLabel="Back to sign up"
        stepLabel="Step 3 of 3"
        onBack={() => setSignupCode(null)}
        onVerified={finishSignup}
      />
    )
  }

  // Login OTP challenge - blocks the dashboard until the emailed code clears.
  // Going back signs out, so an unverified session never proceeds.
  if (loginOtp) {
    return (
      <OtpScreen
        purpose="login"
        title={loginOtp.isSignup ? 'Confirm your email' : "Confirm it's you"}
        stepLabel={loginOtp.isSignup ? 'Last step' : 'One quick check'}
        backLabel="Back to sign in"
        description={
          loginOtp.isSignup
            ? 'Your store is created. Enter the 6-digit code we just emailed you to finish setting up.'
            : loginOtp.reason === 'country_change'
              ? "You're signing in from a new location, so we've emailed you a code."
              : loginOtp.reason === 'stale_verification'
                ? "It's been a while since we confirmed this device. We've emailed you a code."
                : "We don't recognise this device, so we've emailed you a code."
        }
        onBack={async () => {
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
          const wasSignup = loginOtp.isSignup
          setLoginOtp(null)
          setCelebration({ variant: wasSignup ? 'new' : 'back' })
        }}
      />
    )
  }

  if (mode === 'forgot') {
    return (
      <AuthShell mode="login" back={{ onClick: () => switchMode('login'), label: 'Back to sign in', short: 'Sign in' }}>
        {resetSent ? (
          <div className="animate-in fade-in duration-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><MailCheck size={26} /></span>
            <h2 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Check your inbox</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">
              We sent a reset link to <span className="font-semibold text-dash-ink">{resetEmail}</span>. Open it on this device to choose a new password.
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <button type="button" onClick={() => setResetSent(false)} className="font-semibold text-forest-600 hover:underline">try again</button>.
            </p>
            <button type="button" onClick={() => switchMode('login')} className={`${PRIMARY} mt-6`}>Back to Sign In</button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="animate-in fade-in duration-300">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-100"><KeyRound size={26} /></span>
            <h2 className="mt-5 font-display text-[28px] font-extrabold tracking-tight text-dash-ink">Forgot your password?</h2>
            <p className="mb-6 mt-2 text-[14.5px] leading-relaxed text-slate-600">No wahala. Enter the email you signed up with and we&apos;ll send you a reset link.</p>
            <ErrorBanner>{error}</ErrorBanner>
            <Field id="reset-email" label="Email address" required>
              <IconInput icon={Mail} id="reset-email" type="email" autoComplete="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="e.g. funmi@gmail.com" required />
            </Field>
            <button type="submit" disabled={loading} className={`${PRIMARY} mt-6`}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <>Send Reset Link <ArrowRight size={16} /></>}
            </button>
            {/* Password reset emails the account address - useless if the
                vendor has lost that inbox. This is the escape hatch for that. */}
            <Link to="/account-recovery" className="mt-5 block text-center text-[13px] text-slate-500 hover:text-dash-ink">
              Lost access to your email? <span className="font-semibold text-forest-600">Recover your account</span>
            </Link>
          </form>
        )}
      </AuthShell>
    )
  }

  const isRegister = mode === 'register'

  return (
    <AuthShell mode={mode}>
      <style>{HAND_CSS}</style>
      <div ref={cardTopRef} className="scroll-mt-4" />
      <h2 className="flex items-center gap-2.5 font-display text-[30px] font-extrabold leading-tight tracking-tight text-dash-ink sm:text-[36px]">
        {isRegister ? 'Welcome!' : 'Welcome back!'}
        <Hand size={30} strokeWidth={1.8} className="sp-wave text-amber-500" aria-hidden="true" />
      </h2>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-600">
        {isRegister ? "Create your account and start building your store today. It's quick, easy and free." : 'Sign in to manage your store, orders and customers.'}
      </p>

      <div role="tablist" aria-label="Sign in or create a store" className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100/80 p-1">
        {[['login', 'Sign In'], ['register', 'Create Store']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => switchMode(id)}
            className={`h-11 rounded-xl text-[14px] font-semibold transition ${mode === id ? 'bg-white text-forest-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-dash-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {isRegister && (
        <>
          <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Sign up steps">
            {STEPS.map((s) => {
              const done = step > s.n
              const current = step === s.n
              return (
                <li key={s.n}>
                  <button type="button" disabled={s.n >= step} onClick={() => goStep(s.n)} aria-current={current ? 'step' : undefined} className="w-full text-left disabled:cursor-default">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-forest-600 transition-all duration-500" style={{ width: done ? '100%' : current ? `${Math.max(6, stepFill * 100)}%` : '0%' }} />
                    </span>
                    <span className={`mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold sm:text-[12px] ${current ? 'text-forest-600' : done ? 'text-dash-ink' : 'text-slate-400'}`}>
                      {done ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <s.icon size={13} className="flex-shrink-0" />}
                      <span className="truncate"><span className="hidden sm:inline">{s.n}. </span>{s.title}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <p key={coach} className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50/80 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-amber-900 animate-in fade-in duration-300">
            <Smile size={16} className="mt-px flex-shrink-0 text-amber-500" /> {coach}
          </p>
          {draftNotice && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-forest-100 bg-forest-50/70 px-3.5 py-2.5 text-[12.5px] text-forest-700 animate-in fade-in duration-300">
              <span className="flex items-center gap-2"><Info size={15} className="flex-shrink-0" /> Welcome back! We kept what you typed last time.</span>
              <button type="button" onClick={() => { clearSignupDraft(); setForm((p) => ({ ...EMPTY_FORM, referralCode: p.referralCode })); setSlugEdited(false); setStep(1); setDraftNotice(false) }}
                className="inline-flex flex-shrink-0 items-center gap-1 font-semibold hover:underline"><RotateCcw size={13} /> Start over</button>
            </div>
          )}
        </>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <ErrorBanner>{error}</ErrorBanner>

        {!isRegister && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Field id="login-email" label="Email address">
              <IconInput icon={Mail} id="login-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} placeholder="e.g. funmi@gmail.com" required />
            </Field>
            <Field id="login-password" label="Password">
              <IconInput icon={Lock} id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={update} placeholder="Your password" required
                right={<button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="px-4 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
            </Field>
            <div className="text-right">
              <button type="button" onClick={() => switchMode('forgot')} className="text-[13px] font-semibold text-forest-600 hover:underline">Forgot password?</button>
            </div>
            {captcha}
            <button type="submit" disabled={loading || captchaBlocks || !form.email || !form.password} className={PRIMARY}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing you in...</> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {isRegister && (
          <div ref={stepRef} key={step} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {step === 1 && (
              <>
                <Field id="su-owner" label="Full Name" required error={errs.ownerName}>
                  <IconInput icon={UserRound} id="su-owner" name="ownerName" autoComplete="name" value={form.ownerName} onChange={update} placeholder="e.g. Funmi Adeyemi" maxLength={80} aria-invalid={!!errs.ownerName} invalid={!!errs.ownerName} />
                </Field>
                <Field id="su-business" label="Business Name" required error={errs.businessName}>
                  <IconInput icon={Store} id="su-business" name="businessName" autoComplete="organization" value={form.businessName} onChange={update} placeholder="e.g. Chioma Fabrics" maxLength={120} aria-invalid={!!errs.businessName} invalid={!!errs.businessName}
                    right={slugStatus === 'free' ? <BadgeCheck size={20} className="mr-3.5 fill-forest-600 text-white animate-in zoom-in duration-300" aria-label="Available" />
                      : slugStatus === 'checking' ? <Loader2 size={17} className="mr-3.5 animate-spin text-slate-400" /> : null} />
                  <div className="mt-2">
                    {!form.businessName.trim() ? (
                      <p className="text-[12px] text-dash-muted">This will be the name of your store.</p>
                    ) : slugStatus === 'checking' ? (
                      <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500"><Loader2 size={13} className="animate-spin" /> Checking {host}/{slug}...</p>
                    ) : slugStatus === 'free' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-forest-50 px-3.5 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-forest-600"><BadgeCheck size={16} className="fill-forest-600 text-white" /> This name is available</span>
                          <span className="block truncate text-[12px] text-forest-700/80">{host}/<span className="font-semibold">{slug}</span></span>
                        </span>
                        <button type="button" onClick={() => setSlugEditorOpen((v) => !v)} className="text-[12px] font-semibold text-forest-600 hover:underline">{slugEditorOpen ? 'Done' : 'Change link'}</button>
                      </div>
                    ) : slugStatus === 'taken' || slugStatus === 'reserved' ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 animate-in fade-in duration-300">
                        <p className="text-[12.5px] font-medium text-amber-900">{errs.storeName} <span className="text-amber-700">({host}/{slug})</span></p>
                        {altSlugs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {altSlugs.map((s) => (
                              <button key={s} type="button" onClick={() => { setSlugEdited(true); setField('storeName', s) }} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-forest-600 ring-1 ring-forest-200 hover:bg-forest-50">
                                <Check size={12} /> {s}
                              </button>
                            ))}
                          </div>
                        )}
                        {!slugEditorOpen && <button type="button" onClick={() => setSlugEditorOpen(true)} className="mt-2 text-[12px] font-semibold text-amber-800 underline">Or type your own link</button>}
                      </div>
                    ) : slugStatus === 'invalid' ? (
                      <p className="text-[12.5px] text-amber-700">Your store link needs at least 3 letters or numbers. <button type="button" onClick={() => setSlugEditorOpen(true)} className="font-semibold underline">Set it yourself</button></p>
                    ) : (
                      <p className="text-[12.5px] text-slate-500">We&apos;ll confirm {host}/{slug} when you create your store.</p>
                    )}
                  </div>
                  {slugEditorOpen && (
                    <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label htmlFor="su-slug" className="mb-1 block text-[12px] font-semibold text-dash-ink">Your store link</label>
                      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-forest-600 focus-within:ring-4 focus-within:ring-forest-600/10">
                        <span className="flex h-full items-center border-r border-gray-100 bg-slate-50 px-3 text-[12.5px] text-slate-500">{host}/</span>
                        <input id="su-slug" name="storeName" value={form.storeName} onChange={(e) => { setSlugEdited(true); update(e) }} maxLength={61} placeholder="yourstore" className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none" />
                      </div>
                      <p className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-dash-muted">
                        Lowercase letters, numbers and hyphens.
                        {slugEdited && <button type="button" onClick={() => { setSlugEdited(false); setField('storeName', slugify(form.businessName)) }} className="font-semibold text-forest-600 hover:underline">Use my business name</button>}
                      </p>
                    </div>
                  )}
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field id="su-about" label="Describe your business" optional hint={<span className="flex justify-between gap-2"><span>What you sell and what makes you different.</span><span className={form.description.length > 200 ? 'text-amber-600' : ''}>{form.description.length}/200</span></span>}>
                  <textarea id="su-about" name="description" value={form.description} onChange={update} rows={3} maxLength={1000} placeholder="e.g. Ankara, lace and aso-oke fabrics, delivered anywhere in Lagos."
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14.5px] text-dash-ink outline-none transition placeholder:text-slate-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-600/10" />
                </Field>
                <Field id="su-category" label="Category" required error={errs.businessCategory} hint="Shoppers browse Explore Stores by category.">
                  <div className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-4 ${errs.businessCategory ? 'border-red-300 focus-within:ring-red-100' : 'border-gray-200 focus-within:border-forest-600 focus-within:ring-forest-600/10'}`}>
                    <span className="flex h-full w-12 flex-shrink-0 items-center justify-center border-r border-gray-100 text-slate-400"><Tag size={17} /></span>
                    <select id="su-category" name="businessCategory" value={form.businessCategory} onChange={update} aria-invalid={!!errs.businessCategory}
                      className={`h-full min-w-0 flex-1 bg-transparent px-3 text-[14.5px] outline-none ${form.businessCategory ? 'text-dash-ink' : 'text-slate-400'}`}>
                      <option value="">Choose a category</option>
                      {NIGERIAN_MARKET_CATEGORIES.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
                    </select>
                  </div>
                </Field>
                <div>
                  <p className="mb-2 text-[13.5px] font-semibold text-dash-ink">What are you setting up?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'products', label: 'Products', sub: 'Physical items', icon: Package },
                      { value: 'services', label: 'Services', sub: 'Skills & bookings', icon: Wrench },
                      { value: 'both', label: 'Both', sub: 'Mixed offering', icon: Layers },
                    ].map((opt) => {
                      const on = form.vendorType === opt.value
                      return (
                        <button key={opt.value} type="button" aria-pressed={on} onClick={() => setField('vendorType', opt.value)}
                          className={`flex flex-col items-center rounded-2xl border px-2 py-3 text-center transition ${on ? 'border-forest-600 bg-forest-50 ring-4 ring-forest-600/10' : 'border-gray-200 hover:border-forest-200 hover:bg-forest-50/40'}`}>
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-500'}`}><opt.icon size={17} /></span>
                          <span className={`mt-1.5 text-[13px] font-semibold ${on ? 'text-forest-600' : 'text-dash-ink'}`}>{opt.label}</span>
                          <span className="text-[10.5px] leading-tight text-dash-muted">{opt.sub}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-dash-ink">Dropshipping <span className="font-normal text-dash-muted">(optional)</span></p>
                  <p className="mt-0.5 text-[12px] text-dash-muted">Needs Pro or Premium. <a href="/dropshipping" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-600 hover:underline">How it works</a></p>
                  <div className="mt-2 space-y-2">
                    {[
                      { key: 'supply', label: 'I want to supply products to dropshippers' },
                      { key: 'dropship', label: "I want to dropship other suppliers' products" },
                    ].map((opt) => (
                      <label key={opt.key} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-600">
                        <input type="checkbox" checked={form.marketplaceInterest[opt.key]} onChange={(e) => setField('marketplaceInterest', { ...form.marketplaceInterest, [opt.key]: e.target.checked })} className="h-4 w-4 accent-[#0b6b35]" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Field id="su-ref" label="Referral Code" optional error={errs.referralCode || referralError}
                  hint={referralChecking ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Checking code...</span>
                    : referralValidated && form.referralCode ? <span className="flex items-center gap-1 font-medium text-forest-600"><CheckCircle2 size={13} /> Valid referral code</span>
                      : 'If someone referred you, enter their code here.'}>
                  <IconInput icon={Gift} id="su-ref" name="referralCode" value={form.referralCode} placeholder="e.g. SP-ABC123" disabled={referralChecking} invalid={!!(errs.referralCode || referralError)}
                    onChange={(e) => {
                      setField('referralCode', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                      setReferralError('')
                      setReferralValidated(false)
                    }} />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field id="su-email" label="Email Address" required error={errs.email}>
                  <IconInput icon={Mail} id="su-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} placeholder="e.g. funmi@gmail.com" maxLength={200} aria-invalid={!!errs.email} invalid={!!errs.email} />
                </Field>
                <Field id="su-password" label="Password" required error={errs.password}>
                  <IconInput icon={Lock} id="su-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={update} placeholder="Create a strong password" maxLength={128} aria-invalid={!!errs.password} invalid={!!errs.password}
                    right={<button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="px-4 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
                  {!strength.empty && (
                    <div className="mt-2.5 animate-in fade-in duration-200" aria-live="polite">
                      <div className="flex items-center gap-2.5">
                        <div className="grid flex-1 grid-cols-4 gap-1.5">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${i <= strength.level ? METER[strength.tone][0] : 'bg-slate-100'}`} />
                          ))}
                        </div>
                        <span key={strength.label} className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold animate-in zoom-in-90 duration-200 ${METER[strength.tone][1]}`}>{strength.label}</span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-slate-500">{strength.tip}</p>
                    </div>
                  )}
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                    {[['length', 'At least 8 characters'], ['letter', '1 letter'], ['number', '1 number']].map(([k, label]) => (
                      <li key={k} className={`flex items-center gap-1 transition-colors ${strength.checks[k] ? 'text-forest-600' : 'text-slate-400'}`}>
                        <Check size={13} strokeWidth={strength.checks[k] ? 3 : 2} /> {label}
                      </li>
                    ))}
                  </ul>
                </Field>
                <Field id="su-phone" label="Business Contact Number" required error={errs.whatsappNumber && phoneStatus !== 'taken' ? errs.whatsappNumber : null}>
                  <div className={`flex h-12 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:ring-4 ${phoneStatus === 'taken' || errs.whatsappNumber || phoneInvalid ? 'border-red-300 focus-within:ring-red-100' : 'border-gray-200 focus-within:border-forest-600 focus-within:ring-forest-600/10'}`}>
                    <span className="flex h-full flex-shrink-0 items-center gap-2 border-r border-gray-100 px-3.5 text-[13.5px] text-slate-500"><NgFlag /> +234</span>
                    <input id="su-phone" name="whatsappNumber" type="tel" inputMode="tel" autoComplete="tel-national" value={form.whatsappNumber} onChange={update} placeholder="e.g. 08012345678" maxLength={20}
                      aria-invalid={!!errs.whatsappNumber || phoneStatus === 'taken'} className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[14.5px] text-dash-ink outline-none placeholder:text-slate-400" />
                    {phoneStatus === 'checking' ? <Loader2 size={17} className="mr-3.5 animate-spin text-slate-400" />
                      : phoneStatus === 'free' ? <CheckCircle2 size={18} className="mr-3.5 text-forest-600 animate-in zoom-in duration-300" /> : null}
                  </div>
                  {phoneStatus === 'taken' ? (
                    <div role="alert" className="mt-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                      <p className="flex items-start gap-2 text-[13px] font-semibold text-red-700"><AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {phoneRefusal}</p>
                      {phoneIsDuplicate && (
                        <p className="mt-1 pl-[23px] text-[12px] text-red-600/90">
                          Use another number, or{' '}
                          <button type="button" onClick={() => switchMode('login')} className="font-semibold underline">sign in</button> if that store is yours.
                        </p>
                      )}
                    </div>
                  ) : phoneStatus === 'free' ? (
                    <p className="mt-1.5 text-[12px] font-medium text-forest-600">Great! We&apos;ll text a code to this number to create your store.</p>
                  ) : phoneInvalid ? (
                    <p className="mt-1.5 text-[12px] text-red-600">Enter a valid Nigerian mobile number, e.g. 08012345678.</p>
                  ) : !errs.whatsappNumber ? (
                    <p className="mt-1.5 text-[12px] text-dash-muted">We&apos;ll text a code to this number to create your store.</p>
                  ) : null}
                </Field>
                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-slate-600">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-invalid={!!errs.agreed} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#0b6b35]" />
                    <span>I agree to Sellapage&apos;s <Link to="/terms" target="_blank" className="font-semibold text-forest-600 underline">Terms of Service</Link> and <Link to="/privacy-policy" target="_blank" className="font-semibold text-forest-600 underline">Privacy Policy</Link>.</span>
                  </label>
                  {errs.agreed && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-red-600"><AlertCircle size={14} /> {errs.agreed}</p>}
                </div>
                {captcha}
              </>
            )}

            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button type="button" onClick={() => goStep(step - 1)} className="inline-flex h-12 flex-shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-5 text-[14.5px] font-semibold text-slate-600 hover:bg-slate-50">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < 3 ? (
                <button type="submit" disabled={referralChecking || (step === 1 && slugStatus === 'checking')} className={PRIMARY}>
                  {referralChecking || (step === 1 && slugStatus === 'checking') ? <><Loader2 size={16} className="animate-spin" /> One moment...</> : <>Continue <ArrowRight size={16} /></>}
                </button>
              ) : (
                <button type="submit" disabled={loading || captchaBlocks || phoneStatus === 'taken'} className={PRIMARY}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Texting your code...</> : <>Create my store <ArrowRight size={16} /></>}
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-[13.5px] text-slate-500">
        {isRegister ? 'Already have an account? ' : 'New to Sellapage? '}
        <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')} className="font-semibold text-forest-600 hover:underline">
          {isRegister ? 'Sign in' : 'Create your store'}
        </button>
      </p>
    </AuthShell>
  )
}
