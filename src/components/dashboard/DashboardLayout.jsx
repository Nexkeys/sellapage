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
  ShieldCheck,
  Smartphone,
  Wallet,
  CreditCard,
  Sparkles,
  Truck,
  BookOpen,
  Target,
  Share2,
  Briefcase,
  CalendarDays,
  Receipt,
  UserPlus,
  Gift,
  ShoppingBag,
  Activity,
} from "lucide-react";
import { logoutSeller, auth } from "../../firebase/auth";
import AnnouncementBanner from "./AnnouncementBanner";
import SellaAI from "./SellaAI";
import CalculatorFAB from "./CalculatorFAB";
import ReviewPromptModal from "./ReviewPromptModal";
import { sendHeartbeat } from "../../utils/sessionTracking";
import { canStaffAccessTab } from "../../utils/staffRoles";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { type: "group", label: "Commerce" },
  { id: "products", label: "Products", icon: Package },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "abandoned", label: "Abandoned", icon: ShoppingBag },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "leads", label: "Leads", icon: Users },
  { type: "group", label: "Grow" },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "loyalty", label: "Loyalty", icon: Gift },
  { id: "referral-program", label: "Referral Program", icon: Share2 },
  { id: "google-ads", label: "Google Ads", icon: Target },
  { id: "meta-pixel", label: "Meta Pixel", icon: Activity },
  { id: "job-listings", label: "Job Listings", icon: Briefcase },
  { type: "group", label: "Business" },
  { id: "online-store", label: "Business Page", icon: Globe },
  { id: "payouts", label: "Payouts", icon: Wallet },
  { id: "mobile-app", label: "Mobile App", icon: Smartphone },
  { type: "group", label: "Account" },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "custom-domain", label: "Custom Domain", icon: Globe },
  { id: "cac-verification", label: "CAC Verification", icon: ShieldCheck },
  { id: "team", label: "Team", icon: UserPlus },
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

  useEffect(() => {
    if (!store?.id) return;
    let cancelled = false;

    const check = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const { revoked, otpPending } = await sendHeartbeat(token);
        if (revoked && !cancelled) {
          await logoutSeller();
          navigate("/login");
          return;
        }
        // Login OTP challenge abandoned or still outstanding - send them back
        // to sign in rather than leaving an unverified session running.
        if (otpPending && !cancelled) {
          await logoutSeller();
          navigate("/login?verify=1");
        }
      } catch {
        // Silently ignore - a missed heartbeat is retried on the next interval.
      }
    };

    check();
    const interval = setInterval(check, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [store?.id]);

  const plan = store?.plan || "starter";
  const planStatus = store?.planStatus || "active";
  const badge = PLAN_BADGE[plan] ?? null;
  const isGrace = planStatus === "grace";
  const isExpired = planStatus === "expired";
  const effectiveIsPro = isPro || (store?.hasProFeatures ?? (plan === "pro" || plan === "premium"));
  const isGrowth =
    (store?.hasGrowthFeatures ?? (plan === "growth" || plan === "pro")) &&
    !effectiveIsPro;
  const isGrowthOrAbove = plan === 'growth' || plan === 'pro' || plan === 'premium';
  const isPremiumPlan = plan === 'premium';
  const isStaffIdentity = !!store?._isStaff;
  const staffTabAccess = (tabId, needsWrite = false) =>
    canStaffAccessTab({ tabs: store?._staffTabs || [] }, tabId, needsWrite);

  const planEndDate = store?.planEndDate?.toDate?.();
  const daysUntilExpiry = planEndDate
    ? Math.ceil((planEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = !isGrace && !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const mainContentRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const sidebarScrollTopRef = useRef(0);

  const searchableTabs = useMemo(
    () =>
      ALL_TABS.filter((item) => {
        if (item.id === 'orders' && !effectiveIsPro) return false;
        if (item.id === 'bookings' && !effectiveIsPro) return false;
        if (item.id === 'delivery' && !effectiveIsPro) return false;
        if (item.id === 'payouts' && !effectiveIsPro) return false;
        if (item.id === 'customers' && !effectiveIsPro) return false;
        if (item.id === 'reviews' && !effectiveIsPro) return false;
        if (item.id === 'discounts' && !effectiveIsPro) return false;
        if (item.id === 'analytics' && !isGrowthOrAbove) return false;
        if (item.id === 'products' && vendorType === 'services') return false;
        if (item.id === 'services' && vendorType === 'products') return false;
        if (item.id === 'orders' && vendorType === 'services') return false;
        if (item.id === 'bookings' && vendorType === 'products') return false;
        if (item.id === 'team' && !isPremiumPlan) return false;
        // Premium only, and gated in BOTH this list and the mobile drawer below.
        // Gating only one of the two leaves the tab reachable on phones after a
        // plan lapses, which has already shipped as a bug twice on admin tabs.
        if (item.id === 'loyalty' && !isPremiumPlan) return false;
        if (item.id === 'abandoned' && !isPremiumPlan) return false;
        if (item.id === 'meta-pixel' && !isPremiumPlan) return false;
        if (item.id === 'team' && isStaffIdentity) return false;
        if (isStaffIdentity && item.id !== 'team' && !staffTabAccess(item.id)) return false;
        return true;
      }),
    [isGrowthOrAbove, vendorType, effectiveIsPro, isPremiumPlan, isStaffIdentity, store?._staffTabs],
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
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
          <img
            src="/og-image.png"
            alt="Sellapage logo"
            className="w-8 h-9 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
          />
        </div>
        <span className="text-white font-bold text-base tracking-tight">
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
                className="px-3 pt-5 pb-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-gray-600 select-none"
              >
                {item.label}
              </p>
            );
          }
          const { id, label, icon: Icon } = item;
          if (id === 'orders' && !effectiveIsPro) return null;
          if (id === 'bookings' && !effectiveIsPro) return null;
          if (id === 'delivery' && !effectiveIsPro) return null;
          if (id === 'payouts' && !effectiveIsPro) return null;
          if (id === 'customers' && !effectiveIsPro) return null;
          if (id === 'reviews' && !effectiveIsPro) return null;
          if (id === 'discounts' && !effectiveIsPro) return null;
          if (id === 'custom-domain' && !effectiveIsPro) return null;
          if (id === 'cac-verification' && !effectiveIsPro) return null;
          if (id === 'analytics' && !isGrowthOrAbove) return null;
          if (id === 'products' && vendorType === 'services') return null;
          if (id === 'services' && vendorType === 'products') return null;
          if (id === 'orders' && vendorType === 'services') return null;
          if (id === 'bookings' && vendorType === 'products') return null;
          if (id === 'team' && !isPremiumPlan) return null;
          // Mirror of the desktop gate above. Both are required.
          if (id === 'loyalty' && !isPremiumPlan) return null;
          if (id === 'abandoned' && !isPremiumPlan) return null;
          if (id === 'meta-pixel' && !isPremiumPlan) return null;
          if (id === 'team' && isStaffIdentity) return null;
          if (isStaffIdentity && id !== 'team' && !staffTabAccess(id)) return null;
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id, { closeSidebar: true })}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                active
                  ? "bg-green-500/15 text-green-400 font-semibold"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Upgrade Banner - hidden for Pro, and for staff (billing is owner-only) */}
      {!effectiveIsPro && !isStaffIdentity && (
        <div className="mx-3 mb-3 p-3.5 rounded-2xl bg-white/5 border border-white/8">
          <div className="flex items-center gap-2 mb-1">
            <Star size={13} className="text-yellow-400" />
            <span className="text-white text-xs font-bold">
              {isGrowthOrAbove ? 'Upgrade to Pro' : 'Upgrade to Growth'}
            </span>
          </div>
          <p className="text-gray-500 text-[11px] leading-relaxed mb-2.5">
            {isGrowthOrAbove
              ? 'Get unlimited listings, in-app checkout, payouts, CRM, and full commerce tools.'
              : 'Unlock 50 listings, analytics, AI descriptions, and priority support.'}
          </p>
          <button
            onClick={() => handleTabChange("billing", { closeSidebar: true })}
            className="w-full py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-[11px] font-bold transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* User Profile - shows the currently logged-in identity: the staff
          member's own account when acting as staff, not the store owner's,
          so it's visually clear staff have their own separate login. */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            {!isStaffIdentity && store?.logoUrl ? (
              <img
                src={store.logoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-xs font-bold">
                {getInitials(isStaffIdentity ? store?._staffName : store?.businessName)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {isStaffIdentity ? (store?._staffName || "Staff") : (store?.businessName || "Your Business")}
              </p>
              {isStaffIdentity ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {store?._staffRoleName || "Staff"}
                </span>
              ) : badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}
                >
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-[11px] truncate">
              {isStaffIdentity ? (store?._staffEmail || "Staff Account") : (store?.email || "Business Owner")}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
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
        {/* Staff identity banner */}
        {isStaffIdentity && (
          <div className="w-full bg-indigo-600 text-white text-xs font-semibold text-center px-4 py-2 flex-shrink-0">
            Managing {store?.storeName || store?.businessName || "this store"} as {store?._staffRoleName || "Staff"}
          </div>
        )}

        {/* Grace Period Banner */}
        {isGrace && (
          <div className="w-full bg-amber-500 text-white text-xs font-semibold text-center px-4 py-2 flex-shrink-0">
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
        <header className="flex items-center justify-between px-4 md:px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0 min-h-[52px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-gray-800 font-semibold text-sm">
                {ALL_TABS.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:block flex-1 max-w-xs mx-6 relative"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 focus-within:border-green-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-400/15 transition-all">
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-50/50 text-xs font-medium transition-all"
              >
                <ExternalLink size={13} />
                View Page
              </a>
            )}
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center ring-2 ring-green-100">
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
          <AnnouncementBanner />
          {/* 7-day Expiry Alert */}
          {isExpiringSoon && (
            <div className="w-full bg-amber-50 border-b border-amber-100 text-amber-700 text-xs font-semibold text-center px-4 py-2 flex-shrink-0">
              Your plan expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Renew now to keep all your listings live.{" "}
              <button
                onClick={() => handleTabChange("billing")}
                className="underline underline-offset-2 hover:no-underline ml-1"
              >
                Renew Plan
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Sella AI - movable Business Partner, persistent across every tab (Premium only) */}
      <SellaAI store={store} />
      <CalculatorFAB />
      <ReviewPromptModal store={store} navigateTo={setActiveTab} />
    </div>
  );
}
