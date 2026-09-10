// src/components/admin/WhatsAppConsole.jsx
// Operations console for Sellapage's own WhatsApp Business number.
//
// This is the real Cloud API, not a wa.me deep link. Pressing Send here causes
// Sellapage's server to send a WhatsApp message from Sellapage's number, and
// each send is billable by Meta. That is stated in the UI rather than left to
// be discovered from an invoice.
//
// No Meta credential exists in this component. It calls /api/admin-whatsapp,
// which holds the token server-side.
import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Loader2, Send, RefreshCw, Check, AlertCircle } from 'lucide-react'

const STATUS_STYLE = {
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200',
}

export default function WhatsAppConsole({ authHeaders }) {
  const [status, setStatus] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [to, setTo] = useState('')
  const [template, setTemplate] = useState('')
  const [params, setParams] = useState([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetch('/api/admin-whatsapp?action=status', { headers: await authHeaders() })
      const sData = await s.json().catch(() => null)
      setStatus(sData)

      if (sData?.configured) {
        const t = await fetch('/api/admin-whatsapp?action=templates', { headers: await authHeaders() })
        const tData = await t.json().catch(() => null)
        const list = tData?.data?.data || []
        setTemplates(list)
        // Default to something that can actually be sent. Selecting a PENDING
        // template would fail at Meta with a message the admin has to decode.
        // Preference goes to a template with no variables, because that is the
        // one that sends cleanly on the first try.
        const approved = list.filter((x) => x.status === 'APPROVED')
        const preferred = approved.find((x) => !x.paramCount) || approved[0]
        if (preferred) {
          setTemplate((prev) => prev || preferred.name)
          setParams((prev) => (prev.length ? prev : Array.from({ length: preferred.paramCount || 0 }, () => '')))
        }
      }
    } catch {
      setStatus({ success: false, error: 'unreachable' })
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  const send = async () => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin-whatsapp?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ to, template, bodyParams: params }),
      })
      const data = await res.json().catch(() => ({}))
      setResult(
        data.success
          ? { ok: true, id: data.data?.messages?.[0]?.id || null }
          : { ok: false, message: data.message || data.error || 'Send failed', error: data.error },
      )
    } catch {
      setResult({ ok: false, message: 'Could not reach the server.' })
    } finally {
      setSending(false)
    }
  }

  const configured = status?.configured === true

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-xs p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
            <MessageCircle size={15} className="text-[#25D366]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">WhatsApp Cloud API</p>
            {loading ? (
              <p className="text-sm font-bold text-gray-400 mt-0.5">Checking...</p>
            ) : configured ? (
              <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
                WABA {status.wabaId} · Number {status.phoneNumberId}
              </p>
            ) : (
              <p className="text-sm font-bold text-amber-600 mt-0.5">Not configured</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {!loading && !configured && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
          <strong>Missing on this environment:</strong>{' '}
          {(status?.missing || []).join(', ') || 'WhatsApp environment variables'}.
          Set them in Vercel, then redeploy. Sending stays disabled until then, and
          nothing else on the platform is affected.
        </p>
      )}

      {!loading && configured && (
        <>
          <div className="mt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Templates ({templates.length})
            </p>
            {templates.length === 0 ? (
              <p className="text-xs text-gray-400">No templates on this WABA yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (t.status !== 'APPROVED') return
                      setTemplate(t.name)
                      setParams(Array.from({ length: t.paramCount || 0 }, () => ''))
                      setResult(null)
                    }}
                    disabled={t.status !== 'APPROVED'}
                    title={t.status === 'APPROVED' ? 'Use this template' : `Cannot send: ${t.status}`}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                      template === t.name
                        ? 'bg-gray-900 text-white border-gray-900'
                        : STATUS_STYLE[t.status] || 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {t.name} · {t.status}
                    {t.paramCount > 0 && <span className="opacity-70"> · {t.paramCount} field{t.paramCount === 1 ? '' : 's'}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {params.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                This template needs {params.length} value{params.length === 1 ? '' : 's'}
              </p>
              {params.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => setParams((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Value for {{${i + 1}}}`}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient number, e.g. 08120525256"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !to.trim() || !template || params.some((p) => !p.trim())}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#1fba5a] disabled:bg-gray-200 disabled:text-gray-400"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sending ? 'Sending' : 'Send'}
            </button>
          </div>

          <p className="mt-1.5 text-[10px] text-gray-400 leading-relaxed">
            Sends {template ? <code>{template}</code> : 'the selected template'} from
            Sellapage&apos;s WhatsApp number. Meta bills per message. The recipient must
            have WhatsApp on that number.
          </p>

          {result && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs leading-relaxed ${
              result.ok
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result.ok ? <Check size={13} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
              <div className="min-w-0">
                {result.ok ? (
                  <>
                    <strong>Sent.</strong> {result.id && <span className="font-mono break-all">{result.id}</span>}
                  </>
                ) : (
                  <>
                    <strong>{result.error === 'token_expired' ? 'Token expired.' : 'Not sent.'}</strong>{' '}
                    {result.error === 'token_expired'
                      ? 'Generate a new WhatsApp access token in the Meta dashboard and update WHATSAPP_ACCESS_TOKEN in Vercel.'
                      : result.message}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
