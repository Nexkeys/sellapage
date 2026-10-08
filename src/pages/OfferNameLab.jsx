// src/pages/OfferNameLab.jsx
//
// Free business name generator, rebuilt 2026-10-08 in the style of the new
// public pages. The naming logic is unchanged (six name shapes from what the
// vendor sells, who buys and a style); what is new is that picking a name
// shows it live, as an Instagram profile and as a Sellapage store, so the
// vendor sees how it reads before choosing. Everything runs in the browser.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Copy, Check, Sparkles, Wand2, Star, Link2, Grid3x3 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'
import { useAuth } from '../hooks/useAuth'
import { Eyebrow, Script } from '../components/marketing/kit'

const STYLE_POOLS = {
  minimalist: {
    label: 'Minimalist',
    abstracts: ['Label', 'Edit', 'Basics', 'Project', 'Core', 'Pure', 'Studio'],
    oneLiner: (target, item) => `Clean, well made ${item} for ${target}.`,
    bio: (target, item) => `${item} for ${target}.\nSimple pieces you will actually wear.\nTap the link to see what is in stock and order.`,
  },
  street: {
    label: 'Street',
    abstracts: ['Plug', 'Vault', 'Drip', 'Alley', 'Base', 'Crew', 'Zone'],
    oneLiner: (target, item) => `Your ${item} plug in ${target}. Fast.`,
    bio: (target, item) => `${item} in ${target}.\nStock moves fast.\nTap the link below and order now.`,
  },
  luxury: {
    label: 'Luxury',
    abstracts: ['Atelier', 'Maison', 'Aura', 'Privé', 'Vellum', 'Noir', 'Couture'],
    oneLiner: (target, item) => `Quiet, high end ${item} for a small list of clients in ${target}.`,
    bio: (target, item) => `${item} for ${target}.\nMade to order, finished by hand.\nSee what is open now and order through the link.`,
  },
  modern: {
    label: 'Modern',
    abstracts: ['Nova', 'Apex', 'Vivid', 'Shift', 'Element', 'Hub', 'Matrix'],
    oneLiner: (target, item) => `${item} that just works, for ${target}.`,
    bio: (target, item) => `${item} for ${target}.\nGood build, easy ordering.\nPick your size or colour and check out through the link.`,
  },
}

const cleanWords = (value) => value.trim().split(/\s+/).filter(Boolean)
const titleCase = (value) => cleanWords(value).map((w) => `${w[0]?.toUpperCase() || ''}${w.slice(1).toLowerCase()}`).join(' ')
const slugOf = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')
const initialsOf = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function CopyIcon({ done }) {
  return done ? <Check size={15} strokeWidth={3} className="text-forest-600" /> : <Copy size={15} />
}

