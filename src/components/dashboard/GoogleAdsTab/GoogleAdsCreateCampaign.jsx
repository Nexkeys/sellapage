//src/components/dashboard/GoogleAdsTab/GoogleAdsCreateCampaign.jsx
import { useState } from 'react'
import { auth } from '../../../firebase/config'
import { ArrowLeft, Loader2, Target, Eye, ShoppingCart, Zap } from 'lucide-react'

const CAMPAIGN_TYPES = [
  { id: 'SEARCH', label: 'Search', desc: 'Text ads on Google search results', icon: Target, color: 'blue' },
  { id: 'DISPLAY', label: 'Display', desc: 'Visual ads across Google websites', icon: Eye, color: 'purple' },
  { id: 'SHOPPING', label: 'Shopping', desc: 'Product ads for e-commerce', icon: ShoppingCart, color: 'green' },
  { id: 'PERFORMANCE_MAX', label: 'Performance Max', desc: 'AI-optimized across all channels', icon: Zap, color: 'orange' },
]

export default function GoogleAdsCreateCampaign({ store, onBack, onCreated, onError }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'SEARCH',
    budgetType: 'daily',
    budgetAmount: '',
    keywords: '',
    headlines: ['', '', ''],
    descriptions: ['', ''],
    finalUrl: '',
    startDate: '',
  })

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.name || !form.budgetAmount) {
      onError('Please fill in campaign name and budget')
      return
    }

    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/google-ads-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          action: 'create',
          campaignData: {
            name: form.name,
            type: form.type,
            budgetType: form.budgetType,
            budgetAmount: Number(form.budgetAmount),
            targeting: {
              keywords: form.keywords.split('\n').filter(Boolean),
              headlines: form.headlines.filter(Boolean),
              descriptions: form.descriptions.filter(Boolean),
              finalUrl: form.finalUrl,
            },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      onCreated({
        id: data.campaignId,
        name: form.name,
        type: form.type,
        status: 'PAUSED',
        budgetType: form.budgetType,
        budgetAmount: Number(form.budgetAmount),
        spendToDate: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
      })
    } catch (err) {
      onError(err.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = form.type === 'SEARCH' ? 4 : 3

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all">
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Create Campaign</h3>
          <p className="text-[10px] text-gray-400">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step 1: Campaign Type */}
      {step === 1 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900">Campaign Type</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAMPAIGN_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => update('type', type.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.type === type.id
                    ? `border-${type.color}-500 bg-${type.color}-50`
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <type.icon size={14} className={`text-${type.color}-500`} />
                  <span className="text-xs font-bold text-gray-900">{type.label}</span>
                </div>
                <p className="text-[10px] text-gray-500">{type.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Campaign Details */}
      {step === 2 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900">Campaign Details</h4>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Campaign Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g., Summer Sale Campaign"
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Budget Type</label>
              <div className="flex gap-2">
                {['daily', 'lifetime'].map((bt) => (
                  <button
                    key={bt}
                    onClick={() => update('budgetType', bt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      form.budgetType === bt
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {bt === 'daily' ? 'Daily Budget' : 'Lifetime Budget'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Budget Amount (₦)</label>
              <input
                type="number"
                value={form.budgetAmount}
                onChange={(e) => update('budgetAmount', e.target.value)}
                placeholder="e.g., 5000"
                min="100"
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Final URL</label>
              <input
                type="url"
                value={form.finalUrl}
                onChange={(e) => update('finalUrl', e.target.value)}
                placeholder="https://your-store.com.ng"
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all">
              Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Keywords/Search Ads (only for Search type) */}
      {step === 3 && form.type === 'SEARCH' && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900">Keywords & Ad Copy</h4>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Keywords (one per line)</label>
              <textarea
                value={form.keywords}
                onChange={(e) => update('keywords', e.target.value)}
                placeholder={"buy shoes online\nbest sneakers nigeria\naffordable fashion"}
                rows={4}
                className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Headlines (max 30 chars each)</label>
              {form.headlines.map((h, i) => (
                <input
                  key={i}
                  type="text"
                  value={h}
                  onChange={(e) => {
                    const newHeadlines = [...form.headlines]
                    newHeadlines[i] = e.target.value.slice(0, 30)
                    update('headlines', newHeadlines)
                  }}
                  placeholder={`Headline ${i + 1}`}
                  maxLength={30}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent mb-1.5"
                />
              ))}
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">Descriptions (max 90 chars each)</label>
              {form.descriptions.map((d, i) => (
                <input
                  key={i}
                  type="text"
                  value={d}
                  onChange={(e) => {
                    const newDescs = [...form.descriptions]
                    newDescs[i] = e.target.value.slice(0, 90)
                    update('descriptions', newDescs)
                  }}
                  placeholder={`Description ${i + 1}`}
                  maxLength={90}
                  className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 border border-transparent mb-1.5"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all">
              Back
            </button>
            <button onClick={() => setStep(4)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all">
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3 (non-Search) or Step 4: Review */}
      {(step === 3 && form.type !== 'SEARCH') || step === 4 ? (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900">Review Campaign</h4>
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Name</span>
              <span className="font-medium text-gray-900">{form.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Type</span>
              <span className="font-medium text-gray-900">{CAMPAIGN_TYPES.find((t) => t.id === form.type)?.label}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Budget</span>
              <span className="font-medium text-gray-900">₦{Number(form.budgetAmount).toLocaleString()}/{form.budgetType === 'daily' ? 'day' : 'total'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Final URL</span>
              <span className="font-medium text-gray-900 truncate ml-4">{form.finalUrl || '—'}</span>
            </div>
            {form.type === 'SEARCH' && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Keywords</span>
                  <span className="font-medium text-gray-900">{form.keywords.split('\n').filter(Boolean).length} keywords</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Headlines</span>
                  <span className="font-medium text-gray-900">{form.headlines.filter(Boolean).length} headlines</span>
                </div>
              </>
            )}
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700">
              Campaign will be created in <span className="font-bold">PAUSED</span> state. You can activate it anytime from the campaigns list.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(form.type === 'SEARCH' ? 3 : 2)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Create Campaign
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
