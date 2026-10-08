// src/components/Footer.jsx
//
// The public site footer, rebuilt 2026-10-08 with the new navbar. Same groups
// as the menus (product, business types, resources, company), the app badges
// (Android live, iPhone coming soon), the newsletter, and the legal line.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ShieldCheck, Lock } from 'lucide-react'
import PlayStoreBadge, { AppStoreSoon } from './PlayStoreBadge'

const SOCIAL_LINKS = [
  {
    label: 'Facebook',
    href: 'https://web.facebook.com/profile.php?id=61590336756804',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/sellapageng/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.198-4.354-2.618-6.78-6.98-6.98-1.28-.059-1.689-.073-4.948-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@sellapage',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://ng.linkedin.com/company/sellapage',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
]

/**
 * The "Get free tips" box.
 *
 * It used to be an input and a button with no handler at all, so every address
 * typed into it was silently discarded. It now posts to /api/newsletter-subscribe
 * and the list appears in the admin panel under Newsletter.
 */
function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done
  const [error, setError] = useState('')
  // Lazy initialiser rather than useRef(Date.now()): reading the clock during
  // render is impure, and React's rules lint says so.
  const [startedAt, setStartedAt] = useState(() => Date.now())

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return

    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError('Please enter a valid email address.')
      return
    }

    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'footer', hp, elapsedMs: Date.now() - startedAt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'That did not go through. Please try again.')
        setStatus('idle')
        return
      }
      setStatus('done')
      setEmail('')
    } catch {
      setError('We could not reach Sellapage. Check your connection and try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-6" role="status">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-forest-200">You are on the list</p>
        <p className="font-display font-bold text-lg text-white leading-snug">
          Thank you. Selling tips are on the way to your inbox.
        </p>
        <button
          type="button"
          onClick={() => { setStatus('idle'); setStartedAt(Date.now()) }}
          className="mt-3 text-xs font-semibold text-white/60 transition-colors hover:text-white"
        >
          Add another email
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-6"
    >
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-forest-200">Grow your business</p>
        <p className="font-display text-lg font-bold leading-snug text-white">
          Free tips on selling, marketing and running your business
        </p>
        <p className="mt-1.5 text-[11px] text-white/50">
          No spam. Leave the list whenever you want.
        </p>
      </div>

      {/* Honeypot: off screen, out of the tab order, ignored by screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 w-full">
        <div className="flex w-full gap-2">
          <label htmlFor="footer-newsletter-email" className="sr-only">Your email address</label>
          <input
            id="footer-newsletter-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
            placeholder="Enter your email"
            aria-invalid={!!error}
            className={`min-w-0 flex-1 rounded-xl border bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-forest-200/40 ${error ? 'border-red-400/60' : 'border-white/15'}`}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-forest transition-all hover:bg-forest-50 disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending...' : 'Subscribe'}
          </button>
        </div>
        {error && <p className="mt-1.5 text-[11px] text-red-300">{error}</p>}
      </div>
    </form>
  )
}

const COLUMNS = [
  {
    title: 'Product',
    links: [
      ['Online store', '/#store'], ['Bookings', '/#bookings'], ['Payments', '/#orders'], ['Delivery', '/#delivery'],
      ['Get found on Google', '/#marketing'], ['Sella AI', '/#sella'], ['Mobile app', '/#mobile-app'], ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Business types',
    links: [
      ['Fashion', '/live-stores?cat=Fashion%20%26%20Clothing'], ['Beauty', '/live-stores?cat=Beauty%20%26%20Skincare'],
      ['Phones and gadgets', '/live-stores?cat=Gadgets%20%26%20Phones'], ['Food', '/live-stores?cat=Food%20%26%20Groceries'],
      ['Salons and services', '/live-stores?cat=Services'], ['Explore all stores', '/live-stores'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['How it works', '/#how-it-works'], ['Blog', '/blog'], ['Success stories', '/success-stories'], ['Jobs board', '/jobs'],
      ['Business name generator', '/tools/offer-name-lab'], ['Store policy generator', '/tools/policy-generator'],
    ],
  },
  {
    title: 'Compare',
    links: [
      ['vs Shopify', '/compare/vs-shopify'], ['vs WhatsApp Business', '/compare/vs-whatsapp-business'],
      ['vs Linktree', '/compare/vs-linktree'], ['vs Instagram bio', '/compare/vs-instagram-bio'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About us', '/about'], ['Investors and partners', '/partners'], ['Dropshipping', '/dropshipping'],
      ['Contact us', '/contact'], ['Report a store', '/report-store'],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-forest-900 font-body text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-forest-600/25 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-16">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src="/og-image.png" alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" />
              <span className="font-display text-[22px] font-extrabold tracking-tight">Sellapage</span>
            </Link>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
              The business management and growth platform for Nigerian businesses. Sell, get paid, deliver, keep your records and grow, from one dashboard.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PlayStoreBadge tone="light" />
              <AppStoreSoon tone="dark" />
            </div>
            <Link to="/login?mode=register" className="group mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-forest-100">
              Start free <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          <NewsletterSignup />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-display text-[14px] font-bold text-white">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, to]) => (
                  <li key={label}><Link to={to} className="text-[13.5px] text-white/60 transition-colors hover:text-white">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-6 border-t border-white/10 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[[BadgeCheck, 'CAC registered'], [ShieldCheck, 'Payments by Paystack'], [Lock, 'Data encrypted']].map(([I, label]) => (
              <Link key={label} to="/about#trust" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] font-semibold text-white/70 transition hover:text-white"><I size={13} className="text-forest-200" />{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {SOCIAL_LINKS.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`Sellapage on ${social.label}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:border-white hover:bg-white hover:text-forest">
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pb-4 text-[12.5px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Sellapage. All rights reserved.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/privacy-policy" className="transition-colors hover:text-white">Privacy policy</Link>
            <Link to="/terms" className="transition-colors hover:text-white">Terms of service</Link>
            <span>A product of <a href="https://nexkeysagency.com.ng" target="_blank" rel="noopener noreferrer" className="text-white/70 transition-colors hover:text-white">NexKeys Agency</a>, made in Lagos</span>
          </p>
        </div>
      </div>
      {/* The name, large and quiet, along the bottom edge. */}
      <p aria-hidden="true" className="pointer-events-none relative -mb-[0.22em] select-none text-center font-display text-[22vw] font-extrabold leading-none tracking-tighter text-white/[0.05] lg:text-[17rem]">Sellapage</p>
    </footer>
  )
}
