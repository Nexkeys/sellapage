// src/ops/PlatformPulse.jsx
//
// Platform Pulse, the console's home (design, 2026-10-06). Everything shown is
// measured, nothing is decoration:
//   health score  services up (Firebase, Cloudinary, Vercel, AI engine), the
//                 Termii wallet, today's Firestore reads, the latest deploy
//   signals       the same, at a glance
//   ecosystem     stores, paying, premium, products (ops-insights pulse)
//   attention     what is waiting for a person, only in tabs you can open
//   metrics       sign-ups and active merchants, 7 days, 30 days or all time
//   activity      new merchants and the team's latest changes
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowRight, Check, Cloud, Cpu, Database, Globe, Server, Store, Users, Star, Package, TrendingUp, UserCog,
  MessageSquare, Link2, FileCheck, Sparkles, ChevronRight, Rocket,
} from 'lucide-react'
import { Card, Ring, Sparkline, Shimmer, useOpsData, compact, naira } from './opsKit'

function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target == null) return
    const start = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return target == null ? null : v
}

function Count({ value, format = compact }) {
  const v = useCountUp(value)
  return <>{v == null ? '-' : format(v)}</>
}

const ago = (t) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

function healthScore({ health, termii, usage, attention }) {
  const parts = []
  const svc = (ok, label) => parts.push({ label, ok, pts: ok ? 15 : 0, of: 15 })
  svc(!!health?.platform, 'Firebase')
  svc(!!health?.cloudinary, 'Cloudinary')
  svc(!!health?.vercel, 'Vercel')
  svc(!!health?.ai, 'AI engine')
  const tOk = termii?.success && termii?.configured
  parts.push({ label: 'Termii SMS wallet', ok: tOk && !termii.lowBalance, pts: tOk ? (termii.lowBalance ? 7 : 15) : 0, of: 15 })
  // Only when the number exists. On the free (Spark) plan Google does not
  // give it to apps at all, and someone without the Usage tab cannot ask, so
  // a missing reading is left out of the score rather than counted against it.
  const reads = usage?.reads?.percent
  if (reads != null) parts.push({ label: 'Firestore reads today', ok: reads < 70, pts: reads < 70 ? 15 : reads < 90 ? 8 : 0, of: 15 })
  const dep = health?.vercel?.recentDeployments?.[0]?.state
  parts.push({ label: 'Latest deploy', ok: !dep || dep === 'READY', pts: !dep || dep === 'READY' ? 10 : 4, of: 10 })
  const of = parts.reduce((n, p) => n + p.of, 0) || 1
  const score = Math.round((100 * parts.reduce((n, p) => n + p.pts, 0)) / of)
  const issues = parts.filter((p) => !p.ok)
  void attention
  return { score, parts, issues }
}

