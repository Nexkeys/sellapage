export default function MobileAppTab() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[70vh]">
      <div className="text-center space-y-6 w-full">

        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center shadow-xl shadow-green-200">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
              Soon ✦
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mobile App</h1>
          <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
            Manage your store, track orders, and respond to customers — all from your pocket.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['Live Order Notifications','Manage Products','Chat with Customers','View Analytics','Offline Support'].map(f => (
            <span key={f} className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">{f}</span>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-sm mx-auto">
          <p className="font-bold text-gray-900 text-sm">Get notified when it launches</p>
          <div className="flex gap-2">
            <input type="email" placeholder="Your email address"
              className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all min-w-0" />
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all flex-shrink-0">
              Notify Me
            </button>
          </div>
          <p className="text-gray-400 text-xs">No spam, ever. Unsubscribe at any time.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {[['App Store','Download on the'],['Google Play','Get it on']].map(([store, pre]) => (
            <button key={store} disabled className="flex items-center gap-3 bg-gray-900 opacity-40 text-white px-5 py-3 rounded-xl cursor-not-allowed">
              <div className="text-left">
                <p className="text-[10px] opacity-70 leading-none">{pre}</p>
                <p className="text-sm font-bold leading-tight">{store}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
