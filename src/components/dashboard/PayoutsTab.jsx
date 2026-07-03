// src/components/dashboard/PayoutsTab.jsx
import { useState, useEffect } from 'react'
import { Wallet, Info, Check, Search, Calendar, User, Package, ArrowRight, Loader2, Landmark, Building, ShieldCheck, ArrowUpRight, ShieldAlert } from 'lucide-react'

const NIGERIAN_BANKS = [
  { name: 'GTBank', code: '057' },
  { name: 'Access Bank', code: '044' },
  { name: 'Zenith Bank', code: '058' },
  { name: 'UBA', code: '033' },
  { name: 'First Bank', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Moniepoint', code: '50215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Union Bank', code: '032' },
  { name: 'Ecobank', code: '050' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Titan Trust Bank', code: '102' },
]

const SELECT_INPUT_CLASS = "w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10 placeholder:text-gray-400 font-medium"

export default function PayoutsTab({ store, orders, ordersLoading, user, onSubaccountCreated }) {
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    accountNumber: '',
    businessName: store?.businessName || '',
  })
  const [bankSubmitting, setBankSubmitting] = useState(false)
  const [bankError, setBankError] = useState('')
  const [bankSuccess, setBankSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [localAccountNumber, setLocalAccountNumber] = useState('')
  const [localBankName, setLocalBankName] = useState('')
  const [resolvedAccountName, setResolvedAccountName] = useState('')
  const [resolveLoading, setResolveLoading] = useState(false)

  const tryResolveAccount = async (accountNumber, bankCode) => {
    setResolvedAccountName('')
    if (!accountNumber || accountNumber.length !== 10 || !bankCode) return
    setResolveLoading(true)
    try {
      const res = await fetch('/api/resolve-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, bankCode }),
      })
      const data = await res.json()
      if (res.ok && data.accountName) {
        setResolvedAccountName(data.accountName)
      } else {
        setResolvedAccountName('')
      }
    } catch (err) {
      setResolvedAccountName('')
    } finally {
      setResolveLoading(false)
    }
  }

  const handleBankSubmit = async (e) => {
    e.preventDefault()
    setBankSubmitting(true)
    setBankError('')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          bankCode: bankForm.bankCode,
          accountNumber: bankForm.accountNumber,
          businessName: bankForm.businessName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect bank account')
      }

      setBankSuccess(true)
      setLocalAccountNumber(bankForm.accountNumber)
      const selectedBank = NIGERIAN_BANKS.find(b => b.code === bankForm.bankCode)?.name || ''
      setLocalBankName(selectedBank)
      setShowChangeForm(false)

      if (onSubaccountCreated && data.subaccountCode) {
        const selectedBank = NIGERIAN_BANKS.find(b => b.code === bankForm.bankCode)?.name || ''
        onSubaccountCreated({
          subaccountCode: data.subaccountCode,
          payoutBankName: data.payoutBankName || selectedBank,
          payoutAccountNumberMasked: data.payoutAccountNumberMasked || maskAccountNumber(bankForm.accountNumber),
        })
      }
    } catch (err) {
      setBankError(err.message)
    } finally {
      setBankSubmitting(false)
    }
  }

  const handleAccountNumberChange = (raw) => {
    const value = raw.replace(/\D/g, '').slice(0, 10)
    setBankForm({ ...bankForm, accountNumber: value })
    setResolvedAccountName('')
    if (value.length === 10 && bankForm.bankCode) {
      tryResolveAccount(value, bankForm.bankCode)
    }
  }

  const handleBankCodeChange = (code) => {
    setBankForm({ ...bankForm, bankCode: code })
    setResolvedAccountName('')
    if (bankForm.accountNumber.length === 10 && code) {
      tryResolveAccount(bankForm.accountNumber, code)
    }
  }

  const maskAccountNumber = (number) => {
    if (!number || number.length < 4) return number
    return '*'.repeat(number.length - 4) + number.slice(-4)
  }

  useEffect(() => {
    if (store?.subaccountCode) {
      setShowChangeForm(false)
    }
  }, [store?.subaccountCode])

  const checkoutOrders = orders?.filter(
    order => order.orderType === 'checkout' && order.paymentStatus === 'paid'
  ) || []

  const totalEarnings = checkoutOrders.reduce((sum, order) => sum + (order.grandTotal || 0), 0)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const thisMonthEarnings = checkoutOrders
    .filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
    })
    .reduce((sum, order) => sum + (order.grandTotal || 0), 0)

  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const pendingSettlement = checkoutOrders
    .filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt)
      return orderDate >= twentyFourHoursAgo
    })
    .reduce((sum, order) => sum + (order.grandTotal || 0), 0)

  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredOrders = checkoutOrders.filter(order => {
    const query = searchQuery.toLowerCase()
    const orderId = order.id?.substring(0, 8).toLowerCase() || ''
    const customerName = (order.customerName || '').toLowerCase()
    return orderId.includes(query) || customerName.includes(query)
  })

  const formatDate = (date) => {
    if (!date) return ''
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      
      {/* Premium Header Layout */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Finances & Settlements</p>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Payouts</h1>
          <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">Monitor revenue, historical streams, and sync direct merchant billing.</p>
        </div>
      </div>

      {/* SECTION 1: Bank Account Identity Profile Setup */}
      {!store?.subaccountCode ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
          <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">Connect Your Settlement Vault</h2>
            <p className="text-[11px] text-gray-400">Link your verified Nigerian banking terminal to receive instant automated revenue payouts.</p>
          </div>
          
          <div className="p-5">
            {bankSuccess ? (
              <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50/50 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-900">Settlement Destination Locked</p>
                  <p className="text-xs font-semibold text-green-600 mt-0.5">Account verified ending in {maskAccountNumber(bankForm.accountNumber)}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Bank Operator</label>
                    <select
                      value={bankForm.bankCode}
                      onChange={(e) => handleBankCodeChange(e.target.value)}
                      className={SELECT_INPUT_CLASS}
                      required
                    >
                      <option value="">Select your institution</option>
                      {NIGERIAN_BANKS.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">NUBAN Account Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bankForm.accountNumber}
                        onChange={(e) => handleAccountNumberChange(e.target.value)}
                        placeholder="10-digit account number"
                        className={SELECT_INPUT_CLASS}
                        required
                      />
                      {resolveLoading && (
                        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                          <Loader2 size={11} className="animate-spin" /> Verifying
                        </div>
                      )}
                    </div>
                    {!resolveLoading && resolvedAccountName && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-green-600">
                        <Check size={12} strokeWidth={3} /> {resolvedAccountName}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">KYC Legal Business Name</label>
                  <input
                    type="text"
                    value={bankForm.businessName}
                    onChange={(e) => setBankForm({ ...bankForm, businessName: e.target.value })}
                    className={SELECT_INPUT_CLASS}
                    required
                  />
                </div>

                {bankError && (
                  <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 text-xs font-semibold text-red-600">
                    {bankError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bankSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {bankSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Provisioning Secure Route...</>
                  ) : (
                    'Initialize Bank Integration'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-green-100 bg-green-50 text-green-600 shadow-sm shadow-green-100/30">
                    <Wallet size={22} />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black tracking-tight text-gray-900">Settlement Vault Active</h2>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-100">
                        Connected
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-700 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {(localAccountNumber || store?.payoutAccountNumberMasked)
                        ? `Account ending in ${maskAccountNumber(localAccountNumber || store?.payoutAccountNumberMasked || '')}`
                        : 'Account connected'}
                    </p>
                    {(localBankName || store?.payoutBankName) && (
                      <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                        <Landmark size={11} /> {localBankName || store?.payoutBankName}
                      </p>
                    )}

                    {/* Micro Verification State Banner */}
                    {store?.payoutsVerified ? (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-green-100 bg-green-50/50 px-3 py-1.5 text-xs font-bold text-green-800">
                        <ShieldCheck size={14} className="text-green-600" />
                        Live Channels Verified
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                        <ShieldAlert size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium leading-relaxed text-amber-800">
                          Account provisioning takes 6 - 12 hours (often instant). Please safely perform a test store checkout after this timeframe.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => window.open('https://wa.me/2348120525256?text=Hello%20Sellapage%20Team%2C%20I%20need%20to%20update%20my%20payout%20bank%20details%20for%20my%20store.', '_blank', 'noopener,noreferrer')}
                  className="w-full text-center sm:w-auto flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100/50"
                >
                  Modify Account Details
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Re-connection Workflow Wrapper */}
          {showChangeForm && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
              <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
                <h3 className="text-sm font-bold text-gray-900">Override Active Account Configuration</h3>
              </div>
              <div className="p-5">
                {bankSuccess ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Check size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Integration Route Locked</p>
                      <p className="text-xs text-green-700">Terminating at terminal: {maskAccountNumber(bankForm.accountNumber)}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleBankSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Bank Name</label>
                        <select
                          value={bankForm.bankCode}
                          onChange={(e) => handleBankCodeChange(e.target.value)}
                          className={SELECT_INPUT_CLASS}
                          required
                        >
                          <option value="">Select your bank</option>
                          {NIGERIAN_BANKS.map((bank) => (
                            <option key={bank.code} value={bank.code}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Account Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={bankForm.accountNumber}
                            onChange={(e) => handleAccountNumberChange(e.target.value)}
                            placeholder="10-digit account number"
                            className={SELECT_INPUT_CLASS}
                            required
                          />
                          {resolveLoading && (
                            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-gray-400">
                              <Loader2 size={11} className="animate-spin" /> Checking
                            </div>
                          )}
                        </div>
                        {!resolveLoading && resolvedAccountName && (
                          <div className="mt-1 text-xs font-bold text-green-600">{resolvedAccountName}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600">Business Name</label>
                      <input
                        type="text"
                        value={bankForm.businessName}
                        onChange={(e) => setBankForm({ ...bankForm, businessName: e.target.value })}
                        className={SELECT_INPUT_CLASS}
                        required
                      />
                    </div>

                    {bankError && (
                      <p className="text-xs font-semibold text-red-600">{bankError}</p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={bankSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-green-700 disabled:bg-gray-100"
                      >
                        {bankSubmitting ? 'Syncing...' : 'Confirm Update'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowChangeForm(false)} 
                        className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Premium Metrics Dashboard Wallet Cards */}
      {store?.subaccountCode && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Main Net Earnings */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-5 shadow-sm shadow-gray-100/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wide uppercase text-gray-400">Total Net Earnings</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <ArrowUpRight size={14} />
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatNaira(totalEarnings)}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              All-Time Cumulative Channel
            </p>
          </div>

          {/* Current Calendar Cycle */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-5 shadow-sm shadow-gray-100/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wide uppercase text-gray-400">This Month</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Calendar size={13} />
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatNaira(thisMonthEarnings)}
            </p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1.5 whitespace-nowrap truncate">
              {now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Clearing / Processing Escrow Status */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/30 p-5 shadow-sm shadow-gray-100/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wide uppercase text-gray-400">Pending Settlement</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Loader2 size={13} className="animate-spin" />
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight sm:text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatNaira(pendingSettlement)}
            </p>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1.5 flex items-center gap-1">
              Processing Last 24 Hours
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: Micro-Filtered Financial Datagrid / Mobile List Stack */}
      {store?.subaccountCode && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-gray-100/40">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Transaction History</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Audit log of payments cleared through merchant checkout channels.</p>
            </div>
            
            {/* Search Input bar */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or reference hash..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 outline-none transition-all focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/10 placeholder:text-gray-400 font-medium"
              />
            </div>
          </div>

          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Compiling ledger receipts...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-gray-100/60 text-gray-300">
                <Wallet size={20} strokeWidth={1.5} />
              </div>
              <p className="text-xs font-bold text-gray-700">No matching entries recorded</p>
              <p className="text-[11px] text-gray-400 mt-0.5 max-w-[240px]">Historical parameters outside search grid query filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop Interface Table (Tablet screens up to Desktop) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Date</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Reference Hash</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Customer Identity</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Line Items Summary</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 text-right">Net Amount</th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 text-center">Clearing Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/40 transition-colors group">
                        <td className="px-5 py-3.5 text-xs font-medium text-gray-400 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3.5 text-xs font-mono text-gray-900 font-bold tracking-tight uppercase">{order.id?.substring(0, 8)}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-gray-900 max-w-[140px] truncate">{order.customerName}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 max-w-xs truncate font-medium">{order.items}</td>
                        <td className="px-5 py-3.5 text-xs font-black text-gray-900 text-right whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNaira(order.grandTotal)}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-extrabold text-green-700 border border-green-100">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Mobile-First Card Grid Stack (Fires on all Phone Devices implicitly) */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-2.5 bg-white hover:bg-gray-50/30 transition-colors">
                    
                    {/* Card Row 1: ID & Status Badging */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono font-black text-gray-900 tracking-tight uppercase bg-gray-100 rounded px-1.5 py-0.5">
                          #{order.id?.substring(0, 8)}
                        </span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-100">
                        {order.status}
                      </span>
                    </div>

                    {/* Card Row 2: Customer Identity Profile */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <User size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{order.customerName}</span>
                    </div>

                    {/* Card Row 3: Product Inventory / Items Text */}
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 font-medium">
                      <Package size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1 break-all">{order.items}</span>
                    </div>

                    {/* Card Row 4: Base Metrics Footer Metadata */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                        <Calendar size={11} />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <span className="text-sm font-black text-gray-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatNaira(order.grandTotal)}
                      </span>
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* SECTION 4: Premium Paystack Compliance / Settlement Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm shadow-blue-50/20">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wide">Automated Escrow Protocol</p>
          <p className="text-xs leading-relaxed text-blue-800 font-medium">
            Your revenue balances are securely processed and automatically pushed straight into your linked bank account every consecutive business day via Paystack architecture nodes. No secondary action required.
          </p>
        </div>
      </div>

    </div>
  )
}