//src/components/dashboard/DashboardLayout.jsx/
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Store,
  ShoppingCart,
  Tag,
  Star,
  BarChart2,
  Megaphone,
  Percent,
  Globe,
  Smartphone,
  Wallet,
  CreditCard,
  Sparkles,
  Truck,
} from "lucide-react";
import { logoutSeller } from "../../firebase/auth";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { type: "group", label: "Commerce" },
  { id: "products", label: "Products", icon: Package },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "leads", label: "Leads", icon: Users },
  { type: "group", label: "Grow" },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "reviews", label: "Reviews", icon: Star },
  { type: "group", label: "Business" },
  { id: "online-store", label: "Business Page", icon: Globe },
  { id: "payouts", label: "Payouts", icon: Wallet },
  { id: "mobile-app", label: "Mobile App", icon: Smartphone },
  { type: "group", label: "Account" },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "support", label: "Support", icon: HelpCircle },
];

const ALL_TABS = NAV_ITEMS.filter((n) => !n.type);

const PLAN_BADGE = {
  free: null,
  starter: null,
  growth: {
    label: "Growth",
    cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  pro: {
    label: "Pro",
    cls: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30",
  },
  premium: {
    label: "Premium",
    cls: "bg-orange-400/20 text-orange-300 border border-orange-400/30",
  },
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function DashboardLayout({
  store,
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  storeUrl,
  isGrowthOrPro = false,
  isPro = false,
  vendorType = "products",
  children,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const handleLogout = async () => {
    await logoutSeller();
    navigate("/");
  };

  const plan = store?.plan || "starter";
  const planStatus = store?.planStatus || "active";
  const badge = PLAN_BADGE[plan] ?? null;
  const isGrace = planStatus === "grace";
  const effectiveIsPro = isPro || (store?.hasProFeatures ?? (plan === "pro" || plan === "premium"));
  const isGrowth =
    (store?.hasGrowthFeatures ?? (plan === "growth" || plan === "pro")) &&
    !effectiveIsPro;
  const mainContentRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const sidebarScrollTopRef = useRef(0);

  const searchableTabs = useMemo(
    () =>
      ALL_TABS.filter((item) => {
        if (item.id === "orders" && !isGrowthOrPro) return false;
        if (item.id === "delivery" && !isGrowthOrPro) return false;
        if (item.id === "products" && vendorType === "services") return false;
        if (item.id === "services" && vendorType === "products") return false;
        if (item.id === "payouts" && !effectiveIsPro) return false;
        if (item.id === "customers" && !effectiveIsPro) return false;
        if (item.id === "reviews" && !effectiveIsPro) return false;
        if (item.id === "discounts" && !effectiveIsPro) return false;
        return true;
      }),
    [isGrowthOrPro, vendorType, effectiveIsPro],
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchableTabs.slice(0, 6);
    return searchableTabs.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.id.replace(/-/g, " ").includes(query),
    );
  }, [searchQuery, searchableTabs]);

  const handleTabChange = (tabId, options = {}) => {
    if (sidebarNavRef.current) {
      sidebarScrollTopRef.current = sidebarNavRef.current.scrollTop;
    }
    setActiveTab(tabId);
    if (options.closeSidebar) setSidebarOpen(false);
  };

  const goToSearchResult = (tabId) => {
    handleTabChange(tabId);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults[0]) goToSearchResult(searchResults[0].id);
  };

  useEffect(() => {
    if (!sidebarNavRef.current) return;
    sidebarNavRef.current.scrollTop = sidebarScrollTopRef.current;
  }, [activeTab]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <img
            src="/og-image.png"
            alt="Sellapage logo"
            className="w-8 h-9 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
          />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">
          sellapage
        </span>
      </div>

      {/* Nav */}
      <nav
        ref={sidebarNavRef}
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
      >
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === "group") {
            return (
              <p
                key={`g-${idx}`}
                className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none"
              >
                {item.label}
              </p>
            );
          }
          const { id, label, icon: Icon } = item;
          if (id === "orders" && !isGrowthOrPro) return null;
          if (id === "delivery" && !isGrowthOrPro) return null;
          if (id === "products" && vendorType === "services") return null;
          if (id === "services" && vendorType === "products") return null;
          if (id === "payouts" && !effectiveIsPro) return null;
          if (id === "customers" && !effectiveIsPro) return null;
          if (id === "reviews" && !effectiveIsPro) return null;
          if (id === "discounts" && !effectiveIsPro) return null;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id, { closeSidebar: true })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-green-500 text-white shadow-lg shadow-green-950/20"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Upgrade Banner — hidden for Pro */}
      {!effectiveIsPro && (
        <div className="mx-3 mb-3 p-4 rounded-2xl bg-gradient-to-br from-green-600/30 to-green-700/20 border border-green-500/20 shadow-lg shadow-black/10">
          <div className="flex items-center gap-2 mb-1">
            <Star size={14} className="text-yellow-400" />
            <span className="text-white text-sm font-semibold">
              {isGrowth ? "Upgrade to Pro" : "Upgrade to Growth"}
            </span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed mb-3">
            {isGrowth
              ? "Get unlimited listings, hot leads, and deeper commerce insights."
              : "Unlock 50 listings, analytics, carts, and priority support."}
          </p>
          <button
            onClick={() => handleTabChange("billing", { closeSidebar: true })}
            className="w-full py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* User Profile */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm shadow-black/10">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            {store?.logoUrl ? (
              <img
                src={store.logoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {getInitials(store?.businessName)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {store?.businessName || "Your Business"}
              </p>
              {badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs truncate">
              {store?.email || "Business Owner"}
            </p>
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
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-950 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-950 flex flex-col shadow-2xl">
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
            Your plan expires soon. Renew now to keep all your listings live.{" "}
            <button
              onClick={() => handleTabChange("billing")}
              className="underline underline-offset-2 hover:no-underline ml-1"
            >
              Renew Plan
            </button>
          </div>
        )}

        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-gray-900 font-semibold text-base">
                {ALL_TABS.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:block flex-1 max-w-sm mx-8 relative"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500 shadow-inner shadow-gray-100 focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                placeholder="Search dashboard..."
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
              />
            </div>
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/70 overflow-hidden z-30">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => goToSearchResult(item.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                    >
                      <item.icon size={15} />
                      {item.label}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    No dashboard section found.
                  </p>
                )}
              </div>
            )}
          </form>

          <div className="flex items-center gap-2">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-300 hover:bg-green-50/40 text-xs font-medium transition-all"
              >
                <ExternalLink size={13} />
                View Page
              </a>
            )}
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              {store?.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {getInitials(store?.businessName)}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
