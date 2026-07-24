import { useState } from 'react'
import { auth } from '../../../firebase/config'
import GoogleAdsCreateCampaign from './GoogleAdsCreateCampaign'
import {
  Target,
  Plus,
  Pause,
  Play,
  Loader2,
  Eye,
  MousePointerClick,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function formatCurrency(amount, currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode || 'USD', minimumFractionDigits: 0 }).format(amount || 0)
}

const TYPE_CONFIG = {
  SEARCH: { label: 'Search', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  DISPLAY: { label: 'Display', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  SHOPPING: { label: 'Shopping', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  PERFORMANCE_MAX: { label: 'Performance Max', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
}

const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  ENABLED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PAUSED: 'bg-amber-50 text-amber-700 border border-amber-100',
  REMOVED: 'bg-red-50 text-red-700 border border-red-100',
}

export default function GoogleAdsCampaigns({ store, campaigns, setCampaigns, onError, onSuccess }) {
  const currencyCode = store?.googleAdsCurrency || 'USD'
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const handlePauseResume = async (campaignId, currentStatus) => {
    setActionLoading(campaignId)
    try {
      const token = await auth.currentUser?.getIdToken()
      const action = currentStatus === 'PAUSED' ? 'resume' : 'pause'
      const res = await fetch('/api/google-ads-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: store.id, action, campaignId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, status: data.status } : c))
      )
      onSuccess(`Campaign ${action === 'pause' ? 'paused' : 'resumed'} successfully`)
    } catch (err) {
      onError(err.message || 'Failed to update campaign')
    } finally {
      setActionLoading(null)
    }
  }

  if (showCreate) {
    return (
      <GoogleAdsCreateCampaign
        store={store}
        onBack={() => setShowCreate(false)}
        onCreated={(newCampaign) => {
          setCampaigns((prev) => [newCampaign, ...prev])
          setShowCreate(false)
          onSuccess('Campaign created successfully')
        }}
        onError={onError}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <Plus size={13} />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Target size={20} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">No campaigns yet</p>
          <p className="text-xs text-gray-400 mb-4">Create your first Google Ads campaign</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            Create Campaign
          </button>
        </div>
      )}

      {campaigns.map((campaign) => {
        const typeInfo = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.SEARCH
        const isExpanded = expandedId === campaign.id
        const isActive = campaign.status === 'ACTIVE' || campaign.status === 'ENABLED'

        return (
          <div key={campaign.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{campaign.name}</h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[campaign.status] || STATUS_STYLES.PAUSED}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border} border`}>
                      {typeInfo.label}
                    </span>
                    <span>Budget: {formatCurrency(campaign.budgetAmount, currencyCode)}/{campaign.budgetType === 'daily' ? 'day' : 'total'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handlePauseResume(campaign.id, campaign.status)}
                    disabled={actionLoading === campaign.id}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                    }`}
                    title={isActive ? 'Pause' : 'Resume'}
                  >
                    {actionLoading === campaign.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isActive ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                    className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors border border-gray-100"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Eye size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{campaign.impressions || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MousePointerClick size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{campaign.clicks || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-500">{formatCurrency(campaign.spendToDate, currencyCode)}</span>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 mb-0.5">Impressions</p>
                    <p className="font-semibold text-gray-900">{campaign.impressions || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Clicks</p>
                    <p className="font-semibold text-gray-900">{campaign.clicks || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">CTR</p>
                    <p className="font-semibold text-gray-900">{campaign.ctr || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Conversions</p>
                    <p className="font-semibold text-gray-900">{campaign.conversions || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
