// src/pages/PolicyGenerator.jsx
//
// Free store policy generator, rebuilt 2026-10-08 in the style of the new
// public pages. The policy wording is unchanged apart from the emojis in the
// short and WhatsApp versions, which are now plain headings. What is new: the
// choices are tappable cards, and each version is shown where it will be used
// (a store page, an Instagram highlight on a phone, a WhatsApp message), with
// copy buttons. Everything runs in the browser.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, FileText, ShieldCheck, CheckCircle2, Circle, Truck, Clock3, Wallet, RefreshCcw, ArrowRight, Store } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useAuth } from '../hooks/useAuth'
import { Eyebrow, Script } from '../components/marketing/kit'
import { BrandIcon } from '../components/marketing/brands'

const CHOICES = [
  { key: 'deliveryModel', icon: Truck, label: 'Delivery', options: [['island-mainland', 'Lagos Island and Mainland rates'], ['nationwide', 'Nationwide by courier'], ['pickup', 'Pickup only']] },
  { key: 'processingTime', icon: Clock3, label: 'How fast you ship', options: [['fast-track', 'Next day'], ['standard', '24 to 48 hours'], ['preorder', 'Pre-order, 7 to 14 days']] },
  { key: 'paymentModel', icon: Wallet, label: 'Payment', options: [['pbd', 'Pay before delivery'], ['split', '50% deposit, balance later'], ['pod', 'Pay on delivery']] },
  { key: 'refundStrategy', icon: RefreshCcw, label: 'Returns', options: [['size-exchange', 'Allow size swaps'], ['unboxing-only', 'Unboxing video needed'], ['no-refunds', 'No returns']] },
]

