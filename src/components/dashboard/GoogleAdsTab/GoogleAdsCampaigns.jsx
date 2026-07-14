//src/components/dashboard/GoogleAdsTab/GoogleAdsCampaigns.jsx
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
  IndianRupee,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0)
}

const TYPE_LABELS = {
  SEARCH: { label: 'Search', color: 'blue', icon: Target },
  DISPLAY: { label: 'Display', color: 'purple', icon: Eye },
  SHOPPING: { label: 'Shopping', color: 'green', icon: Target },
  PERFORMANCE_MAX: { label: 'Performance Max', color: 'orange', icon: Target },
}

const STATUS_STYLES = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  ENABLED: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  REMOVED: 'bg-red-50 text-red-700 border-red-200',
}

export default function GoogleAdsCampaigns({ store, campaigns, setCampaigns, onError, onSuccess }) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-900">
          {campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5"
        >
          <Plus size={13} />
          New Campaign
        </button>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <Target size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900 mb-1">No campaigns yet</p>
          <p className="text-xs text-gray-400 mb-4">Create your first Google Ads campaign</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Create Campaign
          </button>
        </div>
      )}

      {campaigns.map((campaign) => {
        const typeInfo = TYPE_LABELS[campaign.type] || TYPE_LABELS.SEARCH
        const isExpanded = expandedId === campaign.id
        const isActive = campaign.status === 'ACTIVE' || campaign.status === 'ENABLED'

        return (
          <div key={campaign.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900 truncate">{campaign.name}</h4>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[campaign.status] || STATUS_STYLES.PAUSED}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <typeInfo.icon size={10} className={`text-${typeInfo.color}-500`} />
                      {typeInfo.label}
                    </span>
                    <span>Budget: {formatNaira(campaign.budgetAmount)}/{campaign.budgetType === 'daily' ? 'day' : 'total'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handlePauseResume(campaign.id, campaign.status)}
                    disabled={actionLoading === campaign.id}
                    className={`p-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
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
                    className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5">
                  <Eye size={10} className="text-gray-400" />
                  <span className="text-[10px] text-gray-500">{campaign.impressions || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MousePointerClick size={10} className="text-gray-400" />
                  <span className="text-[10px] text-gray-500">{campaign.clicks || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IndianRupee size={10} className="text-gray-400" />
                  <span className="text-[10px] text-gray-500">{formatNaira(campaign.spendToDate)}</span>
                </div>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 mb-0.5">Impressions</p>
                    <p className="font-bold text-gray-900">{campaign.impressions || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Clicks</p>
                    <p className="font-bold text-gray-900">{campaign.clicks || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">CTR</p>
                    <p className="font-bold text-gray-900">{campaign.ctr || 0}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Conversions</p>
                    <p className="font-bold text-gray-900">{campaign.conversions || 0}</p>
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
