// src/pages/StorePage.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Package,
  Search,
  X,
  ShoppingBag,
  ArrowRight,
  Grid,
  Tag,
  CheckCircle,
  ChevronDown,
  Loader2,
  CreditCard,
  AlertCircle,
  Gift,
} from "lucide-react";
import { getStoreBySlug, getProducts } from "../firebase/products";
import { db } from "../firebase/config";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";
import { buildEnquiryURL } from "../utils/whatsapp";
import LeadForm from "../components/LeadForm";
import ProductCard from "../components/ProductCard";
import StoreNavbar from "../components/StoreNavbar";
import StoreFooter from "../components/StoreFooter";
import CartDrawer from "../components/CartDrawer";
import ProductDetailOverlay from "../components/ProductDetailOverlay";
import NotFound from "./NotFound";
import { resolveStoreThemeTokens } from "../utils/resolveStoreTheme";
import SEO from '../components/SEO';

const EMPTY_CHECKOUT_FORM = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  deliveryState: "",
  deliveryLga: "",
  deliveryAddress: "",
  notes: "",
};

const calcSubtotal = (items) =>
  items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

const calcProcessingFee = (subtotal) =>
  Math.min(Math.ceil(subtotal * 0.015) + 100, 2000);

const calcDiscountAmount = (subtotal, appliedDiscount) => {
  if (!appliedDiscount) return 0;
  return appliedDiscount.type === "percentage"
    ? Math.floor((subtotal * Number(appliedDiscount.value)) / 100)
    : Math.min(Number(appliedDiscount.value), subtotal);
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

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
        {store.showWhatsApp !== false && (
          <a
            href={buildEnquiryURL(store?.whatsappNumber, store?.businessName)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fba5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            <MessageCircle size={15} />
            Start an Order
          </a>
        )}
      </div>
    </div>
  );
}

