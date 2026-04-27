import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, Store } from 'lucide-react'
import { loginSeller, registerSeller } from '../firebase/auth'

const ERROR_MESSAGES = {
  'auth/user-not-found':      'No account found with that email.',
  'auth/wrong-password':      'Incorrect password. Please try again.',
  'auth/invalid-credential':  'Email or password is incorrect.',
  'auth/email-already-in-use':'An account with this email already exists.',
  'auth/weak-password':       'Password must be at least 6 characters.',
  'auth/invalid-email':       'Please enter a valid email address.',
  'auth/too-many-requests':   'Too many attempts. Please wait a moment and try again.',
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    email:           '',
    password:        '',
    businessName:    '',
    whatsappNumber:  '',
    storeName:       '',
    description:     '',
  })

  const update = (e) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      // storeName: lowercase, alphanumeric + hyphens only
      [name]: name === 'storeName'
        ? value.toLowerCase().replace(/[^a-z0-9-]/g, '')
        : value,
    }))
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (!form.businessName.trim())   return setError('Please enter your business name.')
      if (!form.whatsappNumber.trim()) return setError('Please enter your WhatsApp number.')
      if (!form.storeName.trim())      return setError('Please choose a store URL name.')
      if (form.storeName.length < 3)   return setError('Store name must be at least 3 characters.')
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        await loginSeller(form.email, form.password)
      } else {
        await registerSeller(form.email, form.password, {
          businessName:   form.businessName.trim(),
          whatsappNumber: form.whatsappNumber.trim(),
          storeName:      form.storeName.trim(),
          description:    form.description.trim(),
        })
      }
      navigate('/dashboard')
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-md group-hover:bg-brand-600 transition-colors">
            <Store size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-gray-900 text-2xl">Sellapage</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {/* Tab switch */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-400'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <h2 className="font-display text-2xl font-extrabold text-gray-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your store'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to manage your Sellapage.'
              : 'Fill in your details to get started in minutes.'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 mb-5">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                {/* Business name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
                  <input
                    name="businessName"
                    type="text"
                    value={form.businessName}
                    onChange={update}
                    placeholder="E.g. Chioma's Fashion House"
                    className="input-field"
                    autoComplete="organization"
                  />
                </div>

                {/* WhatsApp number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number *</label>
                  <input
                    name="whatsappNumber"
                    type="tel"
                    value={form.whatsappNumber}
                    onChange={update}
                    placeholder="E.g. 2348012345678"
                    className="input-field"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Include country code — e.g. <strong>234</strong>8012345678 for Nigeria
                  </p>
                </div>

                {/* Store URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Store URL *</label>
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
                    <span className="bg-gray-50 px-3 flex items-center text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">
                      sellapage.com.ng/
                    </span>
                    <input
                      name="storeName"
                      type="text"
                      value={form.storeName}
                      onChange={update}
                      placeholder="yourbrandname"
                      className="flex-1 px-3 py-3 text-sm focus:outline-none bg-white"
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    Lowercase letters, numbers, and hyphens only. Min 3 characters.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Short Description
                    <span className="text-gray-400 font-normal"> (Optional)</span>
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={update}
                    placeholder="E.g. Premium fashion pieces for the modern Nigerian woman"
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={update}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={update}
                  placeholder="At least 6 characters"
                  className="input-field pr-11"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-200 hover:shadow-xl mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating your store...'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create My Store'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-brand-600 hover:underline text-sm">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}