import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const MAIN_DOMAINS = ['sellapage.com.ng', 'www.sellapage.com.ng', 'localhost']

export default function DomainResolver({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname

    if (MAIN_DOMAINS.includes(hostname) || hostname.startsWith('localhost:')) {
      setChecking(false)
      setResolved(true)
      return
    }

    const resolveDomain = async () => {
      try {
        const token = await user?.getIdToken()

        const endpoint = token ? '/api/resolve-domain' : '/api/public-resolve-domain'
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ domain: hostname }),
        })

        const data = await res.json()

        if (res.ok && data.success && data.storeName) {
          navigate(`/${data.storeName}`, { replace: true })
        } else {
          setChecking(false)
          setResolved(false)
        }
      } catch {
        setChecking(false)
        setResolved(false)
      }
    }

    resolveDomain()
  }, [user, navigate])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading store...</p>
        </div>
      </div>
    )
  }

  if (!resolved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Domain Not Configured</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            This domain is not connected to any Sellapage store. If you're the store owner, check your custom domain settings in the dashboard.
          </p>
          <a
            href="https://sellapage.com.ng"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
          >
            Go to Sellapage
          </a>
        </div>
      </div>
    )
  }

  return children
}
