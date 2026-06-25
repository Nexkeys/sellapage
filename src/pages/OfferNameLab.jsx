//src/pages/OfferNameLab.jsx/
import { useMemo, useState } from 'react'
import { ArrowRight, Copy, Sparkles, Wand2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const STYLE_POOLS = {
  minimalist: {
    abstracts: ['Label', 'Edit', 'Basics', 'Project', 'Core', 'Pure', 'Studio'],
    oneLiner: (target, item) => `Streamlined, functional ${item} designed for ${target}.`,
    bio: (target, item) => `✨ Curated ${item} for ${target}.\n• Elevated essentials for everyday wear.\n• Tap below to check catalog and secure yours on WhatsApp. 📲`
  },
  street: {
    abstracts: ['Plug', 'Vault', 'Drip', 'Alley', 'Base', 'Crew', 'Zone'],
    oneLiner: (target, item) => `The ultimate high-speed ${item} plug serving ${target}.`,
    bio: (target, item) => `🔥 Finest premium ${item} available in ${target}.\n• High demand items. Fastest finger only.\n• Drop your order payload instantly via WhatsApp below 👇`
  },
  luxury: {
    abstracts: ['Atelier', 'Maison', 'Aura', 'Privé', 'Vellum', 'Noir', 'Couture'],
    oneLiner: (target, item) => `Exquisite, high-end ${item} tailored for discerning clients in ${target}.`,
    bio: (target, item) => `👑 Redefining ${item} for premium collections in ${target}.\n• Bespoke curation and exceptional attention to detail.\n• View open drops and order straight to WhatsApp 🔗`
  },
  modern: {
    abstracts: ['Nova', 'Apex', 'Vivid', 'Shift', 'Element', 'Hub', 'Matrix'],
    oneLiner: (target, item) => `Smart, next-gen ${item} built for modern living across ${target}.`,
    bio: (target, item) => `⚡ High-utility ${item} engineered for ${target}.\n• Premium quality meets effortless ordering.\n• Select your variations and checkout instantly via WhatsApp 🎯`
  }
}

const cleanWords = value => value.trim().split(/\s+/).filter(Boolean)

function titleCase(value) {
  return cleanWords(value)
    .map(word => `${word[0]?.toUpperCase() || ''}${word.slice(1).toLowerCase()}`)
    .join(' ')
}

export default function OfferNameLab() {
  // Core contextual states
  const [specificProduct, setSpecificProduct] = useState('crochet dresses')
  const [audience, setAudience] = useState('Lagos shoppers')
  const [namingStyle, setNamingStyle] = useState('minimalist')
  const [nameLength, setNameLength] = useState('compound') // short (blended) vs compound (two words)
  const [preferredSuffix, setPreferredSuffix] = useState('Co')

  const output = useMemo(() => {
    const productClean = specificProduct.trim() || 'Wears'
    const targetClean = audience.trim() || 'Nigeria'
    const styleData = STYLE_POOLS[namingStyle] || STYLE_POOLS.minimalist

    // 1. Algorithmic Word Root Extraction
    const words = productClean.split(/\s+/)
    const productPrefix = titleCase(words[0] || 'Prime')
    const productRoot = titleCase(words[words.length - 1] || 'Brand')
    const targetGeo = titleCase(targetClean).split(' ')[0] || 'Lagos'
    
    const suffixStr = preferredSuffix === 'None' ? '' : ` ${preferredSuffix}`
    const pool = styleData.abstracts

    // 2. Multi-Angle Name Formulation Engine
    // Each formula uses a completely non-overlapping grammatical structure
    
    // Formula A: The Streamlined Suffix
    const nameA = `${productPrefix}${suffixStr || ' Studio'}`

    // Formula B: The Neologism / Portmanteau (Blends words for short styles)
    const rootTruncated = productRoot.slice(0, 4)
    const nameB = nameLength === 'short' 
      ? `${rootTruncated}ova` 
      : `${pool[0]} ${productRoot}`

    // Formula C: The Continental Reverse Structure
    const nameC = `The ${productRoot} ${pool[1]}`

    // Formula D: The Identity-Localized Hybrid
    const nameD = `${targetGeo} ${pool[2]}`

    // Formula E: Abstract Narrative Prefix
    const nameE = `${pool[3]} ${productPrefix}`

    // Formula F: Studio Direction Title
    const nameF = `${productRoot} ${pool[4]}`

    const uniqueNames = [nameA, nameB, nameC, nameD, nameE, nameF].map(n => n.trim())

    return {
      names: uniqueNames,
      oneLiner: styleData.oneLiner(targetClean, productClean),
      bio: styleData.bio(targetClean, productClean),
      tagline: `${titleCase(productClean)} optimized seamlessly for ${targetClean}.`,
      checklist: [
        'Secure the cleanest generated name combination on your custom Sellapage URL.',
        'Drop your sharp one-line formula right inside your homepage store description.',
        'Copy-paste the structured line-break bio straight to your Instagram Profile Bio.',
        'Ensure you configure dynamic product variants (sizes/colors) before blasting links.',
      ]
    }
  }, [specificProduct, audience, namingStyle, nameLength, preferredSuffix])

  const copy = text => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen bg-[#fffaf2] text-gray-950">
      <Navbar />
      <main className="pt-10">
        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-700">
                <Sparkles size={13} /> High-Conversion Studio
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 md:text-5xl">
                Engineer a distinctive brand silhouette in seconds.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
                Stop using generic templates. Input your exact product specifications and let our engine map out non-repetitive, premium branding layouts.
              </p>
            </div>

            {/* Input Configuration Grid Control Panel */}
            <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-xl shadow-orange-100/70 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">What specific item/service do you sell?</span>
                  <input 
                    value={specificProduct} 
                    onChange={e => setSpecificProduct(e.target.value)} 
                    placeholder="e.g., thrift sneakers, custom cakes"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" 
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Who is your target audience?</span>
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
                  <span className="text-xs font-bold text-gray-700">Brand Vibe/Style</span>
                  <select value={namingStyle} onChange={e => setNamingStyle(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="minimalist">Minimalist</option>
                    <option value="street">Street / Direct</option>
                    <option value="luxury">Luxury / Premium</option>
                    <option value="modern">Modern Tech</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Name Length Format</span>
                  <select value={nameLength} onChange={e => setNameLength(e.target.value)} className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">
                    <option value="compound">Compound (Two words)</option>
                    <option value="short">Short (Blended words)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">Preferred Suffix</span>
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

        {/* Output Section Layout Grid */}
        <section className="px-4 pb-16">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            <div className="rounded-[26px] bg-gray-950 p-6 text-white shadow-xl shadow-gray-300/70 lg:col-span-1">
              <Wand2 className="mb-4 text-orange-300" />
              <h2 className="font-display text-xl font-extrabold">Distinct Brand Names</h2>
              <p className="text-xs text-gray-400 mt-1 mb-4">Click any option below to copy.</p>
              <div className="mt-3 grid gap-2">
                {output.names.map(name => (
                  <button key={name} onClick={() => copy(name)} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-bold hover:bg-white/15 transitional-all active:scale-95">
                    {name}
                    <Copy size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5 lg:col-span-2">
              {[
                ['One-line Conversion Hook', output.oneLiner],
                ['Instagram / WhatsApp Bullet Bio', output.bio],
                ['Brand Tagline', output.tagline],
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
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Execution Plan</p>
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