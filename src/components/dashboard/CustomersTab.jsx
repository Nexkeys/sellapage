// src/components/dashboard/CustomersTab.jsx/
import { Users, ArrowRight, Info } from 'lucide-react'

export default function CustomersTab() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Customers</h1>
        <p className="text-gray-400 text-sm mt-1">People who have ordered from your store.</p>
      </div>

      {/* Coming soon card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
          <Users size={24} className="text-purple-500" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-extrabold text-gray-900 text-lg mb-2">Customer Directory — Coming Soon</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We're building a customer CRM so you can track every buyer, see their order history, and build lasting relationships.
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's coming</p>
          <ul className="space-y-2.5">
            {[
              'Automatic customer profiles built from orders',
              'Full order history per customer',
              'Total spend and repeat purchase tracking',
              'Direct WhatsApp message link per customer',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                <ArrowRight size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          <span className="font-semibold">Currently,</span> customer contact details come through the Leads tab whenever a buyer clicks the WhatsApp order button on your store. Check there to see who's interested.
        </p>
      </div>
    </div>
  )
}