import { Clock, CheckCircle2, XCircle, AlertTriangle, Eye, MousePointerClick, DollarSign } from 'lucide-react'

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0)
}

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  PAUSED: { label: 'Approved', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  REJECTED: { label: 'Rejected', icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  FAILED: { label: 'Failed', icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
}

export default function SellapageManagedCampaigns({ campaigns }) {
  const sellapageCampaigns = (campaigns || []).filter((c) => c.managementMode === 'sellapage')
  if (sellapageCampaigns.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Your Sellapage-Managed Campaigns</h3>
      {sellapageCampaigns.map((c) => {
        const statusInfo = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING_REVIEW
        return (
          <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{c.name}</h4>
                <p className="text-[11px] text-gray-400">{c.type} · {formatNaira(c.budgetAmount)}/day</p>
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                <statusInfo.icon size={11} />
                {statusInfo.label}
              </span>
            </div>

            {c.status === 'REJECTED' && c.rejectionReason && (
              <p className="text-[11px] text-red-600 bg-red-50 rounded-lg p-2 mt-2">{c.rejectionReason}</p>
            )}
            {c.status === 'FAILED' && c.error && (
              <p className="text-[11px] text-red-600 bg-red-50 rounded-lg p-2 mt-2">{c.error}</p>
            )}
            {c.status === 'PENDING_REVIEW' && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2 mt-2">Your campaign is being reviewed by our team — usually within a business day.</p>
            )}

            {(c.status === 'APPROVED' || c.status === 'PAUSED') && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Eye size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{c.impressions || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MousePointerClick size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{c.clicks || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{formatNaira(c.spendToDate)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
