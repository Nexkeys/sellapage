// src/ops/OpsLayout.jsx
//
// The Sellapage Ops console frame (design: Platform Pulse, 2026-10-06):
//   sidebar  workspace card (name, job title), the six groups from
//            utils/opsAccess.js (each opens to its tabs, with counts of what
//            is waiting), Utilities (Settings, Help, Log out), system status
//   top bar  search (Cmd/Ctrl+K: every tab and action), environment badge,
//            what needs attention, refresh, the person's avatar
// Phones get the same sidebar as a drawer. Only tabs the person can open are
// ever drawn.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Bell, RefreshCw, ChevronDown, Settings, HelpCircle, LogOut, Menu, X, Command, ArrowRight, Camera, Loader2, Check, CornerDownLeft,
} from 'lucide-react'
import { OPS_GROUPS } from '../utils/opsAccess'
import { TabIcon, Avatar } from './opsKit'
import { opsJson } from './opsSession'
import { uploadSingleImage } from '../firebase/products'
import CodeBoxes from './CodeBoxes'
import { RecoveryCodes } from './OpsSignIn'

const roleLine = (me) => me?.title || (me?.isSuper ? 'Super Admin' : 'Staff')

function SidebarBody({ me, tabs, activeTab, onTab, counts, onProfile, onHelp, onSignOut, system }) {
  const groups = useMemo(() => OPS_GROUPS.map((g) => ({ ...g, tabs: tabs.filter((t) => t.group === g.id) })).filter((g) => g.tabs.length), [tabs])
  const activeGroup = tabs.find((t) => t.id === activeTab)?.group
  const [open, setOpen] = useState(() => new Set([activeGroup || groups[0]?.id]))
  useEffect(() => { if (activeGroup) setOpen((s) => new Set([...s, activeGroup])) }, [activeGroup])
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <img src="/og-image.png" alt="" className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/20" />
        <span className="font-display text-[19px] font-extrabold tracking-tight text-white">Sellapage</span>
      </div>
      <button type="button" onClick={onProfile} className="mx-3 flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/[0.12]">
        <Avatar person={me} size={34} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-white">Platform Ops</span>
          <span className="block truncate text-[11.5px] text-green-100/70">{me?.name} · {roleLine(me)}</span>
        </span>
        <ChevronDown size={15} className="text-green-100/60" />
      </button>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="Console sections">
        {groups.map((g) => {
          const isOpen = open.has(g.id)
          const has = g.tabs.some((t) => t.id === activeTab)
          const waiting = g.tabs.reduce((n, t) => n + (counts[t.id] || 0), 0)
          return (
            <div key={g.id}>
              <button type="button" onClick={() => toggle(g.id)} aria-expanded={isOpen}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${has ? 'bg-white/[0.12] text-white' : 'text-green-50/80 hover:bg-white/[0.06] hover:text-white'}`}>
                <TabIcon name={g.tabs[0].icon} size={17} className={has ? 'text-green-300' : 'text-green-200/60'} />
                <span className="flex-1 text-left">{g.label}</span>
                {waiting > 0 && !isOpen && <span className="rounded-full bg-amber-400 px-1.5 text-[10.5px] font-bold text-[#023d1d]">{waiting}</span>}
                <ChevronDown size={14} className={`text-green-100/50 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <ul className="mb-1 ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {g.tabs.map((t) => {
                    const on = t.id === activeTab
                    return (
                      <li key={t.id}>
                        <button type="button" onClick={() => onTab(t.id)} aria-current={on ? 'page' : undefined}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition ${on ? 'bg-green-400/15 font-semibold text-white' : 'text-green-50/70 hover:bg-white/[0.06] hover:text-white'}`}>
                          <TabIcon name={t.icon} size={14} className={on ? 'text-green-300' : 'text-green-200/50'} />
                          <span className="flex-1 truncate">{t.label}</span>
                          {counts[t.id] > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-[10.5px] font-bold text-[#023d1d]">{counts[t.id]}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-3 pb-3 pt-3">
        <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-green-100/40">Utilities</p>
        {[[Settings, 'Settings', onProfile], [HelpCircle, 'Help & Sella', onHelp], [LogOut, 'Log out', onSignOut]].map(([Icon, label, fn]) => (
          <button key={label} type="button" onClick={fn} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-green-50/75 transition hover:bg-white/[0.06] hover:text-white"><Icon size={16} /> {label}</button>
        ))}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-black/15 px-3 py-2.5">
          <span className={`relative flex h-2.5 w-2.5 ${system.ok ? 'text-green-400' : system.ok === false ? 'text-amber-400' : 'text-slate-400'}`}>
            {system.ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
          </span>
          <span className="min-w-0"><span className="block text-[12px] font-semibold text-white">{system.ok ? 'System Online' : system.ok === false ? 'Needs a look' : 'Checking...'}</span><span className="block truncate text-[10.5px] text-green-100/60">{system.note}</span></span>
        </div>
      </div>
    </div>
  )
}

function CommandPalette({ tabs, actions, onTab, onClose }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const items = useMemo(() => {
    const all = [
      ...tabs.map((t) => ({ id: `tab:${t.id}`, label: t.label, hint: t.about, icon: t.icon, run: () => onTab(t.id) })),
      ...actions.map((a) => ({ id: `act:${a.label}`, label: a.label, hint: a.hint, icon: a.icon, run: a.run })),
    ]
    const n = q.trim().toLowerCase()
    return n ? all.filter((x) => `${x.label} ${x.hint}`.toLowerCase().includes(n)) : all
  }, [q, tabs, actions, onTab])
  const pick = (x) => { x.run(); onClose() }
  return createPortal(
    <div className="fixed inset-0 z-[135] flex items-start justify-center bg-slate-900/45 px-3 pt-[12vh] backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search the console">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-dash-line px-4">
          <Search size={18} className="text-slate-400" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0) }} placeholder="Jump to a tab or action..."
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, items.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)) }
              if (e.key === 'Enter' && items[i]) pick(items[i])
              if (e.key === 'Escape') onClose()
            }}
            className="h-14 flex-1 bg-transparent text-[15px] outline-none" />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">Esc</kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-slate-400">Nothing matches &quot;{q}&quot;.</li>}
          {items.map((x, n) => (
            <li key={x.id}>
              <button type="button" onMouseEnter={() => setI(n)} onClick={() => pick(x)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${n === i ? 'bg-forest-50' : ''}`}>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><TabIcon name={x.icon} size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold text-dash-ink">{x.label}</span><span className="block truncate text-[12px] text-slate-500">{x.hint}</span></span>
                {n === i && <CornerDownLeft size={14} className="text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}

// Recovery codes are kept only as hashes, so the old ones can never be shown
// again. This makes a fresh set (the old ones stop working), after the
// authenticator code, and shows it once (ops-auth.js recovery-codes).
function RecoverySection({ me, onSaved }) {
  const [mode, setMode] = useState('idle')
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const left = me?.recoveryLeft ?? 0
  const submit = async (v = code) => {
    if (busy || String(v).length !== 6) return
    setBusy(true)
    setError('')
    const { ok, data } = await opsJson('/api/ops-auth?action=recovery-codes', { method: 'POST', body: { code: v } })
    setBusy(false)
    if (!ok) { setError(data.message || 'That code is not right.'); setCode(''); setShake((n) => n + 1); return }
    setCodes(data.recoveryCodes)
    setMode('show')
    onSaved({ recoveryLeft: data.recoveryLeft })
  }
  if (mode === 'show' && codes) {
    return (
      <div className="mt-5 rounded-2xl p-4 ring-1 ring-dash-line">
        <RecoveryCodes codes={codes} doneLabel="Done" onDone={() => { setCodes(null); setCode(''); setMode('idle') }}
          note="These replace your old recovery codes, which no longer work. Each lets you in once if you lose your phone. You will not see them again." />
      </div>
    )
  }
  return (
    <section className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-bold text-dash-ink">Recovery codes</p>
          <p className="text-[12.5px] text-slate-500">{left} of 8 left. Each lets you in once without your phone.</p>
        </div>
        {mode === 'idle' && <button type="button" onClick={() => { setMode('confirm'); setError('') }} className="flex-shrink-0 rounded-xl bg-white px-3 py-2 text-[12.5px] font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50">Make new codes</button>}
      </div>
      <div className="mt-2.5 flex gap-1">{Array.from({ length: 8 }).map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < left ? 'bg-forest-600' : 'bg-slate-200'}`} />)}</div>
      {left <= 2 && mode === 'idle' && <p className="mt-2.5 text-[12px] font-semibold text-amber-700">Running low. Make new codes and keep them somewhere safe.</p>}
      {mode === 'confirm' && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-1">
          <p className="mb-2 text-[12.5px] text-slate-600">Old codes cannot be shown again, for your safety. Type the code from your authenticator app to make a new set. The old ones stop working.</p>
          {error && <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{error}</p>}
          <CodeBoxes key={shake} value={code} onChange={setCode} onComplete={(v) => submit(v)} disabled={busy} error={!!error} />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => submit()} disabled={busy || code.length !== 6} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest-600 py-2.5 text-[13px] font-semibold text-white hover:bg-forest disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : null} Make new codes</button>
            <button type="button" onClick={() => { setMode('idle'); setCode(''); setError('') }} className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-white">Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}

export function ProfileModal({ me, onClose, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState(me?.photoUrl || '')
  const file = useRef(null)
  const upload = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Choose a photo (JPG or PNG).'); return }
    if (f.size > 5 * 1024 * 1024) { setError('That photo is over 5MB. Choose a smaller one.'); return }
    setBusy(true)
    setError('')
    try {
      const url = await uploadSingleImage(f, 'sellapage/ops-staff')
      const { ok, data } = await opsJson('/api/ops-auth?action=profile', { method: 'POST', body: { photoUrl: url } })
      if (!ok) throw new Error(data.message)
      setPhoto(url)
      onSaved({ photoUrl: url })
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return createPortal(
    <div className="fixed inset-0 z-[135] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Your profile">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-24 bg-gradient-to-r from-[#034e22] via-[#0b6b35] to-[#16a34a]">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/10" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative">
              <Avatar person={{ ...me, photoUrl: photo }} size={92} ring />
              <button type="button" onClick={() => file.current?.click()} disabled={busy} className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-white shadow-lg ring-2 ring-white hover:bg-forest" aria-label="Change photo">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
              </button>
              <input ref={file} type="file" accept="image/*" className="hidden" onChange={upload} />
            </div>
          </div>
          <h2 className="mt-3 font-display text-xl font-extrabold text-dash-ink">{me?.name}</h2>
          <p className="text-[13px] font-medium text-forest-700">{roleLine(me)}{me?.isSuper ? ' · Super admin' : ''}</p>
          <p className="text-[12.5px] text-dash-muted">{me?.email}</p>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{error}</p>}
          <p className="mt-4 flex items-center gap-1.5 text-[12.5px] font-semibold text-forest-700"><Check size={14} /> Authenticator app is on</p>
          <RecoverySection me={me} onSaved={onSaved} />
          <p className="mt-4 text-[12px] text-slate-500">Your name and job title are set by a super admin in Team &amp; Access. Your photo shows across Ops: the sidebar, Team &amp; Access and the Activity Log.</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function OpsLayout({ me, tabs, activeTab, onTab, attention, system, onRefresh, onSignOut, onHelp, onMeChange, children }) {
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const [bell, setBell] = useState(false)
  const [menu, setMenu] = useState(false)
  const [profile, setProfile] = useState(false)
  const [spin, setSpin] = useState(false)
  const counts = useMemo(() => Object.fromEntries((attention?.items || []).map((x) => [x.tab, x.count])), [attention])
  const here = tabs.find((t) => t.id === activeTab)
  const env = /^ops\./.test(window.location.hostname) ? 'Production' : 'Preview'

  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => { setDrawer(false) }, [activeTab])

  const go = (id) => { onTab(id); setBell(false); setMenu(false) }
  const sidebar = <SidebarBody me={me} tabs={tabs} activeTab={activeTab} onTab={go} counts={counts} onProfile={() => { setDrawer(false); setProfile(true) }} onHelp={() => { setDrawer(false); onHelp() }} onSignOut={onSignOut} system={system} />
  const actions = [
    { label: 'Take Sella’s tour', hint: 'Every tab you can open, step by step', icon: 'Bot', run: onHelp },
    { label: 'Your profile', hint: 'Photo, authenticator, recovery codes', icon: 'Shield', run: () => setProfile(true) },
    { label: 'Sign out', hint: 'End this session now', icon: 'KeyRound', run: onSignOut },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7f5] font-body">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] bg-[linear-gradient(180deg,#034e22_0%,#023d1b_55%,#01290f_100%)] lg:block">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setDrawer(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-[86vw] max-w-[300px] bg-[linear-gradient(180deg,#034e22_0%,#023d1b_55%,#01290f_100%)] shadow-2xl animate-in slide-in-from-left-6 duration-200">
            <button type="button" onClick={() => setDrawer(false)} className="absolute right-3 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Close menu"><X size={18} /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-dash-line bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            <button type="button" onClick={() => setDrawer(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
            <button type="button" onClick={() => setPalette(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-dash-line bg-white px-3 text-left text-[13.5px] text-slate-400 transition hover:border-forest-200 sm:max-w-md">
              <Search size={16} className="flex-shrink-0" /> <span className="flex-1 truncate">Search anything...</span>
              <kbd className="hidden items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 sm:inline-flex"><Command size={11} />K</kbd>
            </button>
            <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 sm:inline-flex ${env === 'Production' ? 'bg-forest-50 text-forest-700 ring-forest-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${env === 'Production' ? 'bg-green-500' : 'bg-amber-500'}`} /> {env}
            </span>
            <div className="relative ml-auto">
              <button type="button" onClick={() => setBell((v) => !v)} className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100" aria-label={`Needs attention: ${attention?.total || 0}`}>
                <Bell size={19} />
                {attention?.total > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white">{attention.total > 99 ? '99+' : attention.total}</span>}
              </button>
              {bell && (
                <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="border-b border-dash-line px-4 py-3 text-[13.5px] font-bold text-dash-ink">Needs attention</p>
                  {(attention?.items || []).length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-slate-500">Nothing waiting. Lovely.</p> : (
                    <ul className="max-h-80 overflow-y-auto p-2">
                      {attention.items.map((x) => (
                        <li key={x.tab}><button type="button" onClick={() => go(x.tab)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
                          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-50 px-1.5 text-[12px] font-bold text-amber-700">{x.count}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-dash-ink">{x.title}</span><span className="block text-[11.5px] text-slate-500">{x.detail}</span></span>
                          <ArrowRight size={14} className="text-slate-300" />
                        </button></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={() => { setSpin(true); onRefresh(); setTimeout(() => setSpin(false), 900) }} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100" aria-label="Refresh"><RefreshCw size={18} className={spin ? 'animate-spin' : ''} /></button>
            <div className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-100">
                <Avatar person={me} size={34} />
                <span className="hidden text-left leading-tight md:block"><span className="block max-w-[140px] truncate text-[12.5px] font-bold uppercase tracking-wide text-dash-ink">{me?.isSuper ? 'Super Admin' : me?.name}</span><span className="block max-w-[140px] truncate text-[11px] text-slate-500">{me?.isSuper ? me?.name : roleLine(me)}</span></span>
                <ChevronDown size={14} className="hidden text-slate-400 md:block" />
              </button>
              {menu && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button type="button" onClick={() => { setProfile(true); setMenu(false) }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-dash-ink hover:bg-slate-50"><Settings size={15} /> Your profile</button>
                  <button type="button" onClick={() => { onHelp(); setMenu(false) }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-dash-ink hover:bg-slate-50"><HelpCircle size={15} /> Sella&apos;s tour</button>
                  <button type="button" onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-red-600 hover:bg-red-50"><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main key={activeTab} className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-6 sm:py-7">
          {here && (
            <div className="mb-5 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              <span className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-forest-600 shadow-sm ring-1 ring-dash-line"><TabIcon name={here.icon} size={18} /></span>
              <div className="min-w-0">
                <h1 className="font-display text-[24px] font-extrabold leading-tight tracking-tight text-dash-ink sm:text-[28px]">{here.label}</h1>
                <p className="mt-0.5 text-[13px] text-dash-muted">{here.about}</p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {palette && <CommandPalette tabs={tabs} actions={actions} onTab={go} onClose={() => setPalette(false)} />}
      {profile && <ProfileModal me={me} onClose={() => setProfile(false)} onSaved={onMeChange} />}
      {(bell || menu) && <button type="button" className="fixed inset-0 z-20 cursor-default" onClick={() => { setBell(false); setMenu(false) }} aria-label="Close menus" />}
    </div>
  )
}
