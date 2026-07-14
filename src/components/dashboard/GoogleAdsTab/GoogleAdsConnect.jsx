import { useState } from 'react'
import { Link2, Loader2, ExternalLink, Shield, Target, BarChart3, Wallet, Sparkles } from 'lucide-react'

export default function GoogleAdsConnect({ store, onError, onSuccess }) {
  const [loading, setLoading] = useState(null)

  const handleConnectOwn = () => {
    if (!store?.id) return
    setLoading('own')
    window.location.href = `/api/google-ads-auth?storeId=${store.id}`
  }

  const handleSellapageManaged = () => {
    if (!store?.id) return
    setLoading('sellapage')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Connect Your Own Account */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Connect Your Account</h3>
                <p className="text-[11px] text-gray-400">Self-managed ads</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              {[
                { icon: Target, text: 'Create campaigns on your own Google Ads account' },
                { icon: BarChart3, text: 'Full control over budget and targeting' },
                { icon: Wallet, text: 'Pay Google directly — no commission' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon size={12} className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mb-4">
              <div className="flex items-start gap-2">
                <Shield size={12} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Secure OAuth connection. Your password is never shared. Revoke anytime.
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectOwn}
              disabled={loading !== null}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'own' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Link2 size={14} />
                  Connect Google Ads
                  <ExternalLink size={10} className="opacity-50" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Run Ads with Sellapage */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                <Sparkles size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Run Ads with Sellapage</h3>
                <p className="text-[11px] text-gray-400">We manage it for you</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-4">
              {[
                { icon: Target, text: 'We create and manage your Google Ads campaigns' },
                { icon: BarChart3, text: 'Performance dashboard — track impressions, clicks, spend' },
                { icon: Wallet, text: 'Pay via Paystack — ad spend + 10% service charge' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 mb-4">
              <div className="flex items-start gap-2">
                <Sparkles size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-700 leading-relaxed">
                  No Google Ads account needed. Just set your budget and we handle the rest.
                </p>
              </div>
            </div>

            <button
              onClick={handleSellapageManaged}
              disabled={loading !== null}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'sellapage' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Sparkles size={14} />
                  Create Ad Campaign
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