export default function OfferNameLab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [specificProduct, setSpecificProduct] = useState('crochet dresses')
  const [audience, setAudience] = useState('Lagos shoppers')
  const [namingStyle, setNamingStyle] = useState('minimalist')
  const [nameLength, setNameLength] = useState('compound')
  const [preferredSuffix, setPreferredSuffix] = useState('Co')
  const [picked, setPicked] = useState(0)
  const [copied, setCopied] = useState('')

  const output = useMemo(() => {
    const productClean = specificProduct.trim() || 'Wears'
    const targetClean = audience.trim() || 'Nigeria'
    const styleData = STYLE_POOLS[namingStyle] || STYLE_POOLS.minimalist
    const words = productClean.split(/\s+/)
    const productPrefix = titleCase(words[0] || 'Prime')
    const productRoot = titleCase(words[words.length - 1] || 'Brand')
    const targetGeo = titleCase(targetClean).split(' ')[0] || 'Lagos'
    const suffixStr = preferredSuffix === 'None' ? '' : ` ${preferredSuffix}`
    const pool = styleData.abstracts
    const names = [
      `${productPrefix}${suffixStr || ' Studio'}`,
      nameLength === 'short' ? `${productRoot.slice(0, 4)}ova` : `${pool[0]} ${productRoot}`,
      `The ${productRoot} ${pool[1]}`,
      `${targetGeo} ${pool[2]}`,
      `${pool[3]} ${productPrefix}`,
      `${productRoot} ${pool[4]}`,
    ].map((n) => n.trim())
    return {
      names,
      oneLiner: styleData.oneLiner(targetClean, productClean),
      bio: styleData.bio(targetClean, productClean),
      tagline: `${titleCase(productClean)}, made for ${targetClean}.`,
    }
  }, [specificProduct, audience, namingStyle, nameLength, preferredSuffix])

  const name = output.names[Math.min(picked, output.names.length - 1)]
  const slug = slugOf(name)
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }
  // Inputs change every name, so the cards re-run their entrance on each change.
  const runKey = `${specificProduct}|${audience}|${namingStyle}|${nameLength}|${preferredSuffix}`
  const field = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[14px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo('/tools/offer-name-lab')} url="/tools/offer-name-lab" />
      <Navbar />

      <section className="relative overflow-hidden pb-12 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_55%_at_30%_0%,#d5f1e1_0%,rgba(236,249,242,0.6)_45%,#fff_100%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <Reveal className="lg:pt-6">
            <Eyebrow>Free tool</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.2rem]">
              A business name that <span className="text-forest-600">sounds like you.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-600 sm:text-[17px]">
              Tell it what you sell and who buys. You get six names, a one-line description and an Instagram bio, and you can see each name on a real profile before you choose.
            </p>
            <Script className="mt-6 hidden -rotate-3 text-[26px] leading-none lg:block">Free, no sign-up</Script>
          </Reveal>

          <Reveal delay={120} className="rounded-[28px] bg-white p-5 shadow-xl shadow-forest-900/5 ring-1 ring-gray-100 sm:p-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-[13px] font-bold text-gray-800">What do you sell?</span><input value={specificProduct} onChange={(e) => setSpecificProduct(e.target.value)} placeholder="Thrift sneakers, custom cakes" className={field} /></label>
              <label className="block"><span className="text-[13px] font-bold text-gray-800">Who buys from you?</span><input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Abuja foodies, office workers" className={field} /></label>
            </div>
            <p className="mt-5 text-[13px] font-bold text-gray-800">Style</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(STYLE_POOLS).map(([id, s]) => (
                <button key={id} type="button" onClick={() => setNamingStyle(id)} aria-pressed={namingStyle === id}
                  className={`rounded-xl px-3 py-3 text-left transition ${namingStyle === id ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-gray-50 text-gray-700 ring-1 ring-gray-100 hover:bg-forest-50'}`}>
                  <span className="block text-[13.5px] font-bold">{s.label}</span>
                  <span className={`block truncate text-[11.5px] ${namingStyle === id ? 'text-white/70' : 'text-gray-400'}`}>{s.abstracts.slice(0, 3).join(', ')}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-bold text-gray-800">Name shape</p>
                <div className="mt-2 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
                  {[['compound', 'Two words'], ['short', 'One word']].map(([id, l]) => (
                    <button key={id} type="button" onClick={() => setNameLength(id)} aria-pressed={nameLength === id} className={`rounded-lg py-2 text-[13px] font-bold transition ${nameLength === id ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">Ending</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Co', 'Lab', 'Studio', 'Hub', 'None'].map((x) => (
                    <button key={x} type="button" onClick={() => setPreferredSuffix(x)} aria-pressed={preferredSuffix === x} className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${preferredSuffix === x ? 'bg-forest text-white' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-100'}`}>{x === 'None' ? 'No ending' : x}</button>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <Reveal className="rounded-[28px] bg-forest p-5 text-white sm:p-7">
              <div className="flex items-center gap-2"><Wand2 size={18} className="text-forest-100" /><p className="font-display text-[19px] font-extrabold">Your names</p><span className="ml-auto text-[12px] text-white/60">Tap one to preview it</span></div>
              <div key={runKey} className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {output.names.map((n, i) => (
                  <div key={`${n}-${i}`} className={`flex items-center gap-2 rounded-2xl p-1 pl-4 transition animate-rise ${picked === i ? 'bg-white text-forest' : 'bg-white/10 text-white hover:bg-white/15'}`} style={{ animationDelay: `${i * 70}ms` }}>
                    <button type="button" onClick={() => setPicked(i)} aria-pressed={picked === i} className="min-w-0 flex-1 truncate py-2.5 text-left font-display text-[16px] font-extrabold">{n}</button>
                    <button type="button" onClick={() => copy(n, `n${i}`)} aria-label={`Copy ${n}`} className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${picked === i ? 'bg-forest-50 text-forest-700' : 'bg-white/10 text-white/80'}`}><CopyIcon done={copied === `n${i}`} /></button>
                  </div>
                ))}
              </div>
            </Reveal>
            {[['One-line store description', output.oneLiner, 'one'], ['Instagram bio', output.bio, 'bio'], ['Tagline', output.tagline, 'tag']].map(([label, text, key]) => (
              <Reveal key={key} className="rounded-[24px] bg-white p-5 ring-1 ring-gray-100 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-forest-700">{label}</p>
                  <button type="button" onClick={() => copy(text, key)} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[12px] font-bold text-white">{copied === key ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}{copied === key ? 'Copied' : 'Copy'}</button>
                </div>
                <p className="mt-3 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-gray-900">{text}</p>
              </Reveal>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">How {name} looks</p>
            <div className="rounded-[28px] bg-gradient-to-br from-forest-50 to-white p-5 ring-1 ring-forest-100">
              <div className="mx-auto w-full max-w-[300px] rounded-[34px] bg-gray-950 p-2 shadow-xl shadow-gray-900/20">
                <div className="overflow-hidden rounded-[27px] bg-white">
                  <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-bold text-gray-800"><span>9:41</span><span className="h-3.5 w-14 rounded-full bg-gray-950" /><span className="w-6" /></div>
                  <div key={name} className="animate-rise px-4 pb-4 pt-2">
                    <p className="text-center text-[12.5px] font-bold text-gray-900">{slug || 'yourname'}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[3px]"><span className="flex h-full w-full items-center justify-center rounded-full bg-forest font-display text-[18px] font-extrabold text-white">{initialsOf(name)}</span></span>
                      <div className="grid flex-1 grid-cols-3 text-center">{[['Posts', '0'], ['Followers', '0'], ['Following', '0']].map(([l, v]) => <span key={l}><span className="block text-[13px] font-extrabold">{v}</span><span className="block text-[10px] text-gray-500">{l}</span></span>)}</div>
                    </div>
                    <p className="mt-3 text-[12.5px] font-bold text-gray-900">{name}</p>
                    <p className="whitespace-pre-line text-[11.5px] leading-snug text-gray-700">{output.bio}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-[#00376b]"><Link2 size={11} />sellapage.com.ng/{slug}</p>
                    <div className="mt-3 grid grid-cols-2 gap-1.5"><span className="rounded-lg bg-gray-100 py-1.5 text-center text-[11px] font-bold">Follow</span><span className="rounded-lg bg-gray-100 py-1.5 text-center text-[11px] font-bold">Message</span></div>
                    <div className="mt-3 flex justify-center border-t border-gray-100 pt-2 text-gray-800"><Grid3x3 size={16} /></div>
                  </div>
                  <div className="border-t border-gray-100 bg-forest-50/60 px-4 py-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-forest-700">Your Sellapage store</p>
                    <div key={`s-${name}`} className="mt-2 flex items-center gap-2.5 animate-rise">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-[11px] font-extrabold text-white">{initialsOf(name)}</span>
                      <span className="min-w-0"><span className="block truncate text-[12.5px] font-extrabold text-gray-900">{name}</span><span className="flex items-center gap-0.5 text-[10px] text-gray-500"><Star size={9} className="fill-amber-400 text-amber-400" />New store</span></span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-gray-600">{output.oneLiner}</p>
                  </div>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => navigate(user ? '/dashboard' : '/login?mode=register')} className="group mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-4 text-[14.5px] font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700">
              <Sparkles size={16} />Start a free store as {name}<ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </button>
            <p className="mt-2 text-center text-[12px] text-gray-400">Store links are first come, first served. Check yours when you sign up.</p>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  )
}
