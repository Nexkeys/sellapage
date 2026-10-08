// src/components/marketing/ComparePage.jsx
//
// The layout every "Sellapage vs ..." page shares (2026-10-08). Each page
// passes its words and table; this draws them the same way:
//   - a hero with two phones side by side: the other way of selling, playing
//     out its friction (questions in DMs, a list of links, a setup checklist),
//     next to a Sellapage store taking an order
//   - a side-by-side table
//   - "a day with each", "which one is right for you", and a call to action
//
// Claims about other products are kept to what they are built for and what
// they do not do for a Nigerian seller today, written so they stay true as
// those products change. A cell can be true, false, or a short phrase.
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Minus, Link2, MessageCircle, Heart, Send, Bookmark, CheckCircle2, Circle } from 'lucide-react'
import Navbar from '../Navbar'
import Footer from '../Footer'
import Reveal from '../Reveal'
import SEO from '../SEO'
import { useAuth } from '../../hooks/useAuth'
import { pageSeo } from '../../data/seoPages'
import { Eyebrow, Script } from './kit'
import { BrandIcon } from './brands'
import { ShopPhoneLive, ScaledStage, useClock, useOnScreen } from './motion'

/** A plain phone outline for the "other way" scenes. */
function Phone({ children, tint = 'bg-white' }) {
  return (
    <div className="h-[600px] w-[292px] rounded-[38px] bg-gray-950 p-[9px] shadow-[0_40px_70px_-25px_rgba(15,23,42,0.45)]">
      <div className={`relative h-full w-full overflow-hidden rounded-[30px] ${tint}`}>
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-bold text-gray-800"><span>9:41</span><span className="h-4 w-16 rounded-full bg-gray-950" /><span className="w-6" /></div>
        {children}
      </div>
    </div>
  )
}

