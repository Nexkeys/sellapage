//src/components/dashboard/LeadsTab.jsx/
import { Users, Phone, Calendar, Tag, Loader2, MessageSquare, Lock } from 'lucide-react'

const STATUS_STYLES = {
  new:       'bg-blue-50 text-blue-700 border border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border border-amber-200',
  closed:    'bg-green-50 text-green-700 border border-green-200',
}

const LEAD_TYPE_STYLES = {
  product: 'bg-green-50 text-green-700 border border-green-200',
  service: 'bg-blue-50 text-blue-700 border border-blue-200',
}

function LeadTypeBadge({ leadType }) {
  if (!LEAD_TYPE_STYLES[leadType]) return null
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${LEAD_TYPE_STYLES[leadType]}`}>
      {leadType === 'product' ? 'Product' : 'Service'}
    </span>
  )
}

export default function LeadsTab({ leadsLoading, leads, isPro }) {
  // Non-Pro gate
  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[70vh]">
        <div className="text-center space-y-5 w-full">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center">
              <Lock size={32} className="text-gray-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Hot Leads — Pro Feature</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              See every customer who left their details on your store — name, phone, message, and status tracking.
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-left max-w-xs mx-auto space-y-2.5">
            {['Full name, phone & message','Product they enquired about','Mark as new / contacted / closed','Never miss a potential sale'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {f}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 items-center">
            <span className="text-xs text-gray-400">Available on Pro — ₦12,000/month</span>
          </div>
        </div>
      </div>
    )
  }

  // Pro view
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Leads</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Pro</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">People who left their details on your store page.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
      { label: 'Total Leads',  value: leads.length },
      { label: 'New',          value: leads.filter(l => !l.status || l.status === 'new').length },
      { label: 'Contacted',    value: leads.filter(l => l.status === 'contacted').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {leadsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-green-500 animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
            <MessageSquare size={20} className="text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700">No leads yet</p>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            When customers fill out the enquiry form on your store, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1.6fr_1.4fr_3fr_0.8fr_1.2fr_1fr] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/70">
            {['Customer','Phone','Message','Product','Date','Status'].map(h => (
              <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-gray-100">
            {leads.map(lead => (
              <div key={lead.id}>
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1.6fr_1.4fr_3fr_0.8fr_1.2fr_1fr] gap-4 items-start px-5 py-4 hover:bg-gray-50/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-bold text-xs">{(lead.name || '?')[0].toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.name || '—'}</p>
                    <LeadTypeBadge leadType={lead.leadType} />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Phone size={11} className="text-gray-400 flex-shrink-0 mt-1" />
                    <p className="text-sm text-gray-600 break-words min-w-0">{lead.phone || lead.whatsapp || '—'}</p>
                  </div>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap break-words leading-relaxed">
                    {lead.interest || lead.message || '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{lead.productName || lead.productId || '—'}</p>
                  <p className="text-xs text-gray-400">
                    {lead.createdAt?.toDate
                      ? lead.createdAt.toDate().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
                      : '—'}
                  </p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit capitalize ${STATUS_STYLES[lead.status || 'new']}`}>
                    {lead.status || 'new'}
                  </span>
                </div>
                {/* Mobile card */}
                <div className="sm:hidden flex items-start gap-3 px-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-700 font-bold text-sm">{(lead.name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{lead.name || '—'}</p>
                        <LeadTypeBadge leadType={lead.leadType} />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${STATUS_STYLES[lead.status || 'new']}`}>
                        {lead.status || 'new'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{lead.phone || lead.whatsapp || '—'}</p>
                    {(lead.interest || lead.message) && (
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                        {lead.interest || lead.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400 font-medium">Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
