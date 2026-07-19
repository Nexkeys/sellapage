//src/components/dashboard/SessionsPanel.jsx/
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, RefreshCw, Smartphone, Tablet, Monitor, MapPin, LogOut, AlertCircle } from 'lucide-react'
import { auth, logoutSeller } from '../../firebase/auth'
import { getSessionId, clearSessionId } from '../../utils/sessionTracking'

const PAGE_SIZE = 5

const DEVICE_ICON = { Mobile: Smartphone, Tablet: Tablet, Desktop: Monitor }

function timeAgo(iso) {
  if (!iso) return 'Unknown'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NG')
}

export default function SessionsPanel() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [revokingId, setRevokingId] = useState('')
  const currentSessionId = getSessionId()

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/sessions?action=list', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load sessions')
      setSessions(data.sessions || [])
    } catch {
      setError('Could not load your login sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId)
    setError('')
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/sessions?action=revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error('Failed to log out device')

      if (sessionId === currentSessionId) {
        clearSessionId()
        await logoutSeller()
        navigate('/login')
        return
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch {
      setError('Could not log out that device. Please try again.')
    } finally {
      setRevokingId('')
    }
  }

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const pageSessions = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900 text-sm">Login Sessions</h2>
          <p className="text-gray-400 text-xs mt-0.5">Devices currently signed in to your workspace.</p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-2"><AlertCircle size={13} className="flex-shrink-0" />{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-green-600" size={20} />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-6">No active sessions found.</p>
      ) : (
        <div className="space-y-2">
          {pageSessions.map((s) => {
            const Icon = DEVICE_ICON[s.deviceType] || Monitor
            const isCurrent = s.id === currentSessionId
            const location = [s.city, s.country].filter(Boolean).join(', ')
            return (
              <div key={s.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3.5 py-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-gray-900">{s.browser || 'Unknown Browser'} · {s.os || 'Unknown OS'}</p>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">This device</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} className="flex-shrink-0" />{location || 'Unknown location'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Last active {timeAgo(s.lastActiveAt)}</p>
                </div>
                <button
                  onClick={() => handleRevoke(s.id)}
                  disabled={revokingId === s.id}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 bg-white border border-red-100 hover:bg-red-50 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {revokingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
                  Log out
                </button>
              </div>
            )
          })}
        </div>
      )}

      {sessions.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-[10px] font-bold bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-[10px] font-semibold text-gray-500">{page}/{totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-[10px] font-bold bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
