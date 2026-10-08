// src/pages/ContactUs.jsx
//
// Contact, rebuilt 2026-10-08 in the style of the new Home and About.
//
// There is no contact-form endpoint, and adding one would mean another inbox
// nobody watches. So the message builder here writes the message for the
// visitor and hands it to the channels the team already answers: WhatsApp
// (+234 812 052 5256) and email (sellapage.ng@gmail.com), both pre-filled with
// the topic, store link and details so the first reply can be the answer.
// Vendors who are signed in are pointed at the dashboard Support tab first,
// because it attaches their store details automatically.
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Mail, MapPin, LifeBuoy, KeyRound, CreditCard, Wallet, Truck, Store, Flag, HeartHandshake as HandshakeIcon, Send, Check, Copy, Bot,
  BookOpen, ShieldCheck, FileText, HelpCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { Eyebrow, Script } from '../components/marketing/kit'
import { BrandIcon } from '../components/marketing/brands'
import { useClock, useOnScreen } from '../components/marketing/motion'

const WHATSAPP = '2348120525256'
const WHATSAPP_SHOWN = '+234 812 052 5256'
const EMAIL = 'sellapage.ng@gmail.com'

const TOPICS = [
  { id: 'account', icon: KeyRound, label: 'Signing in or my account' },
  { id: 'billing', icon: CreditCard, label: 'Plans and billing' },
  { id: 'payouts', icon: Wallet, label: 'Payments and payouts' },
  { id: 'delivery', icon: Truck, label: 'Delivery' },
  { id: 'store', icon: Store, label: 'Setting up my store' },
  { id: 'other', icon: HelpCircle, label: 'Something else' },
]

// A short, made-up exchange that shows what talking to support looks like.
const CHAT = [
  { who: 'you', text: 'Hi, I connected my bank in Payouts. When does a sale reach my account?' },
  { who: 'us', text: 'Hi! Paystack settles each paid order to the bank you added. You can follow every one in your Payouts tab.' },
  { who: 'you', text: 'Perfect, I can see it there now. Thank you!' },
]

