//src/components/dashboard/DashboardLayout.jsx/
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Palette,
  Music2,
  Bell,
  Warehouse,
  PackageSearch,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Crown,
  Search,
  Home,
  UserRound,
  Calculator as CalculatorIcon,
  Lock,
} from "lucide-react";
import { logoutSeller, auth } from "../../firebase/auth";
import AnnouncementBanner from "./AnnouncementBanner";
import SellaAI from "./SellaAI";
import CalculatorFAB from "./CalculatorFAB";
import SellaLogo from "../SellaLogo";
import ReviewPromptModal from "./ReviewPromptModal";
import { sendHeartbeat } from "../../utils/sessionTracking";
import { canStaffAccessTab } from "../../utils/staffRoles";
import { readInterest } from "../../utils/marketplace";
import { isMarketplaceUnlocked } from "../../utils/marketplaceStage";
import { requestFCMPermission } from "../../firebase/messaging";
import { db } from "../../firebase/config";
import { doc } from "firebase/firestore";
import { updateDoc } from "../../firebase/metered";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: Home },
  { type: "group", label: "Commerce" },
  { id: "products", label: "Products", icon: Package },
  { id: "services", label: "Services", icon: Sparkles },
  // Dropshipping marketplace (coming soon). Shown only to owners who ticked
  // supply / dropship, never to staff. See Docs/Dropshipping-Marketplace-Plan.md.
  { id: "supplier-hub", label: "Supplier Hub", icon: Warehouse, soon: true },
  { id: "dropship", label: "Dropship Marketplace", icon: PackageSearch, soon: true },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "abandoned", label: "Abandoned", icon: ShoppingBag },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "leads", label: "Leads", icon: UserRound },
  { id: "reminders", label: "Reminders", icon: Bell },
  { type: "group", label: "Grow" },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "discounts", label: "Discounts", icon: Percent },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "loyalty", label: "Loyalty", icon: Gift },
  { id: "referral-program", label: "Referral Program", icon: Share2 },
  { id: "google-ads", label: "Google Ads", icon: Target },
  { id: "meta-pixel", label: "Meta Pixel", icon: Activity },
  // Id stays `tiktok-pixel` because it is the tab id in staff roles, the Sella
  // AI registry and the OAuth callback's redirect. The LABEL is just "TikTok"
  // because the tab now holds the account connection as well as the pixel.
  { id: "tiktok-pixel", label: "TikTok", icon: Music2 },
  { id: "job-listings", label: "Job Listings", icon: Briefcase },
  { id: "store-design", label: "Store Design", icon: Palette },
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

// NAV_ITEMS as sections: the ungrouped top (Dashboard), then one section per
// group heading. Each group is a dropdown in the sidebar, so a vendor sees
// four headings instead of thirty-odd tabs at once.
const SECTIONS = NAV_ITEMS.reduce((acc, item) => {
  if (item.type === "group") acc.push({ label: item.label, items: [] });
  else acc[acc.length - 1].items.push(item);
  return acc;
}, [{ label: null, items: [] }]);

const LS_NAV_GROUPS = "sellapage_nav_groups";
const LS_NAV_DESKTOP = "sellapage_nav_desktop";
const readJson = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v ?? fallback; } catch { return fallback; }
};
const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: not remembered, still works */ }
};

