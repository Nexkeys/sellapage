import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasOtpPendingHint, setLoginNotice } from '../utils/sessionTracking'
import { logoutSeller } from '../firebase/auth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Checked BEFORE the !user branch, not after.
  //
  // Someone who abandoned an emailed code still holds a live Firebase session,
  // so without this they reach the dashboard and are ejected a moment later by
  // the session heartbeat. That flash of a dashboard handed over and snatched
  // back is exactly what made signup feel broken, so bounce first and never
  // paint it.
  //
  // The reason is passed as a stored notice rather than a ?verify=1 query
  // param, because that param does not survive: once logoutSeller() resolves
  // this component re-renders, falls through to the !user branch below, and
  // redirects again to a bare /login. Login never read `verify` anyway.
  //
  // The heartbeat remains the real enforcement. This flag is advisory: it can
  // only deny locally, never grant, so forging or clearing it gains nothing.
  if (hasOtpPendingHint()) {
    setLoginNotice('Sign in and enter the code we emailed you to finish setting up your store.')
    // Clears the flag too, via clearSessionId, so this cannot loop.
    logoutSeller().catch(() => {})
    return <Navigate to="/login" replace />
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}