export default function PolicyGenerator() {
  // Store setup
  const [businessName, setBusinessName] = useState('Your Business')
  const [deliveryModel, setDeliveryModel] = useState('island-mainland') // island-mainland, nationwide, pickup
  const [processingTime, setProcessingTime] = useState('standard') // fast-track, standard, preorder
  const [paymentModel, setPaymentModel] = useState('pbd') // pbd (payment before delivery), split, pod
  const [refundStrategy, setRefundStrategy] = useState('size-exchange') // no-refunds, size-exchange, unboxing-only
  const [saleExclusion, setSaleExclusion] = useState(true) // sale items are final
  const [logisticShield, setLogisticShield] = useState(true) // courier delay disclaimer

  const policy = useMemo(() => {
    const name = businessName.trim() || 'Our Store'

    // 1. Delivery
    let deliveryClause
    let deliverySummary
    if (deliveryModel === 'island-mainland') {
      deliveryClause = "Delivery to Lagos Island and Lagos Mainland are charged at different rates. Please pick the correct area at checkout. If the wrong area is selected, we will hold the order until the balance is settled."
      deliverySummary = "Island and Mainland rates are different. Pick the correct area at checkout."
    } else if (deliveryModel === 'pickup') {
      deliveryClause = "Orders are collected in person at our pickup point. We send you the address and a collection time on WhatsApp or email once your payment comes in."
      deliverySummary = "Pickup only. We send the address once payment comes in."
    } else {
      deliveryClause = "We ship nationwide through courier partners. Delivery to major cities takes 3 to 5 working days. For some locations you may need to collect from the courier office closest to you."
      deliverySummary = "Nationwide delivery takes 3 to 5 working days. Some areas require pickup at the courier office."
    }

    // 2. Processing time
    let timelineClause
    if (processingTime === 'fast-track') {
      timelineClause = "Orders paid for before 12 PM are packed the same day and go out the next morning."
    } else if (processingTime === 'preorder') {
      timelineClause = "This item is made or restocked after you order it. Please allow 7 to 14 working days before it ships."
    } else {
      timelineClause = "We pack your order and hand it to the courier within 24 to 48 hours of your payment."
    }

    // 3. Payment
    let paymentClause
    if (paymentModel === 'pbd') {
      paymentClause = "We only accept payment before delivery. Your order is packed and sent out once your payment reflects."
    } else if (paymentModel === 'split') {
      paymentClause = "Pay 50% to start your order and the balance before we send it out. The first 50% is not refundable once work has started."
    } else {
      paymentClause = "Pay on delivery is available in selected areas only. Please have the money ready and pay the rider before the package is opened."
    }

    // 4. Returns and exchanges
    let refundClause
    let exchangeLine
    if (refundStrategy === 'no-refunds') {
      refundClause = "All sales are final and we do not give refunds. Please check the size, colour, and details carefully before you pay."
      exchangeLine = "We only replace an item if we sent you the wrong thing."
    } else if (refundStrategy === 'unboxing-only') {
      refundClause = "We only review refund or store credit requests if you send a clear unboxing video, recorded in one take, within 24 hours of delivery."
      exchangeLine = "Without that video we cannot honour a claim for a missing, damaged, or wrong item."
    } else {
      refundClause = "You can exchange for a different size within 48 hours of delivery. The item must be unworn, unwashed, and still have its tags on."
      exchangeLine = "You cover the delivery cost both ways for an exchange."
    }

    // 5. Optional clauses
    const saleBlock = saleExclusion 
      ? "\n\nSALE AND DISCOUNTED ITEMS\nAnything bought during a sale, flash sale, or discount run is final. Sale items cannot be exchanged or returned."
      : ""

    const logisticsBlock = logisticShield
      ? "\n\nDELIVERY DELAYS\nWe deliver through courier and dispatch partners. We follow up on every order, but once a parcel leaves us we cannot control delays caused by traffic, weather, or the rider."
      : ""

    // --- OUTPUT FORMATS ---

    // A: full terms for the store page
    const full = `${name.toUpperCase()} STORE POLICY

1. Payment
${paymentClause}

2. Delivery and Timing
${timelineClause} ${deliveryClause}${logisticsBlock}

3. Returns and Exchanges
${refundClause} ${exchangeLine}${saleBlock}

4. Your Details
Please give us a correct phone number, WhatsApp number, and full address. We cannot be held responsible for a delivery that fails because the contact details were wrong or unreachable.`

    // B: short version, sized for an Instagram highlight screenshot
    const short = `${name.toUpperCase()} STORE TERMS

PAYMENT
• ${paymentModel === 'pbd' ? 'Payment before delivery only' : paymentModel === 'split' ? '50% upfront, balance before we ship' : 'Pay on delivery in selected areas'}
• No payment, no delivery.

DELIVERY
• ${deliverySummary}
• Allow ${processingTime === 'preorder' ? '7 to 14 days to make your item' : '24 to 48 hours before it ships'}.

RETURNS
• ${refundStrategy === 'no-refunds' ? 'No refunds or exchanges' : refundStrategy === 'unboxing-only' ? 'Unboxing video required within 24 hours' : 'Size swaps allowed within 48 hours'}
• ${saleExclusion ? 'Sale items are final.' : 'These terms apply to every order.'}`

    // C: WhatsApp message, using WhatsApp markdown
    const whatsapp = `*${name.toUpperCase()}: ORDER TERMS*

Thank you for your order. Here is how we work:

*1. Timing*
• ${timelineClause}

*2. Delivery*
• ${deliverySummary}
${logisticShield ? '• _We deliver through dispatch partners, so delays from traffic or weather are outside our control._' : ''}

*3. Payment*
• ${paymentClause}

*4. Returns*
• ${refundStrategy === 'no-refunds' ? 'All sales are final. We do not accept returns.' : refundStrategy === 'unboxing-only' ? 'Any claim needs a clear, unedited unboxing video.' : 'Size swaps need the item unworn with tags on. You cover delivery both ways.'}
${saleExclusion ? '\n*Note:* Sale and discounted items cannot be swapped or returned.' : ''}

_Paying for your order means you agree to these terms._`

    return { full, short, whatsapp }
  }, [businessName, deliveryModel, processingTime, paymentModel, refundStrategy, saleExclusion, logisticShield])

  const { user } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState('')
  const [view, setView] = useState('full')
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }
  const values = { deliveryModel, processingTime, paymentModel, refundStrategy }
  const setters = { deliveryModel: setDeliveryModel, processingTime: setProcessingTime, paymentModel: setPaymentModel, refundStrategy: setRefundStrategy }
  const name = businessName.trim() || 'Our Store'
  const VIEWS = [['full', 'Store page', Store], ['short', 'Instagram highlight', null], ['whatsapp', 'WhatsApp message', null]]
  // WhatsApp shows *bold* and _italic_; render them the same way here.
  const waHtml = policy.whatsapp.split('\n').map((line, i) => {
    const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, j) => (
      part.startsWith('*') && part.endsWith('*') ? <b key={j}>{part.slice(1, -1)}</b>
        : part.startsWith('_') && part.endsWith('_') ? <i key={j}>{part.slice(1, -1)}</i> : part
    ))
    return <span key={i} className="block min-h-[0.9em]">{parts}</span>
  })

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/tools/policy-generator')} url="/tools/policy-generator" />
      <Navbar />

      <section className="relative overflow-hidden pb-12 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_55%_at_30%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-8">
          <Reveal className="lg:pt-6">
            <Eyebrow>Free tool</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.2rem]">
              Clear store rules, <span className="text-forest-600">before anyone argues.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Answer four questions about how you really run your store. You get terms for your store page, a short version for your Instagram highlight and a message to send on WhatsApp after an order.
            </p>
            <Script className="mt-6 hidden -rotate-3 text-[26px] leading-none lg:block">Free, no sign-up</Script>
          </Reveal>

          <Reveal delay={120} className="rounded-[28px] bg-white p-5 shadow-xl shadow-forest-900/5 ring-1 ring-gray-100 sm:p-7">
            <label className="block"><span className="text-[13px] font-bold text-gray-800">Business name</span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[14px] outline-none transition focus:border-forest-600 focus:ring-4 focus:ring-forest-50" />
            </label>
            <div className="mt-5 space-y-4">
              {CHOICES.map((c) => (
                <div key={c.key}>
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-gray-800"><c.icon size={15} className="text-forest-600" />{c.label}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {c.options.map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setters[c.key](v)} aria-pressed={values[c.key] === v}
                        className={`rounded-xl px-3 py-2.5 text-left text-[12.5px] font-semibold transition ${values[c.key] === v ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-forest-50'}`}>{l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[[saleExclusion, setSaleExclusion, 'Sale items are final', 'No swaps or returns on discounted items.'], [logisticShield, setLogisticShield, 'Cover courier delays', 'Rider and traffic delays are outside your control.']].map(([on, set, t, d]) => (
                <button key={t} type="button" onClick={() => set(!on)} aria-pressed={on}
                  className={`flex items-start gap-2.5 rounded-xl p-3 text-left transition ${on ? 'bg-forest-50 ring-1 ring-forest-200' : 'bg-gray-50 ring-1 ring-gray-100'}`}>
                  {on ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-forest-600" /> : <Circle size={18} className="mt-0.5 flex-shrink-0 text-gray-300" />}
                  <span><span className="block text-[13px] font-bold text-gray-900">{t}</span><span className="block text-[11.5px] text-gray-500">{d}</span></span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <div className="inline-flex flex-wrap justify-center gap-1 rounded-2xl bg-gray-100 p-1" role="tablist">
              {VIEWS.map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-bold transition ${view === id ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {Icon ? <Icon size={15} /> : <BrandIcon name={id === 'short' ? 'instagram' : 'whatsapp'} size={15} />}{label}
                </button>
              ))}
            </div>
          </div>

          <div key={view} className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {view === 'full' && (
              <div className="mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-xl shadow-forest-900/5 ring-1 ring-gray-100">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-forest-50/60 px-5 py-4 sm:px-7">
                  <span className="flex items-center gap-2 text-[13.5px] font-bold text-gray-900"><FileText size={16} className="text-forest-600" />{name}: store policy</span>
                  <button type="button" onClick={() => copy(policy.full, 'full')} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[12.5px] font-bold text-white">{copied === 'full' ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}{copied === 'full' ? 'Copied' : 'Copy'}</button>
                </div>
                <pre className="whitespace-pre-wrap px-5 py-6 font-sans text-[14px] leading-relaxed text-gray-700 sm:px-7">{policy.full}</pre>
              </div>
            )}
            {view === 'short' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-[300px] rounded-[34px] bg-gray-950 p-2 shadow-xl shadow-gray-900/25">
                  <div className="relative overflow-hidden rounded-[27px] bg-gradient-to-br from-forest via-forest-700 to-forest-900 px-5 pb-8 pt-10 text-white" style={{ aspectRatio: '9 / 16' }}>
                    <div className="absolute inset-x-3 top-3 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={`h-0.5 flex-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/30'}`} />)}</div>
                    <pre className="whitespace-pre-wrap font-sans text-[12px] font-semibold leading-relaxed">{policy.short}</pre>
                  </div>
                </div>
                <button type="button" onClick={() => copy(policy.short, 'short')} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white">{copied === 'short' ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}{copied === 'short' ? 'Copied' : 'Copy the text'}</button>
              </div>
            )}
            {view === 'whatsapp' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-[420px] overflow-hidden rounded-[28px] bg-[#efeae2] shadow-xl shadow-gray-900/10 ring-1 ring-gray-200">
                  <div className="flex items-center gap-2.5 bg-[#075e54] px-4 py-3 text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">{name.slice(0, 2).toUpperCase()}</span><span className="text-[13px] font-bold">{name}</span></div>
                  <div className="p-4"><div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-[#d9fdd3] px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-800 shadow-sm">{waHtml}</div></div>
                </div>
                <button type="button" onClick={() => copy(policy.whatsapp, 'wa')} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-bold text-white">{copied === 'wa' ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}{copied === 'wa' ? 'Copied' : 'Copy the message'}</button>
              </div>
            )}
          </div>

          <Reveal className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 rounded-[28px] bg-forest p-6 text-center text-white sm:flex-row sm:p-8 sm:text-left">
            <ShieldCheck size={34} className="flex-shrink-0 text-forest-100" />
            <div className="flex-1"><p className="font-display text-[19px] font-extrabold">Put your policy on a real store.</p><p className="mt-1 text-[14px] text-white/75">Sellapage shows your guarantee to buyers before they pay, and Premium stores get their own policies page.</p></div>
            <button type="button" onClick={() => navigate(user ? '/dashboard' : '/login?mode=register')} className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px] font-bold text-forest">Start free <ArrowRight size={16} className="transition group-hover:translate-x-1" /></button>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
