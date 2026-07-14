import { useState } from 'react'
import { Link2, Loader2, ExternalLink, Shield, Target, BarChart3, Wallet } from 'lucide-react'

export default function GoogleAdsConnect({ store, onError, onSuccess }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = () => {
    if (!store?.id) return
    setLoading(true)
    window.location.href = `/api/google-ads-auth?storeId=${store.id}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Google Ads</h2>
            <p className="text-xs text-gray-400">Connect your account to run campaigns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { icon: Target, title: 'Create Campaigns', desc: 'Search, Display, Shopping, Performance Max' },
            { icon: BarChart3, title: 'Track Performance', desc: 'Impressions, clicks, conversions, spend' },
            { icon: Wallet, title: 'Manage Budgets', desc: 'Set daily or lifetime budgets in Naira' },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
              <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center mb-2.5">
                <item.icon size={14} className="text-gray-500" />
              </div>
              <h3 className="text-xs font-semibold text-gray-900 mb-0.5">{item.title}</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-2.5 mb-4">
          <Shield size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-gray-600 font-medium">Secure OAuth Connection</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              We use Google's official OAuth2 flow. Your password is never shared. You can revoke access anytime.
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Link2 size={16} />
              Connect Google Ads Account
              <ExternalLink size={12} className="opacity-50" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