const PLAN_BADGE = {
  free: null,
  starter: null,
  growth: {
    label: "Growth",
    cls: "bg-blue-50 text-blue-700",
  },
  pro: {
    label: "Pro",
    cls: "bg-amber-50 text-amber-700",
  },
  premium: {
    label: "Premium",
    cls: "bg-amber-100 text-amber-800",
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
  // Phones: the search box opens under the top bar from the search icon.
  const [mobileSearch, setMobileSearch] = useState(false);
  // Which account menu is open: "header" (avatar), "sidebar" (footer) or null.
  const [accountMenu, setAccountMenu] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);
  const searchInputRef = useRef(null);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
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
  // Reads the same stored flag the render gates in Dashboard.jsx read. It was
  // the raw plan name, so a store granted Premium features without the plan
  // name had those tabs missing from the sidebar but reachable by URL.
  const isPremiumPlan = store?.hasPremiumFeatures ?? plan === 'premium';
  const isStaffIdentity = !!store?._isStaff;
  const staffTabAccess = (tabId, needsWrite = false) =>
    canStaffAccessTab({ tabs: store?._staffTabs || [] }, tabId, needsWrite);
  const marketplaceInterest = readInterest(store);
  // A store with early access can really use the marketplace, so the "Soon"
  // pill on those two tabs would be a lie. Cosmetic either way: the server
  // decides what the tabs can actually do.
  const [marketplaceUnlocked, setMarketplaceUnlocked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    isMarketplaceUnlocked(store).then((v) => { if (!cancelled) setMarketplaceUnlocked(v); });
    return () => { cancelled = true; };
  }, [store]);
  // One rule for both nav lists below. Owner only: these tabs will set prices
  // and move money, so no staff role can hold them.
  const hideMarketplaceTab = (tabId) =>
    (tabId === "supplier-hub" && (isStaffIdentity || !marketplaceInterest.supply)) ||
    (tabId === "dropship" && (isStaffIdentity || !marketplaceInterest.dropship));

  const planEndDate = store?.planEndDate?.toDate?.();
  const daysUntilExpiry = planEndDate
    ? Math.ceil((planEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = !isGrace && !isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const mainContentRef = useRef(null);
  const sidebarNavRef = useRef(null);
  const sidebarScrollTopRef = useRef(0);

  // Which tabs this person can see. The sidebar AND the search box both use
  // this one list (see visibleIds below), so a gate can never apply to one and
  // not the other, the mistake that twice left a lapsed plan's tab reachable
  // on phones.
  // custom-domain and cac-verification are deliberately NOT hidden: both
  // paywall internally, so a Starter vendor lands on the upgrade panel.
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
        if (item.id === 'tiktok-pixel' && !isPremiumPlan) return false;
        // Premium only inside, so hidden like every other Premium tab. It was
        // the one Premium tab left in the sidebar for every plan.
        if (item.id === 'google-ads' && !isPremiumPlan) return false;
        // Shown to Premium only. A downgraded vendor keeps the saved design
        // (see isDesignLive) but loses the editor until they upgrade again.
        if (item.id === 'store-design' && !isPremiumPlan) return false;
        if (hideMarketplaceTab(item.id)) return false;
        if (item.id === 'team' && isStaffIdentity) return false;
        if (isStaffIdentity && item.id !== 'team' && !staffTabAccess(item.id)) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGrowthOrAbove, vendorType, effectiveIsPro, isPremiumPlan, isStaffIdentity, store?._staffTabs, marketplaceInterest.supply, marketplaceInterest.dropship],
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

  // One visibility rule for the sidebar and the search box: a tab is shown
  // if search can find it. The sidebar used to repeat every rule inline, and
  // the two copies are exactly the kind of thing that drifts.
  const visibleIds = useMemo(() => new Set(searchableTabs.map((t) => t.id)), [searchableTabs]);

  // Group dropdowns. A group the vendor never touched follows the page: it is
  // open when the current tab lives in it. Once they open or close a group,
  // that choice is remembered on this device.
  const [openGroups, setOpenGroups] = useState(() => readJson(LS_NAV_GROUPS, {}));
  const activeGroup = SECTIONS.find((s) => s.label && s.items.some((i) => i.id === activeTab))?.label || null;
  // On the Dashboard home, which sits in no group, Commerce starts open so the
  // everyday tabs are one tap away, as in the 2026-09-26 design.
  const isGroupOpen = (label) => openGroups[label] ?? (label === activeGroup || (!activeGroup && label === "Commerce"));
  const toggleGroup = (label) => setOpenGroups((g) => {
    const next = { ...g, [label]: !(g[label] ?? (label === activeGroup || (!activeGroup && label === "Commerce"))) };
    writeJson(LS_NAV_GROUPS, next);
    return next;
  });

  // Desktop sidebar can now be closed too (it used to be permanently open).
  const [desktopNavOpen, setDesktopNavOpen] = useState(() => readJson(LS_NAV_DESKTOP, true) !== false);
  const setDesktopNav = (open) => { setDesktopNavOpen(open); writeJson(LS_NAV_DESKTOP, open); };

  // Sella and the calculator are opened from the sidebar. They used to float
  // over every screen as draggable buttons, covering content and each other.
  const [sellaOpen, setSellaOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  // Other screens open Sella with a request typed in (e.g. Import Products):
  // window.dispatchEvent(new CustomEvent("sella:open", { detail: { prompt } })).
  // SellaAI fills in the prompt; this opens the workspace.
  useEffect(() => {
    const onOpen = () => { setCalcOpen(false); setSellaOpen(true); };
    window.addEventListener("sella:open", onOpen);
    return () => window.removeEventListener("sella:open", onOpen);
  }, []);
  // Who sees Sella in the menu: Premium owners (and, as an upgrade prompt, other
  // owners, marked Premium); staff only when the owner switched staff access on.
  const sellaEntry = isStaffIdentity
    ? (isPremiumPlan && store?.sellaStaffAccess === true ? "open" : "hidden")
    : (isPremiumPlan ? "open" : "upsell");
  const sellaName = store?.sellaAiName || "Sella AI";

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

  // Ctrl+K / Cmd+K jumps to the search box, as the hint in it says.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileSearch(true);
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setAccountMenu(null);
        setBellOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderNavItem = (item) => {
    const { id, label, icon: Icon } = item;
    const active = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => handleTabChange(id, { closeSidebar: true })}
        aria-current={active ? "page" : undefined}
        className={`w-full flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl text-[13.5px] transition-colors duration-150 ${
          active
            ? "bg-forest-50 text-forest font-semibold"
            : "text-slate-600 font-medium hover:text-dash-ink hover:bg-gray-50"
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.1 : 1.7} className={`flex-shrink-0 ${active ? "text-forest" : "text-slate-500"}`} />
        <span className="truncate">{label}</span>
        {item.soon && !marketplaceUnlocked && (
          <span className="ml-auto rounded-md bg-forest-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest-600 ring-1 ring-forest-100">
            Soon
          </span>
        )}
      </button>
    );
  };

  const identityName = isStaffIdentity ? (store?._staffName || "Staff") : (store?.businessName || "Your Business");
  const identityEmail = isStaffIdentity ? (store?._staffEmail || "Staff Account") : (store?.email || "Business Owner");
  const vendorLogo = store?.logoUrl || "";

  // The account menu, opened from the top-bar avatar or the sidebar footer.
  // `where` is "header" or "sidebar" so it opens next to what was clicked.
  const renderAccountMenu = (where) => accountMenu === where && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setAccountMenu(null)} aria-hidden="true" />
      <div
        role="menu"
        className={`absolute z-50 w-56 overflow-hidden rounded-2xl border border-dash-line bg-white py-1.5 shadow-xl shadow-gray-200/70 ${
          where === "header" ? "right-0 top-full mt-2" : "bottom-full left-3 right-3 mb-2 w-auto"
        }`}
      >
        <div className="border-b border-dash-line px-4 pb-2.5 pt-1.5">
          <p className="truncate text-[13px] font-semibold text-dash-ink">{identityName}</p>
          <p className="truncate text-[11px] text-dash-muted">{identityEmail}</p>
        </div>
        {storeUrl && (
          <a
            role="menuitem"
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAccountMenu(null)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-gray-50"
          >
            <ExternalLink size={15} className="text-slate-500" /> View my store
          </a>
        )}
        {visibleIds.has("settings") && (
          <button role="menuitem" type="button" onClick={() => { setAccountMenu(null); handleTabChange("settings", { closeSidebar: true }); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-gray-50">
            <Settings size={15} className="text-slate-500" /> Settings
          </button>
        )}
        {!isStaffIdentity && visibleIds.has("billing") && (
          <button role="menuitem" type="button" onClick={() => { setAccountMenu(null); handleTabChange("billing", { closeSidebar: true }); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-gray-50">
            <CreditCard size={15} className="text-slate-500" /> Billing and plan
          </button>
        )}
        <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 border-t border-dash-line px-4 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50">
          <LogOut size={15} /> Log out
        </button>
      </div>
    </>
  );

  // Called as a function, not rendered as <SidebarContent />: a component
  // defined inside this one is a NEW component type on every render, so React
  // would remount the whole sidebar (losing scroll and focus) on each click.
  const renderSidebar = (onClose) => (
    <div className="flex flex-col h-full">
      {/* The VENDOR's logo, not Sellapage's: this is their shop. No logo
          uploaded yet means no picture here, just their business name. */}
      <div className="flex items-center gap-3 pl-5 pr-3 h-[72px] flex-shrink-0">
        {vendorLogo && !isStaffIdentity ? (
          <img
            src={vendorLogo}
            alt={store?.businessName ? `${store.businessName} logo` : "Store logo"}
            className="h-10 w-10 flex-shrink-0 rounded-xl object-cover ring-1 ring-dash-line"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate font-body text-[17px] font-bold tracking-tight text-dash-ink">
          {store?.businessName || store?.storeName || ""}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-dash-ink hover:bg-gray-100 transition-colors"
          aria-label="Close menu"
          title="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav: Dashboard, then one dropdown per group */}
      <nav
        ref={sidebarNavRef}
        className="flex-1 px-3 pb-3 pt-1 overflow-y-auto"
      >
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => visibleIds.has(i.id));
          if (!items.length) return null;
          if (!section.label) {
            return (
              <div key="top" className="space-y-0.5 mb-2">
                {items.map(renderNavItem)}
                {/* Tools that open a panel rather than a tab, on their own, under no group. */}
                {sellaEntry !== "hidden" && (
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      if (sellaEntry === "upsell") { handleTabChange("billing"); return; }
                      setCalcOpen(false);
                      setSellaOpen(true);
                    }}
                    className={`w-full flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl text-[13.5px] transition-colors duration-150 ${
                      sellaOpen ? "bg-forest-50 text-forest font-semibold" : "text-slate-600 font-medium hover:text-dash-ink hover:bg-gray-50"
                    }`}
                  >
                    <SellaLogo size={20} className="-mx-px" />
                    <span className="truncate">{sellaName}</span>
                    {sellaEntry === "upsell" ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100"><Lock size={9} /> Premium</span>
                    ) : (
                      <span className="ml-auto rounded-md bg-forest-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest-600 ring-1 ring-forest-100">AI</span>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setSidebarOpen(false); setSellaOpen(false); setCalcOpen((o) => !o); }}
                  aria-pressed={calcOpen}
                  className={`w-full flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl text-[13.5px] transition-colors duration-150 ${
                    calcOpen ? "bg-forest-50 text-forest font-semibold" : "text-slate-600 font-medium hover:text-dash-ink hover:bg-gray-50"
                  }`}
                >
                  <CalculatorIcon size={18} strokeWidth={calcOpen ? 2.1 : 1.7} className={`flex-shrink-0 ${calcOpen ? "text-forest" : "text-slate-500"}`} />
                  <span className="truncate">Calculator</span>
                </button>
              </div>
            );
          }
          const open = isGroupOpen(section.label);
          const holdsActive = section.label === activeGroup;
          const panelId = `nav-group-${section.label.toLowerCase()}`;
          return (
            <div key={section.label} className="mt-1.5">
              <button
                onClick={() => toggleGroup(section.label)}
                aria-expanded={open}
                aria-controls={panelId}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  holdsActive ? "text-slate-600" : "text-slate-400"
                } hover:text-slate-700 hover:bg-gray-50`}
              >
                <span>{section.label}</span>
                {/* The page you are on is inside this closed group. */}
                {holdsActive && !open && <span className="w-1.5 h-1.5 rounded-full bg-forest-600" aria-hidden="true" />}
                <span className="ml-auto text-[10px] font-medium tracking-normal text-slate-400 tabular-nums">{items.length}</span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div id={panelId} className="mt-0.5 mb-2 space-y-0.5">
                  {items.map(renderNavItem)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Grow Faster - hidden for Pro, and for staff (billing is owner-only) */}
      {!effectiveIsPro && !isStaffIdentity && (
        <div className="mx-3 mb-3 rounded-2xl bg-forest-50 p-4">
          <Crown size={20} className="fill-forest-600 text-forest-600" />
          <p className="mt-2 text-[15px] font-bold text-forest">Grow Faster</p>
          <p className="mt-1 text-xs leading-relaxed text-forest-600/80">
            {isGrowthOrAbove
              ? "Unlimited listings, in-app checkout, payouts and customers on Pro."
              : "Unlock advanced features with a paid plan."}
          </p>
          <button
            onClick={() => handleTabChange("billing", { closeSidebar: true })}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-700"
          >
            View Plans <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* User Profile - shows the currently logged-in identity: the staff
          member's own account when acting as staff, not the store owner's,
          so it's visually clear staff have their own separate login. */}
      <div className="relative border-t border-dash-line px-3 py-3">
        {renderAccountMenu("sidebar")}
        <button
          type="button"
          onClick={() => setAccountMenu((m) => (m === "sidebar" ? null : "sidebar"))}
          aria-haspopup="menu"
          aria-expanded={accountMenu === "sidebar"}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-50"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-semibold text-slate-600">
            {!isStaffIdentity && vendorLogo ? (
              <img src={vendorLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(isStaffIdentity ? store?._staffName : store?.businessName)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold text-dash-ink">{identityName}</span>
              {isStaffIdentity ? (
                <span className="flex-shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  {store?._staffRoleName || "Staff"}
                </span>
              ) : badge && (
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </span>
            <span className="block truncate text-[11px] text-dash-muted">{identityEmail}</span>
          </span>
          <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />
        </button>
      </div>
    </div>
  );

  const notifState = typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported";
  const [notifOn, setNotifOn] = useState(notifState === "granted");
  const turnOnAlerts = async () => {
    if (!store?.id) return;
    try {
      const token = await requestFCMPermission(store.id, async (data) => {
        await updateDoc(doc(db, "stores", store.id), data);
      });
      if (token) setNotifOn(true);
    } catch (err) {
      console.error("[layout] notification permission failed", err);
    }
  };

  return (
    <div className="flex h-screen bg-dash-bg overflow-hidden font-body">
      {/* Desktop Sidebar (closable; reopened from the menu button in the top bar) */}
      {desktopNavOpen && (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-dash-line flex-shrink-0">
          {renderSidebar(() => setDesktopNav(false))}
        </aside>
      )}

      {/* Mobile Sidebar Overlay. z-[62]: above the Sella (60) and calculator
          (55) buttons, which otherwise sat on top of the drawer and covered
          the logout button. */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[62] md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(18rem,86vw)] bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebar(() => setSidebarOpen(false))}
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
        <header className="relative flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-8 py-3 bg-white/95 backdrop-blur border-b border-dash-line flex-shrink-0 min-h-[64px] z-30">
          <div className="flex items-center gap-2 min-w-0 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-dash-ink hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-dash-ink font-semibold text-[15px] truncate">
              {ALL_TABS.find((n) => n.id === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          {!desktopNavOpen && (
            <button
              onClick={() => setDesktopNav(true)}
              className="hidden md:inline-flex p-2 rounded-xl text-slate-600 hover:text-dash-ink hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
              title="Open menu"
            >
              <Menu size={20} />
            </button>
          )}

          <form
            onSubmit={handleSearchSubmit}
            className={`${mobileSearch ? "absolute inset-x-3 top-full mt-2 block" : "hidden"} md:static md:mt-0 md:block flex-1 max-w-[600px] md:mr-6 relative`}
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-dash-line rounded-2xl text-sm text-slate-400 shadow-sm md:shadow-none focus-within:border-forest-200 focus-within:ring-4 focus-within:ring-forest-50 transition-all">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="flex-shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => { setSearchOpen(false); setMobileSearch(false); }, 120)}
                placeholder="Search anything... (products, orders, customers, etc.)"
                aria-label="Search the dashboard"
                className="w-full min-w-0 bg-transparent outline-none text-[13px] text-dash-ink placeholder:text-slate-400"
              />
              <kbd className="hidden lg:inline-flex flex-shrink-0 items-center gap-0.5 rounded-md border border-dash-line bg-gray-50 px-1.5 py-0.5 font-body text-[10px] font-medium text-slate-500">
                {isMac ? "⌘" : "Ctrl"} K
              </kbd>
            </div>
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-dash-line rounded-2xl shadow-xl shadow-gray-200/70 overflow-hidden z-30 py-1">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => goToSearchResult(item.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-slate-700 hover:bg-forest-50 hover:text-forest transition-colors"
                    >
                      <item.icon size={16} className="text-slate-500" />
                      {item.label}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-400">
                    No dashboard section found.
                  </p>
                )}
              </div>
            )}
          </form>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => { setMobileSearch(true); setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 0); }}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-gray-100"
              aria-label="Search"
            >
              <Search size={19} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={bellOpen}
                className="relative p-2 rounded-xl text-slate-600 hover:text-dash-ink hover:bg-gray-100 transition-colors"
                aria-label="Order alerts"
              >
                <Bell size={20} />
                {!notifOn && <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" />}
              </button>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-dash-line bg-white p-4 shadow-xl shadow-gray-200/70">
                    <p className="text-[13px] font-semibold text-dash-ink">Order alerts</p>
                    {notifOn ? (
                      <p className="mt-1 text-xs leading-relaxed text-dash-muted">
                        Alerts are on for this device. You will be told about new orders and payments as they happen.
                      </p>
                    ) : notifState === "unsupported" ? (
                      <p className="mt-1 text-xs leading-relaxed text-dash-muted">
                        This browser cannot show alerts. Install the Sellapage app or use Chrome to get them.
                      </p>
                    ) : notifState === "denied" ? (
                      <p className="mt-1 text-xs leading-relaxed text-dash-muted">
                        Alerts are blocked for this site. Allow notifications in your browser settings, then reload.
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-xs leading-relaxed text-dash-muted">
                          Hear about new orders and payments the moment they happen, even with this tab closed.
                        </p>
                        <button
                          type="button"
                          onClick={turnOnAlerts}
                          className="mt-3 w-full rounded-xl bg-forest px-3 py-2 text-xs font-semibold text-white transition hover:bg-forest-700"
                        >
                          Turn on alerts
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dash-line text-slate-600 hover:text-forest hover:border-forest-200 hover:bg-forest-50 text-xs font-semibold transition-all"
              >
                <ExternalLink size={14} />
                View store
              </a>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenu((m) => (m === "header" ? null : "header"))}
                aria-haspopup="menu"
                aria-expanded={accountMenu === "header"}
                className="flex items-center gap-1.5 rounded-full p-0.5 pr-1 transition hover:bg-gray-100"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
                  {!isStaffIdentity && vendorLogo ? (
                    <img src={vendorLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(isStaffIdentity ? store?._staffName : store?.businessName)
                  )}
                </span>
                <ChevronDown size={16} className="hidden sm:block text-slate-500" />
              </button>
              {renderAccountMenu("header")}
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
      <SellaAI store={store} open={sellaOpen} onClose={() => setSellaOpen(false)} />
      <CalculatorFAB open={calcOpen} onClose={() => setCalcOpen(false)} besideNav={desktopNavOpen} />
      <ReviewPromptModal store={store} navigateTo={setActiveTab} />
    </div>
  );
}
