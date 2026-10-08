// src/components/dashboard/marketing/ui.jsx
//
// The pieces every Marketing section is built from (2026-10-08), so Get found,
// Free Google listings, Google Maps, Post kit and Your guarantee read as one
// product: the same cards, copy rows, step lists, notices and phone frame.
import { useState } from 'react'
import { Check, Copy, ExternalLink, AlertCircle, CheckCircle2, Lock, Info } from 'lucide-react'

export const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-forest-600 focus:ring-4 focus:ring-forest-50'

/** A white card with an optional icon, title, subtitle and right-hand slot. */
export function Panel({ icon: Icon, title, sub, right, children, className = '', tone = 'white' }) {
  const tones = {
    white: 'border-gray-100 bg-white',
    green: 'border-forest-100 bg-forest-50/60',
    dark: 'border-forest bg-forest text-white',
  }
  return (
    <section className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5 ${tones[tone]} ${className}`}>
      {(title || Icon) && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tone === 'dark' ? 'bg-white/10 text-white' : 'bg-forest-50 text-forest-600'}`}><Icon size={18} /></span>}
            <div className="min-w-0">
              <p className={`text-[14.5px] font-bold ${tone === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</p>
              {sub && <p className={`mt-0.5 text-[12.5px] leading-relaxed ${tone === 'dark' ? 'text-white/70' : 'text-gray-500'}`}>{sub}</p>}
            </div>
          </div>
          {right}
        </div>
      )}
      {children && <div className={title || Icon ? 'mt-4' : ''}>{children}</div>}
    </section>
  )
}

/** Copies text, and says so for two seconds. */
export function useCopy() {
  const [copied, setCopied] = useState('')
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }
  return [copied, copy]
}

export function CopyButton({ done, onClick, disabled, label = 'Copy' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition ${done ? 'bg-forest-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'} disabled:bg-gray-200 disabled:text-gray-400`}>
      {done ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}{done ? 'Copied' : label}
    </button>
  )
}

/** A labelled value with a copy button: a link, a description, a list. */
export function CopyRow({ label, hint, value, mono, copied, onCopy, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-[12.5px] font-bold text-gray-800">{label}</p>{hint && <p className="text-[11.5px] text-gray-400">{hint}</p>}</div>
        <CopyButton done={copied} onClick={onCopy} disabled={disabled} />
      </div>
      <p className={`mt-1.5 break-words rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 leading-relaxed text-gray-700 ${mono ? 'font-mono text-[11.5px]' : 'text-[12.5px]'}`}>{value}</p>
    </div>
  )
}

/** Numbered steps joined by a line; `done` marks how many are finished. */
export function Steps({ steps, done = 0 }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const finished = i < done
        const current = i === done
        return (
          <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className={`absolute left-[13px] top-8 bottom-0 w-[2px] ${finished ? 'bg-forest-600' : 'bg-gray-100'}`} />}
            <span className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${finished ? 'bg-forest-600 text-white' : current ? 'bg-white text-forest-700 ring-2 ring-forest-600' : 'bg-gray-100 text-gray-500'}`}>
              {finished ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13.5px] font-bold text-gray-900">{s.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">{s.body}</p>
              {s.link && (
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-forest-700 hover:underline">
                  {s.linkLabel} <ExternalLink size={12} />
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A one-line status, info, warning or error. */
export function Notice({ tone = 'info', title, children, action }) {
  const map = {
    info: ['border-sky-100 bg-sky-50', 'text-sky-600', 'text-sky-900', 'text-sky-800', Info],
    warn: ['border-amber-200 bg-amber-50', 'text-amber-600', 'text-amber-900', 'text-amber-800', AlertCircle],
    lock: ['border-amber-200 bg-amber-50', 'text-amber-600', 'text-amber-900', 'text-amber-800', Lock],
    error: ['border-red-100 bg-red-50', 'text-red-500', 'text-red-800', 'text-red-700', AlertCircle],
    ok: ['border-forest-100 bg-forest-50', 'text-forest-600', 'text-forest-900', 'text-forest-700', CheckCircle2],
  }
  const [box, icon, head, body, Icon] = map[tone] || map.info
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border p-3.5 ${box}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className={`mt-0.5 flex-shrink-0 ${icon}`} />
      <div className="min-w-0 flex-1">
        {title && <p className={`text-[13px] font-bold ${head}`}>{title}</p>}
        {children && <div className={`text-[12.5px] leading-relaxed ${body} ${title ? 'mt-0.5' : 'font-semibold'}`}>{children}</div>}
      </div>
      {action}
    </div>
  )
}

/** The same switch as Get found. */
export function Toggle({ on, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${on ? 'bg-forest-600' : 'bg-gray-200'}`}>
      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

/** A phone outline for previews of what a customer sees. */
export function PhoneFrame({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-[290px] rounded-[34px] bg-gray-950 p-2 shadow-xl shadow-gray-900/20 ${className}`}>
      <div className="relative overflow-hidden rounded-[27px] bg-white">
        <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-bold text-gray-800"><span>9:41</span><span className="h-3.5 w-14 rounded-full bg-gray-950" /><span className="w-6" /></div>
        {children}
      </div>
    </div>
  )
}

/** A short headline above a group of cards on the right-hand side. */
export function SideLabel({ children }) {
  return <p className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">{children}</p>
}
