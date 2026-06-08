// src/pages/StorePage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  MessageCircle,
  Package,
  Search,
  X,
  ShoppingBag,
  ArrowRight,
  Grid,
  Tag,
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getStoreBySlug, getProducts } from "../firebase/products";
import { getServices } from "../firebase/services";
import { db } from "../firebase/config";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { buildEnquiryURL } from "../utils/whatsapp";
import LeadForm from "../components/LeadForm";
import ProductCard from "../components/ProductCard";
import StoreNavbar from "../components/StoreNavbar";
import StoreFooter from "../components/StoreFooter";
import CartDrawer from "../components/CartDrawer";
import NotFound from "./NotFound";
import { resolveStoreThemeTokens } from "../utils/resolveStoreTheme";

function ServiceCard({
  service,
  isHighlighted,
  onOrder,
  onBook,
  listView = false,
  themeCardStyle = {},
  buttonStyle = "",
  structuralClasses = "rounded-2xl border border-stone-100",
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [popupIndex, setPopupIndex] = useState(null);

  const images = service.imageUrls?.length ? service.imageUrls : [];
  const hasMultiple = images.length > 1;

  const handleBook = () => {
    if (onOrder) onOrder(service.id);
    if (onBook) onBook(service);
  };

  return (
    <>
      <div
        id={`product-${service.id}`}
        className={`relative isolate h-full min-w-0 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group
          ${listView ? "flex flex-row" : "flex flex-col"}
          ${structuralClasses}
          ${isHighlighted ? "ring-2 ring-green-300 ring-offset-2 shadow-xl shadow-green-100/80" : "hover:shadow-lg hover:shadow-black/10"}`}
        style={themeCardStyle}
      >
        {/* Image Area */}
        {listView ? (
          <div className="relative z-0 bg-stone-100 overflow-hidden flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-l-2xl rounded-r-none">
            {images.length > 0 ? (
              <img
                src={images[activeImg]}
                alt={service.name}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
                onClick={() => setPopupIndex(activeImg)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <Package size={24} className="text-stone-300" />
                <p className="text-stone-300 text-[10px]">No image</p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-0 aspect-square w-full bg-stone-100 overflow-hidden">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImg]}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300 cursor-zoom-in"
                  loading="lazy"
                  onClick={() => setPopupIndex(activeImg)}
                />
                {hasMultiple && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImg(
                          (i) => (i - 1 + images.length) % images.length,
                        );
                      }}
                      className="absolute left-1.5 top-1/2 z-20 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImg((i) => (i + 1) % images.length);
                      }}
                      className="absolute right-1.5 top-1/2 z-20 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Package size={32} className="text-stone-300" />
                <p className="text-stone-300 text-xs">No image</p>
              </div>
            )}
          </div>
        )}

        {/* Info & Badges */}
        {listView ? (
          <div className="relative z-10 flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-stone-400 text-xs line-clamp-1 leading-relaxed mt-1">
                  {service.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {service.duration && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    <Clock size={8} /> {service.duration}
                  </span>
                )}
                {service.locationType && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                    <MapPin size={8} />{" "}
                    {service.locationType === "physical"
                      ? "In Person"
                      : service.locationType === "virtual"
                        ? "Online"
                        : "In Person / Online"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-green-600 font-extrabold text-base leading-none flex-shrink-0">
                ₦{Number(service.price).toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleBook}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold transition-all shadow-sm hover:shadow-md ${buttonStyle || "bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl"}`}
                >
                  <MessageCircle size={12} />
                  Book
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 p-3 sm:p-4 flex flex-col flex-1 min-h-0 gap-2">
            <h3 className="min-h-[2.25rem] font-bold text-gray-900 text-sm leading-snug line-clamp-2">
              {service.name}
            </h3>
            <p className="min-h-[1rem] text-stone-400 text-[11px] sm:text-xs line-clamp-1 leading-snug">
              {service.description || ""}
            </p>

            <div className="flex flex-wrap gap-1">
              {service.duration && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock size={8} /> {service.duration}
                </span>
              )}
              {service.locationType && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                  <MapPin size={8} />{" "}
                  {service.locationType === "physical"
                    ? "In Person"
                    : service.locationType === "virtual"
                      ? "Online"
                      : "In Person / Online"}
                </span>
              )}
            </div>

            <span className="text-green-600 font-extrabold text-lg leading-none mt-auto">
              ₦{Number(service.price).toLocaleString()}
            </span>

            <button
              onClick={handleBook}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all shadow-sm hover:shadow-md ${buttonStyle || "bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white rounded-xl"}`}
            >
              <MessageCircle size={13} />
              Book Now
            </button>
          </div>
        )}
      </div>

      {popupIndex !== null && (
        <div
          className="fixed inset-0 z-[80] bg-black/92 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPopupIndex(null)}
        >
          <button
            onClick={() => setPopupIndex(null)}
            className="absolute top-4 right-4 w-11 h-11 bg-white/15 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={images[popupIndex]}
            alt={service.name}
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-3 px-4">
            <p className="text-white/80 text-sm font-semibold drop-shadow text-center">
              {service.name}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBook();
              }}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all"
            >
              <MessageCircle size={15} />
              Book — ₦{Number(service.price).toLocaleString()}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatDateInputMin = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatBookingWhatsAppMessage = ({
  storeName,
  service,
  customerName,
  customerPhone,
  bookingDate,
  bookingTime,
  locationPref,
  notes,
}) => {
  const lines = [
    `Hello ${storeName || "there"},`,
    "",
    "I want to book a service appointment:",
    `Service: ${service.name}`,
    `Price: ₦${Number(service.price || 0).toLocaleString()}`,
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Preferred Date: ${bookingDate}`,
    `Preferred Time: ${bookingTime}`,
  ];

  if (locationPref) lines.push(`Location Preference: ${locationPref}`);
  if (notes) lines.push(`What I need help with: ${notes}`);

  lines.push("", "Please confirm availability. Thank you.");
  return lines.join("\n");
};

const getBookingNotesPlaceholder = (service = {}) => {
  const descriptor =
    `${service.category || ""} ${service.name || ""}`.toLowerCase();

  if (/consult|strategy|coach|session/.test(descriptor)) {
    return "E.g. I need help with a 30-minute business strategy session for my new store.";
  }

  if (/beauty|makeup|hair|spa|nail/.test(descriptor)) {
    return "E.g. I’m booking for bridal glam next Saturday and want a soft natural look.";
  }

  if (/design|brand|logo|graphics|website/.test(descriptor)) {
    return "E.g. I need a logo and brand design for a new fashion business.";
  }

  if (/photo|video|media|shoot/.test(descriptor)) {
    return "E.g. I need coverage for a birthday shoot next weekend in Lagos.";
  }

  return "E.g. Tell the business what you need help with, your goals, or any special request.";
};

const buildBookingWhatsAppUrl = (whatsappNumber, message) => {
  const cleanedNumber = `${whatsappNumber || ""}`.replace(/\D/g, "");
  return `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
};

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({
  products,
  onSelectCategory,
  activeCategory,
  activeThemeObj,
}) {
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2 className="font-bold text-gray-900 text-lg mb-4">Categories</h2>
      {categories.length <= 1 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Grid size={24} className="text-gray-300" />
          </div>
          <p className="text-stone-500 font-semibold text-sm">
            No categories yet
          </p>
          <p className="text-stone-400 text-xs mt-1">
            Products will be organised by category here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`flex items-center gap-3 p-4 transition-all text-left ${
                activeCategory === cat
                  ? `${activeThemeObj?.internalTabShellStyle?.cardClasses || "bg-white rounded-2xl border border-stone-100 shadow-sm"} ring-2 ring-green-400`
                  : `${activeThemeObj?.internalTabShellStyle?.cardClasses || "bg-white rounded-2xl border border-stone-100 shadow-sm"} hover:opacity-80`
              }`}
            >
              <div
                className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${
                  activeThemeObj?.internalTabShellStyle?.cardClasses
                    ? "rounded-full bg-black/10"
                    : "rounded-xl bg-stone-100"
                }`}
              >
                <Tag
                  size={16}
                  className={
                    activeCategory === cat ? "text-green-600" : "text-stone-400"
                  }
                />
              </div>
              <div>
                <p className="font-semibold text-sm">{cat}</p>
                <p className="text-xs text-stone-400">
                  {cat === "All"
                    ? `${products.length} items`
                    : `${products.filter((p) => p.category === cat).length} items`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ store, activeThemeObj }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2
        className="font-bold text-lg mb-4"
        style={{ fontFamily: activeThemeObj?.typography?.headerFontFamily }}
      >
        Orders
      </h2>
      <div
        className={`p-10 text-center ${activeThemeObj?.internalTabShellStyle?.cardClasses || "bg-white rounded-2xl border border-stone-100 shadow-sm"}`}
      >
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={28} className="text-green-400" />
        </div>
        <h3 className="font-bold text-gray-800 text-base mb-2">
          Order tracking
        </h3>
        <p className="text-stone-400 text-sm max-w-xs mx-auto mb-5">
          Use the store checkout and direct contact options to start or follow
          up on an order with this business.
        </p>
        <a
          href={buildEnquiryURL(store?.whatsappNumber, store?.businessName)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
        >
          <MessageCircle size={15} />
          Start an Order
        </a>
      </div>
    </div>
  );
}

// ─── Store Page ───────────────────────────────────────────────────────────────
export default function StorePage() {
  const { storeName } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [activeStoreSection, setActiveStoreSection] = useState("products");
  const [activeCategory, setActiveCategory] = useState("All");
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedBookingService, setSelectedBookingService] = useState(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingLocationPref, setBookingLocationPref] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  // ── Cart state ──
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const allProdsRef = useRef(null);
  const viewCountedRef = useRef(false);

  // ── Analytics ──
  const triggerSessionEngagement = () => {
    if (!hasInteracted && store?.id) {
      setHasInteracted(true);
      setDoc(
        doc(db, "stores", store.id, "analytics", "storeSummary"),
        { engagedViews: increment(1), updatedAt: new Date() },
        { merge: true },
      ).catch(() => {});
    }
  };

  // ── Data fetching ──
  useEffect(() => {
    const load = async () => {
      try {
        const storeData = await getStoreBySlug(storeName);
        if (!storeData) {
          setNotFound(true);
          return;
        }
        setStore(storeData);
        const [prods, serviceDocs] = await Promise.all([
          getProducts(storeData.id),
          getServices(storeData.id),
        ]);
        setProducts(prods);
        setServices(serviceDocs);

        if (!viewCountedRef.current) {
          viewCountedRef.current = true;
          try {
            await setDoc(
              doc(db, "stores", storeData.id, "analytics", "storeSummary"),
              { totalViews: increment(1), updatedAt: new Date() },
              { merge: true },
            );
          } catch {
            // silently ignore
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeName]);

  // ── Theme extraction (shared with dashboard live preview) ──
  const {
    activeThemeObj,
    previewThemeObj,
    themeBg,
    themeText,
    themePrimary,
    themeCard,
    themeAccent,
    headerFont,
    bodyFont,
    fontUrl,
    heroBannerUrl,
    footerText,
  } = resolveStoreThemeTokens(store, {}, { bannerWidth: 1200 });

  // ── Dynamic Font Injection ──
  useEffect(() => {
    if (!store || !fontUrl) return;
    const link = document.createElement("link");
    link.href = fontUrl;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [store?.storeTheme]);

  // ── Highlight product from URL param ──
  useEffect(() => {
    if (products.length === 0 && services.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    if (!productId) return;
    setHighlightedProduct(productId);
    setTimeout(() => {
      const el = document.getElementById(`product-${productId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    setTimeout(() => setHighlightedProduct(null), 4500);
  }, [products, services]);

  // ── Click tracking callback ──
  const handleProductClick = (productId) => {
    if (!store?.id) return;
    triggerSessionEngagement();
    setDoc(
      doc(db, "stores", store.id, "analytics", "storeSummary"),
      { totalClicks: increment(1), updatedAt: new Date() },
      { merge: true },
    ).catch(() => {});
    updateDoc(doc(db, "stores", store.id, "products", productId), {
      clicks: increment(1),
    }).catch(() => {});
  };

  const handleServiceClick = (serviceId) => {
    if (!store?.id) return;
    triggerSessionEngagement();
    setDoc(
      doc(db, "stores", store.id, "analytics", "storeSummary"),
      { totalClicks: increment(1), updatedAt: new Date() },
      { merge: true },
    ).catch(() => {});
    updateDoc(doc(db, "stores", store.id, "services", serviceId), {
      clicks: increment(1),
    }).catch(() => {});
  };

  const resetBookingForm = () => {
    setSelectedBookingService(null);
    setBookingName("");
    setBookingPhone("");
    setBookingDate("");
    setBookingTime("");
    setBookingLocationPref("");
    setBookingNotes("");
    setBookingError("");
    setBookingSubmitting(false);
    setBookingDone(false);
  };

  const openBookingModal = (service) => {
    setSelectedBookingService(service);
    setBookingName("");
    setBookingPhone("");
    setBookingDate("");
    setBookingTime("");
    setBookingLocationPref("");
    setBookingNotes("");
    setBookingError("");
    setBookingDone(false);
    setBookingSubmitting(false);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingService || !store?.id) return;

    if (
      !bookingName.trim() ||
      !bookingPhone.trim() ||
      !bookingDate ||
      !bookingTime
    ) {
      setBookingError(
        "Please fill in your name, phone number, preferred date, and preferred time.",
      );
      return;
    }

    const locationPref =
      selectedBookingService.locationType === "both"
        ? bookingLocationPref
        : selectedBookingService.locationType === "virtual"
          ? "Online"
          : selectedBookingService.locationType === "physical"
            ? "In Person"
            : "";

    if (selectedBookingService.locationType === "both" && !locationPref) {
      setBookingError("Please choose your location preference.");
      return;
    }

    setBookingSubmitting(true);
    setBookingError("");

    const message = formatBookingWhatsAppMessage({
      storeName: store.businessName,
      service: selectedBookingService,
      customerName: bookingName.trim(),
      customerPhone: bookingPhone.trim(),
      bookingDate,
      bookingTime,
      locationPref,
      notes: bookingNotes.trim(),
    });

    const whatsappUrl = buildBookingWhatsAppUrl(store.whatsappNumber, message);
    const analyticsRef = doc(
      db,
      "stores",
      store.id,
      "analytics",
      "storeSummary",
    );
    const serviceRef = doc(
      db,
      "stores",
      store.id,
      "services",
      selectedBookingService.id,
    );
    const isProOrPremium =
      store?.plan === "pro" ||
      store?.plan === "premium" ||
      store?.hasProFeatures === true ||
      store?.hasPremiumFeatures === true;

    try {
      if (isProOrPremium) {
        await addDoc(collection(db, "stores", store.id, "orders"), {
          customerName: bookingName.trim(),
          customerPhone: bookingPhone.trim(),
          bookingDate,
          bookingTime,
          locationPref,
          notes: bookingNotes.trim(),
          serviceId: selectedBookingService.id,
          serviceName: selectedBookingService.name,
          servicePrice: selectedBookingService.price,
          orderType: "service",
          status: "pending",
          paymentStatus: "unpaid",
          createdAt: new Date(),
        });

        await Promise.all([
          setDoc(
            analyticsRef,
            { totalBookingRequests: increment(1), updatedAt: new Date() },
            { merge: true },
          ),
          updateDoc(serviceRef, { bookingRequests: increment(1) }),
        ]);

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      } else {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        await Promise.all([
          setDoc(
            analyticsRef,
            { totalBookingRequests: increment(1), updatedAt: new Date() },
            { merge: true },
          ),
          updateDoc(serviceRef, { bookingRequests: increment(1) }),
        ]);
      }

      setBookingDone(true);
    } catch (error) {
      setBookingError(
        "Could not send your booking request right now. Please try again.",
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  // ── Cart handlers ──
  const handleAddToCart = (product) => {
    triggerSessionEngagement();
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          type: product.type || "physical",
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const handleRemoveItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  // ── Filtered products ──
  const filteredProductsOnly = (
    search.trim()
      ? products.filter(
          (p) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.description?.toLowerCase().includes(search.toLowerCase()),
        )
      : activeCategory !== "All"
        ? products.filter((p) => p.category === activeCategory)
        : products
  ).filter((p) => p.isActive !== false);

  const filteredServices = (
    search.trim()
      ? services.filter(
          (service) =>
            service.name?.toLowerCase().includes(search.toLowerCase()) ||
            service.description?.toLowerCase().includes(search.toLowerCase()),
        )
      : activeCategory !== "All"
        ? services.filter((service) => service.category === activeCategory)
        : services
  ).filter((service) => service.isActive !== false);

  const sortedProducts = [...filteredProductsOnly].sort((a, b) => {
    const aOut = typeof a.stock === "number" && a.stock === 0;
    const bOut = typeof b.stock === "number" && b.stock === 0;
    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;
    return 0;
  });

  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : "";
  const vendorType = store?.vendorType || "products";
  const hasProducts = vendorType === "products" || vendorType === "both";
  const hasServices = vendorType === "services" || vendorType === "both";
  const isServiceOnly = vendorType === "services";
  const storeLayout = store?.storeLayout || "grid";
  const showingServices =
    vendorType === "both" ? activeStoreSection === "services" : isServiceOnly;
  const currentItems = showingServices ? services : products;
  const currentFilteredItems = showingServices
    ? filteredServices
    : sortedProducts;
  const minBookingDate = formatDateInputMin();

  // ── Cart feature gate ──
  const isCartEnabled =
    store?.hasGrowthFeatures === true ||
    store?.plan === "growth" ||
    store?.plan === "pro" ||
    store?.plan === "premium";

  const scrollToAll = () => {
    allProdsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    setActiveTab("home");
    setTimeout(
      () =>
        allProdsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm font-medium">Loading store...</p>
        </div>
      </div>
    );
  }

  if (notFound) return <NotFound />;

  return (
    <div
      className={`isolate w-full min-h-screen overflow-x-hidden ${activeThemeObj.structuralStyle.containerClasses}`}
      style={{
        backgroundColor: themeBg,
        color: themeText,
        fontFamily: bodyFont,
      }}
    >
      {/* ── Navbar ── */}
      <StoreNavbar
        store={store}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={isCartEnabled ? cartCount : 0}
        onCartOpen={isCartEnabled ? () => setCartOpen(true) : null}
        activeThemeObj={previewThemeObj}
        hasServices={hasServices}
        hasProducts={hasProducts}
        activeStoreSection={activeStoreSection}
        onSectionChange={setActiveStoreSection}
      />

      <main className="relative z-0 pb-24 md:pb-0">
        {/* ── Tab: Categories ── */}
        {activeTab === "categories" && (
          <CategoriesTab
            products={products}
            onSelectCategory={handleSelectCategory}
            activeCategory={activeCategory}
            activeThemeObj={activeThemeObj}
          />
        )}

        {/* ── Tab: Orders ── */}
        {activeTab === "orders" && (
          <OrdersTab store={store} activeThemeObj={activeThemeObj} />
        )}

        {/* ── Tab: Home ── */}
        {activeTab === "home" && (
          <>
            {/* ── Hero ── */}
            <div
              className="relative overflow-hidden shadow-inner shadow-black/10"
              style={{
                backgroundColor: themePrimary,
                backgroundImage: heroBannerUrl
                  ? `url(${heroBannerUrl})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                  className={`absolute inset-0 ${heroBannerUrl ? "bg-black/50" : "bg-black/10"}`}
                />
                {!heroBannerUrl && (
                  <>
                    <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-white/10" />
                    <div className="absolute -bottom-16 -right-10 w-80 h-80 rounded-full bg-black/10" />
                  </>
                )}
              </div>

              <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
                <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-14">
                  {/* Left: Store info */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex justify-center md:hidden mb-5">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl bg-white/20 backdrop-blur-sm border-2 border-white/35">
                        {store.logoUrl ? (
                          <img
                            src={store.logoUrl}
                            alt={store.businessName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-extrabold text-2xl select-none">
                            {getInitials(store.businessName)}
                          </span>
                        )}
                      </div>
                    </div>

                    <h1
                      className="font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight text-white tracking-tight mb-4 drop-shadow-sm max-w-2xl mx-auto md:mx-0"
                      style={{ fontFamily: headerFont }}
                    >
                      {store.businessName}
                    </h1>

                    {store.description && (
                      <p className="text-white/80 text-sm md:text-base max-w-md mx-auto md:mx-0 leading-relaxed mb-6">
                        {store.description}
                      </p>
                    )}

                    <div
                      className={`flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 ${store.description ? "" : "mt-6"}`}
                    >
                      {isServiceOnly ? (
                        <button
                          onClick={scrollToAll}
                          className={`inline-flex items-center justify-center gap-2 px-6 py-3 transition-all shadow-xl shadow-black/10 ${activeThemeObj.structuralStyle.buttonClasses}`}
                          style={{
                            backgroundColor:
                              themeAccent !==
                              activeThemeObj.defaultColors.accent
                                ? themeAccent
                                : undefined,
                          }}
                        >
                          <Calendar size={15} />
                          Book a Service
                        </button>
                      ) : (
                        <a
                          href={buildEnquiryURL(
                            store.whatsappNumber,
                            store.businessName,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center justify-center gap-2 px-6 py-3 transition-all shadow-xl shadow-black/10 ${activeThemeObj.structuralStyle.buttonClasses}`}
                          style={{
                            backgroundColor:
                              themeAccent !==
                              activeThemeObj.defaultColors.accent
                                ? themeAccent
                                : undefined,
                          }}
                        >
                          <MessageCircle size={15} />
                          Contact this business
                        </a>
                      )}
                      {products.length > 0 && (
                        <button
                          onClick={scrollToAll}
                          className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all border border-white/25 backdrop-blur-sm"
                        >
                          <ShoppingBag size={15} />
                          Browse {products.length} item
                          {products.length !== 1 ? "s" : ""}
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop logo showcase */}
                  <div className="hidden md:flex flex-shrink-0 items-center justify-center w-[280px] lg:w-[340px] relative">
                    <div className="absolute w-[260px] h-[260px] lg:w-[310px] lg:h-[310px] rounded-full bg-white/10 border border-white/15" />
                    <div className="absolute w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] rounded-full bg-white/15" />
                    <div className="relative z-10 w-[140px] h-[140px] lg:w-[168px] lg:h-[168px] rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl shadow-black/20 bg-white/25 backdrop-blur-md border-2 border-white/40">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.businessName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-extrabold text-5xl select-none drop-shadow-lg">
                          {getInitials(store.businessName)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Products Section ── */}
            <div
              ref={allProdsRef}
              className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 scroll-mt-20"
            >
              {currentItems.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
                  <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={28} className="text-stone-300" />
                  </div>
                  <p className="text-stone-600 font-semibold text-base">
                    No items listed yet.
                  </p>
                  <p className="text-stone-400 text-sm mt-1">
                    Check back soon!
                  </p>
                </div>
              ) : (
                <>
                  {/* Section header */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
                    <div>
                      <h2
                        className="font-bold text-lg sm:text-xl"
                        style={{ fontFamily: headerFont, color: themeText }}
                      >
                        {search
                          ? "Search Results"
                          : activeCategory !== "All"
                            ? activeCategory
                            : "Our Collection"}
                      </h2>
                      <p className="text-xs sm:text-sm mt-0.5 opacity-60">
                        {search
                          ? `${currentFilteredItems.length} of ${currentItems.length} item${currentItems.length !== 1 ? "s" : ""}`
                          : `${currentFilteredItems.length} item${currentFilteredItems.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {activeCategory !== "All" && (
                      <button
                        onClick={() => setActiveCategory("All")}
                        className="text-green-600 text-sm font-semibold hover:underline w-fit"
                      >
                        View all
                      </button>
                    )}
                  </div>

                  {/* Search bar */}
                  {isServiceOnly && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-800 text-sm">
                          Book a service
                        </p>
                        <p className="text-blue-600 text-xs">
                          Select a service below to check availability and book.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative mb-6 max-w-sm">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={
                        isServiceOnly
                          ? "Search services..."
                          : "Search products..."
                      }
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-gray-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all shadow-sm shadow-stone-100/70"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {vendorType === "both" && (
                    <div className="flex gap-2 mb-5">
                      <button
                        onClick={() => setActiveStoreSection("products")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          activeStoreSection === "products"
                            ? "bg-green-500 text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
                        }`}
                      >
                        Shop Products
                      </button>
                      <button
                        onClick={() => setActiveStoreSection("services")}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          activeStoreSection === "services"
                            ? "bg-green-500 text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-green-300"
                        }`}
                      >
                        Book a Service
                      </button>
                    </div>
                  )}

                  {/* Product grid */}
                  {currentFilteredItems.length > 0 ? (
                    <div
                      className={
                        storeLayout === "list"
                          ? "grid grid-cols-1 items-stretch gap-3 sm:gap-4"
                          : storeLayout === "compact"
                            ? "grid grid-cols-3 items-stretch sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
                            : "grid grid-cols-2 items-stretch sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
                      }
                    >
                      {showingServices
                        ? filteredServices.map((service) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              isHighlighted={highlightedProduct === service.id}
                              onOrder={handleServiceClick}
                              onBook={openBookingModal}
                              listView={storeLayout === "list"}
                              themeCardStyle={{
                                backgroundColor: themeCard,
                                color: themeText,
                                fontFamily: bodyFont,
                              }}
                              buttonStyle={
                                activeThemeObj.structuralStyle.buttonClasses
                              }
                              structuralClasses={`${activeThemeObj.structuralStyle.cardBorderRadius} ${activeThemeObj.structuralStyle.cardBorder}`}
                            />
                          ))
                        : sortedProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              whatsappNumber={store.whatsappNumber}
                              storeUrl={storeUrl}
                              isHighlighted={highlightedProduct === product.id}
                              onOrder={handleProductClick}
                              listView={storeLayout === "list"}
                              onAddToCart={
                                isCartEnabled ? handleAddToCart : null
                              }
                              themeCardStyle={{
                                backgroundColor: themeCard,
                                color: themeText,
                                fontFamily: bodyFont,
                              }}
                              buttonStyle={
                                activeThemeObj.structuralStyle.buttonClasses
                              }
                              structuralClasses={`${activeThemeObj.structuralStyle.cardBorderRadius} ${activeThemeObj.structuralStyle.cardBorder}`}
                            />
                          ))}
                    </div>
                  ) : (
                    <div className="text-center py-14 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/80">
                      <Search
                        size={28}
                        className="text-stone-200 mx-auto mb-3"
                      />
                      <p className="text-stone-500 text-sm font-semibold">
                        No {showingServices ? "services" : "products"} match
                        &ldquo;
                        <span className="font-bold text-gray-700">
                          {search}
                        </span>
                        &rdquo;
                      </p>
                      <button
                        onClick={() => setSearch("")}
                        className="text-green-500 text-sm font-bold mt-2 hover:underline"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Lead Form */}
              <div className="mt-12 sm:mt-14">
                <LeadForm
                  storeId={store.id}
                  storeName={store.businessName}
                  whatsappNumber={store.whatsappNumber}
                  leadType={
                    isServiceOnly || showingServices
                      ? "service"
                      : "product"
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {activeTab === "home" && (
          <StoreFooter
            storeName={store.businessName}
            customFooterText={footerText}
          />
        )}

        {/* Mobile bottom dock clearance */}
      </main>

      {selectedBookingService && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0"
            onClick={resetBookingForm}
            aria-hidden="true"
          />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <button
              onClick={resetBookingForm}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="px-5 sm:px-6 pt-6 pb-5 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">
                Booking Request
              </p>
              <h2 className="text-xl font-bold text-gray-900 pr-12">
                {selectedBookingService.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                ₦{Number(selectedBookingService.price || 0).toLocaleString()}
              </p>
            </div>

            {bookingDone ? (
              <div className="px-5 sm:px-6 py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Booking request sent
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your request has been prepared successfully. Please continue
                    the conversation in WhatsApp if it opened in a new tab.
                  </p>
                </div>
                <button
                  onClick={resetBookingForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="px-5 sm:px-6 py-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="E.g. Amara Okafor"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder="E.g. 08012345678"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    min={minBookingDate}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                {selectedBookingService.locationType === "both" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
                      Location Preference
                    </label>
                    <div className="flex gap-2">
                      {[
                        { label: "In Person", value: "In Person" },
                        { label: "Online", value: "Online" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setBookingLocationPref(option.value)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                            bookingLocationPref === option.value
                              ? "bg-green-500 text-white border-green-500"
                              : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                      What do you need help with
                    </label>
                    <span className="text-xs text-gray-400">
                      {bookingNotes.length}/250
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={250}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder={getBookingNotesPlaceholder(
                      selectedBookingService,
                    )}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none resize-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                {selectedBookingService.bookingNote && (
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
                      Booking note
                    </p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      {selectedBookingService.bookingNote}
                    </p>
                  </div>
                )}

                {bookingError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                    {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-all"
                >
                  {bookingSubmitting ? "Sending..." : "Send Booking Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && isCartEnabled && (
        <CartDrawer
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClose={() => setCartOpen(false)}
          whatsappNumber={store.whatsappNumber}
          storeName={store.businessName}
          activeThemeObj={activeThemeObj}
        />
      )}
    </div>
  );
}
