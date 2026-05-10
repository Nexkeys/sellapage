import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Users, Settings,
  HelpCircle, LogOut, Menu, X, ExternalLink, Store,
  ShoppingCart, Tag, Star, BarChart2, Megaphone,
  Percent, Globe, Smartphone, Wallet, CreditCard,
} from 'lucide-react'
import { logoutSeller } from '../../firebase/auth'



const NAV_ITEMS = [
  { id: 'overview',      label: 'Dashboard',    icon: LayoutDashboard },
  { type: 'group', label: 'Store' },
  { id: 'products',      label: 'Products',     icon: Package },
  { id: 'categories',    label: 'Categories',   icon: Tag },
  { id: 'orders',        label: 'Orders',       icon: ShoppingCart },
  { id: 'customers',     label: 'Customers',    icon: Users },
  { id: 'leads',         label: 'Leads',        icon: Users },
  { type: 'group', label: 'Grow' },
  { id: 'analytics',     label: 'Analytics',    icon: BarChart2 },
  { id: 'marketing',     label: 'Marketing',    icon: Megaphone },
  { id: 'discounts',     label: 'Discounts',    icon: Percent },
  { id: 'reviews',       label: 'Reviews',      icon: Star },
  { type: 'group', label: 'Business' },
  { id: 'online-store',  label: 'Online Store', icon: Globe },
  { id: 'payouts',       label: 'Payouts',      icon: Wallet },
  { id: 'mobile-app',    label: 'Mobile App',   icon: Smartphone },
  { type: 'group', label: 'Account' },
  { id: 'billing',       label: 'Billing',      icon: CreditCard },
  { id: 'settings',      label: 'Settings',     icon: Settings },
  { id: 'support',       label: 'Support',      icon: HelpCircle },
]



const ALL_TABS = NAV_ITEMS.filter(n => !n.type)



const PLAN_BADGE = {
  free:    null,
  starter: null,
  growth:  { label: 'Growth', cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  pro:     { label: 'Pro ✦',  cls: 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' },
}



const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}



export default function DashboardLayout({
  store, activeTab, setActiveTab,
  sidebarOpen, setSidebarOpen, storeUrl, children,
}) {
  const navigate = useNavigate()
  const handleLogout = async () => { await logoutSeller(); navigate('/') }


  const plan       = store?.plan || 'starter'
  const planStatus = store?.planStatus || 'active'
  const badge      = PLAN_BADGE[plan] ?? null
  const isGrace    = planStatus === 'grace'
  const isPro      = store?.hasProFeatures ?? (plan === 'pro')
  const isGrowth   = (store?.hasGrowthFeatures ?? (plan === 'growth' || plan === 'pro')) && !isPro



  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Store size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">sellapage</span>
      </div>


      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'group') {
            return (
              <p key={`g-${idx}`} className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
                {item.label}
              </p>
            )
          }
          const { id, label, icon: Icon } = item
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </button>
          )
        })}
      </nav>


      {/* Upgrade Banner — hidden for Pro */}
      {!isPro && (
        <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-green-600/30 to-green-700/20 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400 text-sm">⭐</span>
            <span className="text-white text-sm font-semibold">
              {isGrowth ? 'Upgrade to Pro' : 'Upgrade to Growth'}
            </span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            {isGrowth
              ? 'Get unlimited products, hot leads & store insights.'
              : 'Unlock 50 products, analytics & priority support.'}
          </p>
          <button
            onClick={() => { setActiveTab('billing'); setSidebarOpen(false) }}
            className="w-full py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-semibold transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      )}


      {/* User Profile */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/8">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            {store?.logoUrl
              ? <img src={store.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              : <span className="text-white text-sm font-bold">{getInitials(store?.businessName)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-white text-sm font-medium truncate">{store?.businessName || 'Your Store'}</p>
              {badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs truncate">{store?.email || 'Business Owner'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )



  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 flex-shrink-0">
        <SidebarContent />
      </aside>


      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 flex flex-col shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}


      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Grace Period Banner */}
        {isGrace && (
          <div className="w-full bg-amber-500 text-white text-sm font-semibold text-center px-4 py-2.5 flex-shrink-0">
            ⚠️ Your plan expires soon. Renew now to keep all your products live.{' '}
            <button
              onClick={() => setActiveTab('billing')}
              className="underline underline-offset-2 hover:no-underline ml-1"
            >
              Renew Plan →
            </button>
          </div>
        )}


        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-gray-900 font-semibold text-base">
                {ALL_TABS.find(n => n.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>
          </div>


          <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm mx-8">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Search anything...
            </div>
          </div>


          <div className="flex items-center gap-2">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 text-xs font-medium transition-colors"
              >
                <ExternalLink size={13} />
                View Store
              </a>
            )}
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              {store?.logoUrl
                ? <img src={store.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                : <span className="text-white text-xs font-bold">{getInitials(store?.businessName)}</span>
              }
            </div>
          </div>
        </header>


        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}