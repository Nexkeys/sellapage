import { useMemo, useState } from 'react'
import { ArrowRight, Copy, Sparkles, Wand2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const BUSINESS_TYPES = {
  fashion: {
    label: 'Fashion & beauty',
    nouns: ['Style', 'Closet', 'Glow', 'Luxe', 'Threads', 'Studio'],
    angles: ['premium everyday looks', 'ready-to-wear pieces', 'beauty appointments', 'occasion styling'],
  },
  food: {
    label: 'Food & drinks',
    nouns: ['Kitchen', 'Bites', 'Crave', 'Bowl', 'Tastes', 'Table'],
    angles: ['fresh meals', 'party trays', 'office lunch packs', 'weekend treats'],
  },
  gadgets: {
    label: 'Gadgets & electronics',
    nouns: ['Tech', 'Plug', 'Hub', 'Gear', 'Market', 'Zone'],
    angles: ['tested gadgets', 'phone accessories', 'home electronics', 'fast replacements'],
  },
  services: {
    label: 'Services & bookings',
    nouns: ['Studio', 'Desk', 'Works', 'Care', 'Pro', 'Suite'],
    angles: ['bookable services', 'expert support', 'home service visits', 'consultation packages'],
  },
  home: {
    label: 'Home & lifestyle',
    nouns: ['Home', 'Nest', 'Living', 'Decor', 'Essentials', 'House'],
    angles: ['home essentials', 'decor pieces', 'gift-ready items', 'everyday lifestyle picks'],
  },
}

const cleanWords = value => value.trim().split(/\s+/).filter(Boolean)

function titleCase(value) {
  return cleanWords(value)
    .map(word => `${word[0]?.toUpperCase() || ''}${word.slice(1).toLowerCase()}`)
    .join(' ')
}

export default function OfferNameLab() {
  const [businessType, setBusinessType] = useState('fashion')
  const [audience, setAudience] = useState('Lagos customers')
  const [coreOffer, setCoreOffer] = useState('affordable ready-to-wear outfits')
  const [tone, setTone] = useState('warm')

  const output = useMemo(() => {
    const type = BUSINESS_TYPES[businessType]
    const offer = coreOffer.trim() || type.angles[0]
    const target = audience.trim() || 'Nigerian customers'
    const seed = titleCase(offer).split(' ')[0] || 'Prime'
    const names = type.nouns.slice(0, 6).map((noun, index) => {
      const prefix = index % 2 === 0 ? seed : titleCase(target).split(' ')[0]
      return `${prefix} ${noun}`
    })
    const toneLine = tone === 'bold'
      ? 'clear, confident, and direct'
      : tone === 'premium'
      ? 'polished, credible, and refined'
      : 'friendly, helpful, and easy to trust'

    return {
      names,
      oneLiner: `We help ${target} get ${offer} with a ${toneLine} buying experience.`,
      bio: `${titleCase(offer)} for ${target}. Browse offers, send a clear order, and get a fast response on WhatsApp.`,
      tagline: `${titleCase(offer)} made simple for ${target}.`,
      checklist: [
        'Use the clearest name on your Sellapage URL.',
        'Put the one-line offer in your page description.',
        'Use the bio text in your WhatsApp or Instagram profile.',
        'Add at least 5 listings before sharing your link widely.',
      ],
    }
  }, [audience, businessType, coreOffer, tone])

  const copy = text => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen bg-[#fffaf2] text-gray-950">
      <Navbar />
      <main className="pt-10">
        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-700">
                <Sparkles size={13} /> Starter tool
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                Shape your offer before customers land on your page.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                Generate business name ideas, a sharp one-line offer, and profile-ready copy from the kind of business you run.
              </p>
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-white p-5 shadow-xl shadow-orange-100/70">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Business type</span>
                  <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    {Object.entries(BUSINESS_TYPES).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Tone</span>
                  <select value={tone} onChange={e => setTone(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="warm">Warm and friendly</option>
                    <option value="bold">Bold and direct</option>
                    <option value="premium">Premium and polished</option>
                  </select>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-bold text-gray-700">Who do you sell to?</span>
                <input value={audience} onChange={e => setAudience(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-bold text-gray-700">What is your main offer?</span>
                <input value={coreOffer} onChange={e => setCoreOffer(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </label>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            <div className="rounded-[26px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-300/70 lg:col-span-1">
              <Wand2 className="mb-4 text-orange-300" />
              <h2 className="font-display text-xl font-extrabold">Name ideas</h2>
              <div className="mt-5 grid gap-2">
                {output.names.map(name => (
                  <button key={name} onClick={() => copy(name)} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-bold hover:bg-white/15">
                    {name}
                    <Copy size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5 lg:col-span-2">
              {[
                ['One-line offer', output.oneLiner],
                ['Profile bio', output.bio],
                ['Tagline', output.tagline],
              ].map(([label, text]) => (
                <div key={label} className="rounded-[26px] border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{label}</p>
                    <button onClick={() => copy(text)} className="rounded-full bg-orange-50 p-2 text-orange-600 hover:bg-orange-100" aria-label={`Copy ${label}`}>
                      <Copy size={15} />
                    </button>
                  </div>
                  <p className="mt-3 text-lg font-bold leading-relaxed text-gray-900">{text}</p>
                </div>
              ))}
              <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Next steps</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {output.checklist.map(item => (
                    <div key={item} className="flex gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                      <ArrowRight size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
