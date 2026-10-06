// src/ops/OpsShell.jsx
//
// The frame around the Ops sign-in, invite and lost-authenticator screens.
// A dark "restricted area" panel on desktop (a dark band on phones) and the
// form card. Nothing here markets anything: it says who may enter and how the
// door is guarded.
import { ShieldCheck, KeyRound, TimerReset, ScrollText, Lock } from 'lucide-react'

const POINTS = [
  { icon: KeyRound, t: 'Password and authenticator', s: 'Every sign-in needs both. Codes from SMS are never used.' },
  { icon: TimerReset, t: 'Sessions end on their own', s: 'After 30 minutes without activity, or 12 hours at most.' },
  { icon: ScrollText, t: 'Everything is recorded', s: 'Each action is logged with your name, the time and your device.' },
]

export function OpsBrand({ dark = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/og-image.png" alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-black/10" />
      <span className="leading-tight">
        <span className={`block font-display text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-dash-ink'}`}>Sellapage Ops</span>
        <span className={`block text-[11px] font-medium ${dark ? 'text-green-200/80' : 'text-forest-600/80'}`}>Staff console</span>
      </span>
    </span>
  )
}

export default function OpsShell({ children }) {
  return (
    <div className="min-h-screen bg-[#f3f6f4] font-body lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#0b6b35_0%,#034e22_45%,#012512_100%)] p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative"><OpsBrand dark /></div>
        <div className="relative mt-auto max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green-100 ring-1 ring-white/15"><Lock size={12} /> Restricted area</span>
          <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[1.05] tracking-tight">Authorised Sellapage staff only.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-green-100/85">This console runs the whole platform: merchants, money and messages. The door is guarded accordingly.</p>
          <ul className="mt-8 space-y-5">
            {POINTS.map((x) => (
              <li key={x.t} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-green-200 ring-1 ring-white/15"><x.icon size={18} /></span>
                <span><span className="block text-[14px] font-semibold">{x.t}</span><span className="block text-[12.5px] text-green-100/75">{x.s}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-[12px] text-green-100/60">Not staff? <a href="https://sellapage.com.ng" className="font-semibold text-white hover:underline">Go to sellapage.com.ng</a></p>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="bg-[#034e22] px-5 py-4 lg:hidden"><OpsBrand dark /></div>
        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:px-8">
          <div className="w-full max-w-[460px]">
            <div className="rounded-[26px] border border-white bg-white p-6 shadow-[0_24px_60px_-28px_rgba(3,78,34,0.35)] sm:p-8">{children}</div>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[12px] text-slate-500"><ShieldCheck size={14} className="text-forest-600" /> Sign-ins and actions here are recorded.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
