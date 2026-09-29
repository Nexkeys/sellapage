// src/components/dashboard/ReferralTab.jsx
//
// Referral Program, rebuilt on 2026-09-29 to the Referral design. Every
// working part is the same code path as before: the code comes from
// /api/referral-generate-code, stats and recent referrals from
// /api/referral-stats (polled every 25s and on focus), withdrawals from
// /api/referral-withdraw-request (no minimum, any amount up to the balance),
// the bank account from /api/referral-bank-save (verified with Paystack).
//
// New:
//   - before a code exists, Sellapage "talks" to the vendor in chat bubbles
//     and the code is created from a reply button
//   - creating the code sprays naira notes across the screen
//   - a verified withdrawal sprays them too
//   - emails of referred vendors are shown masked
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Copy, MessageCircle, CheckCircle2, AlertCircle, Wallet, Users, UserPlus, Database, CreditCard, ArrowUpRight,
  ChevronDown, Loader2, ShieldCheck, Landmark, Info, Link2, Home, ChevronRight, Gift, ArrowRight, X, Check,
  Share2, Facebook, Megaphone, TrendingUp, Clock, History, Sparkles,
} from 'lucide-react'
import MediaSlot from '../../media/MediaSlot'
import { hasMedia } from '../../media/hasMedia'
import useMoneySpray from './ui/useMoneySpray'
import { Skeleton } from '../Skeleton'

const API_BASE = ''
const card = 'rounded-2xl border border-dash-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function formatKobo(amount) {
  if (!amount) return '₦0'
  return `₦${(amount / 100).toLocaleString('en-NG')}`
}

// "funmi.ade@gmail.com" -> "fu***@gmail.com". Enough to recognise a person
// you invited, without laying another vendor's address out in full.
function maskEmail(email) {
  if (!email || !email.includes('@')) return ''
  const [user, domain] = email.split('@')
  return `${user.slice(0, 2)}***@${domain}`
}

const fmtDate = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : ''
}

// ── Chat bubbles for the first visit ──────────────────────────────────────
const INTRO = [
  'Boss, you know you can also earn while you sell?',
  'We know the economy is hard right now. This is our own way of standing with our vendors.',
  'Bring other business owners to Sellapage so they can run their business here too. When any of them upgrades to a paid plan, you earn ₦500 to ₦2,000, instantly.',
  'No stress and no threshold. Withdraw any amount, any time, and track every referral right here.',
]

function Bubble({ children, delay }) {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white">S</span>
      <div className="max-w-[520px] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-[14px] leading-relaxed text-dash-ink shadow-sm ring-1 ring-dash-line">{children}</div>
    </div>
  )
}

function Typing({ delay }) {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in duration-200" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white">S</span>
      <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-dash-line">
        {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />)}
      </div>
    </div>
  )
}

