//src/components/dashboard/DiscountsTab.jsx/
import { useEffect, useState } from "react";
import { Percent, Lock, Plus, X, Loader2, Trash2 } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";

const formatExpiryDate = (expiryDate) => {
  if (!expiryDate) return "";
  try {
    const date =
      typeof expiryDate.toDate === "function"
        ? expiryDate.toDate()
        : new Date(expiryDate);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
};

export default function DiscountsTab({ store, isPro, navigateTo }) {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState("percentage");
  const [formValue, setFormValue] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState("");

  useEffect(() => {
    if (!isPro || !store?.id) {
      setDiscounts([]);
      setLoading(false);
      return;
    }

    const fetchDiscounts = async () => {
      setLoading(true);
      try {
        const discountsRef = collection(db, "stores", store.id, "discounts");
        const discountsQuery = query(
          discountsRef,
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(discountsQuery);
        setDiscounts(
          snapshot.docs.map((discountDoc) => ({
            id: discountDoc.id,
            ...discountDoc.data(),
          })),
        );
      } catch (error) {
        console.error("Failed to fetch discounts", error);
        setDiscounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, [isPro, store?.id]);

  const resetForm = () => {
    setFormCode("");
    setFormType("percentage");
    setFormValue("");
    setFormExpiry("");
    setFormUsageLimit("");
    setFormError("");
    setShowForm(false);
  };

  const handleSaveDiscount = async () => {
    const normalizedCode = formCode.trim().toUpperCase();
    const parsedValue = Number(formValue);
    const parsedUsageLimit =
      formUsageLimit === "" ? null : Number(formUsageLimit);

    if (normalizedCode.length < 3) {
      setFormError("Code must be at least 3 characters long");
      return;
    }

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      setFormError("Discount value must be a positive number");
      return;
    }

    if (formType === "percentage" && (parsedValue < 1 || parsedValue > 100)) {
      setFormError("Percentage discount must be between 1 and 100");
      return;
    }

    if (
      parsedUsageLimit !== null &&
      (Number.isNaN(parsedUsageLimit) || parsedUsageLimit <= 0)
    ) {
      setFormError("Max uses must be a number greater than 0");
      return;
    }

    if (
      discounts.some(
        (discount) => (discount.code || "").toUpperCase() === normalizedCode,
      )
    ) {
      setFormError("A code with this name already exists");
      return;
    }

    setSaving(true);
    setFormError("");

    const expiryDate = formExpiry
      ? Timestamp.fromDate(new Date(`${formExpiry}T00:00:00`))
      : null;

    try {
      const payload = {
        code: normalizedCode,
        type: formType,
        value: parsedValue,
        expiryDate,
        usageLimit: parsedUsageLimit,
        usageCount: 0,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "stores", store.id, "discounts"),
        payload,
      );

      setDiscounts((prev) => [
        {
          id: docRef.id,
          ...payload,
          createdAt: Timestamp.fromDate(new Date()),
        },
        ...prev,
      ]);

      resetForm();
    } catch (error) {
      console.error("Failed to save discount", error);
      setFormError("Failed to create discount code. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (discountId, nextState) => {
    try {
      await updateDoc(doc(db, "stores", store.id, "discounts", discountId), {
        isActive: nextState,
      });
      setDiscounts((prev) =>
        prev.map((discount) =>
          discount.id === discountId
            ? { ...discount, isActive: nextState }
            : discount,
        ),
      );
    } catch (error) {
      console.error("Failed to update discount status", error);
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    if (!window.confirm("Delete this discount code?")) return;

    setDeleting(discountId);
    try {
      await deleteDoc(doc(db, "stores", store.id, "discounts", discountId));
      setDiscounts((prev) =>
        prev.filter((discount) => discount.id !== discountId),
      );
    } catch (error) {
      console.error("Failed to delete discount", error);
    } finally {
      setDeleting("");
    }
  };

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Discounts
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Create promo codes for your store checkout
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 gap-5 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Lock size={22} className="text-gray-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">
              Discount Codes — Pro Feature
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              Create promo codes with percentage or flat discounts for your
              customers. Apply usage limits and expiry dates to run time-limited
              promotions. Available on Pro and Premium plans.
            </p>
          </div>
          <button
            onClick={() => navigateTo("billing")}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Discounts
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Create promo codes for your store checkout
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus size={16} />
            Create Code
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                New Discount Code
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Create a promo code for checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Code
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => {
                setFormCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                );
                setFormError("");
              }}
              placeholder="SAVE10"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Discount type
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormType("percentage")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  formType === "percentage"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                }`}
              >
                Percentage %
              </button>
              <button
                type="button"
                onClick={() => setFormType("flat")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  formType === "flat"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
                }`}
              >
                Flat Amount ₦
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Discount value
              </label>
              <input
                type="number"
                min="1"
                value={formValue}
                onChange={(e) => {
                  setFormValue(e.target.value);
                  setFormError("");
                }}
                placeholder={formType === "percentage" ? "10" : "500"}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Expiry Date (optional)
              </label>
              <input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Max Uses (optional)
            </label>
            <input
              type="number"
              min="1"
              value={formUsageLimit}
              onChange={(e) => {
                setFormUsageLimit(e.target.value);
                setFormError("");
              }}
              placeholder="Leave blank for unlimited"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          {formError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDiscount}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 px-6 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 size={24} className="animate-spin text-green-500" />
          <p className="text-sm text-gray-500">Loading discount codes...</p>
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 px-6 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
            <Percent size={24} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base mb-1">
              No discount codes yet
            </h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              Create your first promo code to offer percentage or flat discounts
              at checkout.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {discounts.map((discount) => {
            const isActive = discount.isActive !== false;
            const valueLabel =
              discount.type === "percentage"
                ? `${Number(discount.value)}%`
                : `₦${Number(discount.value).toLocaleString()}`;
            const usageLabel = `Used: ${Number(discount.usageCount || 0)} / ${discount.usageLimit != null ? Number(discount.usageLimit) : "∞"}`;
            const expiryLabel = formatExpiryDate(discount.expiryDate);

            return (
              <div
                key={discount.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono font-bold text-lg text-gray-900 tracking-wide">
                      {discount.code}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          discount.type === "percentage"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {discount.type === "percentage" ? "% Off" : "₦ Off"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDiscount(discount.id)}
                    disabled={deleting === discount.id}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Delete ${discount.code}`}
                  >
                    {deleting === discount.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>

                <div>
                  <p className="text-3xl font-extrabold text-gray-900">
                    {valueLabel}
                  </p>
                  {expiryLabel && (
                    <p className="text-sm text-gray-500 mt-2">
                      Expires {expiryLabel}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{usageLabel}</p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(discount.id, !isActive)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {isActive ? "Active" : "Paused"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
