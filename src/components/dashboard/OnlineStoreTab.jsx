import { Copy, Check, ExternalLink, Eye, Palette, Share2, MessageCircle } from 'lucide-react'
import { useState } from 'react'

export default function OnlineStoreTab({ store, storeUrl }) {
  const url = storeUrl || `https://sellapage.com/store/${store?.storeName || 'your-store'}`
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(url).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2500) }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Online Store</h1>
        <p className="text-gray-400 text-sm mt-1">Your live store link — share it everywhere to get orders.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Your Store Link</p>
            <p className="text-gray-400 text-xs">Share this to start getting orders on WhatsApp.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-0">
            <p className="text-sm text-gray-600 truncate font-medium">{url}</p>
          </div>
          <button onClick={copy}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all ${copied ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-700'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(`Shop from ${store?.businessName||'my store'} 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my store 🛍️ ${url}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <Share2 size={14} /> Twitter
          </a>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
            <ExternalLink size={14} /> View Store
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center"><Palette size={17} className="text-purple-600" /></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Customise Appearance</p>
            <p className="text-gray-400 text-xs mt-1">Change your store's colours, logo, and layout to match your brand.</p>
          </div>
          <button className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-bold transition-all">
            <Palette size={13} /> Open Customiser
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Eye size={17} className="text-blue-600" /></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Preview Store</p>
            <p className="text-gray-400 text-xs mt-1">See exactly how customers view your store on their devices.</p>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all">
            <Eye size={13} /> Preview Store
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="w-28 h-28 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-300 flex-shrink-0 border-2 border-dashed border-gray-200">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
          </svg>
          <span className="text-[10px] mt-1.5 font-medium">QR Code</span>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Store QR Code</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed max-w-xs">Generate a QR code and add it to your flyers, business cards, or shop front so customers can scan and order directly.</p>
          <button disabled className="mt-3 flex items-center gap-2 bg-gray-900 opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed">
            Generate QR Code &nbsp;<span className="text-gray-400 font-normal">— Coming Soon</span>
          </button>
        </div>
      </div>
    </div>
  )
}
