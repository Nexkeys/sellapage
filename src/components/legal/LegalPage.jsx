// src/components/legal/LegalPage.jsx
//
// The layout both legal pages share (2026-10-08): Privacy Policy and Terms of
// Service. The WORDING lives in each page and is not changed here; this only
// decides how it reads:
//   - a reading progress bar under the navbar
//   - a contents list that follows you (beside the text on a laptop, a row of
//     chips on a phone) and highlights the section on screen
//   - numbered sections, print or save as PDF, and a link to the other policy
//
// items: [{ id, title, content: string[] } | { id, title, node, tone }]
// Section ids are stable anchors (/terms#supplier-agreement is linked from the
// marketplace accept box and emails), so never derive them from position.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Printer, Mail, ShieldCheck, FileText, ChevronRight } from 'lucide-react'
import Navbar from '../Navbar'
import Footer from '../Footer'
import SEO from '../SEO'
import { pageSeo } from '../../data/seoPages'
import { Eyebrow } from '../marketing/kit'

function useReadingProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight
        setP(h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])
  return p
}

/** Which section is on screen: the last one whose top has passed 30% of the viewport. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.3
        let current = ids[0]
        for (const id of ids) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= line) current = id
        }
        setActive(current)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on) }
  }, [ids])
  return active
}

export default function LegalPage({ path, kind, title, lastUpdated, intro, items, sibling }) {
  const progress = useReadingProgress()
  // A stable list for the scroll listener, rebuilt only if the sections change.
  const idKey = items.map((i) => i.id).join('|')
  const ids = useMemo(() => idKey.split('|'), [idKey])
  const active = useActiveSection(ids)
  const chipsRef = useRef(null)

  // Keep the active chip in view on phones (the row only, never the page).
  useEffect(() => {
    const row = chipsRef.current
    const chip = row?.querySelector(`[data-id="${active}"]`)
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' })
  }, [active])

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const Icon = kind === 'privacy' ? ShieldCheck : FileText

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-body text-gray-900">
      <SEO {...pageSeo(path)} url={path} />
      <Navbar />
      <div className="fixed inset-x-0 top-16 z-40 h-[3px] bg-transparent print:hidden" aria-hidden="true">
        <div className="h-full origin-left bg-forest-600 transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-10 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_20%_0%,#d5f1e1_0%,rgba(236,249,242,0.5)_45%,#fff_100%)]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-[12.5px] text-gray-500 print:hidden">
            <Link to="/" className="hover:text-gray-800">Home</Link><ChevronRight size={13} className="text-gray-300" /><span>Legal</span><ChevronRight size={13} className="text-gray-300" /><span className="font-semibold text-gray-800">{title}</span>
          </nav>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-white shadow-lg shadow-forest/20"><Icon size={22} /></span><Eyebrow>Legal</Eyebrow></span>
              <h1 className="mt-5 font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-gray-950 sm:text-[3.2rem]">{title}</h1>
              <p className="mt-4 text-[15.5px] leading-relaxed text-gray-600 sm:text-[16.5px]">{intro}</p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 print:hidden">
              <span className="rounded-full bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-600 ring-1 ring-gray-200">Last updated {lastUpdated}</span>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-bold text-forest-700 ring-1 ring-forest-200 transition hover:bg-forest-50"><Printer size={14} />Print or save as PDF</button>
            </div>
          </div>
          <p className="mt-6 hidden text-[13px] text-gray-500 print:block">Last updated {lastUpdated}. sellapage.com.ng{path}</p>
        </div>
      </section>

      {/* ── Contents on phones: a row of chips that stays under the navbar ─ */}
      <div className="sticky top-16 z-30 border-y border-gray-100 bg-white/95 backdrop-blur lg:hidden print:hidden">
        <div ref={chipsRef} className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-6">
          {items.map((it, i) => (
            <button key={it.id} data-id={it.id} type="button" onClick={() => go(it.id)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${active === it.id ? 'bg-forest text-white' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-100'}`}>
              {i + 1}. {it.title}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        {/* ── Contents on a laptop ──────────────────────────────────────── */}
        <aside className="hidden lg:block print:hidden">
          <nav aria-label="Contents" className="sticky top-24">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">On this page</p>
            <ol className="relative space-y-0.5 border-l-2 border-gray-100">
              {items.map((it, i) => (
                <li key={it.id}>
                  <button type="button" onClick={() => go(it.id)}
                    className={`-ml-[2px] flex w-full items-start gap-2 border-l-2 py-1.5 pl-4 text-left text-[13.5px] leading-snug transition ${active === it.id ? 'border-forest-600 font-bold text-forest-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                    <span className="w-5 flex-shrink-0 tabular-nums text-gray-400">{i + 1}</span>{it.title}
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-2xl bg-forest-50 p-4 ring-1 ring-forest-100">
              <p className="text-[13px] font-bold text-gray-900">Questions?</p>
              <p className="mt-1 text-[12.5px] leading-snug text-gray-600">Real people answer, by email or WhatsApp.</p>
              <Link to="/contact" className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-forest-700">Contact us <ArrowRight size={14} /></Link>
            </div>
          </nav>
        </aside>

        {/* ── The text ───────────────────────────────────────────────────── */}
        <article className="min-w-0 space-y-5">
          {items.map((it, i) => (
            <section key={it.id} id={it.id} className={`scroll-mt-32 rounded-[24px] p-5 sm:p-7 lg:scroll-mt-24 ${it.tone === 'green' ? 'bg-forest-50/70 ring-1 ring-forest-100' : 'bg-white ring-1 ring-gray-100'} print:break-inside-avoid print:rounded-none print:p-0 print:ring-0`}>
              <h2 className="flex items-start gap-3 font-display text-[1.25rem] font-extrabold leading-tight text-gray-950 sm:text-[1.4rem]">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-[13px] font-extrabold tabular-nums text-forest-700 ring-1 ring-forest-100">{i + 1}</span>
                <span className="pt-0.5">{it.title}</span>
              </h2>
              <div className="mt-4 sm:pl-11">
                {it.content ? (
                  <ul className="space-y-3">
                    {it.content.map((point, j) => (
                      <li key={j} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-gray-700">
                        <span className="mt-[0.6rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-forest-600" />{point}
                      </li>
                    ))}
                  </ul>
                ) : it.node}
              </div>
            </section>
          ))}

          <section className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 print:hidden">
            <Link to={sibling.to} className="group flex items-center gap-4 rounded-[24px] bg-white p-5 ring-1 ring-gray-100 transition hover:ring-forest-200">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">{kind === 'privacy' ? <FileText size={20} /> : <ShieldCheck size={20} />}</span>
              <span className="flex-1"><span className="block text-[12px] font-semibold text-gray-500">Also read</span><span className="block text-[15px] font-bold text-gray-900">{sibling.label}</span></span>
              <ArrowRight size={17} className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-forest-600" />
            </Link>
            <Link to="/contact" className="group flex items-center gap-4 rounded-[24px] bg-forest p-5 text-white transition hover:bg-forest-700">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10"><Mail size={20} /></span>
              <span className="flex-1"><span className="block text-[12px] font-semibold text-forest-100">Something unclear?</span><span className="block text-[15px] font-bold">Talk to us</span></span>
              <ArrowRight size={17} className="text-white/60 transition group-hover:translate-x-1" />
            </Link>
          </section>
        </article>
      </div>

      <div className="print:hidden"><Footer /></div>
    </div>
  )
}