/** Messages arriving one at a time, as a seller's DMs do. */
function Thread({ t, lines, start = 400, gap = 1300 }) {
  return (
    <div className="flex flex-col gap-2 px-3">
      {lines.map(([mine, text], i) => {
        const at = start + i * gap
        if (t < at) return null
        return <p key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11.5px] leading-snug shadow-sm animate-rise ${mine ? 'self-end rounded-br-md bg-[#d9fdd3] text-gray-800' : 'self-start rounded-bl-md bg-white text-gray-800'}`}>{text}</p>
      })}
    </div>
  )
}

const CHAT = [
  [false, 'Good evening, how much is the green sneakers?'],
  [true, 'Hi dear, it is 18,500'],
  [false, 'Is size 42 still available?'],
  [true, 'Let me check and get back to you'],
  [false, 'Ok. Send account details'],
  [true, 'GTB 0123... Ada O.'],
  [false, 'I have paid, please confirm'],
  [true, 'Checking my alerts...'],
]

function ThemScene({ kind }) {
  const ref = useRef(null)
  const t = useClock(useOnScreen(ref), { stillAt: 9000 }) % 12000
  let body
  if (kind === 'chat') {
    body = (
      <Phone tint="bg-[#efeae2]">
        <div className="flex items-center gap-2 bg-[#075e54] px-3 pb-2.5 pt-3 text-white"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">CK</span><span><span className="block text-[12px] font-bold">Customer</span><span className="block text-[10px] text-white/70">{t % 2600 < 1300 ? 'typing...' : 'online'}</span></span></div>
        <div className="pt-3"><Thread t={t} lines={CHAT} gap={1100} /></div>
      </Phone>
    )
  } else if (kind === 'links') {
    const tapped = t > 2600
    body = (
      <Phone tint="bg-gradient-to-b from-[#d2e823] to-[#c0d71a]">
        {!tapped ? (
          <div className="px-5 pt-8 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-[15px] font-extrabold text-white">AC</span>
            <p className="mt-2 text-[14px] font-extrabold text-gray-900">@adascloset</p>
            <div className="mt-5 space-y-2.5">
              {['DM to order', 'Price list (PDF)', 'Chat me on WhatsApp', 'My Instagram'].map((l, i) => (
                <span key={l} className={`relative block rounded-2xl bg-white px-4 py-3 text-[12.5px] font-bold text-gray-900 shadow-sm ${i === 0 && t > 1600 ? 'scale-95 ring-2 ring-gray-900' : ''} transition`}>{l}{i === 0 && t > 1600 && t < 2600 && <span className="absolute -right-1 top-1/2 h-8 w-8 -translate-y-1/2 animate-tap rounded-full bg-gray-900/30" />}</span>
              ))}
            </div>
            <p className="mt-6 text-[10.5px] text-gray-700">No prices. No photos. No checkout.</p>
          </div>
        ) : (
          <div className="h-full bg-[#efeae2] pt-3"><Thread t={t - 2600} lines={CHAT.slice(0, 6)} gap={1100} start={200} /></div>
        )}
      </Phone>
    )
  } else if (kind === 'post') {
    body = (
      <Phone>
        <div className="flex items-center gap-2 px-3 py-2"><span className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px]"><span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[8px] font-extrabold">AC</span></span><span className="text-[11.5px] font-bold">adascloset</span></div>
        <div className="flex h-[250px] items-center justify-center bg-gradient-to-br from-forest-100 to-forest-50"><span className="text-[64px] font-extrabold text-forest-600/40">AC</span></div>
        <div className="flex gap-3 px-3 py-2 text-gray-800"><Heart size={18} /><MessageCircle size={18} /><Send size={18} /><Bookmark size={18} className="ml-auto" /></div>
        <p className="px-3 text-[11.5px]"><b>adascloset</b> New green sneakers in stock. <b>DM for price</b></p>
        <div className="mt-2 space-y-1.5 px-3">
          {[['chi_mk', 'HM?'], ['tunde.a', 'Price please'], ['blessing_e', 'Do you deliver to Ikeja?'], ['ngozi', 'DM sent, no reply yet'], ['ibro_s', 'Still available?']].map(([u, c], i) => (
            t > 600 + i * 1200 ? <p key={u} className="text-[11px] animate-rise"><b>{u}</b> {c}</p> : null
          ))}
        </div>
      </Phone>
    )
  } else {
    const items = ['Pick and set up a theme', 'Buy and connect a domain', 'Find an app for Paystack', 'Find an app for local delivery', 'Pay the plan in dollars', 'Set up taxes and shipping zones']
    const done = Math.min(items.length, Math.floor(t / 1300))
    body = (
      <Phone tint="bg-[#f6f6f7]">
        <div className="px-4 pt-4">
          <p className="text-[14px] font-extrabold text-gray-900">Set up your store</p>
          <p className="text-[11px] text-gray-500">{done} of {items.length} tasks complete</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-gray-800 transition-[width] duration-700" style={{ width: `${(done / items.length) * 100}%` }} /></div>
          <div className="mt-4 space-y-2">
            {items.map((x, i) => (
              <div key={x} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                {i < done ? <CheckCircle2 size={16} className="text-gray-800" /> : <Circle size={16} className="text-gray-300" />}
                <span className={`text-[11.5px] font-semibold ${i < done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{x}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Still not selling yet</p>
        </div>
      </Phone>
    )
  }
  return <div ref={ref}>{body}</div>
}

function Mark({ v, us }) {
  if (v === true) return <Check size={18} strokeWidth={2.6} className={`mx-auto ${us ? 'text-forest-600' : 'text-gray-500'}`} />
  if (v === false) return <Minus size={17} className="mx-auto text-gray-300" />
  return <span className={`text-[12.5px] font-semibold ${us ? 'text-forest-700' : 'text-gray-500'}`}>{v}</span>
}

/**
 * page: {
 *   path, them, themShort, brand (brands.jsx key, optional), kind ('chat'|'links'|'post'|'setup'),
 *   title: [line1, line2], intro, rows: [[label, them, us]], day: { them, us },
 *   fit: { them: [...], us: [...] }, alongside (optional sentence)
 * }
 */
export default function ComparePage({ page }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const start = () => navigate(user ? '/dashboard' : '/login?mode=register')
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-body text-gray-900">
      <SEO {...pageSeo(page.path)} url={page.path} />
      <Navbar />

      <section className="relative overflow-hidden pb-14 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(60%_55%_at_50%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal><Eyebrow>Sellapage vs {page.them}</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-[2.2rem] font-extrabold leading-[1.06] tracking-tight text-gray-950 sm:text-[3.1rem] lg:text-[3.5rem]">
              {page.title[0]} <span className="text-forest-600">{page.title[1]}</span>
            </h1>
          </Reveal>
          <Reveal delay={160}><p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">{page.intro}</p></Reveal>
          <Reveal delay={220} className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={start} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-7 py-4 text-[15px] font-bold text-white shadow-xl shadow-forest/25 transition hover:bg-forest-700">Start free <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button>
            <a href="#side-by-side" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-[15px] font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-50">See the comparison</a>
          </Reveal>
        </div>

        <Reveal delay={200} className="mx-auto mt-12 max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-2 items-start gap-3 sm:gap-10">
            <div>
              <p className="mb-3 flex items-center justify-center gap-2 text-center text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{page.brand ? <BrandIcon name={page.brand} size={15} /> : <Link2 size={14} />}{page.themShort}</p>
              <div className="mx-auto max-w-[292px] opacity-95 grayscale-[35%]"><ScaledThem kind={page.kind} /></div>
            </div>
            <div>
              <p className="mb-3 flex items-center justify-center gap-2 text-center text-[12px] font-extrabold uppercase tracking-[0.14em] text-forest-700"><img src="/og-image.png" alt="" className="h-4 w-4 rounded" />Sellapage</p>
              <div className="mx-auto max-w-[292px]"><ShopPhoneLive /></div>
            </div>
          </div>
          <Script className="mx-auto mt-6 w-fit -rotate-2 text-center text-[24px] leading-none sm:text-[28px]">Same customer. One of them pays.</Script>
        </Reveal>
      </section>

      <section id="side-by-side" className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-8 text-center">
            <Eyebrow>Side by side</Eyebrow>
            <h2 className="mt-4 font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.4rem]">What each one does for you.</h2>
          </Reveal>
          <Reveal className="overflow-hidden rounded-[24px] bg-white ring-1 ring-gray-100">
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] border-b border-gray-100 text-center">
              <span />
              <span className="flex items-center justify-center gap-1.5 bg-gray-50 px-2 py-4 text-[13px] font-extrabold text-gray-600">{page.brand && <BrandIcon name={page.brand} size={14} />}{page.themShort}</span>
              <span className="flex items-center justify-center gap-1.5 bg-forest px-2 py-4 text-[13px] font-extrabold text-white"><img src="/og-image.png" alt="" className="h-4 w-4 rounded bg-white" />Sellapage</span>
            </div>
            {page.rows.map(([label, them, us], i) => (
              <div key={label} className={`grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center text-center ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                <span className="px-4 py-3.5 text-left text-[13.5px] font-medium text-gray-800 sm:px-6">{label}</span>
                <span className="px-2 py-3.5"><Mark v={them} /></span>
                <span className="bg-forest-50/50 px-2 py-3.5"><Mark v={us} us /></span>
              </div>
            ))}
          </Reveal>
          <p className="mt-3 text-center text-[12px] text-gray-400">Based on what each product offers sellers in Nigeria as of October 2026. Sellapage features depend on your plan; see <a href="/pricing" className="underline">pricing</a>.</p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white via-forest-50/50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
          <Reveal direction="left" className="rounded-[28px] bg-white p-6 ring-1 ring-gray-100 sm:p-8">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-gray-400">A day with {page.themShort}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{page.day.them}</p>
          </Reveal>
          <Reveal direction="right" delay={120} className="rounded-[28px] bg-forest p-6 text-white sm:p-8">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-forest-100">A day with Sellapage</p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85">{page.day.us}</p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-8 text-center">
            <h2 className="font-display text-[1.9rem] font-extrabold text-gray-950 sm:text-[2.4rem]">Which one is right for you?</h2>
            {page.alongside && <p className="mx-auto mt-3 max-w-2xl text-[15px] text-gray-600">{page.alongside}</p>}
          </Reveal>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal className="rounded-[28px] bg-gray-50 p-6 sm:p-8">
              <p className="font-display text-[18px] font-extrabold text-gray-700">{page.themShort} suits you if</p>
              <ul className="mt-4 space-y-3">{page.fit.them.map((x) => <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-gray-600"><span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />{x}</li>)}</ul>
            </Reveal>
            <Reveal delay={100} className="rounded-[28px] bg-forest-50 p-6 ring-1 ring-forest-100 sm:p-8">
              <p className="font-display text-[18px] font-extrabold text-forest-800">Sellapage suits you if</p>
              <ul className="mt-4 space-y-3">{page.fit.us.map((x) => <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-forest-900"><Check size={16} strokeWidth={3} className="mt-0.5 flex-shrink-0 text-forest-600" />{x}</li>)}</ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl rounded-[32px] bg-forest px-6 py-14 text-center text-white sm:py-20">
          <h2 className="mx-auto max-w-2xl text-balance font-display text-[2rem] font-extrabold leading-[1.08] sm:text-[2.7rem]">Run and grow your business from one place.</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-white/75">Start free. Your store can be live the same day. No card needed.</p>
          <button type="button" onClick={start} className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-4 text-[15px] font-bold text-forest transition hover:bg-forest-50">{user ? 'Open your dashboard' : 'Start free'} <ArrowRight size={17} className="transition group-hover:translate-x-1" /></button>
        </Reveal>
      </section>

      <Footer />
    </div>
  )
}

/** The scene at phone scale, shrunk to fit narrow screens like ShopPhoneLive. */
function ScaledThem({ kind }) {
  return <ScaledStage width={292} height={600}><ThemScene kind={kind} /></ScaledStage>
}
