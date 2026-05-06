import { Megaphone, Share2, MessageCircle, Zap } from 'lucide-react'

const TOOLS = [
  { Icon: MessageCircle, color: 'bg-green-50 text-green-600',  title: 'WhatsApp Broadcast',    desc: 'Send a message to all your customers at once. Great for announcing new arrivals or promos.',     badge: 'Coming Soon', bc: 'bg-gray-100 text-gray-500' },
  { Icon: Share2,        color: 'bg-blue-50 text-blue-600',    title: 'Instagram Bio Link',     desc: 'Your store link is perfect for your Instagram bio. Tap to copy and paste in your profile.',       badge: 'Available',   bc: 'bg-green-50 text-green-700' },
  { Icon: Megaphone,     color: 'bg-purple-50 text-purple-600',title: 'Share Store Link',       desc: 'Share your store on WhatsApp Status, Twitter, Facebook, and more — all with one tap.',           badge: 'Available',   bc: 'bg-green-50 text-green-700' },
  { Icon: Zap,           color: 'bg-amber-50 text-amber-600',  title: 'Promotions & Discounts', desc: 'Create time-limited discount codes to create urgency and drive more sales from your audience.',   badge: 'Coming Soon', bc: 'bg-gray-100 text-gray-500' },
]

export default function MarketingTab({ store, storeUrl }) {
  const name = store?.businessName || 'my store'
  const url  = storeUrl || 'https://sellapage.com/store/your-store'
  const waShare  = `https://wa.me/?text=${encodeURIComponent(`Shop from ${name} 🛍️ ${url}`)}`
  const twShare  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${name} 🛍️ ${url}`)}`

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Marketing</h1>
        <p className="text-gray-400 text-sm mt-1">Grow your customer base and drive more sales.</p>
      </div>

      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Megaphone size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-white text-base">Share your store today</p>
          <p className="text-white/70 text-xs mt-0.5">Every share is a potential sale. Start spreading the word.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href={waShare} target="_blank" rel="noopener noreferrer"
            className="bg-white text-green-700 hover:bg-green-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
            <MessageCircle size={13} /> WhatsApp
          </a>
          <a href={twShare} target="_blank" rel="noopener noreferrer"
            className="bg-white/20 border border-white/30 text-white hover:bg-white/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
            <Share2 size={13} /> Share
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map(t => (
          <div key={t.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.color}`}>
                <t.Icon size={19} strokeWidth={1.8} />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.bc}`}>{t.badge}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{t.title}</p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
        <p className="font-bold text-amber-800 text-sm flex items-center gap-2"><span>💡</span> Marketing Tips for Nigerian Sellers</p>
        <ul className="space-y-2 text-amber-700 text-xs leading-relaxed">
          {[
            'Post your store link in WhatsApp Status every morning for consistent visibility.',
            'Ask satisfied customers to share your store with their contacts.',
            'Use high-quality photos — products with clear images sell 3× faster.',
            'Respond to enquiries within 30 minutes to maximise conversion.',
          ].map((tip,i) => (
            <li key={i} className="flex items-start gap-2"><span className="text-amber-400 font-bold mt-0.5">→</span>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
