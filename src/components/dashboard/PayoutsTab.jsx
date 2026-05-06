import { Wallet, ArrowDownLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const TRANSACTIONS = [
  { id: 'PAY-001', amount: 48500,  date: 'May 20, 2025', status: 'Completed', bank: 'Zenith Bank · 0123456789' },
  { id: 'PAY-002', amount: 32000,  date: 'May 13, 2025', status: 'Completed', bank: 'GTBank · 9876543210' },
  { id: 'PAY-003', amount: 61800,  date: 'May 6, 2025',  status: 'Completed', bank: 'Zenith Bank · 0123456789' },
  { id: 'PAY-004', amount: 18000,  date: 'Apr 29, 2025', status: 'Processing',bank: 'First Bank · 1122334455' },
]

export default function PayoutsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payouts</h1>
          <p className="text-gray-400 text-sm mt-1">Track your earnings and payout history.</p>
        </div>
        <button className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-fit">
          <ArrowDownLeft size={14} /> Request Payout
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-green-50 text-green-600 flex-shrink-0">
            <Wallet size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-green-600">&#8358;324,850</p>
            <p className="text-gray-400 text-xs font-medium">Available Balance</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 flex-shrink-0">
            <CheckCircle size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-blue-600">&#8358;160,300</p>
            <p className="text-gray-400 text-xs font-medium">Total Paid Out</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 flex-shrink-0">
            <Clock size={19} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-amber-600">&#8358;18,000</p>
            <p className="text-gray-400 text-xs font-medium">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <p><span className="font-bold">Automated payouts are coming soon.</span> For now, reach out to Sellapage support via WhatsApp to process your payout manually.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">Payout History</p>
          <span className="text-xs text-gray-400 font-medium">4 transactions</span>
        </div>
        <div className="divide-y divide-gray-100">
          {TRANSACTIONS.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-gray-50/40 transition-colors">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={16} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">&#8358;{t.amount.toLocaleString()}</p>
                <p className="text-gray-400 text-xs truncate">{t.bank} &middot; {t.date}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                t.status === 'Completed'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
