// src/components/admin/PushConsole.jsx
// Platform broadcast push console.
//
// Pressing Send here wakes up every matching vendor's phone, immediately, and
// there is no recall. That is stated in the UI rather than left to be
// discovered, and the audience count is fetched BEFORE sending so nobody is
// guessing how many handsets they are about to ring.
//
// No credential lives in this component. It calls /api/admin-push, which
// authorizes on the 'push' tab through _lib/verify-admin.js.
import { useState, useEffect, useCallback } from 'react'
import { Bell, Loader2, Send, RefreshCw, AlertCircle, Users, ImageIcon, X } from 'lucide-react'
import { uploadSingleImage } from '../../firebase/products'

const INPUT = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500'

// Must match APP_ROUTES in src/api-handlers/admin-push.js. The server rejects
// anything not on its own list, so a value added here alone will fail to send.
const APP_ROUTES = [
  { value: '', label: 'Just open the app' },
  { value: '/dashboard', label: 'Dashboard home' },
  { value: '/dashboard/orders', label: 'Orders' },
  { value: '/dashboard/bookings', label: 'Bookings' },
  { value: '/dashboard/payouts', label: 'Payouts' },
  { value: '/dashboard/delivery', label: 'Delivery' },
  { value: '/dashboard/marketing', label: 'Marketing' },
  { value: '/dashboard/more', label: 'More' },
]

const PLANS = ['starter', 'growth', 'pro', 'premium']

const TITLE_MAX = 65
const BODY_MAX = 240

export default function PushConsole({ authHeaders }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('')
  const [plans, setPlans] = useState([])
  const [vendorType, setVendorType] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const [audience, setAudience] = useState(null)
  const [audienceLoading, setAudienceLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const filters = useCallback(() => {
    const f = {}
    if (plans.length) f.plan = plans
    if (vendorType) f.vendorType = vendorType
    return f
  }, [plans, vendorType])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const r = await fetch('/api/admin-push?action=list', { headers: await authHeaders() })
      const d = await r.json().catch(() => ({}))
      setHistory(d.broadcasts || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Recounted whenever the filters change, because an audience number that
  // silently belongs to a previous filter set is worse than no number at all.
  const loadAudience = useCallback(async () => {
    setAudienceLoading(true)
    setAudience(null)
    try {
      const r = await fetch('/api/admin-push?action=audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ filters: filters() }),
      })
      const d = await r.json().catch(() => ({}))
      setAudience(typeof d.devices === 'number' ? d.devices : null)
    } catch {
      setAudience(null)
    } finally {
      setAudienceLoading(false)
    }
  }, [authHeaders, filters])

  useEffect(() => { loadAudience() }, [loadAudience])

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setUploading(true)
    setError('')
    try {
      // Same unsigned Cloudinary path the blog editor uses. Returns a public
      // https URL, which is exactly what Android needs for notification.image.
      const url = await uploadSingleImage(file, 'sellapage/push')
      setImageUrl(url)
    } catch {
      setError('Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    setError('')
    setResult(null)
    if (!title.trim() || !body.trim()) { setError('Title and message are both required.'); return }

    const reach = audience === null ? 'an unknown number of' : audience
    if (!window.confirm(`Send this push to ${reach} device(s)? This cannot be undone.`)) return

    setSending(true)
    try {
      const r = await fetch('/api/admin-push?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          target: target || undefined,
          imageUrl: imageUrl || undefined,
          filters: filters(),
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.error || 'Send failed.'); return }

      setResult(d)
      setTitle('')
      setBody('')
      setImageUrl('')
      loadHistory()
    } catch (err) {
      setError(err.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  const togglePlan = (p) => {
    setPlans((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 font-medium">
          This sends a real push notification to vendors' phones straight away. It cannot be recalled once sent.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gray-900" />
          <h2 className="font-bold text-gray-900 text-sm">New broadcast</h2>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title</label>
          <input className={INPUT} value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Your payouts just got faster" />
          <p className="text-[10px] text-gray-400 mt-1">{title.length}/{TITLE_MAX}. Android cuts the title off past roughly this length.</p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
          <textarea className={`${INPUT} min-h-[80px] resize-y`} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} placeholder="Settlements now land the same day for Growth and Pro stores." />
          <p className="text-[10px] text-gray-400 mt-1">{body.length}/{BODY_MAX}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Opens</label>
            <select className={INPUT} value={target} onChange={(e) => setTarget(e.target.value)}>
              {APP_ROUTES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Image (optional)</label>
            {imageUrl ? (
              <div className="flex items-center gap-2">
                <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                <button onClick={() => setImageUrl('')} className="text-gray-400 hover:text-red-500"><X size={15} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
                {uploading ? <Loader2 size={14} className="animate-spin text-gray-400" /> : <ImageIcon size={14} className="text-gray-400" />}
                <span className="text-xs text-gray-500 font-medium">{uploading ? 'Uploading...' : 'Upload image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Who gets it</p>

          <div className="flex flex-wrap gap-1.5">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlan(p)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${plans.includes(p) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <select className={INPUT} value={vendorType} onChange={(e) => setVendorType(e.target.value)}>
            <option value="">Products and services</option>
            <option value="products">Product sellers only</option>
            <option value="services">Service providers only</option>
          </select>

          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">
              {audienceLoading
                ? 'Counting devices...'
                : audience === null
                  ? 'Audience unavailable'
                  : `${audience} device${audience === 1 ? '' : 's'} will receive this`}
            </span>
            <button onClick={loadAudience} className="ml-auto text-gray-400 hover:text-gray-600"><RefreshCw size={12} /></button>
          </div>

          {!plans.length && !vendorType && (
            <p className="text-[10px] text-gray-400">
              No filters set, so this also reaches installs where nobody has signed in yet.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800 font-semibold">
              Sent to {result.sent} of {result.audience} device(s).
              {result.failed ? ` ${result.failed} failed.` : ''}
              {result.pruned ? ` ${result.pruned} dead token(s) removed.` : ''}
            </p>
          </div>
        )}

        <button
          onClick={send}
          disabled={sending || !title.trim() || !body.trim()}
          className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? 'Sending...' : 'Send broadcast'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-sm">Recent broadcasts</h2>
          <button onClick={loadHistory} className="text-gray-400 hover:text-gray-600"><RefreshCw size={13} /></button>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-300" /></div>
        ) : !history.length ? (
          <p className="text-xs text-gray-400 text-center py-6">Nothing sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((b) => (
              <div key={b.id} className="border border-gray-100 rounded-xl p-3">
                <p className="font-bold text-gray-900 text-xs">{b.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{b.body}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {b.sentAt ? new Date(b.sentAt).toLocaleString() : 'unknown date'}
                  {' · '}{b.sent ?? 0} delivered
                  {b.failed ? ` · ${b.failed} failed` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
