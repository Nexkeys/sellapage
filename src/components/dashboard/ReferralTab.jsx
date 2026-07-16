import { useState, useEffect, useCallback } from 'react'
import {
  Copy, Share2, MessageCircle, Twitter, CheckCircle, AlertCircle,
  Wallet, TrendingUp, Users, MousePointerClick, CreditCard, ArrowUpRight,
  Clock, ChevronDown, ChevronUp, ExternalLink, Loader2, ShieldCheck,
  Landmark, Info
} from 'lucide-react'

const API_BASE = typeof window !== 'undefined' ? '' : ''

function formatKobo(amount) {
  if (!amount) return '₦0'
  return `₦${(amount / 100).toLocaleString('en-NG')}`
}

export default function ReferralTab({ token }) {
  const [store, setStore] = useState(null)
  const [referralCode, setReferralCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', accountNumber: '' })
  const [bankSaving, setBankSaving] = useState(false)
  const [bankSuccess, setBankSuccess] = useState('')
  const [bankError, setBankError] = useState('')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  const [showBankList, setShowBankList] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [referralStats, setReferralStats] = useState(null)
  const [recentReferrals, setRecentReferrals] = useState([])
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const NIGERIAN_BANKS = [
    { name: 'Access Bank', code: '044' },
    { name: 'Citibank Nigeria', code: '023' },
    { name: 'Ecobank Nigeria', code: '050' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'First City Monument Bank', code: '214' },
    { name: 'Globus Bank', code: '00100' },
    { name: 'Guaranty Trust Bank', code: '058' },
    { name: ' Heritage Bank', code: '030' },
    { name: 'Keystone Bank', code: '082' },
    { name: 'Kuda Bank', code: '090267' },
    { name: 'Opay', code: '999991' },
    { name: 'Palmpay', code: '999992' },
    { name: 'Polaris Bank', code: '076' },
    { name: 'Providus Bank', code: '101' },
    { name: 'Stanbic IBTC Bank', code: '221' },
    { name: 'Standard Chartered Bank', code: '068' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'SunTrust Bank', code: '100' },
    { name: 'Titan Trust Bank', code: '102' },
    { name: 'Union Bank', code: '032' },
    { name: 'United Bank for Africa', code: '033' },
    { name: 'Unity Bank', code: '215' },
    { name: 'VFD Microfinance Bank', code: '56' },
    { name: 'Wema Bank', code: '035' },
    { name: 'Zenith Bank', code: '057' },
  ]

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/get-store`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.store) {
        setStore(data.store)
        if (data.store.referralCode) {
          setReferralCode(data.store.referralCode)
          setReferralLink(`https://sellapage.com.ng/register?ref=${data.store.referralCode}`)
        }
      }
    } catch (err) {
      console.error('Failed to load store:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchReferralStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/referral-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setReferralStats(data.stats)
        setRecentReferrals(data.recentReferrals || [])
      }
    } catch {
    }
  }, [token])

  const fetchWithdrawalHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/referral-withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setWithdrawalHistory(data.withdrawals || [])
      }
    } catch {
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchStore()
      fetchReferralStats()
    }
  }, [token, fetchStore, fetchReferralStats])

  useEffect(() => {
    if (showHistory && token) {
      fetchWithdrawalHistory()
    }
  }, [showHistory, token, fetchWithdrawalHistory])

  const generateCode = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API_BASE}/api/referral-generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setReferralCode(data.referralCode)
        setReferralLink(`https://sellapage.com.ng/register?ref=${data.referralCode}`)
        setStore(prev => ({ ...prev, referralCode: data.referralCode }))
      }
    } catch {
    } finally {
      setGenerating(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Sellapage and start your online store! Use my referral code: ${referralCode}\n\nSign up here: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareTwitter = () => {
    const text = encodeURIComponent(
      `I use Sellapage to run my online store. Join using my referral link and we both benefit! ${referralLink}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const saveBank = async () => {
    if (!bankForm.bankName || !bankForm.bankCode || !bankForm.accountNumber) {
      setBankError('Please fill in all fields')
      return
    }
    if (bankForm.accountNumber.length !== 10) {
      setBankError('Account number must be 10 digits')
      return
    }

    setBankSaving(true)
    setBankError('')
    setBankSuccess('')

    try {
      const res = await fetch(`${API_BASE}/api/referral-bank-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankForm),
      })
      const data = await res.json()
      if (data.success) {
        setBankSuccess(`Account verified: ${data.accountName}`)
        setStore(prev => ({
          ...prev,
          referralBankName: bankForm.bankName,
          referralBankAccount: bankForm.accountNumber,
          referralBankAccountName: data.accountName,
          referralBankVerified: true,
        }))
        setShowBankForm(false)
        setTimeout(() => setBankSuccess(''), 5000)
      } else {
        setBankError(data.message || data.error || 'Failed to save bank details')
      }
    } catch {
      setBankError('Network error. Please try again.')
    } finally {
      setBankSaving(false)
    }
  }

  const requestWithdrawal = async () => {
    const amountKobo = Math.round(parseFloat(withdrawAmount) * 100)
    if (!amountKobo || amountKobo <= 0) {
      setWithdrawError('Enter a valid amount')
      return
    }

    setWithdrawing(true)
    setWithdrawError('')
    setWithdrawSuccess('')

    try {
      const res = await fetch(`${API_BASE}/api/referral-withdraw-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountKobo }),
      })
      const data = await res.json()
      if (data.success) {
        setWithdrawSuccess(data.message || 'Withdrawal request submitted!')
        setStore(prev => ({
          ...prev,
          referralAvailable: (prev.referralAvailable || 0) - amountKobo,
          referralWithdrawn: (prev.referralWithdrawn || 0) + amountKobo,
        }))
        setWithdrawAmount('')
        setTimeout(() => {
          setShowWithdraw(false)
          setWithdrawSuccess('')
        }, 3000)
      } else {
        setWithdrawError(data.message || data.error || 'Failed to submit withdrawal')
      }
    } catch {
      setWithdrawError('Network error. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const filteredBanks = NIGERIAN_BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  const available = store?.referralAvailable || 0
  const pending = store?.referralPending || 0
  const withdrawn = store?.referralWithdrawn || 0
  const totalEarned = store?.referralTotalEarned || 0
  const totalClicks = store?.referralTotalClicks || 0
  const totalSignups = store?.referralTotalSignups || 0
  const totalPaid = store?.referralTotalPaid || 0
  const hasCode = !!referralCode
  const hasBank = !!store?.referralBankVerified
  const minimumKobo = 500000
  const progressToMin = Math.min(100, Math.round((available / minimumKobo) * 100))

  return (
    <div className="space-y-5 pb-8">
      {!hasCode ? (
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 rounded-xl p-3">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">Referral Program</h2>
          </div>
          <p className="text-green-100 text-sm sm:text-base mb-6 max-w-md">
            Earn money for every vendor you refer to Sellapage. Get paid when they upgrade to a paid plan.
          </p>
          <button
            onClick={generateCode}
            disabled={generating}
            className="bg-white text-green-700 font-bold py-3 px-8 rounded-xl hover:bg-green-50 transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            {generating ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </span>
            ) : (
              'Generate My Referral Code'
            )}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 rounded-xl p-2.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Invite & Earn</h2>
              <p className="text-green-100 text-xs">₦500 – ₦2,000 per paid referral</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-4 mt-4">
            <p className="text-green-100 text-xs mb-2 font-medium">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-wider">{referralCode}</span>
              <button
                onClick={copyCode}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-all"
              >
                {copiedCode ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-4 mt-3">
            <p className="text-green-100 text-xs mb-2 font-medium">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <span className="text-sm truncate flex-1 opacity-90">{referralLink}</span>
              <button
                onClick={copyLink}
                className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-all shrink-0"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={shareWhatsApp}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button
              onClick={shareTwitter}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <Twitter className="w-4 h-4" /> Twitter
            </button>
            <button
              onClick={copyLink}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              <Share2 className="w-4 h-4" /> Copy
            </button>
          </div>
        </div>
      )}

      {hasCode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Available', value: formatKobo(available), icon: Wallet, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending', value: formatKobo(pending), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Withdrawn', value: formatKobo(withdrawn), icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Earned', value: formatKobo(totalEarned), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-xl p-3 sm:p-4`}>
              <item.icon className={`w-4 h-4 ${item.color} mb-1`} />
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-base sm:text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {hasCode && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Link Clicks', value: totalClicks, icon: MousePointerClick },
            { label: 'Signups', value: totalSignups, icon: Users },
            { label: 'Paid Users', value: totalPaid, icon: CheckCircle },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <item.icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {hasCode && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600" /> Withdrawal
            </h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              History {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {!hasBank ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Set up your bank account</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Add your bank details to receive referral payouts.
                  </p>
                  <button
                    onClick={() => setShowBankForm(true)}
                    className="mt-3 bg-amber-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-amber-700 transition-all"
                  >
                    Add Bank Account
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Bank Account Verified</span>
              </div>
              <p className="text-sm text-green-800">{store?.referralBankName}</p>
              <p className="text-sm text-green-800">{store?.referralBankAccount} — {store?.referralBankAccountName}</p>
            </div>
          )}

          {hasBank && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress to minimum withdrawal (₦5,000)</span>
                <span className="font-medium text-gray-900">{progressToMin}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressToMin}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatKobo(available)} of {formatKobo(minimumKobo)} minimum
              </p>

              {available >= minimumKobo ? (
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="mt-4 w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" /> Withdraw Funds
                </button>
              ) : (
                <div className="mt-4 bg-gray-50 rounded-xl p-3 text-center">
                  <Info className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">
                    Refer {Math.ceil((minimumKobo - available) / 50000)} more vendors who upgrade to reach the minimum
                  </p>
                </div>
              )}
            </div>
          )}

          {showHistory && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Withdrawal History</h4>
              {withdrawalHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No withdrawals yet</p>
              ) : (
                <div className="space-y-2">
                  {withdrawalHistory.map((w) => (
                    <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatKobo(w.amount)}</p>
                        <p className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString('en-NG')}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        w.status === 'completed' ? 'bg-green-100 text-green-700' :
                        w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasCode && recentReferrals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green-600" /> Recent Referrals
          </h3>
          <div className="space-y-2">
            {recentReferrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                    {(r.referredUserName || r.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.referredUserName || 'New Vendor'}</p>
                    <p className="text-xs text-gray-500">{r.plan} plan</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  r.status === 'paid' ? 'bg-green-100 text-green-700' :
                  r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {r.status === 'paid' ? `+${formatKobo(r.rewardAmount)}` : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBankForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Bank Account</h3>
              <button onClick={() => { setShowBankForm(false); setBankError(''); setBankSuccess('') }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {bankSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {bankSuccess}
                </p>
              </div>
            )}

            {bankError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {bankError}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                <div className="relative">
                  <button
                    onClick={() => setShowBankList(!showBankList)}
                    className="w-full text-left border border-gray-300 rounded-lg py-2.5 px-3 text-sm bg-white hover:border-gray-400 transition-all flex items-center justify-between"
                  >
                    <span className={bankForm.bankName ? 'text-gray-900' : 'text-gray-400'}>
                      {bankForm.bankName || 'Select your bank'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showBankList && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                        <input
                          type="text"
                          placeholder="Search banks..."
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:border-green-500"
                        />
                      </div>
                      {filteredBanks.map((bank) => (
                        <button
                          key={bank.code}
                          onClick={() => {
                            setBankForm(prev => ({ ...prev, bankName: bank.name, bankCode: bank.code }))
                            setShowBankList(false)
                            setBankSearch('')
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 transition-all border-b border-gray-50 last:border-0"
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0123456789"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-green-500"
                />
              </div>

              <button
                onClick={saveBank}
                disabled={bankSaving}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bankSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Verify & Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Withdraw Funds</h3>
              <button onClick={() => { setShowWithdraw(false); setWithdrawError(''); setWithdrawSuccess('') }} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {withdrawSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {withdrawSuccess}
                </p>
              </div>
            )}

            {withdrawError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {withdrawError}
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatKobo(available)}</p>
              <p className="text-xs text-gray-500 mt-1">{store?.referralBankName} — {store?.referralBankAccount}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  min="5000"
                  step="100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum withdrawal: ₦5,000</p>
              </div>

              <button
                onClick={requestWithdrawal}
                disabled={withdrawing || !withdrawAmount}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {withdrawing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> Request Withdrawal</>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Payments are processed within 3 business days via bank transfer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
