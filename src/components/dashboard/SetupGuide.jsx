// src/components/dashboard/SetupGuide.jsx
//
// The Overview's setup guide. Six steps, each ticked from the store itself
// (never a guess), a progress ring, a "Next up" card that says exactly what
// to do, and a small cheer when a step gets done. Finishing all six earns
// confetti, once per store on this device.
//
// "Share your link" is the one step the store cannot show, so it ticks when
// the vendor copies or sends the link from here.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Package, Wrench, ImageIcon, ImagePlus, PenLine, ShieldCheck, Share2, Copy, ArrowRight, Sparkles, PartyPopper, X } from 'lucide-react'
import useConfetti from './ui/useConfetti'

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage blocked */ } }

const GUIDE_CSS = `
@keyframes sp-guide-pulse { 0% { box-shadow: 0 0 0 0 rgba(11,107,53,0.28) } 70% { box-shadow: 0 0 0 10px rgba(11,107,53,0) } 100% { box-shadow: 0 0 0 0 rgba(11,107,53,0) } }
.sp-guide-pulse { animation: sp-guide-pulse 2.2s ease-out infinite }
@media (prefers-reduced-motion: reduce) { .sp-guide-pulse { animation: none } }
`

function Ring({ done, total }) {
  const r = 24
  const c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <div className="relative h-[60px] w-[60px] flex-shrink-0">
      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
        <circle cx="30" cy="30" r={r} fill="none" stroke="#ecf9f2" strokeWidth="6" />
        <circle cx="30" cy="30" r={r} fill="none" stroke="#0b6b35" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-[15px] font-extrabold text-dash-ink">{done}/{total}</span>
      </span>
    </div>
  )
}

