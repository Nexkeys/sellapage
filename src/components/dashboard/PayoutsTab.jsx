import { Wallet, ArrowRight, Info, Mail } from 'lucide-react'

export default function PayoutsTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Payouts</h1>
        <p className="text-gray-400 text-sm mt-1">Track your earnings and withdraw your balance.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
          <Wallet size={24} className="text-green-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Automated Payouts — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a full payout system so your earnings are tracked automatically and you can withdraw to any Nigerian bank account directly from your dashboard.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Real-time earnings balance from confirmed orders',
              'One-tap withdrawal to any Nigerian bank account',
              'Full payout history with transaction references',
              'Scheduled automatic weekly or monthly payouts',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                <ArrowRight size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Manual payout request note */}
        <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Mail size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm leading-relaxed text-left">
              <span className="font-semibold">To request a manual payout,</span> contact Sellapage support and we'll process it for you within 1–2 business days.
            </p>
          </div>
          <a
            href="mailto:nexkeysagency@gmail.com?subject=Payout%20Request"
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Mail size={14} />
            nexkeysagency@gmail.com
          </a>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">Note:</span> Since orders are currently handled over WhatsApp, your earnings go directly to you at the point of sale. The payout dashboard will become relevant once in-app checkout is live.
        </p>
      </div>
    </div>
  )
}