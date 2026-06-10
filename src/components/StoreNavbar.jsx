// src/components/StoreNavbar.jsx
import { useState, useRef } from "react";
import {
  MessageCircle,
  Search,
  X,
  Home,
  Grid,
  ShoppingCart,
} from "lucide-react";
import { buildEnquiryURL } from "../utils/whatsapp";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export default function StoreNavbar({
  store,
  search,
  setSearch,
  activeTab,
  setActiveTab,
  cartCount = 0,
  onCartOpen = null,
  activeThemeObj = null,
  previewMode = false,
  hasServices = false,
  hasProducts = false,
  activeStoreSection = "products",
  onSectionChange = null,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const headerLayout =
    activeThemeObj?.layout?.headerLayout || "classic-flat-row";
  const dockLayout =
    activeThemeObj?.layout?.navigationDockLayout || "flush-bottom";

  const cardBg = activeThemeObj?.defaultColors?.card || "#ffffff";
  const textCol = activeThemeObj?.defaultColors?.text || "#111827";
  const primaryCol = activeThemeObj?.defaultColors?.primary || "#16a34a";

  let navClasses = "sticky top-0 z-40 transition-all ";
  if (headerLayout === "glass-pill")
    navClasses +=
      "mt-4 mx-4 rounded-full border border-gray-200/50 shadow-lg bg-white/70 backdrop-blur-md ";
  else if (headerLayout === "asymmetric-heavy")
    navClasses +=
      "border-b-4 border-r-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-none ";
  else if (headerLayout === "puffy-rounded")
    navClasses += "rounded-[2rem] border-4 mt-2 mx-2 shadow-xl ";
  else if (headerLayout === "heavy-block")
    navClasses += "border-b-[4px] rounded-none ";
  else if (headerLayout === "minimal-underline")
    navClasses += "border-b-[0.5px] rounded-none shadow-none ";
  else if (headerLayout === "neon-cyber-bordered")
    navClasses += "border-b shadow-lg ";
  else navClasses += "border-b shadow-sm "; // classic

  let dockClasses = previewMode
    ? "absolute bottom-0 left-0 right-0 z-30 w-full flex-shrink-0 transition-all "
    : "fixed bottom-0 left-0 right-0 z-50 w-full md:hidden safe-area-bottom bg-white border-t border-gray-100 transition-all ";
  if (dockLayout === "floating-pill")
    dockClasses += previewMode
      ? "mx-2 mb-2 rounded-full border shadow-lg "
      : "bottom-4 mx-4 rounded-full border shadow-2xl ";
  else if (dockLayout === "retro-block")
    dockClasses += "border-t-4 border-black ";
  else dockClasses += "border-t "; // flush-bottom

  const searchPlaceholder =
    activeStoreSection === "services"
      ? "Search services..."
      : "Search products...";

  return (
    <>
      {/* ── Top Navbar ── */}
      <nav
        className={navClasses}
        style={{
          backgroundColor: headerLayout === "glass-pill" ? undefined : cardBg,
          color: textCol,
          borderColor: activeThemeObj?.structuralStyle?.cardBorder
            ? "inherit"
            : undefined,
        }}
      >
        <div
          className={`max-w-6xl mx-auto px-3 flex items-center justify-between gap-2 ${previewMode ? "h-10" : "px-4 sm:px-6 h-14 gap-4"}`}
        >
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-green-500">
              {store?.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xs select-none">
                  {getInitials(store?.businessName)}
                </span>
              )}
            </div>
            <span
              className="font-bold text-sm truncate"
              style={{
                fontFamily: activeThemeObj?.typography?.headerFontFamily,
              }}
            >
              {store?.businessName}
            </span>
          </div>

          {/* Desktop Section Tabs */}
          {hasProducts && hasServices && onSectionChange && (
            <div className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl flex-shrink-0">
              <button
                onClick={() => onSectionChange("products")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeStoreSection === "products"
                    ? "bg-white text-gray-900 shadow-sm border border-black/5"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                View Products
              </button>
              <button
                onClick={() => onSectionChange("services")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeStoreSection === "services"
                    ? "bg-white text-gray-900 shadow-sm border border-black/5"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                Book Service
              </button>
            </div>
          )}

          {/* Desktop Search */}
          <div
            className={`${previewMode ? "hidden" : "hidden md:flex"} items-center flex-shrink-0`}
          >
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 ${search ? "ring-2" : ""}`}
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <Search size={15} className="flex-shrink-0 opacity-50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="bg-transparent text-sm placeholder-current outline-none w-40 focus:w-52 transition-all duration-200"
                style={{ color: textCol }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile search toggle */}
            <button
              onClick={openSearch}
              className="md:hidden p-2 opacity-70 hover:opacity-100 rounded-xl transition-all"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Desktop cart button — only for Growth/Pro */}
            {onCartOpen !== null && (
              <button
                onClick={onCartOpen}
                className="hidden md:flex relative items-center justify-center p-2 opacity-70 hover:opacity-100 rounded-xl transition-all"
                aria-label="Open cart"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                    style={{ backgroundColor: primaryCol }}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Chat button */}
            <a
              href={buildEnquiryURL(store?.whatsappNumber, store?.businessName)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 active:scale-95 px-3 py-2 sm:px-4 text-xs transition-all shadow-sm whitespace-nowrap ${activeThemeObj?.structuralStyle?.buttonClasses || "bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-xl font-bold"}`}
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">Chat with us</span>
              <span className="sm:hidden">Chat</span>
            </a>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {searchOpen && (
          <div
            className="md:hidden px-4 pb-3 border-t pt-2"
            style={{ backgroundColor: cardBg, borderColor: "rgba(0,0,0,0.1)" }}
          >
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                onBlur={() => {
                  if (!search) setSearchOpen(false);
                }}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchOpen(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div
        className={dockClasses}
        style={{ backgroundColor: cardBg, borderColor: "rgba(0,0,0,0.1)" }}
      >
        <div className="mx-auto flex min-h-[4.25rem] max-w-3xl items-center justify-around gap-1 px-2 py-2">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "categories", label: "Categories", icon: Grid },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all"
              style={{
                color: activeTab === id ? primaryCol : textCol,
                opacity: activeTab === id ? 1 : 0.5,
              }}
            >
              <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
              <span className="max-w-full truncate text-[10px] font-semibold">
                {label}
              </span>
              {activeTab === id && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: primaryCol }}
                />
              )}
            </button>
          ))}

          {/* Cart tab — only for Growth/Pro */}
          {onCartOpen !== null && (
            <button
              onClick={onCartOpen}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-all opacity-50 hover:opacity-100"
              style={{ color: textCol }}
              aria-label="Open cart"
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <ShoppingCart size={20} strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                    style={{ backgroundColor: primaryCol }}
                  >
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-[10px] font-semibold">
                Cart
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