/** A support conversation typing itself out in a phone. */
function SupportChat() {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 9000 }) % 11000
  // Each message: typing dots for a moment, then the bubble.
  const at = [400, 2600, 6200]
  return (
    <div ref={ref} className="mx-auto w-full max-w-[320px] rounded-[38px] bg-gray-950 p-[9px] shadow-[0_40px_70px_-25px_rgba(2,58,25,0.55)]">
      <div className="overflow-hidden rounded-[30px] bg-[#f4f7f5]">
        <div className="flex items-center gap-2.5 bg-forest px-4 pb-3 pt-4 text-white">
          <img src="/og-image.png" alt="" className="h-9 w-9 rounded-full bg-white p-0.5" />
          <div><p className="text-[13px] font-bold">Sellapage Support</p><p className="text-[10.5px] text-white/70">Real people, here to help</p></div>
        </div>
        <div className="flex h-[330px] flex-col justify-end gap-2.5 px-3 pb-4">
          {CHAT.map((m, i) => {
            const typing = t > at[i] - 900 && t < at[i]
            const shown = t >= at[i]
            const mine = m.who === 'you'
            if (!typing && !shown) return null
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                {shown ? (
                  <p className={`max-w-[84%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug shadow-sm animate-rise ${mine ? 'rounded-br-md bg-forest-600 text-white' : 'rounded-bl-md bg-white text-gray-800'}`}>{m.text}</p>
                ) : (
                  <span className={`inline-flex gap-1 rounded-2xl px-3 py-2.5 shadow-sm ${mine ? 'bg-forest-600' : 'bg-white'}`}>{[0, 1, 2].map((d) => <i key={d} className={`h-1.5 w-1.5 animate-bounce rounded-full ${mine ? 'bg-white/70' : 'bg-gray-300'}`} style={{ animationDelay: `${d * 120}ms` }} />)}</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
          <span className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-[11.5px] text-gray-400">Message</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-white"><Send size={14} /></span>
        </div>
      </div>
    </div>
  )
}

/** Writes the message, then opens WhatsApp or email with it filled in. */
function MessageBuilder() {
  const [topic, setTopic] = useState('account')
  const [name, setName] = useState('')
  const [store, setStore] = useState('')
  const [details, setDetails] = useState('')
  const [copied, setCopied] = useState(false)
  const label = TOPICS.find((x) => x.id === topic)?.label || 'Question'
  const body = [
    `Hi Sellapage, I need help with: ${label}.`,
    name.trim() && `My name: ${name.trim()}`,
    store.trim() && `My store: ${store.trim()}`,
    details.trim() && `\n${details.trim()}`,
  ].filter(Boolean).join('\n')
  const ready = details.trim().length >= 10
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(body)}`
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`Help with: ${label}`)}&body=${encodeURIComponent(body)}`
  const copy = () => {
    navigator.clipboard?.writeText(`${body}\n\n(${EMAIL})`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const input = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[14px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50'
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="rounded-[28px] bg-white p-5 shadow-xl shadow-forest-900/5 ring-1 ring-gray-100 sm:p-7">
        <p className="text-[13px] font-bold text-gray-800">What is it about?</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOPICS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTopic(x.id)} aria-pressed={topic === x.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-semibold transition ${topic === x.id ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-forest-50'}`}>
              <x.icon size={15} className={`flex-shrink-0 ${topic === x.id ? '' : 'text-forest-600'}`} />{x.label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-[12.5px] font-bold text-gray-700">Your name</span><input value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1.5`} autoComplete="name" /></label>
          <label className="block"><span className="text-[12.5px] font-bold text-gray-700">Your store link <span className="font-normal text-gray-400">(if you have one)</span></span><input value={store} onChange={(e) => setStore(e.target.value)} placeholder="sellapage.com.ng/yourstore" className={`${input} mt-1.5`} /></label>
        </div>
        <label className="mt-3 block">
          <span className="text-[12.5px] font-bold text-gray-700">What happened?</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Tell us what you were doing, what you expected and what you saw instead." className={`${input} mt-1.5 resize-none`} />
        </label>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <a href={ready ? wa : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!ready} onClick={(e) => { if (!ready) e.preventDefault() }}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold transition ${ready ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25 hover:brightness-95' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>
            <BrandIcon name="whatsapp" size={18} color="currentColor" />Send on WhatsApp
          </a>
          <a href={ready ? mail : undefined} aria-disabled={!ready} onClick={(e) => { if (!ready) e.preventDefault() }}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold transition ${ready ? 'bg-forest text-white hover:bg-forest-700' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>
            <Mail size={17} />Send by email
          </a>
        </div>
        <p className="mt-2.5 text-[12px] text-gray-400">{ready ? 'Your message opens ready to send. Nothing is sent until you press send there.' : 'Write a line or two about what happened to continue.'}</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">Your message</p>
        <div className="min-h-[200px] rounded-[28px] bg-[#e7efe9] p-4">
          <p className="ml-auto max-w-[92%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#d9fdd3] px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-800 shadow-sm">{body}</p>
        </div>
        <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition hover:border-forest-200">
          {copied ? <Check size={15} className="text-forest-600" /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy the message instead'}
        </button>
      </div>
    </div>
  )
}

export default function ContactUs() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-body text-gray-900">
      <SEO {...pageSeo('/contact')} url="/contact" />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-14 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[radial-gradient(60%_55%_at_30%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8">
          <Reveal>
            <Eyebrow>Contact us</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.5rem] font-extrabold leading-[1.04] tracking-tight text-gray-950 sm:text-[3.4rem] lg:text-[3.8rem]">
              Talk to a <span className="text-forest-600">real person.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              A question about your store, orders, payments or plan? Message us on WhatsApp or email. Real people at Sellapage answer, usually within one to two business days.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-[15px] font-bold text-white shadow-xl shadow-[#25D366]/25 transition hover:brightness-95">
                <BrandIcon name="whatsapp" size={19} color="currentColor" />Chat on WhatsApp
              </a>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50">
                <Mail size={18} className="text-forest-600" />{EMAIL}
              </a>
            </div>
            {user && (
              <button type="button" onClick={() => navigate('/dashboard')} className="group mt-6 flex w-full items-center gap-3 rounded-2xl bg-forest-50 p-4 text-left ring-1 ring-forest-100 transition hover:bg-forest-100/60 sm:max-w-md">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-forest-600 shadow-sm"><LifeBuoy size={19} /></span>
                <span className="flex-1"><span className="block text-[14px] font-bold text-gray-900">You are signed in</span><span className="block text-[12.5px] text-gray-600">Use Support in your dashboard. Your store details go with your message.</span></span>
                <ArrowRight size={17} className="text-forest-700 transition group-hover:translate-x-1" />
              </button>
            )}
          </Reveal>
          <Reveal direction="left" delay={120} className="relative">
            <div className="absolute inset-x-6 bottom-6 top-10 -z-10 rounded-[40px] bg-gradient-to-br from-forest-100 via-forest-50 to-white" />
            <SupportChat />
            <Script className="absolute -left-2 bottom-10 hidden -rotate-6 text-[24px] leading-[1.05] lg:block">Real people,<br />real answers</Script>
          </Reveal>
        </div>
      </section>

      {/* ── Ways to reach us ─────────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: LifeBuoy, tone: 'bg-forest text-white', iconTone: 'bg-white/10 text-white', title: 'Dashboard Support', body: 'Fastest for vendors. Your store details are attached for you.', action: user ? <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-forest-100">Open your dashboard <ArrowRight size={14} /></button> : <Link to="/login" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-forest-100">Sign in <ArrowRight size={14} /></Link> },
            { icon: () => <BrandIcon name="whatsapp" size={20} />, title: 'WhatsApp', body: 'For quick questions and anything urgent.', action: <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-bold text-forest-700">{WHATSAPP_SHOWN}</a> },
            { icon: Mail, title: 'Email', body: 'For anything detailed. Include your store name.', action: <a href={`mailto:${EMAIL}`} className="break-all text-[13.5px] font-bold text-forest-700">{EMAIL}</a> },
            { icon: Flag, title: 'Report a store', body: 'Seen a scam or a store breaking the rules? Tell us.', action: <Link to="/report-store" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-forest-700">Report it <ArrowRight size={14} /></Link> },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 70} className={`flex flex-col rounded-[24px] p-5 ${c.tone || 'bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]'}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${c.iconTone || 'bg-forest-50 text-forest-600'}`}><c.icon size={20} /></span>
              <p className="mt-4 font-display text-[17px] font-extrabold">{c.title}</p>
              <p className={`mt-1 flex-1 text-[13.5px] leading-snug ${c.tone ? 'text-white/75' : 'text-gray-500'}`}>{c.body}</p>
              <div className="mt-4">{c.action}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Message builder ──────────────────────────────────────────────── */}
      <section id="message" className="scroll-mt-20 bg-gradient-to-b from-white via-forest-50/50 to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Eyebrow>Write to us</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-[1.9rem] font-extrabold leading-tight text-gray-950 sm:text-[2.5rem]">Tell us once. Get the right answer first time.</h2>
            <p className="mt-3 text-[15px] text-gray-600">We put your message together with everything we need, then you send it on WhatsApp or by email.</p>
          </Reveal>
          <Reveal><MessageBuilder /></Reveal>
        </div>
      </section>

      {/* ── Office and quick answers ─────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal className="overflow-hidden rounded-[28px] bg-white ring-1 ring-gray-100">
            <div className="relative h-56 overflow-hidden bg-[#eef3ec]" aria-hidden="true">
              <svg viewBox="0 0 600 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
                <rect x="0" y="150" width="600" height="80" fill="#cfe3f3" />
                <path d="M0 150 C120 140 220 165 330 150 S520 130 600 145" fill="none" stroke="#b9d6ec" strokeWidth="6" />
                <rect x="380" y="20" width="150" height="70" rx="12" fill="#cfe8c9" />
                <path d="M-10 110 L610 95" stroke="#fff" strokeWidth="14" />
                <path d="M170 -10 L210 160" stroke="#fff" strokeWidth="10" />
                <path d="M420 -10 L380 150" stroke="#fde68a" strokeWidth="8" />
                <path d="M-10 40 L610 60" stroke="#fff" strokeWidth="6" />
              </svg>
              <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-full">
                <span className="absolute left-1/2 top-full h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-forest-600/25" />
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-forest shadow-xl"><img src="/og-image.png" alt="" className="h-7 w-7 rounded-md bg-white p-0.5" /></span>
              </span>
            </div>
            <div className="flex items-start gap-3 p-5 sm:p-6">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600"><MapPin size={20} /></span>
              <div>
                <p className="font-display text-[18px] font-extrabold text-gray-900">Our office</p>
                <p className="mt-1 text-[14px] leading-relaxed text-gray-600">Babatunde Street, Olodi Apapa, Lagos, Nigeria.</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="rounded-[28px] bg-gray-50 p-5 sm:p-7">
            <p className="font-display text-[20px] font-extrabold text-gray-950">Quick answers</p>
            <p className="mt-1 text-[14px] text-gray-500">Many questions are already answered here.</p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                [CreditCard, 'Plans and prices', '/pricing'],
                [BookOpen, 'How Sellapage works', '/#how-it-works'],
                [Bot, 'Questions about Sellapage', '/#faq'],
                [ShieldCheck, 'Privacy policy', '/privacy-policy'],
                [FileText, 'Terms of service', '/terms'],
                [HandshakeIcon, 'Investors and partners', '/partners'],
              ].map(([I, label, to]) => (
                <Link key={label} to={to} className="group flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-100 transition hover:ring-forest-200">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><I size={17} /></span>
                  <span className="flex-1 text-[13.5px] font-semibold text-gray-800">{label}</span>
                  <ArrowRight size={15} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-forest-600" />
                </Link>
              ))}
            </div>
            <p className="mt-6 text-[12.5px] leading-relaxed text-gray-500">Sellapage is built and run in Lagos by <a href="https://nexkeysagency.com.ng" target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 hover:underline">NexKeys Agency</a>.</p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
