//src/pages/JoinTeam.jsx/
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { loginWithCustomToken } from '../firebase/auth'
import { registerSession } from '../utils/sessionTracking'

export default function JoinTeam() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const code = (searchParams.get('code') || '').trim().toUpperCase()

  const [checking, setChecking] = useState(true)
  const [invitePreview, setInvitePreview] = useState(null)
  const [checkError, setCheckError] = useState('')

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) {
      setCheckError('No invite code provided. Ask the store owner for your invite link.')
      setChecking(false)
      return
    }
    fetch(`/api/staff-join?action=check&code=${encodeURIComponent(code)}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Could not verify invite.')
        setInvitePreview(data)
      })
      .catch((err) => setCheckError(err.message))
      .finally(() => setChecking(false))
  }, [code])

  const update = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Please enter your name.')
    if (!form.email.trim()) return setError('Please enter your email.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)
    try {
      const res = await fetch('/api/staff-join?action=redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: form.name.trim(), email: form.email.trim(), password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not join team.')

      const credential = await loginWithCustomToken(data.customToken)
      const token = await credential.user.getIdToken()
      try {
        await registerSession(token)
      } catch (err) {
        console.error('Failed to register session:', err)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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

          {checking ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-green-500" size={24} />
            </div>
          ) : checkError ? (
            <div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={15} /> {checkError}
              </div>
              <Link to="/login" className="text-sm text-green-600 hover:underline">Go to Sign In</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm px-4 py-3 rounded-xl mb-6">
                <CheckCircle size={15} className="flex-shrink-0" />
                <span>
                  You've been invited to join <strong>{invitePreview?.storeName || 'a store'}</strong> as{' '}
                  <strong>{invitePreview?.roleName || 'Staff'}</strong>.
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-6">Create your account to accept the invite.</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={update}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    placeholder="e.g. Tolu Adeyemi"
                    required
                  />
                </div>
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
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md mt-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Join Team
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                By joining you agree to our{' '}
                <Link to="/terms" className="underline hover:text-gray-600">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
