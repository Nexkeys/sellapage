//src/pages/Login.jsx/
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { loginSeller, registerSeller, resetPassword } from '../firebase/auth'

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
  })

  // 3. Cache the referral tracking code safely if found in the link
  useEffect(() => {
    if (refCode) {
      localStorage.setItem('vendor_referral_code', refCode.trim())
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
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginSeller(form.email, form.password)
      } else {
        // 4. Fetch tracking code from cache right at submission (fallback to null if organic signup)
        const savedRefCode = localStorage.getItem('vendor_referral_code') || null

        await registerSeller(form.email, form.password, {
          businessName: form.businessName.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          storeName: form.storeName.trim(),
          description: form.description.trim(),
          vendorType: form.vendorType || 'products',
          referredBy: savedRefCode, // Injected into storeData payload
        })

        // 5. Clear tracking cache completely upon successful document creation
        if (savedRefCode) {
          localStorage.removeItem('vendor_referral_code')
        }
      }
      navigate('/dashboard')
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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

            <button
              type="submit"
              disabled={loading}
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
