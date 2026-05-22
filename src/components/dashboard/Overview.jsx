//src/components/dashboard/Overview.jsx/
import {
  Plus, Copy, Check, ExternalLink, Users, ArrowRight,
  AlertCircle, TrendingUp, ShoppingBag, Eye, Lock,
} from 'lucide-react'



export default function OverviewTab({
  store, plan, maxProducts, productCount, limitReached,
  isGrowthOrPro, isPro,
  leads, products = [], storeUrl, copied, copyLink,
  navigateTo, setShowForm,
  analyticsData,
}) {
  const pct = Math.min(100, Math.round((productCount / maxProducts) * 100))
  const totalViews  = analyticsData?.totalViews  ?? 0
  const totalClicks = analyticsData?.totalClicks ?? 0

  const PLAN_LABEL = {
    starter: { text: 'Free Plan',    cls: 'bg-gray-100 text-gray-600' },
    growth:  { text: 'Growth Plan',  cls: 'bg-blue-100 text-blue-700' },
    pro:     { text: 'Pro Plan ✦',   cls: 'bg-yellow-100 text-yellow-700' },
  }
  const planLabel = PLAN_LABEL[plan] || PLAN_LABEL.starter


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Good day, {store?.businessName?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your store today.</p>
      </div>


      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Products */}
        <div className={`rounded-2xl p-4 shadow-sm shadow-gray-100/80 border transition-all ${limitReached ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 hover:border-green-100 hover:shadow-md hover:shadow-gray-200/70'}`}>
          <div className="flex items-start justify-between mb-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${limitReached ? 'bg-amber-100' : 'bg-green-50'}`}>
              <ShoppingBag size={15} className={limitReached ? 'text-amber-600' : 'text-green-600'} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planLabel.cls}`}>{planLabel.text}</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{productCount}</p>
          <p className="text-gray-400 text-xs mt-0.5 font-medium">Products Listed</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${limitReached ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {productCount} / {maxProducts === 999999 ? 'Unlimited' : maxProducts}
          </p>
        </div>


        {/* Leads */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-4 transition-all hover:border-purple-100 hover:shadow-md hover:shadow-gray-200/70">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-2">
            <Users size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{leads.length}</p>
          <p className="text-gray-400 text-xs mt-0.5 font-medium">Customer Leads</p>
          <p className="text-[10px] text-gray-400 mt-1">from lead form</p>
        </div>


        {/* Store Views — Growth/Pro only */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-4 relative overflow-hidden transition-all hover:border-blue-100 hover:shadow-md hover:shadow-gray-200/70">
          {!isGrowthOrPro && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-10">
              <Lock size={14} className="text-gray-400" />
              <p className="text-[10px] text-gray-400 font-semibold text-center px-2">Growth+ feature</p>
            </div>
          )}
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
            <Eye size={15} className="text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {isGrowthOrPro ? totalViews.toLocaleString() : '—'}
          </p>
          <p className="text-gray-400 text-xs mt-0.5 font-medium">Store Views</p>
          <p className="text-[10px] text-gray-400 mt-1">all time</p>
        </div>


        {/* Conversion — Pro only */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-4 relative overflow-hidden transition-all hover:border-amber-100 hover:shadow-md hover:shadow-gray-200/70">
          {!isPro && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-10">
              <Lock size={14} className="text-gray-400" />
              <p className="text-[10px] text-gray-400 font-semibold text-center px-2">Pro feature</p>
            </div>
          )}
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
            <TrendingUp size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {isPro && totalViews > 0 && totalClicks > 0
              ? `${Math.round((totalClicks / totalViews) * 100)}%`
              : '—'}
          </p>
          <p className="text-gray-400 text-xs mt-0.5 font-medium">Conversion Rate</p>
          <p className="text-[10px] text-gray-400 mt-1">clicks / views</p>
        </div>
      </div>


      {/* Limit reached warning */}
      {limitReached && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 shadow-sm shadow-amber-100/70">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-semibold text-sm">Product limit reached</p>
            <p className="text-amber-700 text-xs mt-0.5">
              You've used all {maxProducts} product slots on the {plan} plan.{' '}
              <button onClick={() => navigateTo('billing')} className="underline font-semibold hover:no-underline">
                Upgrade your plan →
              </button>
            </p>
          </div>
        </div>
      )}


      {/* Store link */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm mb-1">Your Store Link</p>
            <p className="text-gray-400 text-xs truncate">{storeUrl}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                copied ? 'bg-green-500 text-white shadow-sm' : 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm hover:shadow-md"
            >
              <ExternalLink size={14} /> View Store
            </a>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-3">Share on WhatsApp status, Instagram bio, and more.</p>
      </div>


      {/* Top Products — Pro only */}
      {isPro && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">Top Performing Products</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pro</span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">Ranked by customer clicks</p>
            </div>
            <button onClick={() => navigateTo('analytics')} className="text-green-600 text-xs font-bold hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {[...products]
              .filter(p => (p.clicks || 0) > 0)
              .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
              .slice(0, 5)
              .map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-gray-300 font-bold text-sm w-5 flex-shrink-0">#{i + 1}</span>
                  <p className="flex-1 text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs font-bold text-green-600">{p.clicks} click{p.clicks === 1 ? '' : 's'}</p>
                </div>
              ))}
            {products.filter(p => (p.clicks || 0) > 0).length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No clicks yet — share your store link to get started.
              </div>
            )}
          </div>
        </div>
      )}


      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setShowForm(true); navigateTo('products') }}
          className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm shadow-gray-100/70 rounded-2xl px-4 py-4 hover:border-green-200 hover:bg-green-50/30 hover:shadow-md hover:shadow-gray-200/70 transition-all group"
        >
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
            <Plus size={15} className="text-green-600" />
          </div>
          <p className="font-semibold text-gray-700 text-sm">Add Product</p>
        </button>
        <button
          onClick={() => navigateTo('leads')}
          className="flex items-center gap-3 bg-white border border-gray-100 shadow-sm shadow-gray-100/70 rounded-2xl px-4 py-4 hover:border-purple-200 hover:bg-purple-50/20 hover:shadow-md hover:shadow-gray-200/70 transition-all group"
        >
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <Users size={15} className="text-purple-600" />
          </div>
          <p className="font-semibold text-gray-700 text-sm">View Leads</p>
        </button>
      </div>
    </div>
  )
}
