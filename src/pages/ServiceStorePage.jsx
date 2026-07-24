// src/pages/ServiceStorePage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Package, Search, X, Grid, Tag, Calendar, Check, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import { getStoreBySlug } from "../firebase/products";
import { getServices } from "../firebase/services";
import { db } from "../firebase/config";
import {
  addDoc,
  collection,
  doc,
  increment,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import LeadForm from "../components/LeadForm";
import ServiceCard from "../components/ServiceCard";
import StoreNavbar from "../components/StoreNavbar";
import StoreFooter from "../components/StoreFooter";
import NotFound from "./NotFound";
import { resolveStoreThemeTokens } from "../utils/resolveStoreTheme";
import { generateBookingReceipt } from "../utils/generateReceipt";

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

const calcProcessingFee = (subtotal) =>
  Math.min(Math.ceil(subtotal * 0.015) + 100, 2000);

function ServiceCategoriesTab({
  services,
  onSelectCategory,
  activeCategory,
  activeThemeObj,
}) {
  const categories = [
    "All",
    ...Array.from(
      new Set(services.map((service) => service.category).filter(Boolean)),
    ),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2 className="font-bold text-gray-900 text-lg mb-4">
        Service Categories
      </h2>
      {categories.length <= 1 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Grid size={24} className="text-gray-300" />
          </div>
          <p className="text-stone-500 font-semibold text-sm">
            No service categories yet
          </p>
          <p className="text-stone-400 text-xs mt-1">
            Services will be organised by category here.
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
                    ? `${services.length} services`
                    : `${services.filter((service) => service.category === cat).length} services`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceStorePage() {
  const { storeName } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [store, setStore] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [highlightedService, setHighlightedService] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [selectedBookingService, setSelectedBookingService] = useState(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingLocationPref, setBookingLocationPref] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  const [completedBooking, setCompletedBooking] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [receiptDownloading, setReceiptDownloading] = useState(false);

  const allServicesRef = useRef(null);
  const viewCountedRef = useRef(false);

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

  useEffect(() => {
    const load = async () => {
      try {
        const storeData = await getStoreBySlug(storeName);
        if (!storeData) {
          setNotFound(true);
          return;
        }

        if (storeData.vendorType === "products") {
          navigate(`/${storeData.storeName}`, { replace: true });
          return;
        }

        const serviceDocs = await getServices(storeData.id, storeData.maxProducts);
        setStore(storeData);
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
  }, [storeName, navigate]);

  useEffect(() => {
    if (!store || searchParams.get("checkout") !== "success") return;

    const ref = searchParams.get("reference");
    if (!ref) return;

    const stored = sessionStorage.getItem(`sellapage_checkout_${ref}`);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed.transactionType === "checkout") {
        setCompletedBooking(parsed.booking);
        setSuccessModalOpen(true);
        sessionStorage.removeItem(`sellapage_checkout_${ref}`);
      }
    } catch {
      // ignore invalid storage
    }

    searchParams.delete("checkout");
    searchParams.delete("reference");
    setSearchParams(searchParams, { replace: true });
  }, [store, searchParams, setSearchParams]);

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

  useEffect(() => {
    if (!store || !fontUrl) return;
    const link = document.createElement("link");
    link.href = fontUrl;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [store?.storeTheme, store, fontUrl]);

  useEffect(() => {
    if (services.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get("product");
    if (!serviceId) return;
    setHighlightedService(serviceId);
    setTimeout(() => {
      const el = document.getElementById(`product-${serviceId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    setTimeout(() => setHighlightedService(null), 4500);
  }, [services]);

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
    setBookingEmail("");
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
    setBookingEmail("");
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

    const isProOrPremium =
      store?.hasProFeatures === true ||
      store?.plan === "pro" ||
      store?.plan === "premium";

    if (
      !bookingName.trim() ||
      !bookingPhone.trim() ||
      !bookingDate ||
      !bookingTime ||
      (isProOrPremium && !bookingEmail.trim())
    ) {
      setBookingError(
        isProOrPremium
          ? "Please fill in your name, email address, phone number, preferred date, and preferred time."
          : "Please fill in your name, phone number, preferred date, and preferred time.",
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

    try {
      if (isProOrPremium) {
        const res = await fetch("/api/checkout-initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: store.id,
            customerName: bookingName.trim(),
            customerEmail: bookingEmail.trim(),
            customerPhone: bookingPhone.trim(),
            orderType: "booking",
            bookingDate,
            bookingTime,
            serviceId: selectedBookingService.id,
            serviceName: selectedBookingService.name,
            servicePrice: Number(selectedBookingService.price),
            locationType: selectedBookingService.locationType || "",
            locationPref,
            customerNotes: bookingNotes.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.authorization_url) {
          setBookingError(
            data.error || "Could not start payment. Please try again.",
          );
          setBookingSubmitting(false);
          return;
        }

        const subtotal = Number(selectedBookingService.price);
        const processingFee = calcProcessingFee(subtotal);
        const grandTotal = subtotal + processingFee;

        const bookingSnapshot = {
          reference: data.reference,
          customerName: bookingName.trim(),
          customerEmail: bookingEmail.trim(),
          customerPhone: bookingPhone.trim(),
          serviceName: selectedBookingService.name,
          servicePrice: subtotal,
          bookingDate,
          bookingTime,
          locationPref,
          processingFee,
          grandTotal,
          createdAt: new Date().toISOString(),
        };

        sessionStorage.setItem(
          `sellapage_checkout_${data.reference}`,
          JSON.stringify({
            transactionType: "checkout",
            storeName: store.storeName,
            storeId: store.id,
            booking: bookingSnapshot,
          }),
        );

        window.location.href = data.authorization_url;
      } else {
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
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        await Promise.all([
          setDoc(
            analyticsRef,
            { totalBookingRequests: increment(1), updatedAt: new Date() },
            { merge: true },
          ),
          updateDoc(serviceRef, { bookingRequests: increment(1) }),
        ]);

        setBookingDone(true);
      }
    } catch (err) {
      console.error(err);
      setBookingError(
        "Could not process your booking request right now. Please try again.",
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!completedBooking || !store) return;
    setReceiptDownloading(true);
    try {
      const blobUrl = await generateBookingReceipt(completedBooking, store);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `receipt_${completedBooking.reference || completedBooking.id || "booking"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Could not generate receipt:", err);
      setBookingError("Could not generate receipt. Please try again.");
    } finally {
      setReceiptDownloading(false);
    }
  };

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

  const vendorType = store?.vendorType || "services";
  const storeLayout = store?.storeLayout || "grid";
  const minBookingDate = formatDateInputMin();
  const isProOrPremium =
    store?.hasProFeatures === true ||
    store?.plan === "pro" ||
    store?.plan === "premium";

  const scrollToAll = () => {
    allServicesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    setActiveTab("home");
    setTimeout(() => {
      allServicesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

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
      <StoreNavbar
        store={store}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeThemeObj={previewThemeObj}
        hasServices={true}
        hasProducts={store?.vendorType === "both"}
        activeStoreSection="services"
        onSectionChange={(section) => {
          if (section === "products") navigate(`/${store.storeName}`);
        }}
      />

      <main className="relative z-0 pb-24 md:pb-0">
        {activeTab === "categories" && (
          <ServiceCategoriesTab
            services={services}
            onSelectCategory={handleSelectCategory}
            activeCategory={activeCategory}
            activeThemeObj={activeThemeObj}
          />
        )}

        {activeTab === "home" && (
          <>
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
                      <button
                        onClick={scrollToAll}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 transition-all shadow-xl shadow-black/10 ${activeThemeObj.structuralStyle.buttonClasses}`}
                        style={{
                          backgroundColor:
                            themeAccent !== activeThemeObj.defaultColors.accent
                              ? themeAccent
                              : undefined,
                        }}
                      >
                        <Calendar size={15} />
                        Book a Service
                      </button>
                    </div>

                    {(vendorType === "both" || store?.whatsappCommunityLink) && (
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        {vendorType === "both" && (
                          <button
                            onClick={() => navigate(`/${store.storeName}`)}
                            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition-all border border-white/25 backdrop-blur-sm"
                          >
                            Shop Our Products
                            <ArrowRight size={13} />
                          </button>
                        )}
                        {store?.whatsappCommunityLink && (
                          <a
                            href={store.whatsappCommunityLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition-all border border-white/25 backdrop-blur-sm"
                          >
                            <MessageCircle size={13} fill="currentColor" />
                            Join Our WhatsApp Community
                          </a>
                        )}
                      </div>
                    )}
                  </div>

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

            <div
              ref={allServicesRef}
              className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 scroll-mt-20"
            >
              {services.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/70">
                  <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package size={28} className="text-stone-300" />
                  </div>
                  <p className="text-stone-600 font-semibold text-base">
                    No services listed yet.
                  </p>
                  <p className="text-stone-400 text-sm mt-1">
                    Check back soon!
                  </p>
                </div>
              ) : (
                <>
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
                            : "Our Services"}
                      </h2>
                      <p className="text-xs sm:text-sm mt-0.5 opacity-60">
                        {search
                          ? `${filteredServices.length} of ${services.length} services`
                          : `${filteredServices.length} service${filteredServices.length !== 1 ? "s" : ""}`}
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

                  <div className="relative mb-6 max-w-sm">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search services..."
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

                  {filteredServices.length > 0 ? (
                    <div
                      className={
                        storeLayout === "list"
                          ? "grid grid-cols-1 items-stretch gap-3 sm:gap-4"
                          : storeLayout === "compact"
                            ? "grid grid-cols-3 items-stretch sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
                            : "grid grid-cols-2 items-stretch sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
                      }
                    >
                      {filteredServices.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          isHighlighted={highlightedService === service.id}
                          onOrder={handleServiceClick}
                          avgRating={service.avgRating || 0}
                          reviewCount={service.reviewCount || 0}
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
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-14 bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100/80">
                      <Search
                        size={28}
                        className="text-stone-200 mx-auto mb-3"
                      />
                      <p className="text-stone-500 text-sm font-semibold">
                        No services match &ldquo;
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

              <div className="mt-12 sm:mt-14">
                <LeadForm
                  storeId={store.id}
                  storeName={store.businessName}
                  whatsappNumber={store.whatsappNumber}
                  leadType="service"
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "home" && (
          <StoreFooter
            storeName={store.businessName}
            customFooterText={footerText}
          />
        )}
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

                {isProOrPremium && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="E.g. amara@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                )}

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
                  {bookingSubmitting ? (
                    isProOrPremium ? "Processing..." : "Sending..."
                  ) : (
                    isProOrPremium ? "Pay & Book" : "Send Booking Request"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {successModalOpen && completedBooking && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0"
            onClick={() => setSuccessModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-6 text-center space-y-4">
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <Check className="animate-bounce" size={24} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Booking Confirmed!
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Thank you for booking with {store?.businessName || "us"}.
              </p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 text-left space-y-2 text-sm">
              <div>
                <span className="text-stone-400 font-medium">Customer:</span>{" "}
                <span className="text-stone-900 font-semibold">{completedBooking.customerName}</span>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Service:</span>{" "}
                <span className="text-stone-900 font-semibold">
                  {completedBooking.serviceName || "Service Booking"}
                </span>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Total Paid:</span>{" "}
                <span className="text-green-600 font-bold">
                  ₦{Number(completedBooking.grandTotal || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadReceipt}
              disabled={receiptDownloading}
              className="w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50 py-3 rounded-xl font-bold text-sm transition-all"
            >
              {receiptDownloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating…
                </>
              ) : (
                "Download Receipt"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
