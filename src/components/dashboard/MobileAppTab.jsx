//src/components/dashboard/MobileAppTab.jsx/
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
              PWA
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mobile Workspace</h1>
          <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
            Install Sellapage on your phone home screen and manage offers, orders, customers, and analytics from your browser.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['Home-screen access','Manage Offers','Chat with Customers','View Analytics','Fast PWA Loading'].map(f => (
            <span key={f} className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">{f}</span>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 max-w-sm mx-auto">
          <p className="font-bold text-gray-900 text-sm">Install from your browser</p>
          <p className="text-gray-500 text-sm leading-relaxed">
            On Android, open the browser menu and choose Add to Home Screen. On iPhone, use Share, then Add to Home Screen.
          </p>
          <p className="text-gray-400 text-xs">The installed workspace opens fullscreen and stays connected to your live dashboard.</p>
        </div>
      </div>
    </div>
  )
}
