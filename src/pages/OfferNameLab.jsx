//src/pages/OfferNameLab.jsx/
import { useMemo, useState } from 'react'
import { ArrowRight, Copy, Sparkles, Wand2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'

const STYLE_POOLS = {
  minimalist: {
    abstracts: ['Label', 'Edit', 'Basics', 'Project', 'Core', 'Pure', 'Studio'],
    oneLiner: (target, item) => `Clean, well made ${item} for ${target}.`,
    bio: (target, item) => `${item} for ${target}.\n• Simple pieces you will actually wear.\n• Tap the link to see what is in stock and order on WhatsApp.`
  },
  street: {
    abstracts: ['Plug', 'Vault', 'Drip', 'Alley', 'Base', 'Crew', 'Zone'],
    oneLiner: (target, item) => `Your ${item} plug in ${target}. Fast.`,
    bio: (target, item) => `🔥 ${item} in ${target}.\n• Stock moves fast. Fastest finger only.\n• Tap below and order on WhatsApp 👇`
  },
  luxury: {
    abstracts: ['Atelier', 'Maison', 'Aura', 'Privé', 'Vellum', 'Noir', 'Couture'],
    oneLiner: (target, item) => `Quiet, high end ${item} for a small list of clients in ${target}.`,
    bio: (target, item) => `${item} for ${target}.\n• Made to order, finished by hand.\n• See what is open now and order on WhatsApp.`
  },
  modern: {
    abstracts: ['Nova', 'Apex', 'Vivid', 'Shift', 'Element', 'Hub', 'Matrix'],
    oneLiner: (target, item) => `${item} that just works, for ${target}.`,
    bio: (target, item) => `⚡ ${item} for ${target}.\n• Good build, easy ordering.\n• Pick your size or colour and check out on WhatsApp.`
  }
}

const cleanWords = value => value.trim().split(/\s+/).filter(Boolean)

function titleCase(value) {
  return cleanWords(value)
    .map(word => `${word[0]?.toUpperCase() || ''}${word.slice(1).toLowerCase()}`)
    .join(' ')
}

export default function OfferNameLab() {
  // Inputs
  const [specificProduct, setSpecificProduct] = useState('crochet dresses')
  const [audience, setAudience] = useState('Lagos shoppers')
  const [namingStyle, setNamingStyle] = useState('minimalist')
  const [nameLength, setNameLength] = useState('compound') // short (blended) vs compound (two words)
  const [preferredSuffix, setPreferredSuffix] = useState('Co')

  const output = useMemo(() => {
    const productClean = specificProduct.trim() || 'Wears'
    const targetClean = audience.trim() || 'Nigeria'
    const styleData = STYLE_POOLS[namingStyle] || STYLE_POOLS.minimalist

    // 1. Pull the useful words out of what they typed
    const words = productClean.split(/\s+/)
    const productPrefix = titleCase(words[0] || 'Prime')
    const productRoot = titleCase(words[words.length - 1] || 'Brand')
    const targetGeo = titleCase(targetClean).split(' ')[0] || 'Lagos'
    
    const suffixStr = preferredSuffix === 'None' ? '' : ` ${preferredSuffix}`
    const pool = styleData.abstracts

    // 2. Six name formulas, each with a different shape so they do not repeat
    
    // A: name + suffix
    const nameA = `${productPrefix}${suffixStr || ' Studio'}`

    // B: blended word, or abstract + product
    const rootTruncated = productRoot.slice(0, 4)
    const nameB = nameLength === 'short' 
      ? `${rootTruncated}ova` 
      : `${pool[0]} ${productRoot}`

    // C: "The <product> <abstract>"
    const nameC = `The ${productRoot} ${pool[1]}`

    // D: place + abstract
    const nameD = `${targetGeo} ${pool[2]}`

    // E: abstract + product
    const nameE = `${pool[3]} ${productPrefix}`

    // F: product + abstract
    const nameF = `${productRoot} ${pool[4]}`

    const uniqueNames = [nameA, nameB, nameC, nameD, nameE, nameF].map(n => n.trim())

    return {
      names: uniqueNames,
      oneLiner: styleData.oneLiner(targetClean, productClean),
      bio: styleData.bio(targetClean, productClean),
      tagline: `${titleCase(productClean)}, made for ${targetClean}.`,
      checklist: [
        'Pick the name you like best and claim it as your Sellapage link.',
        'Put the one-liner in your store description.',
        'Paste the bio into your Instagram profile.',
        'Add your sizes and colours before you share the link anywhere.',
      ]
    }
  }, [specificProduct, audience, namingStyle, nameLength, preferredSuffix])

  const copy = text => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen bg-[#fffaf2] text-gray-950">
      <SEO {...pageSeo("/tools/offer-name-lab")} url="/tools/offer-name-lab" />
      <Navbar />
      <main className="pt-10">
        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-700">
                <Sparkles size={13} /> Free tool
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                Find a store name that does not sound like everyone else.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                Tell it what you sell and who buys from you. You get name options, a one-line description for your store, and a bio you can paste straight into Instagram.
              </p>
            </div>

            {/* Controls */}
            <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/70 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">What do you sell?</span>
                  <input 
                    value={specificProduct} 
                    onChange={e => setSpecificProduct(e.target.value)} 
                    placeholder="e.g., thrift sneakers, custom cakes"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" 
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Who buys from you?</span>
                  <input 
                    value={audience} 
                    onChange={e => setAudience(e.target.value)} 
                    placeholder="e.g., corporate workers, Abuja foodies"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" 
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Style</span>
                  <select value={namingStyle} onChange={e => setNamingStyle(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="minimalist">Minimalist</option>
                    <option value="street">Street</option>
                    <option value="luxury">Luxury</option>
                    <option value="modern">Modern</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Name format</span>
                  <select value={nameLength} onChange={e => setNameLength(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="compound">Two words</option>
                    <option value="short">One blended word</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Ending</span>
                  <select value={preferredSuffix} onChange={e => setPreferredSuffix(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="Co">Co</option>
                    <option value="Lab">Lab</option>
                    <option value="Studio">Studio</option>
                    <option value="Hub">Hub</option>
                    <option value="None">No Suffix</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Output */}
        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            <Reveal direction="left" className="rounded-[26px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-300/70 lg:col-span-1">
              <Wand2 className="mb-4 text-orange-300" />
              <h2 className="font-display text-xl font-extrabold">Name options</h2>
              <p className="text-xs text-gray-400 mt-1 mb-4">Click any option below to copy.</p>
              <div className="mt-3 grid gap-2">
                {output.names.map(name => (
                  <button key={name} onClick={() => copy(name)} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-bold hover:bg-white/15 transition-all active:scale-95">
                    {name}
                    <Copy size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal direction="right" delay={150} className="space-y-5 lg:col-span-2">
              {[
                ['One-line store description', output.oneLiner],
                ['Instagram bio', output.bio],
                ['Tagline', output.tagline],
              ].map(([label, text]) => (
                <div key={label} className="rounded-[26px] border border-orange-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{label}</p>
                    <button onClick={() => copy(text)} className="rounded-full bg-orange-50 p-2 text-orange-600 hover:bg-orange-100" aria-label={`Copy ${label}`}>
                      <Copy size={15} />
                    </button>
                  </div>
                  <pre className="mt-3 text-base font-bold whitespace-pre-wrap font-sans leading-relaxed text-gray-900">{text}</pre>
                </div>
              ))}
              <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">What to do next</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {output.checklist.map(item => (
                    <div key={item} className="flex gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                      <ArrowRight size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}