// ── Money spray moments ───────────────────────────────────────────────────
function SprayModal({ open, onClose, children, labelledBy }) {
  const canvasRef = useRef(null)
  useMoneySpray(canvasRef, open && !reducedMotion())
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-forest-900/55 backdrop-blur-[3px] animate-in fade-in duration-300" onClick={onClose} />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[103]" aria-hidden="true" />
      <div className="relative z-[102] w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default function ReferralTab({ user, store, navigateTo }) {
  const [token, setToken] = useState(null)
  const [referralCode, setReferralCode] = useState(store?.referralCode || null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [copied, setCopied] = useState('')
  const [referralLink, setReferralLink] = useState(store?.referralCode ? `https://sellapage.com.ng/register?ref=${store.referralCode}` : '')
  const [celebrate, setCelebrate] = useState(false)
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', accountNumber: '' })
  const [bankSaving, setBankSaving] = useState(false)
  const [bankSuccess, setBankSuccess] = useState('')
  const [bankError, setBankError] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawDone, setWithdrawDone] = useState(null) // { amount, message }
  const [showBankList, setShowBankList] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [bankVerified, setBankVerified] = useState(store?.referralBankVerified || false)
  const [bankName, setBankName] = useState(store?.referralBankName || '')
  // Only the masked number is on the store doc - the full account number
  // lives server-side in stores/{id}/private/referralBank. `bankAccount` holds
  // the full number only during the session where the vendor just typed it.
  const [bankAccount, setBankAccount] = useState('')
  const [bankAccountName, setBankAccountName] = useState(store?.referralBankAccountName || '')
  const [referralStats, setReferralStats] = useState(null)
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [recentReferrals, setRecentReferrals] = useState([])
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAllRefs, setShowAllRefs] = useState(false)
  const [banks, setBanks] = useState([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [banksError, setBanksError] = useState('')
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => { if (user) user.getIdToken().then(setToken) }, [user])

  const loadBanks = useCallback(async () => {
    setBanksLoading(true)
    setBanksError('')
    try {
      const res = await fetch(`${API_BASE}/api/get-banks`)
      const data = await res.json()
      if (data.success && data.banks?.length) setBanks(data.banks)
      else setBanksError(data.error || 'Failed to load bank list')
    } catch {
      setBanksError('Could not load bank list. Check your connection.')
    } finally {
      setBanksLoading(false)
    }
  }, [])
  useEffect(() => { loadBanks() }, [loadBanks])

  useEffect(() => {
    if (store?.referralCode) {
      setReferralCode(store.referralCode)
      setReferralLink(`https://sellapage.com.ng/register?ref=${store.referralCode}`)
    }
  }, [store?.referralCode])

  // The chat intro reveals itself, then shows the reply button.
  useEffect(() => {
    if (referralCode) return undefined
    const t = setTimeout(() => setIntroDone(true), reducedMotion() ? 0 : INTRO.length * 900 + 300)
    return () => clearTimeout(t)
  }, [referralCode])

  const fetchReferralStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/referral-stats${store?.id ? `?storeId=${store.id}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setReferralStats(data.stats)
        setRecentReferrals(data.recentReferrals || [])
      }
    } catch { /* next poll tries again */ } finally {
      setStatsLoaded(true)
    }
  }, [token, store?.id])

  const fetchWithdrawalHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/referral-withdrawals${store?.id ? `?storeId=${store.id}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setWithdrawalHistory(data.withdrawals || [])
    } catch { /* next poll tries again */ }
  }, [token, store?.id])

  // Live refresh: on load, every 25s, and when the tab regains focus, so new
  // clicks, signups, rewards and payout statuses appear without a reload.
  useEffect(() => {
    if (!token) return undefined
    fetchReferralStats()
    fetchWithdrawalHistory()
    const interval = setInterval(() => { fetchReferralStats(); fetchWithdrawalHistory() }, 25000)
    const onFocus = () => { fetchReferralStats(); fetchWithdrawalHistory() }
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [token, fetchReferralStats, fetchWithdrawalHistory])

  const generateCode = async () => {
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch(`${API_BASE}/api/referral-generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setReferralCode(data.referralCode)
        setReferralLink(`https://sellapage.com.ng/register?ref=${data.referralCode}`)
        setCelebrate(true)
      } else {
        setGenerateError(data.message || data.error || 'We could not create your code. Please try again.')
      }
    } catch {
      setGenerateError('Network wahala. Check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text) } catch { /* shown on screen to copy by hand */ }
    setCopied(what)
    setTimeout(() => setCopied(''), 2000)
  }
  const shareText = `I run my business on Sellapage and you should too. Sign up with my link: ${referralLink}`
  const shares = [
    { id: 'wa', label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`Join Sellapage and start your online store! Use my referral code: ${referralCode}\n\nSign up here: ${referralLink}`)}`, cls: 'text-[#25D366]' },
    { id: 'x', label: 'Twitter', icon: Share2, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, cls: 'text-dash-ink' },
    { id: 'fb', label: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, cls: 'text-[#1877F2]' },
  ]

  const saveBank = async () => {
    if (!bankForm.bankName || !bankForm.bankCode || !bankForm.accountNumber) { setBankError('Please pick your bank and enter your account number.'); return }
    if (bankForm.accountNumber.length !== 10) { setBankError('Your account number should be exactly 10 digits.'); return }
    setBankSaving(true)
    setBankError('')
    setBankSuccess('')
    try {
      const res = await fetch(`${API_BASE}/api/referral-bank-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bankForm),
      })
      const data = await res.json()
      if (data.success) {
        setBankSuccess(`Verified: ${data.accountName}`)
        setBankVerified(true)
        setBankName(bankForm.bankName)
        setBankAccount(bankForm.accountNumber)
        setBankAccountName(data.accountName)
        setShowBankForm(false)
        setTimeout(() => setBankSuccess(''), 5000)
      } else {
        setBankError(data.message || 'We could not verify that account. Check the bank and number, then try again.')
      }
    } catch (err) {
      console.error('[ReferralTab] Bank save error:', err)
      setBankError('Network error. Please check your connection and try again.')
    } finally {
      setBankSaving(false)
    }
  }

  const requestWithdrawal = async () => {
    const amountKobo = Math.round(parseFloat(withdrawAmount) * 100)
    if (!amountKobo || amountKobo <= 0) { setWithdrawError('Enter how much you want to withdraw.'); return }
    const currentAvailable = referralStats ? (referralStats.referralAvailable || 0) : (store?.referralAvailable || 0)
    if (amountKobo > currentAvailable) { setWithdrawError(`That is more than your balance. You can withdraw up to ${formatKobo(currentAvailable)}.`); return }
    setWithdrawing(true)
    setWithdrawError('')
    try {
      const res = await fetch(`${API_BASE}/api/referral-withdraw-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amountKobo }),
      })
      const data = await res.json()
      if (data.success) {
        setReferralStats((prev) => (prev ? { ...prev, referralAvailable: Math.max(0, (prev.referralAvailable || 0) - amountKobo) } : prev))
        setWithdrawAmount('')
        setShowWithdraw(false)
        setWithdrawDone({ amount: amountKobo, message: data.message })
        fetchReferralStats()
        fetchWithdrawalHistory()
      } else {
        setWithdrawError(data.message || data.error || 'We could not submit that withdrawal. Please try again.')
      }
    } catch {
      setWithdrawError('Network error. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const filteredBanks = banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase()))

  const s = referralStats
  const available = s ? (s.referralAvailable || 0) : (store?.referralAvailable || 0)
  const totalEarned = s ? (s.referralTotalEarned || 0) : (store?.referralTotalEarned || 0)
  const totalClicks = s ? (s.totalClicks || 0) : (store?.referralTotalClicks || 0)
  const totalSignups = s ? (s.totalSignups || 0) : (store?.referralTotalSignups || 0)
  const totalPaid = s ? (s.totalPaid || 0) : (store?.referralTotalPaid || 0)
  const pendingPayouts = withdrawalHistory.filter((w) => w.status === 'pending' || w.status === 'processing').reduce((sum, w) => sum + (w.amount || 0), 0)
  const paidOut = withdrawalHistory.filter((w) => w.status === 'completed').reduce((sum, w) => sum + (w.amount || 0), 0)
  const hasCode = !!referralCode
  const hasBank = bankVerified || !!store?.referralBankVerified
  const refs = showAllRefs ? recentReferrals : recentReferrals.slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <button type="button" onClick={() => navigateTo?.('overview')} className="rounded p-0.5 hover:text-forest" aria-label="Dashboard home"><Home size={14} /></button>
        <ChevronRight size={13} className="text-slate-300" />
        <button type="button" onClick={() => navigateTo?.('marketing')} className="hover:text-forest">Marketing</button>
        <ChevronRight size={13} className="text-slate-300" />
        <span className="font-medium text-dash-ink">Referral Program</span>
      </nav>

      {/* Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-forest-50/50 to-[#e6f5ec]">
        <div className="relative z-[1] p-5 sm:p-7 lg:max-w-[60%]">
          <span className="inline-flex rounded-full bg-forest-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600 ring-1 ring-forest-100">Referral Program</span>
          <h1 className="mt-3 font-body text-[30px] font-bold leading-[1.1] tracking-tight text-dash-ink sm:text-[42px]">
            <span className="text-forest-600">Share</span> Sellapage,<br />Grow Together.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[15px]">Refer other business owners to Sellapage and earn rewards when they sign up and upgrade.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['More users', 'More sales', 'More earnings', 'Stronger community'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm ring-1 ring-dash-line">
                <CheckCircle2 size={14} className="text-forest-600" /> {t}
              </span>
            ))}
          </div>
        </div>
        {hasMedia('referral-hero') && (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block">
            <MediaSlot name="referral-hero" alt="" className="h-full w-full object-cover object-left mix-blend-multiply [mask-image:linear-gradient(to_right,transparent,black_18%)]" />
          </div>
        )}
      </section>

      {!hasCode ? (
        /* ── First visit: a conversation ─────────────────────────────── */
        <section className={`${card} bg-gradient-to-b from-forest-50/40 to-white p-5 sm:p-7`}>
          <div className="space-y-3">
            {INTRO.map((m, i) => (
              <Bubble key={m} delay={reducedMotion() ? 0 : i * 900 + 450}>{m}</Bubble>
            ))}
            {!introDone && <Typing delay={0} />}
          </div>
          {introDone && (
            <div className="mt-5 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                type="button"
                onClick={generateCode}
                disabled={generating || !token}
                className="inline-flex items-center gap-2 rounded-2xl rounded-br-md bg-forest px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/25 transition hover:bg-forest-700 disabled:opacity-60"
              >
                {generating ? <><Loader2 size={16} className="animate-spin" /> Creating your code...</> : <>I&apos;m in, create my referral code <ArrowRight size={16} /></>}
              </button>
              {generateError && <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={13} /> {generateError}</p>}
              <p className="text-[11px] text-dash-muted">It&apos;s free. Takes one second.</p>
            </div>
          )}
          <div className="mt-6 grid gap-3 border-t border-dash-line pt-5 sm:grid-cols-3">
            {[
              { plan: 'Growth', amount: '₦500' }, { plan: 'Pro', amount: '₦1,000' }, { plan: 'Premium', amount: '₦2,000' },
            ].map((t) => (
              <div key={t.plan} className="rounded-2xl bg-white p-4 text-center ring-1 ring-dash-line">
                <p className="text-[22px] font-bold text-forest-600">{t.amount}</p>
                <p className="text-xs text-dash-muted">when they go {t.plan}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[
              { icon: Users, label: 'Link clicks', value: totalClicks.toLocaleString(), sub: 'people opened your link' },
              { icon: UserPlus, label: 'New stores', value: totalSignups.toLocaleString(), sub: 'signed up with your link' },
              { icon: Database, label: 'Paid referrals', value: totalPaid.toLocaleString(), sub: 'upgraded to a paid plan' },
              { icon: Wallet, label: 'Total earned', value: formatKobo(totalEarned), sub: 'since you started' },
            ].map((x) => (
              <div key={x.label} className={`${card} p-4 sm:p-5`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600"><x.icon size={19} /></span>
                <p className="mt-3 text-[13px] text-slate-600">{x.label}</p>
                {!statsLoaded ? <Skeleton className="mt-1.5 h-7 w-16" /> : <p className="mt-1 text-[24px] font-bold leading-tight text-dash-ink tabular-nums sm:text-[28px]">{x.value}</p>}
                <p className="mt-1 text-[11px] text-dash-muted">{x.sub}</p>
              </div>
            ))}
          </div>

          {/* Link + how it works */}
          <section className={`${card} grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]`}>
            <div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Link2 size={18} /></span>
                <div>
                  <p className="text-[15px] font-semibold text-dash-ink">Your Referral Link</p>
                  <p className="text-xs leading-relaxed text-dash-muted">Share it with friends, family or business contacts. When they sign up and upgrade, you earn ₦500 to ₦2,000 per referral.</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-dash-line bg-gray-50/60 px-3.5">
                  <p className="w-full select-all truncate py-2.5 text-[13px] text-slate-700">{referralLink}</p>
                </div>
                <button type="button" onClick={() => copy(referralLink, 'link')} className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition ${copied === 'link' ? 'bg-forest-600' : 'bg-forest hover:bg-forest-700'}`}>
                  {copied === 'link' ? <Check size={14} /> : <Copy size={14} />} {copied === 'link' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {shares.map((x) => (
                  <a key={x.id} href={x.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-dash-line bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-forest-200 hover:bg-forest-50">
                    <x.icon size={15} className={x.cls} /> {x.label}
                  </a>
                ))}
                <button type="button" onClick={() => copy(referralCode, 'code')} className="inline-flex items-center gap-2 rounded-xl border border-dash-line bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-forest-200 hover:bg-forest-50">
                  {copied === 'code' ? <Check size={15} className="text-forest-600" /> : <Copy size={15} />} Code: <span className="font-semibold tracking-wider">{referralCode}</span>
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-forest-50/50 p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-white"><ShieldCheck size={16} /></span> How it works</p>
              <ol className="mt-3 space-y-2.5">
                {['Share your referral link', 'They sign up and create a store', 'They upgrade to any paid plan', 'You earn ₦500 to ₦2,000, instantly'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 text-[13px] text-slate-700">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-forest shadow-sm">{i + 1}</span>{t}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-dash-muted">If they later move up a tier, you&apos;re topped up to that tier&apos;s reward. One reward per vendor, never on renewals.</p>
            </div>
          </section>

          {/* Earnings + withdrawal */}
          <section className={`${card} grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]`}>
            <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-forest-50 via-[#eef8f2] to-white p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-forest"><Users size={17} /> Your Earnings</p>
                <p className="mt-3 text-[40px] font-bold leading-none text-dash-ink tabular-nums">{formatKobo(available)}</p>
                <p className="mt-1.5 text-xs text-dash-muted">Available to withdraw</p>
                <button
                  type="button"
                  onClick={() => (hasBank ? setShowWithdraw(true) : setShowBankForm(true))}
                  disabled={hasBank && available <= 0}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-700 disabled:opacity-50"
                >
                  {hasBank ? <>Withdraw Funds <ArrowRight size={15} /></> : <>Add bank to withdraw <Landmark size={15} /></>}
                </button>
                {hasBank && available <= 0 && <p className="mt-2 text-[11px] text-dash-muted">Your balance fills up the moment a referral upgrades.</p>}
              </div>
              <dl className="space-y-3 sm:border-l sm:border-forest-100 sm:pl-4">
                {[
                  { icon: Clock, k: 'Pending', v: formatKobo(pendingPayouts), sub: 'withdrawals being paid' },
                  { icon: TrendingUp, k: 'Total earned', v: formatKobo(totalEarned) },
                  { icon: CreditCard, k: 'Withdrawn', v: formatKobo(paidOut) },
                ].map((r) => (
                  <div key={r.k} className="flex items-start gap-3">
                    <r.icon size={17} className="mt-0.5 text-forest-600" />
                    <div>
                      <dt className="text-[11px] text-dash-muted">{r.k}</dt>
                      <dd className="text-[16px] font-semibold text-dash-ink tabular-nums">{r.v}</dd>
                      {r.sub && <p className="text-[10px] text-dash-muted">{r.sub}</p>}
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col rounded-2xl border border-dash-line p-5">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-dash-ink"><Info size={16} className="text-forest-600" /> Withdrawal details</p>
              <p className="mt-1.5 text-xs leading-relaxed text-dash-muted">No minimum. Withdraw any amount, paid to your bank within 3 business days.</p>
              {hasBank ? (
                <div className="mt-3 rounded-xl bg-forest-50/60 px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest"><ShieldCheck size={14} /> Bank verified</p>
                  <p className="mt-0.5 text-[12px] text-slate-700">{bankName || store?.referralBankName} • {bankAccount || store?.referralBankAccountMasked}</p>
                  <p className="text-[11px] text-dash-muted">{bankAccountName || store?.referralBankAccountName}</p>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBankForm(true)} disabled={!!banksError && banks.length === 0} className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50">
                  <Landmark size={14} /> Add your bank account
                </button>
              )}
              {bankSuccess && <p className="mt-2 flex items-center gap-1.5 text-xs text-forest-600"><CheckCircle2 size={13} /> {bankSuccess}</p>}
              {hasMedia('referral-wallet') && (
                <div className="mx-auto mt-3 w-36"><MediaSlot name="referral-wallet" alt="" className="h-auto w-full mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)]" /></div>
              )}
              <button type="button" onClick={() => setShowHistory((v) => !v)} className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-dash-line px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-gray-50">
                <History size={14} /> {showHistory ? 'Hide' : 'View'} withdrawal history <ChevronDown size={13} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showHistory && (
              <div className="lg:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {withdrawalHistory.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-xs text-dash-muted">No withdrawals yet. Your first one will show here.</p>
                ) : (
                  <ul className="divide-y divide-dash-line rounded-xl border border-dash-line">
                    {withdrawalHistory.map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-[14px] font-semibold text-dash-ink tabular-nums">{formatKobo(w.amount)}</p>
                          <p className="text-[11px] text-dash-muted">{fmtDate(w.createdAt)}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          w.status === 'completed' ? 'bg-forest-50 text-forest-600' : w.status === 'processing' ? 'bg-blue-50 text-blue-700' : w.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>{w.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Recent referrals */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-semibold text-dash-ink">Recent Referrals</p>
                <p className="text-xs text-dash-muted">People you brought in who upgraded, and what you earned from each.</p>
              </div>
              {recentReferrals.length > 5 && (
                <button type="button" onClick={() => setShowAllRefs((v) => !v)} className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-gray-50">
                  {showAllRefs ? 'Show less' : 'View all'} <ArrowRight size={12} />
                </button>
              )}
            </div>
            {!statsLoaded ? (
              <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : recentReferrals.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-dash-line px-4 py-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Megaphone size={19} /></span>
                <p className="mt-3 text-sm font-semibold text-dash-ink">{totalSignups ? `${totalSignups} store${totalSignups === 1 ? '' : 's'} joined with your link` : 'No referrals yet'}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-dash-muted">
                  {totalSignups ? 'You earn the moment any of them upgrades. A friendly nudge on WhatsApp helps.' : 'Share your link on your WhatsApp status today. One upgrade and your balance starts growing.'}
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-dash-muted">
                      <th className="rounded-l-lg px-3 py-2.5 font-semibold">Name / Store</th>
                      <th className="px-3 py-2.5 font-semibold">Email</th>
                      <th className="px-3 py-2.5 font-semibold">Date</th>
                      <th className="px-3 py-2.5 font-semibold">Plan</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right font-semibold">You earn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dash-line">
                    {refs.map((r) => {
                      const name = r.referredUserName || 'New vendor'
                      return (
                        <tr key={r.id}>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest">{name[0].toUpperCase()}</span>
                              <span className="font-medium text-dash-ink">{name}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{maskEmail(r.referredUserEmail) || '-'}</td>
                          <td className="px-3 py-3 text-slate-600">{fmtDate(r.createdAt)}</td>
                          <td className="px-3 py-3"><span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-forest-600">{r.plan || 'paid'}</span></td>
                          <td className="px-3 py-3 text-right font-semibold text-dash-ink tabular-nums">{r.rewardAmount ? `+${formatKobo(r.rewardAmount)}` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Earn more */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-forest-50 via-[#eef8f2] to-white p-5 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-forest text-white shadow-lg shadow-forest/30"><Gift size={24} /></span>
              <div className="flex-1">
                <p className="text-[17px] font-bold text-dash-ink">Earn More. Refer More.</p>
                <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-600">The more people you refer, the more you earn. Help other businesses grow while you grow too.</p>
              </div>
              <a href={shares[0].href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest-700">
                Share Now <ArrowRight size={15} />
              </a>
              {hasMedia('referral-script') && (
                <div className="hidden w-36 flex-shrink-0 lg:block"><MediaSlot name="referral-script" alt="It is easy, fast and rewarding!" className="h-auto w-full mix-blend-multiply [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_88%)]" /></div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Code created */}
      <SprayModal open={celebrate} onClose={() => setCelebrate(false)} labelledBy="ref-made-title">
        <div className="bg-gradient-to-b from-forest-50 to-white px-6 pb-2 pt-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-forest text-white shadow-lg shadow-forest/30"><Sparkles size={28} /></span>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-forest-600">Your code is ready</p>
          <h2 id="ref-made-title" className="mt-1 font-display text-2xl font-extrabold leading-tight text-dash-ink text-balance">Start spreading the news, boss!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dash-muted">Make you sef dey chop as you dey sell na. Every vendor who upgrades through your link puts money in your pocket.</p>
        </div>
        <div className="px-6 pb-6 pt-3">
          <button type="button" onClick={() => copy(referralCode, 'code')} className="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-forest-200 bg-forest-50/40 px-4 py-3">
            <span className="text-[24px] font-bold tracking-[0.12em] text-forest">{referralCode}</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest-600">{copied === 'code' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</span>
          </button>
          <div className="mt-3 grid gap-2">
            <a href={shares[0].href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95">
              <MessageCircle size={16} /> Share on WhatsApp
            </a>
            <button type="button" onClick={() => copy(referralLink, 'link')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dash-line px-4 py-2.5 text-sm font-semibold text-dash-ink transition hover:bg-gray-50">
              {copied === 'link' ? <Check size={15} className="text-forest-600" /> : <Link2 size={15} />} {copied === 'link' ? 'Link copied' : 'Copy my referral link'}
            </button>
          </div>
        </div>
      </SprayModal>

      {/* Withdrawal submitted */}
      <SprayModal open={!!withdrawDone} onClose={() => setWithdrawDone(null)} labelledBy="ref-paid-title">
        <div className="px-6 pb-6 pt-9 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-50 text-forest-600"><Wallet size={28} /></span>
          <h2 id="ref-paid-title" className="mt-4 font-display text-2xl font-extrabold text-dash-ink">{formatKobo(withdrawDone?.amount)} is on its way</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dash-muted">
            {withdrawDone?.message || 'Your withdrawal request is in.'} It lands in {bankName || store?.referralBankName || 'your bank'} within 3 business days. You earned this, boss.
          </p>
          <button type="button" onClick={() => setWithdrawDone(null)} className="mt-5 w-full rounded-2xl bg-forest px-4 py-3 text-sm font-semibold text-white transition hover:bg-forest-700">Sweet, thank you</button>
        </div>
      </SprayModal>

      {/* Bank form */}
      {showBankForm && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ref-bank-title">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 id="ref-bank-title" className="flex items-center gap-2 text-lg font-bold text-dash-ink"><Landmark size={19} className="text-forest-600" /> Add bank account</h3>
              <button type="button" onClick={() => { setShowBankForm(false); setBankError('') }} className="rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
            </div>
            <p className="mt-1 text-xs text-dash-muted">We check the account name with Paystack so your money goes to the right person.</p>
            {bankError && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700"><AlertCircle size={14} className="mt-px flex-shrink-0" />{bankError}</p>}
            <div className="mt-4 space-y-4">
              <div className="relative">
                <label className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Bank</label>
                {banksLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-dash-line bg-gray-50 px-3.5 py-2.5 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" /> Please hold on, loading banks...</div>
                ) : banksError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                    {banksError} <button type="button" onClick={loadBanks} className="font-semibold underline">Tap to retry</button>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setShowBankList(!showBankList)} className="flex w-full items-center justify-between rounded-xl border border-dash-line bg-white px-3.5 py-2.5 text-left text-sm hover:border-forest-200">
                      <span className={bankForm.bankName ? 'text-dash-ink' : 'text-slate-400'}>{bankForm.bankName || 'Select your bank'}</span>
                      <ChevronDown size={15} className="text-slate-400" />
                    </button>
                    {showBankList && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-dash-line bg-white shadow-xl">
                        <div className="sticky top-0 border-b border-dash-line bg-white p-2">
                          <input type="text" placeholder="Search banks..." value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} autoFocus className="w-full rounded-lg border border-dash-line px-3 py-2 text-sm outline-none focus:border-forest-200" />
                        </div>
                        {filteredBanks.length === 0 ? (
                          <p className="py-4 text-center text-sm text-dash-muted">No banks found</p>
                        ) : filteredBanks.map((bank) => (
                          <button key={bank.code} type="button" onClick={() => { setBankForm((p) => ({ ...p, bankName: bank.name, bankCode: bank.code })); setShowBankList(false); setBankSearch('') }} className="w-full border-b border-gray-50 px-3.5 py-2 text-left text-sm last:border-0 hover:bg-forest-50">{bank.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label htmlFor="ref-acct" className="mb-1.5 block text-[13px] font-semibold text-dash-ink">Account number</label>
                <input id="ref-acct" type="text" inputMode="numeric" maxLength={10} value={bankForm.accountNumber} onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '') }))} placeholder="0123456789" className="w-full rounded-xl border border-dash-line px-3.5 py-2.5 text-sm tracking-wider outline-none focus:border-forest-200 focus:ring-4 focus:ring-forest-50" />
                <p className="mt-1 text-[11px] text-dash-muted">{bankForm.accountNumber.length}/10 digits</p>
              </div>
              <button type="button" onClick={saveBank} disabled={bankSaving || banksLoading || !!banksError || !bankForm.bankCode} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-50">
                {bankSaving ? <><Loader2 size={15} className="animate-spin" /> Checking with Paystack...</> : <><ShieldCheck size={15} /> Verify &amp; Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ref-wd-title">
          <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 id="ref-wd-title" className="flex items-center gap-2 text-lg font-bold text-dash-ink"><ArrowUpRight size={19} className="text-forest-600" /> Withdraw funds</h3>
              <button type="button" onClick={() => { setShowWithdraw(false); setWithdrawError('') }} className="rounded-full p-2 text-dash-muted hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
            </div>
            <div className="mt-4 rounded-2xl bg-forest-50/60 p-4">
              <p className="text-xs text-dash-muted">Available balance</p>
              <p className="text-[28px] font-bold text-forest tabular-nums">{formatKobo(available)}</p>
              <p className="text-[11px] text-dash-muted">To {bankName || store?.referralBankName} • {bankAccount || store?.referralBankAccountMasked}</p>
            </div>
            {withdrawError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700"><AlertCircle size={14} className="mt-px flex-shrink-0" />{withdrawError}</p>}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="ref-amt" className="text-[13px] font-semibold text-dash-ink">Amount (₦)</label>
                <button type="button" onClick={() => setWithdrawAmount(String(available / 100))} className="text-xs font-semibold text-forest-600 hover:underline">Withdraw all</button>
              </div>
              <input id="ref-amt" type="number" min="1" value={withdrawAmount} onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError('') }} placeholder="Any amount" className="w-full rounded-xl border border-dash-line px-3.5 py-2.5 text-lg outline-none focus:border-forest-200 focus:ring-4 focus:ring-forest-50" />
              <p className="mt-1 text-[11px] text-dash-muted">No minimum. Up to {formatKobo(available)}.</p>
            </div>
            <button type="button" onClick={requestWithdrawal} disabled={withdrawing || !withdrawAmount} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-50">
              {withdrawing ? <><Loader2 size={15} className="animate-spin" /> Please hold on...</> : <><CreditCard size={15} /> Request withdrawal</>}
            </button>
            <p className="mt-2 text-center text-[11px] text-dash-muted">Paid by bank transfer within 3 business days.</p>
          </div>
        </div>
      )}
    </div>
  )
}
