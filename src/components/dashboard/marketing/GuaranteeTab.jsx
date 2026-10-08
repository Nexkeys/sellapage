// src/components/dashboard/marketing/GuaranteeTab.jsx
//
// Lets a vendor write one specific promise that a stranger can hold them to.
//
// Every other section of Marketing makes a vendor findable. This one is the
// only thing that helps close a stranger once they arrive, which the research
// says is the real bottleneck: roughly a quarter of Nigerian social-commerce
// shoppers report being scammed, buyers "doubt new service providers", and
// vendors spend most of their effort convincing people they are real.
//
// A new store has no reviews to lean on. The only credibility it can offer is a
// promise it is willing to be judged by.
//
// Free on every plan on purpose: the vendors who most need this are the new
// ones with nothing else to show, which is exactly the Starter cohort.
//
// Redesigned 2026-10-08 to match Get found: the promise on the left, and on
// the right a phone showing exactly where buyers meet it, at checkout and at
// the bottom of the store.
import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Loader2, Save, Lock, Lightbulb, Clock3 } from 'lucide-react'
import { auth } from '../../../firebase/auth'
import GuaranteeBadge from '../../GuaranteeBadge'
import { Panel, Notice, Toggle, PhoneFrame, SideLabel, INPUT } from './ui'

const EMPTY = { enabled: false, headline: '', details: '', days: 7 }

const LIMITS = { headline: 140, details: 400 }

// Written to be edited, not pasted. Each one names a specific failure and a
// specific remedy, which is what makes a promise believable.
const EXAMPLES = [
  'If it does not fit, send it back within 7 days and I will swap it free.',
  'If your order does not arrive by the day I promised, delivery is on me.',
  'If what you receive is not exactly what you saw here, I refund you in full.',
  'If it stops working within 30 days, I repair or replace it at no cost.',
]

const DAY_OPTIONS = [3, 7, 14, 30]

export default function GuaranteeTab({ store }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saved, setSaved] = useState(EMPTY)

  const authed = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken()
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await authed('/api/store-seo?action=get')
        const d = await r.json()
        if (cancelled) return
        if (d?.guarantee) { setForm({ ...EMPTY, ...d.guarantee }); setSaved({ ...EMPTY, ...d.guarantee }) }
      } catch {
        if (!cancelled) setError('Could not load your guarantee.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [authed])

  const save = async (override) => {
    const payload = { ...form, ...(override || {}) }
    if (payload.enabled && !payload.headline.trim()) {
      setError('Write the promise before switching it on.')
      return
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const r = await authed('/api/store-seo?action=save-guarantee', {
        method: 'POST',
        body: JSON.stringify({ guarantee: payload }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.message || 'Could not save.'); return }
      setForm({ ...EMPTY, ...d.guarantee })
      setSaved({ ...EMPTY, ...d.guarantee })
      setSuccess(d.guarantee?.enabled ? 'Live on your store page.' : 'Saved.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100/70" />)}
      </div>
    )
  }

  const dirty = form.headline !== saved.headline || form.details !== saved.details || Number(form.days) !== Number(saved.days)
  const name = store?.businessName || 'Your store'
  const preview = { ...form, enabled: true, headline: form.headline.trim() || EXAMPLES[0] }

  return (
    <div className="grid grid-cols-1 items-start gap-4 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <Panel tone={form.enabled ? 'green' : 'white'} icon={ShieldCheck} title="Show your guarantee"
          sub={form.enabled ? 'Live. Buyers see it right before they pay, and again at the bottom of your store.' : 'A stranger who has never bought from you needs a reason to trust you. A clear promise is the fastest one you can give.'}
          right={<Toggle on={form.enabled} disabled={saving} label="Show your guarantee" onChange={(next) => { setForm((p) => ({ ...p, enabled: next })); save({ enabled: next }) }} />} />

        <Panel title="Your promise" sub="Name what could go wrong and exactly what you will do about it. Vague promises convince nobody."
          right={<span className={`flex-shrink-0 text-[11px] font-semibold tabular-nums ${form.headline.length > LIMITS.headline * 0.9 ? 'text-amber-600' : 'text-gray-400'}`}>{form.headline.length}/{LIMITS.headline}</span>}>
          <textarea value={form.headline} maxLength={LIMITS.headline} rows={2} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
            placeholder="If it does not fit, send it back within 7 days and I will swap it free." className={`${INPUT} resize-none`} />
          <p className="mb-2 mt-3 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-gray-400"><Lightbulb size={13} />Start from one of these</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setForm((p) => ({ ...p, headline: ex.slice(0, LIMITS.headline) }))}
                className={`rounded-xl border px-3 py-2.5 text-left text-[12.5px] leading-snug transition ${form.headline === ex ? 'border-forest-600 bg-forest-50 text-forest-800' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-forest-200 hover:bg-white'}`}>
                {ex}
              </button>
            ))}
          </div>
        </Panel>

        <Panel icon={Clock3} title="How long it lasts" sub="A promise with a deadline is believable. One without a deadline reads as marketing.">
          <div className="grid grid-cols-4 gap-2">
            {DAY_OPTIONS.map((d) => (
              <button key={d} type="button" onClick={() => setForm((p) => ({ ...p, days: d }))}
                className={`rounded-xl py-3 text-center transition-colors ${Number(form.days) === d ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'border border-gray-200 bg-white text-gray-700 hover:border-forest-200'}`}>
                <span className="block font-display text-[18px] font-extrabold leading-none">{d}</span><span className="mt-0.5 block text-[11px] font-semibold opacity-80">days</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Any conditions (optional)" sub="Be honest about limits here rather than arguing later. Only promise what you will actually honour."
          right={<span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">{form.details.length}/{LIMITS.details}</span>}>
          <textarea value={form.details} maxLength={LIMITS.details} rows={3} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
            placeholder="Item must be unworn with tags on. You cover the return delivery." className={`${INPUT} resize-none`} />
        </Panel>

        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="ok">{success}</Notice>}
      </div>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
        <div>
          <SideLabel>What buyers see at checkout</SideLabel>
          <div className="rounded-2xl bg-gradient-to-br from-forest-50 to-white p-5 ring-1 ring-forest-100">
            <PhoneFrame>
              <div className="px-4 pb-5 pt-2">
                <p className="text-[12px] font-extrabold text-gray-900">Checkout</p>
                <p className="text-[10.5px] text-gray-500">{name}</p>
                <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600">
                  <p className="flex justify-between"><span>Your order</span><span className="font-semibold text-gray-800">1 item</span></p>
                  <p className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900"><span>Delivery and total</span><span>At checkout</span></p>
                </div>
                <div className="mt-3"><GuaranteeBadge guarantee={preview} variant="inline" /></div>
                <div className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-forest text-[12px] font-bold text-white"><Lock size={12} />Pay securely</div>
              </div>
            </PhoneFrame>
          </div>
          {!form.headline.trim() && <p className="mt-2 px-1 text-[11.5px] text-gray-400">Showing an example until you write your own.</p>}
        </div>
        <div>
          <SideLabel>At the bottom of your store</SideLabel>
          <GuaranteeBadge guarantee={preview} variant="panel" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg shadow-gray-200/50 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-30 max-lg:shadow-2xl">
          <p className={`min-w-0 flex-1 text-[12px] ${dirty ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{dirty ? 'You have changes that are not saved yet.' : 'Changes go live when you save.'}</p>
          <button type="button" onClick={() => save()} disabled={saving} className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-forest px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:bg-gray-300">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saving ? 'Saving...' : 'Save guarantee'}
          </button>
        </div>
      </aside>
    </div>
  )
}
