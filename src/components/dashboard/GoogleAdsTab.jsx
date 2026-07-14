import { useState, useEffect, useCallback } from 'react'
import { doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { auth } from '../../firebase/config'
import {
  BarChart3,
  Target,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react'

import GoogleAdsConnect from './GoogleAdsTab/GoogleAdsConnect'
import GoogleAdsOverview from './GoogleAdsTab/GoogleAdsOverview'
import GoogleAdsCampaigns from './GoogleAdsTab/GoogleAdsCampaigns'
import GoogleAdsReports from './GoogleAdsTab/GoogleAdsReports'
import SellapageAdsForm from './GoogleAdsTab/SellapageAdsForm'

export default function GoogleAdsTab({ store, isPremium }) {
  const [activeView, setActiveView] = useState('overview')
  const [campaigns, setCampaigns] = useState([])
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSellapageForm, setShowSellapageForm] = useState(false)

  const isConnected = store?.googleAdsConnected || false

  useEffect(() => {
    if (!store?.id || !isConnected) return

    const fetchCampaigns = async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch('/api/google-ads-campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storeId: store.id, action: 'list' }),
        })
        const data = await res.json()
        if (res.ok) setCampaigns(data.campaigns || [])
      } catch (err) {
        console.error('Failed to fetch campaigns:', err)
      }
    }

    fetchCampaigns()
  }, [store?.id, isConnected])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleAdsStatus = params.get('google-ads')
    const adsPayment = params.get('ads-payment')

    if (googleAdsStatus === 'connected') {
      setSuccess('Google Ads account connected successfully!')
      window.history.replaceState({}, '', '/dashboard?tab=google-ads')
    } else if (googleAdsStatus === 'error') {
      setError(params.get('message') || 'Failed to connect Google Ads')
      window.history.replaceState({}, '', '/dashboard?tab=google-ads')
    }

    if (adsPayment === 'pending') {
      const reference = params.get('reference')
      if (reference) {
        handleAdsPaymentVerify(reference)
      }
      window.history.replaceState({}, '', '/dashboard?tab=google-ads')
    }
  }, [])

  const handleAdsPaymentVerify = async (reference) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/ads-payment-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reference, storeId: store.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.pending) {
          setSuccess('Payment confirmed! Campaign will be created once Google Ads is connected.')
        } else {
          setSuccess('Campaign created successfully! It starts in PAUSED state.')
        }
      } else {
        setError(data.error || 'Failed to verify payment')
      }
    } catch (err) {
      setError('Failed to verify payment. Please refresh the page.')
    }
  }

  const fetchReports = useCallback(async (dateRange = '30d') => {
    if (!store?.id) return
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/google-ads-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: store.id, dateRange }),
      })
      const data = await res.json()
      if (res.ok) setReports(data)
      else setError(data.error || 'Failed to fetch reports')
    } catch (err) {
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }, [store?.id])

  useEffect(() => {
    if (isConnected && activeView === 'reports') {
      fetchReports()
    }
  }, [isConnected, activeView, fetchReports])

  if (!isPremium) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
            <Target size={20} className="text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Google Ads</h1>
            <p className="text-xs text-gray-400">Premium feature</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-gray-300" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">Upgrade to Use Google Ads</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
            Google Ads integration is available on the <span className="font-semibold text-gray-700">Premium</span> plan. Upgrade to create, manage, and track ad campaigns.
          </p>
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Upgrade Plan
          </button>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gray-300" /> Pageview tracking</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gray-300" /> Add to Cart tracking</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gray-300" /> Purchase conversion</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gray-300" /> Auto tag injection</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
              <Target size={15} className="text-gray-500" />
            </div>
            Google Ads
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {isConnected ? 'Manage campaigns and track performance' : 'Connect your account or let us run ads for you'}
          </p>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium w-fit">
            <CheckCircle2 size={12} />
            Connected
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-600 text-xs flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
          <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-emerald-600 text-xs flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </div>
      )}

      {!isConnected && !showSellapageForm && (
        <GoogleAdsConnect
          store={store}
          onError={setError}
          onSuccess={setSuccess}
          onSellapageManaged={() => setShowSellapageForm(true)}
        />
      )}

      {showSellapageForm && (
        <SellapageAdsForm
          store={store}
          onBack={() => setShowSellapageForm(false)}
          onError={setError}
        />
      )}

      {isConnected && !showSellapageForm && (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'campaigns', label: 'Campaigns', icon: Target },
              { id: 'reports', label: 'Reports', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-1 justify-center ${
                  activeView === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeView === 'overview' && (
            <GoogleAdsOverview
              store={store}
              campaigns={campaigns}
              reports={reports}
              loading={loading}
              onRefresh={() => fetchReports()}
            />
          )}
          {activeView === 'campaigns' && (
            <GoogleAdsCampaigns
              store={store}
              campaigns={campaigns}
              setCampaigns={setCampaigns}
              onError={setError}
              onSuccess={setSuccess}
            />
          )}
          {activeView === 'reports' && (
            <GoogleAdsReports
              store={store}
              reports={reports}
              loading={loading}
              onRefresh={fetchReports}
            />
          )}
        </>
      )}
    </div>
  )
}