export default function PlatformPulse({ attention, onTab, can, refreshKey }) {
  const health = useOpsData(`/api/admin-health?action=health&r=${refreshKey}`)
  const termii = useOpsData(`/api/admin-termii?r=${refreshKey}`)
  // Firestore usage is its own tab: asking without it would be refused and
  // read as "your access changed".
  const usage = useOpsData(`/api/admin-firestore-usage?r=${refreshKey}`, { enabled: can('usage') })
  const pulse = useOpsData(`/api/ops-insights?action=pulse&r=${refreshKey}`)
  const [range, setRange] = useState('30')

  // Health refreshes itself every 60 seconds while the page is open.
  const reloadHealth = health.reload
  useEffect(() => { const t = setInterval(reloadHealth, 60000); return () => clearInterval(t) }, [reloadHealth])

  const h = health.data
  const { score, parts, issues } = useMemo(() => healthScore({ health: h, termii: termii.data, usage: usage.data, attention }), [h, termii.data, usage.data, attention])
  const loadingCore = health.loading && !h
  const tone = score >= 90 ? { c: '#0b6b35', label: 'Healthy', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100' } : score >= 70 ? { c: '#d97706', label: 'Worth a look', chip: 'bg-amber-50 text-amber-700 ring-amber-100' } : { c: '#dc2626', label: 'Needs attention', chip: 'bg-red-50 text-red-700 ring-red-100' }
  const t = pulse.data?.totals
  const series = pulse.data?.series
  const slice = (arr) => (range === '7' ? (arr || []).slice(-7) : arr || [])
  const sum = (arr) => slice(arr).reduce((n, x) => n + x.n, 0)
  const termiiLow = termii.data?.success && termii.data?.configured && termii.data?.lowBalance
  const cloud = h?.cloudinary
  const vercel = h?.vercel
  const att = attention?.items || []
  const domainsWaiting = att.find((x) => x.tab === 'domains')?.count || 0
  const cacWaiting = att.find((x) => x.tab === 'cac')?.count || 0

  const signals = [
    { label: 'Firebase', ok: !!h?.platform, text: h?.platform ? 'Online' : 'Error' },
    { label: 'Cloudinary', ok: !!cloud, text: cloud ? 'Online' : 'Error' },
    { label: 'Vercel', ok: !!vercel, text: vercel ? (vercel.status || 'Deployed') : 'Error' },
    { label: 'AI Description Engine', ok: !!h?.ai, text: h?.ai ? 'Online' : 'Error' },
    { label: 'SMS (Termii)', ok: !!termii.data?.success && !termiiLow, warn: termiiLow, text: !termii.data ? 'Checking' : !termii.data.success ? 'Unreachable' : !termii.data.configured ? 'Not set up' : termiiLow ? 'Wallet low' : 'Funded' },
    { label: 'Custom Domains', ok: domainsWaiting === 0, warn: domainsWaiting > 0, text: domainsWaiting ? `${domainsWaiting} pending` : 'Active' },
    { label: 'CAC', ok: cacWaiting === 0, warn: cacWaiting > 0, text: cacWaiting ? `${cacWaiting} to review` : 'Verified' },
  ]

  return (
    <div className="space-y-5">
      {/* health + alert */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="bg-gradient-to-br from-white to-[#f1faf4]">
          {loadingCore ? <Shimmer className="h-24" /> : (
            <div className="group flex items-center gap-5">
              <Ring value={score} size={104} color={tone.c}><span className="font-display text-[24px] font-extrabold text-dash-ink">{score}%</span></Ring>
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-dash-ink">Platform Health</p>
                <p className="mt-0.5 text-[13px] text-dash-muted">{issues.length ? `${issues.length} thing${issues.length === 1 ? '' : 's'} to look at: ${issues.map((i) => i.label).join(', ')}` : 'All core systems operating normally'}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${tone.chip}`}><span className="h-1.5 w-1.5 rounded-full bg-current" /> {tone.label}</span>
                <ul className="mt-2 hidden flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 group-hover:flex">
                  {parts.map((p) => <li key={p.label}>{p.label} {p.pts}/{p.of}</li>)}
                </ul>
              </div>
            </div>
          )}
        </Card>
        {termiiLow ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-[#fff8e6] p-5 sm:flex-row sm:items-center">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"><AlertTriangle size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-dash-ink">Termii SMS wallet is below {termii.data.currency || 'NGN'} {Number(termii.data.lowBalanceThreshold || 0).toLocaleString()}</p>
              <p className="text-[13px] text-slate-600">Balance {termii.data.currency || 'NGN'} {Number(termii.data.balance || 0).toLocaleString()}. Top up before sign-up codes stop going out.</p>
            </div>
            {can('sms') && <button type="button" onClick={() => onTab('sms')} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-dash-ink ring-1 ring-amber-200 hover:bg-amber-50">View Messaging <ChevronRight size={14} /></button>}
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-3xl border border-forest-100 bg-gradient-to-r from-forest-50 to-white p-5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-600 text-white"><Check size={20} strokeWidth={3} /></span>
            <div>
              <p className="text-[15px] font-bold text-dash-ink">{att.length ? `${attention.total} item${attention.total === 1 ? '' : 's'} waiting for a person` : 'Nothing urgent right now'}</p>
              <p className="text-[13px] text-slate-600">{att.length ? 'They are listed under Needs Attention below.' : 'Systems are up and every queue you can see is empty.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* key signals */}
      <Card title="Key Platform Signals" right={<span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span> Live</span>}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {signals.map((s) => (
            <li key={s.label} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${s.warn ? 'bg-amber-500' : s.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="min-w-0"><span className="block truncate text-[12.5px] font-semibold text-dash-ink">{s.label}</span><span className={`block text-[11.5px] ${s.warn ? 'text-amber-600' : s.ok ? 'text-emerald-600' : 'text-red-600'}`}>{s.text}</span></span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* services */}
        <Card title="System Services & Infrastructure" sub="Core platform services and their real-time status.">
          <div className="grid grid-cols-2 gap-2.5">
            {[[Database, 'Firebase', 'Core database', !!h?.platform], [Cloud, 'Cloudinary', 'Images', !!cloud], [Server, 'Vercel', 'Deployment', !!vercel], [Sparkles, 'AI Description Engine', 'Vendor descriptions', !!h?.ai]].map(([Icon, name, sub, ok]) => (
              <button key={name} type="button" onClick={() => name.startsWith('AI') && can('ai-describe') && onTab('ai-describe')} className="flex items-start gap-2.5 rounded-2xl border border-dash-line p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-forest-600"><Icon size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold leading-tight text-dash-ink">{name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-dash-muted">{sub}</span>
                  <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : loadingCore ? 'bg-slate-100 text-slate-400' : 'bg-red-50 text-red-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : loadingCore ? 'bg-slate-300' : 'bg-red-500'}`} />{ok ? 'Online' : loadingCore ? 'Checking' : 'Error'}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mb-2 mt-5 text-[13px] font-semibold text-dash-ink">Service Details</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="rounded-2xl border border-dash-line p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-dash-ink"><Cloud size={14} className="text-forest-600" /> Cloud Storage</p>
              {cloud ? [['Storage', cloud.storagePercent, `${cloud.storageUsedGB.toFixed(2)}/${cloud.storageLimitGB.toFixed(0)} GB`], ['Bandwidth', cloud.bandwidthPercent, `${(cloud.bandwidthUsedBytes / 1024 ** 3).toFixed(2)} GB`]].map(([l, p, txt]) => (
                <div key={l} className="mt-2.5">
                  <div className="flex justify-between text-[11.5px]"><span className="text-slate-500">{l}</span><span className="font-medium tabular-nums text-dash-ink">{txt}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${p >= 90 ? 'bg-red-500' : p >= 70 ? 'bg-amber-400' : 'bg-forest-600'}`} style={{ width: `${Math.max(2, Math.min(p, 100))}%` }} /></div>
                </div>
              )) : <p className="mt-2 text-[12px] text-slate-400">{loadingCore ? 'Loading...' : 'Unavailable'}</p>}
            </div>
            <div className="rounded-2xl border border-dash-line p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-dash-ink"><Server size={14} className="text-forest-600" /> Vercel Deployment</p>
              {vercel ? (
                <dl className="mt-2 space-y-1.5 text-[11.5px]">
                  {[['Status', vercel.status], ['Region', vercel.region], ['Environment', vercel.environment]].map(([k, val]) => (
                    <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className={`font-medium ${k === 'Status' ? 'text-emerald-600' : 'text-dash-ink'}`}>{val || '-'}</dd></div>
                  ))}
                </dl>
              ) : <p className="mt-2 text-[12px] text-slate-400">{loadingCore ? 'Loading...' : 'Unavailable'}</p>}
            </div>
          </div>
        </Card>

        {/* ecosystem */}
        <Card title="Merchant Ecosystem" sub="Overview of the commerce network." right={can('directory') && <button type="button" onClick={() => onTab('directory')} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-forest-600 hover:underline">View all <ChevronRight size={13} /></button>}>
          <div className="grid grid-cols-2 gap-2.5">
            {[[Store, 'Total Stores', t?.stores], [Users, 'Paying Stores', t?.paying], [Star, 'Premium Stores', t?.premium], [Package, 'Products', t?.products]].map(([Icon, l, val]) => (
              <div key={l} className="rounded-2xl border border-dash-line p-3.5 transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="flex items-center gap-2 text-[12px] text-slate-500"><Icon size={14} className="text-forest-600" /> {l}</p>
                <div className="mt-1.5 flex items-end justify-between"><span className="font-display text-[28px] font-extrabold leading-none text-dash-ink">{pulse.loading && !t ? '...' : <Count value={val} />}</span><TrendingUp size={16} className="text-emerald-500" /></div>
              </div>
            ))}
          </div>
          <div className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-forest-50 to-[#e3f3ea] px-4 py-5 text-center">
            <svg viewBox="0 0 120 60" className="mx-auto h-14 w-28" aria-hidden="true">
              <rect x="22" y="24" width="76" height="32" rx="4" fill="#0b6b35" />
              <path d="M16 24 L28 8 H92 L104 24 Z" fill="#16a34a" />
              {[28, 44, 60, 76, 92].map((x, i) => <path key={x} d={`M${x - 12} 24 q6 8 12 0`} fill={i % 2 ? '#bbf7d0' : '#fff'} />)}
              <rect x="52" y="36" width="16" height="20" rx="2" fill="#ecfdf5" />
            </svg>
            <p className="mt-2 text-[13px] font-semibold text-forest-700">A growing network of Nigerian businesses</p>
            <p className="text-[12px] text-forest-700/70">{t ? `${t.newThisWeek} joined this week · ${t.active7} active in the last 7 days` : 'More merchants. More commerce. More opportunity.'}</p>
          </div>
        </Card>

        {/* attention */}
        <Card title={<span className="flex items-center gap-2">Needs Attention {attention?.total > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{attention.total}</span>}</span>}>
          {termiiLow && can('sms') && (
            <button type="button" onClick={() => onTab('sms')} className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-100">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><MessageSquare size={16} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-dash-ink">Termii SMS wallet is low</span><span className="block text-[11.5px] text-slate-500">Top up before enabling phone verification.</span></span>
              <ChevronRight size={15} className="text-slate-400" />
            </button>
          )}
          {att.length === 0 && !termiiLow ? (
            <div className="flex flex-col items-center rounded-2xl bg-slate-50 px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={22} strokeWidth={3} /></span>
              <p className="mt-3 text-[13.5px] font-semibold text-dash-ink">All clear</p>
              <p className="text-[12px] text-slate-500">Nothing is waiting in the tabs you can open.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {att.map((x) => {
                const Icon = { domains: Link2, cac: FileCheck, tickets: MessageSquare, withdrawals: TrendingUp, recovery: UserCog, admins: UserCog }[x.tab] || Activity
                return (
                  <li key={x.tab}><button type="button" onClick={() => onTab(x.tab)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-dash-ink">{x.title}</span><span className="block text-[11.5px] text-slate-500">{x.detail}</span></span>
                    <ChevronRight size={15} className="text-slate-300" />
                  </button></li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* metrics */}
        <Card title="Platform Metrics" sub="Key figures at a glance." right={
          <div className="flex rounded-full bg-slate-100 p-0.5 text-[12px] font-semibold">
            {[['all', 'All'], ['7', '7D'], ['30', '30D']].map(([id, l]) => <button key={id} type="button" onClick={() => setRange(id)} className={`rounded-full px-3 py-1 transition ${range === id ? 'bg-forest-600 text-white shadow' : 'text-slate-500'}`}>{l}</button>)}
          </div>
        }>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              [Store, range === 'all' ? 'Total Stores' : 'New Stores', range === 'all' ? t?.stores : sum(series?.signups), series?.signups],
              [Activity, 'Active Merchants', range === 'all' ? t?.active30 : range === '7' ? t?.active7 : t?.active30, series?.active],
              [Users, 'Paying Stores', t?.paying, series?.signups],
              [Rocket, range === 'all' ? 'Products' : 'Customer Actions', range === 'all' ? t?.products : t?.interactions30, series?.active],
            ].map(([Icon, l, val, s]) => (
              <div key={l} className="rounded-2xl border border-dash-line p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-50 text-forest-600"><Icon size={15} /></span>
                <p className="mt-2 text-[11.5px] text-slate-500">{l}</p>
                <p className="font-display text-[22px] font-extrabold leading-tight text-dash-ink">{val == null ? '-' : <Count value={val} />}</p>
                <div className="mt-1 h-9"><Sparkline values={slice(s).map((x) => x.n)} /></div>
              </div>
            ))}
          </div>
          {t?.revenue30 != null && <p className="mt-3 rounded-2xl bg-forest-50 px-3 py-2 text-[12.5px] text-forest-700">Plan revenue, last 30 days: <strong>{naira(t.revenue30)}</strong></p>}
        </Card>

        {/* infra list */}
        <Card title="Infrastructure & Deployment" sub="Service health and infrastructure status.">
          <ul className="divide-y divide-dash-line">
            {[[Database, 'Firebase', h?.platform ? 'Online' : 'Error', !!h?.platform], [Cloud, 'Cloudinary', cloud ? 'Online' : 'Error', !!cloud], [Server, 'Vercel', vercel ? 'Deployed' : 'Error', !!vercel], [Cpu, 'AI Description Engine', h?.ai ? 'Online' : 'Error', !!h?.ai]].map(([Icon, l, txt, ok]) => (
              <li key={l} className="flex items-center gap-2.5 py-2.5 text-[12.5px]"><Icon size={15} className="text-slate-400" /><span className="flex-1 text-dash-ink">{l}</span><span className={`flex items-center gap-1.5 font-semibold ${ok ? 'text-emerald-600' : 'text-red-600'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{txt}</span></li>
            ))}
            {vercel?.recentDeployments?.slice(0, 3).map((d, i) => (
              <li key={i} className="flex items-center gap-2.5 py-2.5 text-[12px]"><Globe size={14} className="text-slate-400" /><span className="min-w-0 flex-1 truncate text-slate-600">{d.commitMessage || 'Deployment'}</span><span className={`text-[11px] font-semibold ${d.state === 'READY' ? 'text-emerald-600' : 'text-amber-600'}`}>{d.state === 'READY' ? 'Live' : d.state}</span></li>
            ))}
          </ul>
        </Card>

        {/* activity */}
        <Card title="Platform Activity" sub="Live updates from your platform." right={can('activity') && <button type="button" onClick={() => onTab('activity')} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-forest-600 hover:underline">View all <ArrowRight size={13} /></button>}>
          {pulse.loading && !pulse.data ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-11" />)}</div> : (
            <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-dash-line">
              {(pulse.data?.feed || []).map((f, i) => (
                <li key={i} className="relative flex items-start gap-3 animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                  <span className={`relative z-[1] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ring-4 ring-white ${f.kind === 'store' ? 'bg-forest-50 text-forest-600' : 'bg-violet-50 text-violet-600'}`}>{f.kind === 'store' ? <Store size={15} /> : <UserCog size={15} />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold text-dash-ink">{f.title}</span><span className="block truncate text-[11.5px] text-slate-500">{f.detail}</span></span>
                  <span className="flex-shrink-0 text-[11px] text-slate-400">{ago(f.at)}</span>
                </li>
              ))}
              {pulse.data && !pulse.data.feed.length && <li className="py-6 text-center text-[12.5px] text-slate-400">No activity yet.</li>}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}