function CartSummary({ cart, subtotal, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);

  const content = (
    <div className="space-y-2">
      {cart.map((item) => (
        <div key={item.id} className="flex justify-between text-sm gap-2">
          <span className="text-gray-600 truncate">
            {item.name} × {item.quantity}
          </span>
          <span className="font-semibold text-gray-900 flex-shrink-0">
            ₦{(Number(item.price) * item.quantity).toLocaleString()}
          </span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100">
        <span>Subtotal</span>
        <span>₦{subtotal.toLocaleString()}</span>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Cart summary
        </p>
        {content}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <span>
          Cart ({cart.length} item{cart.length !== 1 ? "s" : ""}) - ₦
          {subtotal.toLocaleString()}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{content}</div>}
    </div>
  );
}

function StoreCheckoutModal({
  store,
  cart,
  step,
  setStep,
  form,
  setForm,
  selectedZone,
  setSelectedZone,
  checkoutError,
  checkoutProcessing,
  completedOrder,
  onClose,
  onPay,
  onDownloadReceipt,
  receiptDownloading,
  promoCode,
  setPromoCode,
  appliedDiscount,
  setAppliedDiscount,
  promoLoading,
  setPromoLoading,
  promoError,
  setPromoError,
  loyaltyCode,
  setLoyaltyCode,
  loyaltyCard,
  setLoyaltyCard,
  loyaltyLoading,
  setLoyaltyLoading,
  loyaltyError,
  setLoyaltyError,
  storeId,
  verifyError,
}) {
  const subtotal = calcSubtotal(cart);
  const deliveryFee = selectedZone ? Number(selectedZone.price) : 0;
  const processingFee = calcProcessingFee(subtotal);
  const discountAmount = calcDiscountAmount(subtotal, appliedDiscount);
  // Mirrors the server's cap in resolveRedemption: points never eat the delivery
  // or processing fee. Display only; checkout-initialize recomputes it.
  const loyaltyValue = appliedDiscount
    ? 0
    : Math.min(loyaltyCard?.value || 0, subtotal);
  const [showLoyaltyInput, setShowLoyaltyInput] = useState(false);
  // What this order would earn. Read straight off the public store document, so
  // it costs nothing, and mirrors earnPointsForOrder's floor division exactly.
  const loyaltyEarnPreview = Math.floor(
    subtotal / (Number(store?.loyaltyEarnRate) || 100),
  );
  const grandTotal =
    subtotal + deliveryFee + processingFee - discountAmount - loyaltyValue;
  const deliveryZones = store?.deliveryZones || [];

  const steps = [
    { id: "details", label: "1. Details" },
    { id: "delivery", label: "2. Delivery" },
    { id: "payment", label: "3. Payment" },
  ];

  const updateForm = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSelectZone = (zone) => {
    setSelectedZone(zone);
    setForm((prev) => ({
      ...prev,
      deliveryState: zone.state,
      deliveryLga: zone.lga || "",
    }));
  };

  const handleContinueDetails = () => {
    if (
      !form.customerName.trim() ||
      !form.customerEmail.trim() ||
      !form.customerPhone.trim()
    ) {
      return;
    }
    setStep("delivery");
  };

  const handleContinueDelivery = () => {
    if (!selectedZone || !form.deliveryAddress.trim()) return
    setStep("payment")
  };

  const handleApplyLoyalty = async () => {
    const code = (loyaltyCode || "").trim();
    if (!code || !storeId) return;
    setLoyaltyLoading(true);
    setLoyaltyError("");
    try {
      const res = await fetch("/api/loyalty-public?action=lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.enabled) {
        setLoyaltyError("This store is not running a points programme.");
      } else if (!data.found) {
        setLoyaltyError("We could not find that code.");
      } else if (!data.eligible) {
        setLoyaltyError(
          `You need at least ${data.minRedeem} points to spend. You have ${data.points}.`,
        );
      } else {
        // Spend the whole balance by default, capped at the subtotal so the
        // customer is never shown a discount larger than their own basket.
        const usablePoints = Math.min(
          data.points,
          Math.floor(subtotal / (data.redeemValue || 1)),
        );
        setLoyaltyCard({
          code: data.code,
          points: usablePoints,
          balance: data.points,
          value: Math.floor(usablePoints * (data.redeemValue || 1)),
        });
      }
    } catch {
      setLoyaltyError("Could not check that code. Please try again.");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const handleRecoverLoyalty = async () => {
    const email = (form.customerEmail || "").trim();
    if (!email) {
      setLoyaltyError("Enter your email above first, then tap this again.");
      return;
    }
    setLoyaltyLoading(true);
    setLoyaltyError("");
    try {
      await fetch("/api/loyalty-public?action=recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, email }),
      });
    } catch {
      /* the message below is intentionally identical either way */
    } finally {
      setLoyaltyLoading(false);
      // Same message regardless of outcome. The endpoint deliberately does not
      // reveal whether that email has a card, so neither does this.
      setLoyaltyError(
        "If that email has a card with this store, we have sent the code to it.",
      );
    }
  };

  const handleApplyPromo = async () => {
    const normalizedCode = promoCode.trim().toUpperCase();
    if (!normalizedCode || !store?.id) return;

    setPromoLoading(true);
    setPromoError("");

    try {
      const res = await fetch("/api/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          code: normalizedCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromoError(data.error || "Could not apply promo code.");
        return;
      }

      setAppliedDiscount(data);
      setPromoCode(data.code);
    } catch {
      setPromoError("Could not apply promo code.");
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full sm:max-w-[520px] max-h-[100dvh] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            {step === "success" ? (
              <span className="text-green-600">Order complete</span>
            ) : step === "verifying" ? (
              <span className="text-green-600">Confirming payment</span>
            ) : (
              steps.map((s, i) => (
                <span
                  key={s.id}
                  className={step === s.id ? "text-green-600" : "text-gray-400"}
                >
                  {s.label}
                  {i < steps.length - 1 && (
                    <span className="mx-1 text-gray-300">·</span>
                  )}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close checkout"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === "details" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={updateForm("customerName")}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={updateForm("customerEmail")}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={updateForm("customerPhone")}
                    placeholder="08012345678"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <CartSummary cart={cart} subtotal={subtotal} />
              </div>
              <div className="sm:hidden">
                <CartSummary cart={cart} subtotal={subtotal} collapsible />
              </div>
              <button
                type="button"
                onClick={handleContinueDetails}
                disabled={
                  !form.customerName.trim() ||
                  !form.customerEmail.trim() ||
                  !form.customerPhone.trim()
                }
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-bold text-sm transition-all"
              >
                Continue to Delivery
              </button>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-4">
              {deliveryZones.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p>
                    This seller hasn&apos;t set up delivery zones yet - contact
                    them on WhatsApp to arrange delivery.
                  </p>
                  {store.showWhatsApp !== false && (
                    <a
                      href={buildEnquiryURL(store.whatsappNumber, store.businessName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-green-700 font-semibold hover:underline"
                    >
                      <MessageCircle size={14} />
                      Chat on WhatsApp
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Select delivery zone
                    </p>
                    <div className="space-y-2">
                      {deliveryZones.map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => handleSelectZone(zone)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            selectedZone?.id === zone.id
                              ? "border-green-500 bg-green-50"
                              : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <p className="font-semibold text-gray-900 text-sm">
                            {zone.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {zone.state}
                            {zone.lga ? ` · ${zone.lga}` : ""}
                          </p>
                          <p className="text-sm font-bold text-green-600 mt-1">
                            ₦{Number(zone.price).toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                      Delivery Details
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={form.customerName}
                          onChange={updateForm("customerName")}
                          placeholder="Recipient name"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={form.customerPhone}
                          onChange={updateForm("customerPhone")}
                          placeholder="08012345678"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          value={form.deliveryAddress}
                          onChange={updateForm("deliveryAddress")}
                          placeholder="House no., street name, landmark"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          City / LGA
                        </label>
                        <input
                          type="text"
                          value={form.deliveryLga}
                          onChange={updateForm("deliveryLga")}
                          placeholder="Local government area"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                          State
                        </label>
                        <input
                          type="text"
                          value={form.deliveryState}
                          onChange={updateForm("deliveryState")}
                          placeholder="State"
                          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Order notes (optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={updateForm("notes")}
                      placeholder="Any special instructions"
                      rows={2}
                      className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none resize-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </>
              )}

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery fee</span>
                  <span>{deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : '-'}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>−₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {loyaltyValue > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Points ({loyaltyCard.points})</span>
                    <span>−₦{loyaltyValue.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Processing fee</span>
                  <span>₦{processingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueDelivery}
                disabled={deliveryZones.length === 0 || !selectedZone || !form.deliveryAddress.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-bold text-sm transition-all"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <CartSummary cart={cart} subtotal={subtotal} />

              {!appliedDiscount ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase().slice(0, 20))}
                    placeholder="Promo code"
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim() || promoLoading}
                    className="px-5 py-3 text-sm font-bold text-green-600 border border-green-500 rounded-xl hover:bg-green-50 disabled:opacity-50 transition-all"
                  >
                    {promoLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                    <Tag size={14} />
                    {appliedDiscount.code}
                    <span className="text-green-600 font-normal">−₦{discountAmount.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAppliedDiscount(null); setPromoCode(""); }}
                    className="p-1 rounded-lg hover:bg-green-100 text-green-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-red-500 text-xs">{promoError}</p>
              )}

              {/* Loyalty. Two gates before anything renders:
                  1. The store must actually run the programme. Without this the
                     code box appeared on EVERY storefront on the platform,
                     including the vendors who have never heard of it.
                  2. Not while a promo code is applied, because the server refuses
                     to stack the two and an input that silently does nothing is
                     worse than no input at all. */}
              {store?.loyaltyEnabled === true && !appliedDiscount && (
                loyaltyCard ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
                      <Gift size={14} />
                      {loyaltyCard.points} points
                      <span className="text-green-600 font-normal">
                        −₦{loyaltyValue.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLoyaltyCard(null); setLoyaltyCode(""); setLoyaltyError(""); }}
                      className="p-1 rounded-lg hover:bg-green-100 text-green-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : showLoyaltyInput ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={loyaltyCode}
                        onChange={(e) => setLoyaltyCode(e.target.value.toUpperCase().slice(0, 12))}
                        placeholder="Loyalty code"
                        onKeyDown={(e) => e.key === "Enter" && handleApplyLoyalty()}
                        className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleApplyLoyalty}
                        disabled={!loyaltyCode.trim() || loyaltyLoading}
                        className="px-5 py-3 text-sm font-bold text-green-600 border border-green-500 rounded-xl hover:bg-green-50 disabled:opacity-50 transition-all"
                      >
                        {loyaltyLoading ? <Loader2 size={14} className="animate-spin" /> : "Use"}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Only offered to someone who has said they have a code.
                          Showing it to a first time customer is asking them to
                          recover something they never had. */}
                      <button
                        type="button"
                        onClick={handleRecoverLoyalty}
                        className="text-[11px] text-gray-400 hover:text-green-600 underline"
                      >
                        Lost your code?
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowLoyaltyInput(false); setLoyaltyError(""); }}
                        className="text-[11px] text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Default state. A first time customer has no code and needs to
                  // know the programme exists at all, so this leads with what they
                  // are about to earn rather than demanding something they do not
                  // have. The code box is one tap away for returning customers.
                  <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Gift size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-green-800">
                          {loyaltyEarnPreview > 0
                            ? `You will earn ${loyaltyEarnPreview} point${loyaltyEarnPreview === 1 ? "" : "s"} on this order`
                            : "Earn points when you shop here"}
                        </p>
                        <p className="text-[11px] text-green-700 mt-0.5">
                          We will email your points card after checkout. Spend the
                          points on a future order.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowLoyaltyInput(true)}
                          className="text-[11px] font-bold text-green-700 underline mt-1.5"
                        >
                          I already have a code
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
              {loyaltyError && (
                <p className="text-gray-500 text-xs">{loyaltyError}</p>
              )}

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery fee</span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>−₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Processing fee</span>
                  <span>₦{processingFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                  <span>Grand total</span>
                  <span>₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {checkoutError && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {checkoutError}
                </p>
              )}

              <button
                type="button"
                onClick={onPay}
                disabled={checkoutProcessing}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-sm transition-all"
              >
                {checkoutProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay ₦{grandTotal.toLocaleString()} now
                  </>
                )}
              </button>
            </div>
          )}

          {step === "verifying" && (
            <div className="text-center space-y-5 py-8">
              {verifyError ? (
                <>
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={28} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Couldn't confirm your payment
                    </h3>
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                      {verifyError}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 size={32} className="text-green-600 animate-spin mx-auto" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Confirming your payment…
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      This usually takes a few seconds.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "success" && completedOrder && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Order placed successfully!
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Thank you for shopping with {store.businessName}.
                </p>
              </div>

              {/* Points card. Only present once the webhook has run; the redirect
                  often beats it, in which case this simply does not render and
                  the emailed copy is how the customer gets their code. */}
              {completedOrder.loyalty && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={15} className="text-green-600" />
                    <p className="text-sm font-bold text-green-800">
                      You earned {completedOrder.loyalty.earned} points
                    </p>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-green-600">
                    Your code
                  </p>
                  <p className="text-2xl font-bold tracking-[0.2em] text-gray-900 my-1">
                    {completedOrder.loyalty.code}
                  </p>
                  <p className="text-xs text-green-700">
                    Balance: {completedOrder.loyalty.balance} points. Save this code
                    and enter it at checkout next time to spend them. We have emailed
                    it to you as well.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onDownloadReceipt}
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { storeName } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("details");
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT_FORM);
  const [selectedZone, setSelectedZone] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [receiptDownloading, setReceiptDownloading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  // Loyalty. `loyaltyCard` holds the server's answer for an applied code; points
  // are only ever deducted server side once Paystack confirms.
  const [loyaltyCode, setLoyaltyCode] = useState("");
  const [loyaltyCard, setLoyaltyCard] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState("");

  const allProdsRef = useRef(null);
  const viewCountedRef = useRef(false);
  const receiptLinkRef = useRef(null);

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

        if (storeData.vendorType === "services") {
          navigate(`/${storeData.storeName}/services`, { replace: true });
          return;
        }

        setStore(storeData);
        const prods = await getProducts(storeData.id, storeData.maxProducts);
        setProducts(prods);

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
    if (products.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    if (!productId) return;
    setHighlightedProduct(productId);
    setTimeout(() => {
      const el = document.getElementById(`product-${productId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    setTimeout(() => setHighlightedProduct(null), 4500);
  }, [products]);

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

  const handleAddToCart = (product) => {
    triggerSessionEngagement();
    const productVariations = product.selectedVariations || {};
    const variationLabel = product.variationLabel || '';
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.id === product.id &&
          JSON.stringify(item.selectedVariations || {}) === JSON.stringify(productVariations),
      );
      if (existing) {
        return prev.map((item) =>
          item.id === product.id &&
          JSON.stringify(item.selectedVariations || {}) === JSON.stringify(productVariations)
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
          selectedVariations:
            Object.keys(productVariations).length > 0 ? productVariations : undefined,
          variationLabel: variationLabel || undefined,
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

  const filteredProducts = (
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

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aOut = typeof a.stock === "number" && a.stock === 0;
    const bOut = typeof b.stock === "number" && b.stock === 0;
    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;
    return 0;
  });

  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : "";
  const vendorType = store?.vendorType || "products";
  const hasProducts = vendorType === "products" || vendorType === "both";
  const isProOrPremium =
    store?.hasProFeatures === true ||
    store?.plan === "pro" ||
    store?.plan === "premium";
  const storeLayout = store?.storeLayout || "grid";

  const isCartEnabled =
    store?.hasGrowthFeatures === true ||
    store?.plan === "growth" ||
    store?.plan === "pro" ||
    store?.plan === "premium";

  useEffect(() => {
    if (!store || searchParams.get("checkout") !== "success") return;

    const ref = searchParams.get("reference");
    if (!ref) return;

    searchParams.delete("checkout");
    searchParams.delete("reference");
    setSearchParams(searchParams, { replace: true });

    const stored = sessionStorage.getItem(`sellapage_checkout_${ref}`);
    let usedSnapshot = false;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.transactionType === "checkout") {
          setCompletedOrder(parsed.order);
          setCheckoutOpen(true);
          setCheckoutStep("success");
          sessionStorage.removeItem(`sellapage_checkout_${ref}`);
          usedSnapshot = true;
        }
      } catch {
        // ignore invalid storage
      }
    }

    if (usedSnapshot) {
      // The snapshot is written before the Paystack redirect, so it cannot carry
      // the loyalty card: that is created by the webhook after payment confirms.
      // Without this the code would never appear on screen for the majority of
      // customers (whose sessionStorage survives the round trip) and only the
      // emailed copy would reach them.
      //
      // Gated on the store actually running loyalty, so no other vendor's
      // customers spend a read on this. Purely additive and fully optional: if
      // the webhook is slow and this never resolves, the email still arrives.
      if (store?.loyaltyEnabled === true) {
        let tries = 0;
        const pollLoyalty = async () => {
          tries += 1;
          try {
            const res = await fetch(
              `/api/verify-transaction?storeId=${store.id}&reference=${encodeURIComponent(ref)}`,
            );
            const data = await res.json();
            if (res.ok && data.type === "order" && data.order?.loyalty) {
              setCompletedOrder((prev) =>
                prev ? { ...prev, loyalty: data.order.loyalty } : prev,
              );
              return;
            }
          } catch {
            // Never surfaced. The emailed code is the reliable path.
          }
          if (tries < 3) setTimeout(pollLoyalty, 2500);
        };
        setTimeout(pollLoyalty, 1500);
      }
      return;
    }

    // sessionStorage snapshot is gone - happens whenever the Paystack redirect
    // lands in a different browsing context than the one that left (common in
    // WhatsApp/Instagram in-app browsers). Fall back to a server-verified
    // lookup by reference so the customer still gets their receipt, retrying
    // briefly since the webhook that creates the order can lag the redirect.
    let cancelled = false;
    setVerifyError("");
    setCheckoutOpen(true);
    setCheckoutStep("verifying");

    const attemptVerify = async (attempt = 0) => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/verify-transaction?storeId=${store.id}&reference=${encodeURIComponent(ref)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.type === "order") {
          setCompletedOrder(data.order);
          setCheckoutStep("success");
          return;
        }
      } catch {
        // network hiccup - fall through to retry
      }
      if (cancelled) return;
      if (attempt < 5) {
        setTimeout(() => attemptVerify(attempt + 1), 1500);
      } else {
        setVerifyError(
          `We couldn't confirm your payment automatically. If you were charged, please contact the store with this reference: ${ref}`,
        );
      }
    };
    attemptVerify();

    return () => {
      cancelled = true;
    };
  }, [store, searchParams, setSearchParams]);

  const handleProceedToCheckout = useCallback(() => {
    setCartOpen(false);
    setCheckoutOpen(true);
    setCheckoutStep("details");
    setCheckoutError("");
    setSelectedZone(null);
  }, []);

  const handleCheckoutPay = async () => {
    if (!store?.id || !selectedZone) return;

    setCheckoutProcessing(true);
    setCheckoutError("");

    const subtotal = calcSubtotal(cart);
    const processingFee = calcProcessingFee(subtotal);
    const deliveryFee = Number(selectedZone?.price || 0);
    const discountAmount = calcDiscountAmount(subtotal, appliedDiscount);
    const grandTotal = subtotal + deliveryFee + processingFee - discountAmount;

    try {
      const res = await fetch("/api/checkout-initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          customerName: checkoutForm.customerName.trim(),
          customerEmail: checkoutForm.customerEmail.trim(),
          customerPhone: checkoutForm.customerPhone.trim(),
          cartItems: cart,
          deliveryFee,
          deliveryAddress: {
            state: selectedZone?.state || '',
            lga: selectedZone?.lga || '',
            address: checkoutForm.deliveryAddress.trim(),
          },
          notes: checkoutForm.notes.trim(),
          promoCode: appliedDiscount?.code || "",
          discountAmount: discountAmount || 0,
          // Sent only as a request. checkout-initialize re-reads the card and
          // decides the real naira value, and ignores this entirely when a promo
          // code is present, so nothing here can be used to invent a discount.
          loyaltyCode: loyaltyCard?.code || "",
          redeemPoints: loyaltyCard?.points || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.authorization_url) {
        setCheckoutError(
          data.error || "Could not start payment. Please try again.",
        );
        setCheckoutProcessing(false);
        return;
      }

      const orderSnapshot = {
        reference: data.reference,
        customerName: checkoutForm.customerName.trim(),
        customerEmail: checkoutForm.customerEmail.trim(),
        customerPhone: checkoutForm.customerPhone.trim(),
        cartItems: cart,
        deliveryFee,
        processingFee,
        discountAmount,
        promoCode: appliedDiscount?.code || "",
        grandTotal,
        createdAt: new Date().toISOString(),
      };

      sessionStorage.setItem(
        `sellapage_checkout_${data.reference}`,
        JSON.stringify({
          transactionType: "checkout",
          storeName: store.storeName,
          storeId: store.id,
          order: orderSnapshot,
        }),
      );

      window.location.href = data.authorization_url;
    } catch {
      setCheckoutError("Could not start payment. Please try again.");
      setCheckoutProcessing(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!completedOrder || !store) return;
    setReceiptDownloading(true);
    try {
      // @react-pdf is ~476 kB gzipped. Pulled in only when a receipt is actually
      // requested, so storefront visitors do not pay for it up front. The existing
      // receiptDownloading spinner covers the fetch and the catch below covers failure.
      const { generateOrderReceipt } = await import("../utils/generateReceipt");
      const blobUrl = await generateOrderReceipt(completedOrder, store);
      if (receiptLinkRef.current) {
        receiptLinkRef.current.href = blobUrl;
        receiptLinkRef.current.click();
      }
    } catch {
      setCheckoutError("Could not generate receipt. Please try again.");
    } finally {
      setReceiptDownloading(false);
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setPromoCode("");
    setAppliedDiscount(null);
    setPromoError("");
    setPromoLoading(false);
    if (checkoutStep === "success" || checkoutStep === "verifying") {
      setCart([]);
      setCheckoutForm(EMPTY_CHECKOUT_FORM);
      setSelectedZone(null);
      setCompletedOrder(null);
      setVerifyError("");
      setCheckoutStep("details");
    }
  };

  const scrollToAll = () => {
    allProdsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectCategory = (cat) => {
    setActiveCategory(cat);
    setActiveTab("home");
    setTimeout(() => {
      allProdsRef.current?.scrollIntoView({
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
      <SEO
        title={store.storeName || store.name}
        description={store.description || `${store.storeName || store.name} - products, services, and more on Sellapage.`}
        url={`/${store.slug || store.storeName}`}
        image={store.logo || store.coverImage}
        jsonLd={store.id ? {
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: store.storeName || store.name,
          description: store.description,
          url: `https://sellapage.com.ng/${store.slug || store.storeName}`,
          logo: store.logo,
          image: store.coverImage || store.logo,
          address: store.pickupAddress ? {
            '@type': 'PostalAddress',
            streetAddress: store.pickupAddress.streetAddress,
            addressLocality: store.pickupAddress.city,
            addressRegion: store.pickupAddress.state,
            addressCountry: 'NG',
          } : undefined,
        } : null}
      />
      <StoreNavbar
        store={store}
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={isCartEnabled ? cartCount : 0}
        onCartOpen={isCartEnabled ? () => setCartOpen(true) : null}
        activeThemeObj={previewThemeObj}
        hasProducts={hasProducts}
      />

      <main className="relative z-0 pb-24 md:pb-0">
        {activeTab === "categories" && (
          <CategoriesTab
            products={products}
            onSelectCategory={handleSelectCategory}
            activeCategory={activeCategory}
            activeThemeObj={activeThemeObj}
          />
        )}

        {activeTab === "orders" && (
          <OrdersTab store={store} activeThemeObj={activeThemeObj} />
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
                      {store.showWhatsApp !== false && (
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
                              themeAccent !== activeThemeObj.defaultColors.accent
                                ? themeAccent
                                : undefined,
                          }}
                        >
                          <MessageCircle size={15} />
                          Chat on WhatsApp
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

                    {(vendorType === "both" || store?.whatsappCommunityLink) && (
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        {vendorType === "both" && (
                          <button
                            onClick={() => navigate(`/${store.storeName}/services`)}
                            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition-all border border-white/25 backdrop-blur-sm"
                          >
                            View Our Services
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
              ref={allProdsRef}
              className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 scroll-mt-20"
            >
              {products.length === 0 ? (
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
                          ? `${filteredProducts.length} of ${products.length} item${products.length !== 1 ? "s" : ""}`
                          : `${filteredProducts.length} item${filteredProducts.length !== 1 ? "s" : ""}`}
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
                      placeholder="Search products..."
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

                  {sortedProducts.length > 0 ? (
                    <div
                      className={
                        storeLayout === "list"
                          ? "grid grid-cols-1 items-stretch gap-3 sm:gap-4"
                          : storeLayout === "compact"
                            ? "grid grid-cols-3 items-stretch sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
                            : "grid grid-cols-2 items-stretch sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
                      }
                    >
                      {sortedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          whatsappNumber={store.whatsappNumber}
                          storeUrl={storeUrl}
                          avgRating={product.avgRating || 0}
                          reviewCount={product.reviewCount || 0}
                          isHighlighted={highlightedProduct === product.id}
                          onOrder={handleProductClick}
                          listView={storeLayout === "list"}
                          onAddToCart={isCartEnabled ? handleAddToCart : null}
                          isProOrPremium={isProOrPremium}
                          themeCardStyle={{
                            backgroundColor: themeCard,
                            color: themeText,
                            fontFamily: bodyFont,
                          }}
                          buttonStyle={
                            activeThemeObj.structuralStyle.buttonClasses
                          }
                          structuralClasses={`${activeThemeObj.structuralStyle.cardBorderRadius} ${activeThemeObj.structuralStyle.cardBorder}`}
                          onViewProduct={setSelectedProduct}
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
                        No products match &ldquo;
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
                  leadType="product"
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

      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onOrder={handleProductClick}
          isCartEnabled={isCartEnabled}
          isProOrPremium={isProOrPremium}
          activeThemeObj={activeThemeObj}
          themePrimary={themePrimary}
          themeCard={themeCard}
          themeText={themeText}
          bodyFont={bodyFont}
          headerFont={headerFont}
          whatsappNumber={store.whatsappNumber}
          storeUrl={storeUrl}
        />
      )}

      {cartOpen && isCartEnabled && (
        <CartDrawer
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClose={() => setCartOpen(false)}
          whatsappNumber={store.whatsappNumber}
          storeName={store.businessName}
          activeThemeObj={activeThemeObj}
          onProceedToCheckout={
            isProOrPremium ? handleProceedToCheckout : undefined
          }
        />
      )}

      {checkoutOpen && (
        <StoreCheckoutModal
          store={store}
          cart={cart}
          step={checkoutStep}
          setStep={setCheckoutStep}
          form={checkoutForm}
          setForm={setCheckoutForm}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          checkoutError={checkoutError}
          checkoutProcessing={checkoutProcessing}
          completedOrder={completedOrder}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          appliedDiscount={appliedDiscount}
          setAppliedDiscount={setAppliedDiscount}
          promoLoading={promoLoading}
          setPromoLoading={setPromoLoading}
          promoError={promoError}
          setPromoError={setPromoError}
          loyaltyCode={loyaltyCode}
          setLoyaltyCode={setLoyaltyCode}
          loyaltyCard={loyaltyCard}
          setLoyaltyCard={setLoyaltyCard}
          loyaltyLoading={loyaltyLoading}
          setLoyaltyLoading={setLoyaltyLoading}
          loyaltyError={loyaltyError}
          setLoyaltyError={setLoyaltyError}
          storeId={store.id}
          onClose={handleCloseCheckout}
          onPay={handleCheckoutPay}
          onDownloadReceipt={handleDownloadReceipt}
          receiptDownloading={receiptDownloading}
          verifyError={verifyError}
        />
      )}

      <a
        ref={receiptLinkRef}
        href="#"
        download="receipt.pdf"
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