export default function SetupGuide({ store, vendorType = 'products', listings = 0, storeUrl = '', navigateTo, onHide }) {
  const id = store?.id || 'store'
  const [shared, setShared] = useState(() => read(`sellapage_guide_shared_${id}`) === '1')
  const [copied, setCopied] = useState(false)
  const [cheer, setCheer] = useState('')
  const [party, setParty] = useState(false)
  const canvasRef = useRef(null)
  useConfetti(canvasRef, party)

  const isServices = vendorType === 'services'
  const steps = useMemo(() => [
    {
      key: 'listing', icon: isServices ? Wrench : Package, done: listings > 0,
      title: isServices ? 'Add your first service' : 'Add your first product',
      body: 'A name, a price and a clear photo. That is all it takes.',
      cta: isServices ? 'Add a service' : 'Add a product', go: () => navigateTo?.(isServices ? 'services' : 'products'),
      cheer: 'First listing in. Your store is officially open for business!',
    },
    {
      key: 'logo', icon: ImageIcon, done: !!store?.logoUrl,
      title: 'Add your logo', body: 'Your logo goes on your store, your receipts and your QR poster.',
      cta: 'Add my logo', go: () => navigateTo?.('online-store'),
      cheer: 'Logo added. Your store looks like a real brand now.',
    },
    {
      key: 'cover', icon: ImagePlus, done: !!(store?.themeMetadata?.heroBannerUrl || store?.coverImage),
      title: 'Add a cover image', body: 'The big picture at the top of your store. Free on every plan.',
      cta: 'Add a cover', go: () => navigateTo?.('online-store'),
      cheer: 'Cover image in. First impressions, sorted.',
    },
    {
      key: 'about', icon: PenLine, done: String(store?.description || '').trim().length >= 30,
      title: 'Describe your business', body: 'Two lines on what you sell and why people should buy from you.',
      cta: 'Write it', go: () => navigateTo?.('settings'),
      cheer: 'Lovely description. Customers now know what you are about.',
    },
    {
      key: 'phone', icon: ShieldCheck, done: store?.phoneVerified === true,
      title: 'Verify your phone', body: 'A verified number earns trust and keeps your account safe.',
      cta: 'Verify now', go: () => navigateTo?.('settings'),
      cheer: 'Phone verified. Buyers can trust you a little more.',
    },
    {
      key: 'share', icon: Share2, done: shared,
      title: 'Share your store link', body: 'Post it on your WhatsApp status and socials, then check Marketing for today\'s growth tasks.',
      cta: null, go: () => navigateTo?.('marketing'),
      cheer: 'Link shared. Now watch the visits roll in.',
    },
  ], [isServices, listings, store, shared, navigateTo])

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length
  const next = steps.find((s) => !s.done)

  // A cheer for anything finished since the vendor last saw the guide.
  const doneKey = steps.filter((s) => s.done).map((s) => s.key).join(',')
  useEffect(() => {
    if (!store?.id) return
    const seenKey = `sellapage_guide_seen_${id}`
    const seen = read(seenKey)
    write(seenKey, doneKey)
    if (seen == null) {
      // First visit: nothing to cheer yet, and a store that is already
      // complete has earned no surprise party on its next visit either.
      if (allDone) write(`sellapage_guide_party_${id}`, '1')
      return
    }
    const before = new Set(seen ? seen.split(',') : [])
    const fresh = steps.find((s) => s.done && !before.has(s.key))
    if (fresh) setCheer(fresh.cheer)
    if (allDone && read(`sellapage_guide_party_${id}`) !== '1') {
      write(`sellapage_guide_party_${id}`, '1')
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setParty(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey, store?.id])

  useEffect(() => {
    if (!cheer) return
    const t = setTimeout(() => setCheer(''), 6000)
    return () => clearTimeout(t)
  }, [cheer])
  useEffect(() => {
    if (!party) return
    const t = setTimeout(() => setParty(false), 4600)
    return () => clearTimeout(t)
  }, [party])

  const markShared = () => {
    write(`sellapage_guide_shared_${id}`, '1')
    setShared(true)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(storeUrl) } catch { /* the link is still on screen */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    markShared()
  }
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Shop with ${store?.businessName || 'us'} on Sellapage: ${storeUrl}`)}`

  const headline = allDone ? 'Your store is fully set up, boss!'
    : doneCount === 0 ? "Let's get your store selling"
      : doneCount >= steps.length - 2 ? 'Almost there! Just a little more'
        : 'Nice momentum. Keep going!'
  const sub = allDone ? 'Everything a buyer looks for is in place. You can hide this guide now.'
    : `${doneCount} of ${steps.length} done. Next up: ${next.title.toLowerCase()}.`

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <style>{GUIDE_CSS}</style>
      {party && createPortal(<canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[110]" aria-hidden="true" />, document.body)}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-forest-50 blur-2xl" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <Ring done={doneCount} total={steps.length} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-forest-600"><Sparkles size={12} /> Setup guide</p>
            <h2 key={headline} className="mt-1 font-body text-base font-bold text-dash-ink animate-in fade-in duration-500 sm:text-lg">{headline}</h2>
            <p className="mt-0.5 text-xs text-dash-muted">{sub}</p>
          </div>
          <button type="button" onClick={onHide} className="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-dash-muted transition hover:bg-gray-50 hover:text-dash-ink">
            Hide
          </button>
        </div>

        {cheer && (
          <div role="status" className="mt-3 flex items-center gap-2.5 rounded-xl bg-forest px-3.5 py-2.5 text-[13px] font-medium text-white animate-in fade-in zoom-in-95 duration-300">
            <PartyPopper size={16} className="flex-shrink-0 text-amber-300" /> <span className="flex-1">{cheer}</span>
            <button type="button" onClick={() => setCheer('')} aria-label="Dismiss" className="rounded-full p-1 text-green-100 hover:bg-white/10"><X size={14} /></button>
          </div>
        )}

        <ol className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {steps.map((s, i) => {
            const isNext = next?.key === s.key
            return (
              <li key={s.key}
                className={`relative flex min-w-0 flex-col rounded-xl border p-3.5 transition ${
                  s.done ? 'border-forest-100 bg-forest-50/50' : isNext ? 'border-forest-600 bg-white ring-4 ring-forest-600/5' : 'border-dash-line bg-white'
                }`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${
                    s.done ? 'bg-forest text-white' : isNext ? 'sp-guide-pulse bg-forest-50 text-forest-600' : 'bg-gray-100 text-slate-500'
                  }`}>
                    {s.done ? <Check size={16} strokeWidth={3} /> : <s.icon size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[13px] font-semibold ${s.done ? 'text-forest' : 'text-dash-ink'}`}>{i + 1}. {s.title}</span>
                      {isNext && <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Next up</span>}
                      {s.done && <span className="text-[11px] font-medium text-forest-600">Done</span>}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-dash-muted">{s.body}</span>
                  </span>
                </div>
                {!s.done && (
                  s.key === 'share' ? (
                    <div className="mt-3 flex flex-wrap gap-2 pl-12">
                      <button type="button" onClick={copy} disabled={!storeUrl} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-50">
                        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy link</>}
                      </button>
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={markShared} className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 px-3.5 py-1.5 text-xs font-semibold text-forest hover:bg-forest-50">
                        Send on WhatsApp
                      </a>
                    </div>
                  ) : isNext ? (
                    <button type="button" onClick={s.go} className="group mt-3 ml-12 inline-flex w-fit items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-700">
                      {s.cta} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                    </button>
                  ) : (
                    <button type="button" onClick={s.go} className="mt-2 ml-12 inline-flex w-fit items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                      {s.cta} <ArrowRight size={12} />
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
