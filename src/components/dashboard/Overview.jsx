//src/components/dashboard/Overview.jsx/
import {
  Plus, Copy, Check, ExternalLink, Users, ArrowRight,
  AlertCircle, TrendingUp, ShoppingBag, Eye, Lock,
} from 'lucide-react'



export default function OverviewTab({
  store, plan, maxProducts, productCount = 0, serviceCount = 0, services = [], vendorType = 'products', limitReached,
  isGrowthOrPro, isPro,
  leads, products = [], storeUrl, copied, copyLink,
  navigateTo, setShowForm,
  analyticsData,
}) {
  // derive which count and label to show
  let derivedCount = productCount || 0
  let label = 'Products Listed'
  if (vendorType === 'services') {
    derivedCount = serviceCount || 0
    label = 'Services Listed'
  } else if (vendorType === 'both') {
    derivedCount = (productCount || 0) + (serviceCount || 0)
    label = 'Total Listings'
  }

  const pct = Math.min(100, Math.round((derivedCount / maxProducts) * 100))
  const totalViews  = analyticsData?.totalViews  ?? 0
  const engagedViews = analyticsData?.engagedViews ?? 0

  let engagementRateNum = totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;
  if (engagementRateNum > 100) engagementRateNum = 100;
  const engagementRate = totalViews > 0 ? `${engagementRateNum.toFixed(0)}%` : '—';

  const PLAN_LABEL = {
    starter: { text: 'Free Plan',    cls: 'bg-gray-100 text-gray-600' },
    growth:  { text: 'Growth Plan',  cls: 'bg-blue-100 text-blue-700' },
    pro:     { text: 'Pro Plan ✦',   cls: 'bg-yellow-100 text-yellow-700' },
    premium: { text: 'Premium Plan ✦', cls: 'bg-orange-100 text-orange-700' },
  }
  const planLabel = PLAN_LABEL[plan] || PLAN_LABEL.starter


  return (
    <div className="p-4 sm:p-5 max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Good day, {store?.businessName?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Here's what's happening with your store today.</p>
      </div>


      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Products */}
        <div className={`rounded-2xl p-4 border transition-all ${limitReached ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${limitReached ? 'bg-amber-100' : 'bg-green-50'} mb-3`}>
              <ShoppingBag size={14} className={limitReached ? 'text-amber-600' : 'text-green-600'} />
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${planLabel.cls}`}>{planLabel.text}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{derivedCount}</p>
          <p className="text-gray-400 text-[11px] mt-0.5">{label}</p>
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${limitReached ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {derivedCount} / {maxProducts === 999999 ? 'Unlimited' : maxProducts}
          </p>
        </div>


        {/* Leads */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 transition-all">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Users size={14} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{leads.length}</p>
          <p className="text-gray-400 text-[11px] mt-0.5">Customer Leads</p>
          <p className="text-[10px] text-gray-400 mt-1.5">from lead form</p>
        </div>


        {/* Store Views — Growth/Pro only */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 relative overflow-hidden transition-all">
          {!isGrowthOrPro && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-10">
              <Lock size={14} className="text-gray-400" />
              <p className="text-[10px] text-gray-400 font-semibold text-center px-2">Growth+ feature</p>
            </div>
          )}
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <Eye size={14} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {isGrowthOrPro ? totalViews.toLocaleString() : '—'}
          </p>
          <p className="text-gray-400 text-[11px] mt-0.5">Store Views</p>
          <p className="text-[10px] text-gray-400 mt-1.5">all time</p>
        </div>


        {/* Conversion — Pro only */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 relative overflow-hidden transition-all">
          {!isPro && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-10">
              <Lock size={14} className="text-gray-400" />
              <p className="text-[10px] text-gray-400 font-semibold text-center px-2">Pro feature</p>
            </div>
          )}
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <TrendingUp size={14} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {isPro && totalViews > 0
              ? `${((engagedViews / totalViews) * 100).toFixed(1)}%`
              : '—'}
          </p>
          <p className="text-gray-400 text-[11px] mt-0.5">Engagement Rate</p>
          <p className="text-[10px] text-gray-400 mt-1.5">of visitors who interacted</p>
        </div>
      </div>


      {/* Limit reached warning */}
      {limitReached && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-semibold text-xs">{vendorType === 'services' ? 'Service limit reached' : vendorType === 'both' ? 'Listing limit reached' : 'Product limit reached'}</p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
              {vendorType === 'services' ? (
                <>You've used all {maxProducts} service slots on the {plan} plan.{' '}</>
              ) : vendorType === 'both' ? (
                <>You've used all {maxProducts} listing slots on the {plan} plan.{' '}</>
              ) : (
                <>You've used all {maxProducts} product slots on the {plan} plan.{' '}</>
              )}
              <button onClick={() => navigateTo('billing')} className="underline font-semibold hover:no-underline">
                Upgrade your plan →
              </button>
            </p>
          </div>
        </div>
      )}


      {/* Store link */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-800 text-xs">Your Store Link</p>
            <p className="text-gray-400 text-[11px] truncate mt-0.5">{storeUrl}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                copied ? 'bg-green-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500 hover:bg-green-600 text-white transition-all"
            >
              <ExternalLink size={13} /> View Store
            </a>
          </div>
        </div>
        <p className="text-gray-400 text-[11px] mt-2">Share on WhatsApp status, Instagram bio and many more.</p>
      </div>


      {/* Top Performing — Pro only */}
      {isPro && (
        <div className="space-y-4">
          {(vendorType === 'products' || vendorType === 'both') && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-xs">Top Performing Products</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pro</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-0.5">Ranked by customer clicks</p>
                </div>
                <button onClick={() => navigateTo('analytics')} className="text-green-600 text-[11px] font-semibold hover:underline flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {[...products]
                  .filter(p => (p.clicks || 0) > 0)
                  .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
                  .slice(0, 5)
                  .map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-gray-300 font-bold text-xs w-4 flex-shrink-0">#{i + 1}</span>
                      <p className="flex-1 text-xs font-semibold text-gray-700 truncate">{p.name}</p>
                      <p className="text-xs font-bold text-green-600">{p.clicks} click{p.clicks === 1 ? '' : 's'}</p>
                    </div>
                  ))}
                {products.filter(p => (p.clicks || 0) > 0).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-xs">
                    No clicks yet — share your store link to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {(vendorType === 'services' || vendorType === 'both') && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-xs">Top Performing Services</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pro</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-0.5">Ranked by booking requests</p>
                </div>
                <button onClick={() => navigateTo('analytics')} className="text-green-600 text-[11px] font-semibold hover:underline flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {[...services]
                  .filter(s => (s.bookingRequests || 0) > 0)
                  .sort((a, b) => (b.bookingRequests || 0) - (a.bookingRequests || 0))
                  .slice(0, 5)
                  .map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-gray-300 font-bold text-xs w-4 flex-shrink-0">#{i + 1}</span>
                      <p className="flex-1 text-xs font-semibold text-gray-700 truncate">{s.name}</p>
                      <p className="text-xs font-bold text-green-600">{s.bookingRequests} request{s.bookingRequests === 1 ? '' : 's'}</p>
                    </div>
                  ))}
                {services.filter(s => (s.bookingRequests || 0) > 0).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-xs">
                    No booking requests yet — promote your services to get bookings.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Quick actions */}
      {vendorType === 'both' ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setShowForm(true); navigateTo('products') }}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-green-200 hover:bg-green-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Plus size={14} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">Add Product</p>
          </button>
          <button
            onClick={() => navigateTo('services')}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-green-200 hover:bg-green-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <Plus size={14} className="text-teal-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">Add Service</p>
          </button>
        </div>
      ) : vendorType === 'services' ? (
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigateTo('services')}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-green-200 hover:bg-green-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <Plus size={14} className="text-teal-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">Add Service</p>
          </button>
          <button
            onClick={() => navigateTo('leads')}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-purple-200 hover:bg-purple-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Users size={14} className="text-purple-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">View Leads</p>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setShowForm(true); navigateTo('products') }}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-green-200 hover:bg-green-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Plus size={14} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">Add Product</p>
          </button>
          <button
            onClick={() => navigateTo('leads')}
            className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-purple-200 hover:bg-purple-50/20 transition-all group"
          >
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Users size={14} className="text-purple-600" />
            </div>
            <p className="font-semibold text-gray-700 text-xs">View Leads</p>
          </button>
        </div>
      )}
    </div>
  )
}
