// src/components/dashboard/PayoutsTab.jsx/
import { useState } from 'react'
import { Wallet, Info, Check, Search, Calendar, User, Package, ArrowRight } from 'lucide-react'

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

  const handleBankSubmit = async (e) => {
    e.preventDefault()
    setBankSubmitting(true)
    setBankError('')

    try {
      const token = await user.getIdToken()
      const response = await fetch('/.netlify/functions/create-subaccount', {
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
      if (onSubaccountCreated && data.subaccountCode) {
        onSubaccountCreated(data.subaccountCode)
      }
    } catch (err) {
      setBankError(err.message)
    } finally {
      setBankSubmitting(false)
    }
  }

  const maskAccountNumber = (number) => {
    if (!number || number.length < 4) return number
    return '*'.repeat(number.length - 4) + number.slice(-4)
  }

  // Calculate earnings
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

  // Filter transactions
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payouts</h1>
        <p className="text-gray-400 text-sm mt-1">Track your earnings and manage your bank account.</p>
      </div>

      {/* Section 1: Bank Account Setup */}
      {!store?.subaccountCode ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-extrabold text-gray-900 text-lg mb-4">Connect Your Bank Account</h2>
          {bankSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Bank Account Connected</p>
                <p className="text-sm text-green-700">Account ending in {maskAccountNumber(bankForm.accountNumber)}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBankSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank Name</label>
                <select
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setBankForm({ ...bankForm, accountNumber: value })
                  }}
                  placeholder="10-digit account number"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
                <input
                  type="text"
                  value={bankForm.businessName}
                  onChange={(e) => setBankForm({ ...bankForm, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  required
                />
              </div>

              {bankError && (
                <p className="text-sm text-red-600">{bankError}</p>
              )}

              <button
                type="submit"
                disabled={bankSubmitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {bankSubmitting ? 'Connecting...' : 'Connect Bank Account'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-green-500" />
              </div>
              <div>
                <h2 className="font-extrabold text-gray-900 text-lg">Bank Account Connected</h2>
                <p className="text-sm text-gray-500">Account ending in ****{store.subaccountCode?.slice(-4) || '****'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">Connected</span>
              <button className="text-sm text-green-600 hover:text-green-700 font-semibold">
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Earnings Overview - Only show when subaccount exists */}
      {store?.subaccountCode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Earnings</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatNaira(totalEarnings)}</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-500 mb-1">This Month</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatNaira(thisMonthEarnings)}</p>
            <p className="text-xs text-gray-400 mt-1">{now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-500 mb-1">Pending Settlement</p>
            <p className="text-2xl font-extrabold text-gray-900">{formatNaira(pendingSettlement)}</p>
            <p className="text-xs text-gray-400 mt-1">Last 24 hours</p>
          </div>
        </div>
      )}

      {/* Section 3: Transaction History - Only show when subaccount exists */}
      {store?.subaccountCode && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="font-extrabold text-gray-900 text-lg">Transaction History</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or order ID..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none w-full sm:w-64"
              />
            </div>
          </div>

          {ordersLoading ? (
            <div className="text-center py-8 text-gray-500">Loading transactions...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions yet</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                        <td className="py-3 px-2 text-sm font-mono text-gray-900">{order.id?.substring(0, 8)}</td>
                        <td className="py-3 px-2 text-sm text-gray-900">{order.customerName}</td>
                        <td className="py-3 px-2 text-sm text-gray-600 max-w-xs truncate">{order.items}</td>
                        <td className="py-3 px-2 text-sm font-semibold text-gray-900">{formatNaira(order.grandTotal)}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{formatDate(order.createdAt)}</span>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">{order.id?.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">{order.customerName}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Package size={14} className="text-gray-400 mt-0.5" />
                      <span className="text-sm text-gray-600">{order.items}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm font-extrabold text-gray-900">{formatNaira(order.grandTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Section 4: Settlement Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">Settlement Info:</span> Your earnings are automatically settled to your registered bank account every business day by Paystack. No action needed on your end.
        </p>
      </div>
    </div>
  )
}