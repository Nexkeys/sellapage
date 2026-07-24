import { useState, useEffect } from 'react'
import { auth } from '../../../firebase/config'
import { uploadSingleImage } from '../../../firebase/products'
import { ArrowLeft, Loader2, Target, Eye, ShoppingCart, Zap, X, ImagePlus } from 'lucide-react'

const CAMPAIGN_TYPES = [
  { id: 'SEARCH', label: 'Search', desc: 'Text ads on Google search results', icon: Target, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeBg: 'bg-blue-50', activeBorder: 'border-blue-400' },
  { id: 'DISPLAY', label: 'Display', desc: 'Visual ads across Google websites', icon: Eye, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', activeBg: 'bg-purple-50', activeBorder: 'border-purple-400' },
  { id: 'SHOPPING', label: 'Shopping', desc: 'Coming soon — requires Google Merchant Center', icon: ShoppingCart, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-400', disabled: true },
  { id: 'PERFORMANCE_MAX', label: 'Performance Max', desc: 'Coming soon — requires Google Merchant Center', icon: Zap, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', activeBg: 'bg-orange-50', activeBorder: 'border-orange-400', disabled: true },
]

const MAX_IMAGES = 5

function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount || 0)
}

export default function SellapageAdsForm({ store, onBack, onError }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'SEARCH',
    budgetAmount: '',
    targetLocation: '',
    keywords: '',
    headlines: ['', '', ''],
    descriptions: ['', ''],
    finalUrl: '',
    images: [],
  })

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  // Canceling on Paystack's checkout returns here via the browser's back/forward cache (bfcache)
  // instead of a fresh page load — React state (including a stuck `loading: true` on the Pay
  // button) can be restored exactly as it was, with no code path left to reset it. Force a reset
  // whenever the page is restored from bfcache.
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) setLoading(false)
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const budget = Number(form.budgetAmount) || 0
  const serviceCharge = Math.round(budget * 0.10)
  const total = budget + serviceCharge

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (form.images.length + files.length > MAX_IMAGES) {
      onError(`You can upload up to ${MAX_IMAGES} images`)
      return
    }
    setUploadingImage(true)
    try {
      const uploaded = []
      for (const file of files) {
        const url = await uploadSingleImage(file, 'sellapage/ads')
        uploaded.push(url)
      }
      update('images', [...form.images, ...uploaded])
    } catch (err) {
      onError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const removeImage = (index) => {
    update('images', form.images.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.budgetAmount) {
      onError('Please fill in campaign name and budget')
      return
    }
    if (budget < 100) {
      onError('Budget must be at least ₦100')
      return
    }

    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/ads-payment-initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          campaignName: form.name,
          campaignType: form.type,
          budgetAmount: budget,
          targetLocation: form.targetLocation,
          businessName: store?.businessName || store?.storeName || form.name,
          images: form.images,
          targeting: {
            keywords: form.keywords.split('\n').filter(Boolean),
            headlines: form.headlines.filter(Boolean),
            descriptions: form.descriptions.filter(Boolean),
            finalUrl: form.finalUrl,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      window.location.href = data.authorization_url
    } catch (err) {
      onError(err.message || 'Failed to initialize payment')
      setLoading(false)
    }
  }

  const totalSteps = 4

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft size={16} className="text-gray-600" />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Create Ad Campaign</h3>
          <p className="text-[11px] text-gray-400">Step {step} of {totalSteps} · Sellapage-managed</p>
        </div>
      </div>

      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">Campaign Type</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAMPAIGN_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => !type.disabled && update('type', type.id)}
                disabled={type.disabled}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  type.disabled
                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    : form.type === type.id
                    ? `${type.activeBg} ${type.activeBorder}`
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <type.icon size={14} className={form.type === type.id && !type.disabled ? type.text : 'text-gray-400'} />
                  <span className="text-xs font-semibold text-gray-900">{type.label}</span>
                </div>
                <p className="text-[10px] text-gray-400">{type.desc}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">Campaign Details</h4>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Campaign Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g., Summer Sale Campaign"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Daily Budget (₦)</label>
              <input
                type="number"
                value={form.budgetAmount}
                onChange={(e) => update('budgetAmount', e.target.value)}
                placeholder="e.g., 5000"
                min="100"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Target Location</label>
              <input
                type="text"
                value={form.targetLocation}
                onChange={(e) => update('targetLocation', e.target.value)}
                placeholder="e.g., Lagos, Nigeria"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Final URL</label>
              <input
                type="url"
                value={form.finalUrl}
                onChange={(e) => update('finalUrl', e.target.value)}
                placeholder="https://your-store.com.ng"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors">
              Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">{form.type === 'SEARCH' ? 'Keywords & Ad Copy' : 'Images & Ad Copy'}</h4>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            {form.type === 'SEARCH' && (
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block">Keywords (one per line)</label>
                <textarea
                  value={form.keywords}
                  onChange={(e) => update('keywords', e.target.value)}
                  placeholder={"buy shoes online\nbest sneakers nigeria\naffordable fashion"}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 resize-none transition-colors"
                />
              </div>
            )}

            {form.type === 'DISPLAY' && (
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block">Images (up to {MAX_IMAGES})</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={`Ad image ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {form.images.length < MAX_IMAGES && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 transition-colors">
                      {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">Landscape images work best (min. 600×314px).</p>
              </div>
            )}

            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Headlines (max 30 chars each)</label>
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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 mb-1.5 transition-colors"
                />
              ))}
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-medium mb-1 block">Descriptions (max 90 chars each)</label>
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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 mb-1.5 transition-colors"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors">
              Back
            </button>
            <button onClick={() => setStep(4)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors">
              Review & Pay
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-900">Review & Payment</h4>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Campaign Name</span>
              <span className="font-medium text-gray-900">{form.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Type</span>
              <span className="font-medium text-gray-900">{CAMPAIGN_TYPES.find((t) => t.id === form.type)?.label}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Location</span>
              <span className="font-medium text-gray-900">{form.targetLocation || '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Final URL</span>
              <span className="font-medium text-gray-900 truncate ml-4">{form.finalUrl || '—'}</span>
            </div>
            {form.type === 'SEARCH' && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Keywords</span>
                <span className="font-medium text-gray-900">{form.keywords.split('\n').filter(Boolean).length} keywords</span>
              </div>
            )}
            {form.type === 'DISPLAY' && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Images</span>
                <span className="font-medium text-gray-900">{form.images.length} uploaded</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <h5 className="text-xs font-semibold text-gray-900 mb-2">Payment Breakdown</h5>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Ad Spend (daily)</span>
              <span className="font-medium text-gray-900">{formatNaira(budget)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Service Charge (10%)</span>
              <span className="font-medium text-gray-900">{formatNaira(serviceCharge)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 mt-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatNaira(total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-[11px] text-amber-700">
              After payment, your campaign will be <span className="font-semibold">reviewed by our team</span> before it goes live — usually within a business day.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Pay {formatNaira(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
