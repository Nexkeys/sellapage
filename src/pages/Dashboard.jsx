//src/pages/Dashboard.jsx/
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  addProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  removeProductImage,
  checkProductLimit,
  FREE_PLAN_LIMIT,
  deleteAllStoreProducts,
  uploadSingleImage,
  saveCustomCategory,
  getCustomCategories,
} from "../firebase/products";
import {
  addService,
  getServices,
  updateService,
  deleteService,
  toggleServiceActive,
  deleteAllStoreServices,
} from "../firebase/services";
import { logoutSeller, updateStore, deleteAuthUser } from "../firebase/auth";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db } from "../firebase/config";
import {
  collection,
  getDocs,
  query,
  orderBy,
  writeBatch,
  deleteDoc,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { initFCM, requestFCMPermission } from "../firebase/messaging";
import { Bell, Wallet } from "lucide-react";

import DashboardLayout from "../components/dashboard/DashboardLayout";
import OverviewTab from "../components/dashboard/Overview";
import ProductsTab from "../components/dashboard/Products";
import ServicesTab from "../components/dashboard/ServicesTab";
import LeadsTab from "../components/dashboard/LeadsTab";
import SettingsTab from "../components/dashboard/Settings";
import SupportTab from "../components/dashboard/SupportTab";
import OrdersTab from "../components/dashboard/OrdersTab";
import CustomersTab from "../components/dashboard/CustomersTab";
import CategoriesTab from "../components/dashboard/CategoriesTab";
import ReviewsTab from "../components/dashboard/ReviewsTab";
import AnalyticsTab from "../components/dashboard/AnalyticsTab";
import MarketingTab from "../components/dashboard/MarketingTab";
import DiscountsTab from "../components/dashboard/DiscountsTab";
import OnlineStoreTab from "../components/dashboard/OnlineStoreTab";
import MobileAppTab from "../components/dashboard/MobileAppTab";
import PayoutsTab from "../components/dashboard/PayoutsTab";
import BillingTab from "../components/dashboard/BillingTab";
import DeliveryTab from "../components/dashboard/DeliveryTab";
import LedgerTab from "../components/dashboard/LedgerTab";

const EMPTY_FORM = {
  name: "",
  price: "",
  description: "",
  category: "",
  stock: "",
  type: "physical",
  imageFiles: [],
  imagePreviews: [],
  imageUrls: [],
  variations: [],
};

const EMPTY_SERVICE_FORM = {
  name: "",
  price: "",
  description: "",
  category: "",
  duration: "",
  locationType: "physical",
  bookingNote: "",
  imageFiles: [],
  imagePreviews: [],
  imageUrls: [],
};

export default function Dashboard() {
  const { user, store, setStore } = useAuth();
  const navigate = useNavigate();

  // ── Plan-aware derivations ─────────────────────────────────────────────────
  const plan = store?.plan || "starter";
  const planStatus = store?.planStatus || "active";
  const isPremium = store?.hasPremiumFeatures ?? plan === "premium";
  const isGrowthOrPro =
    store?.hasGrowthFeatures ??
    (plan === "growth" || plan === "pro" || plan === "premium");
  const isPro = store?.hasProFeatures ?? (plan === "pro" || plan === "premium");
  const maxProducts =
    store?.maxProducts ??
    (plan === "premium"
      ? 999999
      : plan === "pro"
        ? 999999
        : plan === "growth"
          ? 50
          : FREE_PLAN_LIMIT);
  const maxImagesPerProduct =
    store?.maxImagesPerProduct ??
    (plan === "premium"
      ? 50
      : plan === "pro"
        ? 50
        : plan === "growth"
          ? 10
          : 3);

  const [activeTab, setActiveTab] = useState("overview");
  const [showChecklist, setShowChecklist] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [productCount, setProductCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [aiDescError, setAiDescError] = useState("");
  const [customCategories, setCustomCategories] = useState([]);
  const [generatingServiceDesc, setGeneratingServiceDesc] = useState(false);
  const [serviceAiDescError, setServiceAiDescError] = useState("");

  const [services, setServices] = useState([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM);
  const [serviceFormError, setServiceFormError] = useState("");
  const [savingService, setSavingService] = useState(false);
  const [deletingService, setDeletingService] = useState(null);

  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportSuccess, setSupportSuccess] = useState("");

  // Billing
  const [billingLoading, setBillingLoading] = useState("");
  const [billingError, setBillingError] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSynced, setOrdersSynced] = useState(false);

  // Analytics — lifted here so Overview and AnalyticsTab share the same data
  const [analyticsData, setAnalyticsData] = useState({
    totalViews: 0,
    totalClicks: 0,
    engagedViews: 0,
    totalBookingRequests: 0,
  });

  const limitReached = productCount >= maxProducts;
  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : "";

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (store?.id) {
      fetchProducts();
      fetchServices();
    }
  }, [store]);

  // Setup Guide State initialization
  useEffect(() => {
    if (store?.id) {
      const dismissed = localStorage.getItem(
        `sellapage_onboarding_dismissed_${store.id}`,
      );
      if (!dismissed) {
        setShowChecklist(true);
      }
    }
  }, [store?.id]);

  // FCM Push Notification Setup
  useEffect(() => {
    if (!store?.id) return;
    const setupPush = async () => {
      try {
        const result = await initFCM(store.id, async (data) => {
          await updateDoc(doc(db, "stores", store.id), data);
        });
        if (result === "needs-permission") setShowPushBanner(true);
        else if (result) setShowPushBanner(false);
      } catch (err) {
        console.error("[Dashboard] initFCM failed", err);
      }
    };
    setupPush();
  }, [store?.id]);

  useEffect(() => {
    if (store?.id) fetchLeads();
  }, [store]);

  useEffect(() => {
    if (activeTab !== "support") {
      setSupportSuccess("");
      setSupportError("");
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "billing") setBillingError("");
  }, [activeTab]);

  useEffect(() => {
    if ((activeTab === "orders" || activeTab === "delivery") && !isGrowthOrPro)
      setActiveTab("overview");
  }, [activeTab, isGrowthOrPro]);

  useEffect(() => {
    if (activeTab === "orders" && store?.id && isGrowthOrPro && !ordersSynced)
      fetchOrders();
  }, [activeTab, store?.id, isGrowthOrPro, ordersSynced]);

  useEffect(() => {
    setOrdersSynced(false);
    setOrders([]);
  }, [store?.id]);

  // Analytics real-time listener — only for Growth/Pro, lives at Dashboard level
  useEffect(() => {
    if (!store?.id || !isGrowthOrPro) return;
    const unsubscribe = onSnapshot(
      doc(db, "stores", store.id, "analytics", "storeSummary"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setAnalyticsData({
            totalViews: data.totalViews ?? 0,
            totalClicks: data.totalClicks ?? 0,
            engagedViews: data.engagedViews ?? 0,
            totalBookingRequests: data.totalBookingRequests ?? 0,
          });
        } else {
          setAnalyticsData({
            totalViews: 0,
            totalClicks: 0,
            engagedViews: 0,
            totalBookingRequests: 0,
          });
        }
      },
      () => {
        setAnalyticsData({
          totalViews: 0,
          totalClicks: 0,
          engagedViews: 0,
          totalBookingRequests: 0,
        });
      },
    );
    return unsubscribe;
  }, [store?.id, isGrowthOrPro]);

  // Mount-time Firestore re-fetch with self-healing migration for legacy store documents
  useEffect(() => {
    if (!store?.id) return;
    const syncStoreOnMount = async () => {
      try {
        const snap = await getDoc(doc(db, "stores", store.id));
        if (snap.exists()) {
          const data = snap.data();

          // Detect legacy documents missing plan fields and backfill them
          if (
            data.maxProducts === undefined ||
            data.hasGrowthFeatures === undefined
          ) {
            const existingPlan = data.plan || "starter";
            let planFields = {};

            if (existingPlan === "premium") {
              planFields = {
                maxProducts: 999999,
                maxImagesPerProduct: 50,
                hasGrowthFeatures: true,
                hasProFeatures: true,
                hasPremiumFeatures: true,
              };
            } else if (existingPlan === "pro") {
              planFields = {
                maxProducts: 999999,
                maxImagesPerProduct: 50,
                hasGrowthFeatures: true,
                hasProFeatures: true,
                hasPremiumFeatures: false,
              };
            } else if (existingPlan === "growth") {
              planFields = {
                maxProducts: 50,
                maxImagesPerProduct: 10,
                hasGrowthFeatures: true,
                hasProFeatures: false,
                hasPremiumFeatures: false,
              };
            } else {
              planFields = {
                maxProducts: FREE_PLAN_LIMIT,
                maxImagesPerProduct: 3,
                hasGrowthFeatures: false,
                hasProFeatures: false,
                hasPremiumFeatures: false,
              };
            }

            planFields.planStatus = data.planStatus ?? "active";
            planFields.productCount = data.productCount ?? 0;

            try {
              await updateDoc(doc(db, "stores", store.id), planFields);
            } catch (writeErr) {
              console.error("Failed to migrate legacy store fields", writeErr);
            }

            Object.assign(data, planFields);
          }

          setStore((prev) => ({ ...prev, ...data }));

          try {
            await updateDoc(doc(db, "stores", store.id), {
              lastSeen: new Date(),
            });
          } catch {
            // non-critical background signature logging; silently suppress anomalies
          }
        }
      } catch (err) {
        console.error("Failed to sync store on mount", err);
      }
    };
    syncStoreOnMount();
  }, []);

  // Sync store plan state from Firestore after returning from billing callback
  useEffect(() => {
    if (activeTab !== "billing" || !store?.id) return;
    const syncPlan = async () => {
      try {
        const snap = await getDoc(doc(db, "stores", store.id));
        if (snap.exists()) {
          setStore((prev) => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.error("Failed to sync plan state", err);
      }
    };
    syncPlan();
  }, [activeTab, store?.id]);

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      const data = await getProducts(store.id);
      setProducts(data);
      setProductCount(data.length);
      const cats = await getCustomCategories(store.id);
      setCustomCategories(cats);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await getServices(store.id);
      setServices(data);
      setServiceCount(data.length);
    } catch (err) {
      console.error("Failed to fetch services", err);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const storeLeads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.storeId === store.id);
      setLeads(storeLeads);
    } catch (err) {
      console.error("Failed to fetch leads", err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const q = query(
        collection(db, "stores", store.id, "orders"),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOrdersSynced(true);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleAddOrder = async (orderData) => {
    if (!store?.id || !isGrowthOrPro) return;
    const now = new Date();
    const orderRef = doc(collection(db, "stores", store.id, "orders"));
    const newOrder = {
      id: orderRef.id,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || "",
      items: orderData.items,
      total: orderData.total ?? null,
      notes: orderData.notes || "",
      status: orderData.status || "pending",
      paymentStatus: orderData.paymentStatus || "unpaid",
      paymentMethod: orderData.paymentMethod || "bank_transfer",
      createdAt: now,
      updatedAt: now,
    };

    setOrders((prev) => [newOrder, ...prev]);

    try {
      const { id, ...payload } = newOrder;
      await setDoc(orderRef, payload);
      setOrdersSynced(true);
    } catch (err) {
      console.error("Failed to add order", err);
      setOrders((prev) => prev.filter((order) => order.id !== orderRef.id));
      throw err;
    }
  };

  const handleUpdateOrder = async (orderId, updates) => {
    if (!store?.id || !isGrowthOrPro) return;
    const previousOrder = orders.find((order) => order.id === orderId);
    if (!previousOrder) return;

    const normalizedUpdates =
      typeof updates === "string" ? { status: updates } : { ...updates };
    const updatedAt = new Date();
    const nextOrder = { ...previousOrder, ...normalizedUpdates, updatedAt };

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, ...normalizedUpdates, updatedAt }
          : order,
      ),
    );

    try {
      await updateDoc(doc(db, "stores", store.id, "orders", orderId), {
        ...normalizedUpdates,
        updatedAt,
      });
    } catch (err) {
      console.error("Failed to update order", err);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? previousOrder : order)),
      );
      throw err;
    }

    return nextOrder;
  };

  const handleDeleteOrder = async (orderId) => {
    if (!store?.id || !isGrowthOrPro) return;
    const deletedOrder = orders.find((order) => order.id === orderId);
    const deletedIndex = orders.findIndex((order) => order.id === orderId);
    if (!deletedOrder) return;

    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    try {
      await deleteDoc(doc(db, "stores", store.id, "orders", orderId));
    } catch (err) {
      console.error("Failed to delete order", err);
      setOrders((prev) => {
        if (prev.some((order) => order.id === orderId)) return prev;
        const next = [...prev];
        next.splice(Math.max(deletedIndex, 0), 0, deletedOrder);
        return next;
      });
      throw err;
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const dismissChecklist = () => {
    if (!store?.id) return;
    localStorage.setItem(`sellapage_onboarding_dismissed_${store.id}`, "true");
    setShowChecklist(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setAiDescError("");
    setEditingProduct(null);
    setShowForm(false);
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setAiDescError("");
    setForm({
      name: product.name,
      price: product.price,
      description: product.description || "",
      category: product.category || "",
      stock: product.stock ?? "",
      type: product.type || "physical",
      imageFiles: [],
      imagePreviews: [],
      imageUrls: product.imageUrls || [],
      variations: product.variations || [],
    });
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const isService = activeTab === "services";
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const targetForm = isService ? serviceForm : form;
    const currentTotal =
      targetForm.imageUrls.length + targetForm.imageFiles.length;
    const slotsLeft = maxImagesPerProduct - currentTotal;
    if (slotsLeft <= 0) {
      if (isService) {
        setServiceFormError(
          `Maximum ${maxImagesPerProduct} images allowed per service.`,
        );
      } else {
        setFormError(
          `Maximum ${maxImagesPerProduct} images allowed per product.`,
        );
      }
      return;
    }
    const toAdd = files.slice(0, slotsLeft);
    const previews = [];
    toAdd.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        if (isService) {
          setServiceFormError("Each image must be under 5MB.");
        } else {
          setFormError("Each image must be under 5MB.");
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === toAdd.length) {
          if (isService) {
            setServiceForm((p) => ({
              ...p,
              imageFiles: [...p.imageFiles, ...toAdd],
              imagePreviews: [...p.imagePreviews, ...previews],
            }));
          } else {
            setForm((p) => ({
              ...p,
              imageFiles: [...p.imageFiles, ...toAdd],
              imagePreviews: [...p.imagePreviews, ...previews],
            }));
          }
        }
      };
      reader.readAsDataURL(file);
    });
    if (isService) setServiceFormError("");
    else setFormError("");
  };

  const handleRemoveExistingImage = async (url) => {
    const isService = activeTab === "services";
    const targetEditing = isService ? editingService : editingProduct;
    const targetForm = isService ? serviceForm : form;
    if (!targetEditing) {
      if (isService) {
        setServiceForm((p) => ({
          ...p,
          imageUrls: p.imageUrls.filter((u) => u !== url),
        }));
      } else {
        setForm((p) => ({
          ...p,
          imageUrls: p.imageUrls.filter((u) => u !== url),
        }));
      }
      return;
    }
    try {
      const newUrls = await removeProductImage(
        store.id,
        targetEditing.id,
        url,
        targetForm.imageUrls,
      );
      if (isService) {
        setServiceForm((p) => ({ ...p, imageUrls: newUrls }));
        setServices((prev) =>
          prev.map((s) =>
            s.id === targetEditing.id
              ? { ...s, imageUrls: newUrls, imageUrl: newUrls[0] || "" }
              : s,
          ),
        );
      } else {
        setForm((p) => ({ ...p, imageUrls: newUrls }));
        setProducts((prev) =>
          prev.map((p) =>
            p.id === targetEditing.id
              ? { ...p, imageUrls: newUrls, imageUrl: newUrls[0] || "" }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to remove image", err);
      if (isService) {
        setServiceFormError("Could not remove image. Please try again.");
      } else {
        setFormError("Could not remove image. Please try again.");
      }
    }
  };

  const handleRemoveNewImage = (index) => {
    const isService = activeTab === "services";
    if (isService) {
      setServiceForm((p) => ({
        ...p,
        imageFiles: p.imageFiles.filter((_, i) => i !== index),
        imagePreviews: p.imagePreviews.filter((_, i) => i !== index),
      }));
    } else {
      setForm((p) => ({
        ...p,
        imageFiles: p.imageFiles.filter((_, i) => i !== index),
        imagePreviews: p.imagePreviews.filter((_, i) => i !== index),
      }));
    }
  };

  // ── Service-specific image handlers (parallel to product handlers) ──────────
  const handleServiceImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentTotal =
      serviceForm.imageUrls.length + serviceForm.imageFiles.length;
    const slotsLeft = maxImagesPerProduct - currentTotal;
    if (slotsLeft <= 0) {
      setServiceFormError(
        `Maximum ${maxImagesPerProduct} images allowed per service.`,
      );
      return;
    }
    const toAdd = files.slice(0, slotsLeft);
    const previews = [];
    toAdd.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setServiceFormError("Each image must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === toAdd.length) {
          setServiceForm((p) => ({
            ...p,
            imageFiles: [...p.imageFiles, ...toAdd],
            imagePreviews: [...p.imagePreviews, ...previews],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    setServiceFormError("");
  };

  const handleRemoveExistingServiceImage = async (url) => {
    const targetEditing = editingService;
    if (!targetEditing) {
      setServiceForm((p) => ({
        ...p,
        imageUrls: p.imageUrls.filter((u) => u !== url),
      }));
      return;
    }
    try {
      const newUrls = await removeProductImage(
        store.id,
        targetEditing.id,
        url,
        serviceForm.imageUrls,
      );
      setServiceForm((p) => ({ ...p, imageUrls: newUrls }));
      setServices((prev) =>
        prev.map((s) =>
          s.id === targetEditing.id
            ? { ...s, imageUrls: newUrls, imageUrl: newUrls[0] || "" }
            : s,
        ),
      );
    } catch (err) {
      console.error("Failed to remove image", err);
      setServiceFormError("Could not remove image. Please try again.");
    }
  };

  const handleRemoveNewServiceImage = (index) => {
    setServiceForm((p) => ({
      ...p,
      imageFiles: p.imageFiles.filter((_, i) => i !== index),
      imagePreviews: p.imagePreviews.filter((_, i) => i !== index),
    }));
  };

  const handleSaveCustomCategory = async (categoryName) => {
    try {
      const id = await saveCustomCategory(store.id, categoryName);
      const cats = await getCustomCategories(store.id);
      setCustomCategories(cats);
      return id;
    } catch (err) {
      console.error("Failed to save custom category", err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
      setFormError("Please enter a valid price.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editingProduct) {
        const updatedData = await updateProduct(
          store.id,
          editingProduct.id,
          {
            name: form.name.trim(),
            price: form.price,
            description: form.description.trim(),
            category: form.category.trim(),
            stock:
              form.stock !== "" &&
              form.stock !== null &&
              form.stock !== undefined
                ? Number(form.stock)
                : null,
            imageUrls: form.imageUrls,
            variations: form.variations || [],
          },
          form.imageFiles,
        );
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id ? { ...p, ...updatedData } : p,
          ),
        );
        resetForm();
      } else {
        const { limitReached: reached } = await checkProductLimit(store.id);
        if (reached) {
          setFormError(`You've reached the ${maxProducts} product limit.`);
          setSaving(false);
          return;
        }
        const newProduct = await addProduct(
          store.id,
          {
            name: form.name.trim(),
            price: form.price,
            description: form.description.trim(),
            category: form.category.trim(),
            stock:
              form.stock !== "" &&
              form.stock !== null &&
              form.stock !== undefined
                ? Number(form.stock)
                : null,
            variations: form.variations || [],
          },
          form.imageFiles,
        );
        setProducts((prev) => [newProduct, ...prev]);
        setProductCount((c) => c + 1);
        resetForm();
      }
    } catch (err) {
      console.error("Failed to save product", err);
      if (err.message === "FREE_PLAN_LIMIT_REACHED") {
        setFormError(
          `You've reached the ${maxProducts} product limit on the ${plan} plan.`,
        );
      } else {
        setFormError("Failed to save product. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteProduct(store.id, id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setProductCount((c) => c - 1);
    } catch (err) {
      console.error("Failed to delete product", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (product) => {
    if (!isGrowthOrPro) return;
    const newValue = !product.isActive;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isActive: newValue } : p)),
    );
    try {
      await updateDoc(doc(db, "stores", store.id, "products", product.id), {
        isActive: newValue,
      });
    } catch (err) {
      console.error("Toggle failed", err);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isActive: !newValue } : p,
        ),
      );
    }
  };

  const resetServiceForm = () => {
    setServiceForm(EMPTY_SERVICE_FORM);
    setServiceFormError("");
    setEditingService(null);
    setShowServiceForm(false);
  };

  const startEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: service.price,
      description: service.description || "",
      category: service.category || "",
      duration: service.duration || "",
      locationType: service.locationType || "physical",
      bookingNote: service.bookingNote || "",
      imageFiles: [],
      imagePreviews: [],
      imageUrls: service.imageUrls || [],
    });
    setShowServiceForm(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim()) {
      setServiceFormError("Service name is required.");
      return;
    }
    if (
      !serviceForm.price ||
      isNaN(serviceForm.price) ||
      Number(serviceForm.price) <= 0
    ) {
      setServiceFormError("Please enter a valid price.");
      return;
    }
    setSavingService(true);
    setServiceFormError("");
    try {
      if (editingService) {
        const updatedData = await updateService(
          store.id,
          editingService.id,
          {
            name: serviceForm.name.trim(),
            price: serviceForm.price,
            description: serviceForm.description.trim(),
            category: serviceForm.category.trim(),
            duration: serviceForm.duration.trim(),
            locationType: serviceForm.locationType,
            bookingNote: serviceForm.bookingNote.trim(),
            imageUrls: serviceForm.imageUrls,
          },
          serviceForm.imageFiles,
        );
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingService.id ? { ...s, ...updatedData } : s,
          ),
        );
        resetServiceForm();
      } else {
        const { limitReached: reached } = await checkProductLimit(store.id);
        if (reached) {
          setServiceFormError(
            `You've reached the ${maxProducts} listing limit.`,
          );
          setSavingService(false);
          return;
        }
        const newService = await addService(
          store.id,
          {
            name: serviceForm.name.trim(),
            price: serviceForm.price,
            description: serviceForm.description.trim(),
            category: serviceForm.category.trim(),
            duration: serviceForm.duration.trim(),
            locationType: serviceForm.locationType,
            bookingNote: serviceForm.bookingNote.trim(),
          },
          serviceForm.imageFiles,
        );
        setServices((prev) => [newService, ...prev]);
        setServiceCount((c) => c + 1);
        resetServiceForm();
      }
    } catch (err) {
      console.error("Failed to save service", err);
      setServiceFormError("Failed to save service. Please try again.");
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    setDeletingService(id);
    try {
      await deleteService(store.id, id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      setServiceCount((c) => c - 1);
    } catch (err) {
      console.error("Failed to delete service", err);
    } finally {
      setDeletingService(null);
    }
  };

  const handleToggleServiceActive = async (service) => {
    if (!isGrowthOrPro) return;
    const newValue = !service.isActive;
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, isActive: newValue } : s)),
    );
    try {
      await toggleServiceActive(store.id, service.id, newValue);
    } catch (err) {
      console.error("Service toggle failed", err);
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, isActive: !newValue } : s,
        ),
      );
    }
  };

  const handleSettingsSave = async (formData) => {
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSuccess("");
    try {
      await updateStore(store.id, {
        businessName: formData.businessName.trim(),
        storeName: formData.storeName.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        description: formData.description.trim(),
        themeColor: formData.themeColor || "",
        vendorType: formData.vendorType,
      });
      setStore((prev) => ({
        ...prev,
        ...formData,
        themeColor: formData.themeColor || "",
      }));
      setSettingsSuccess("Settings saved successfully.");
      setTimeout(() => setSettingsSuccess(""), 3000);
    } catch (err) {
      console.error("Settings save failed", err);
      setSettingsError("Failed to save settings. Please try again.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDeliverySave = async (formData) => {
    setDeliverySaving(true);
    setDeliveryError("");
    setDeliverySuccess("");
    try {
      await updateStore(store.id, {
        pickupAddress: {
          streetAddress: formData.streetAddress.trim(),
          city: formData.city.trim(),
          state: formData.state,
        },
      });
      setStore((prev) => ({
        ...prev,
        pickupAddress: {
          streetAddress: formData.streetAddress.trim(),
          city: formData.city.trim(),
          state: formData.state,
        },
      }));
      setDeliverySuccess("Address saved successfully.");
      setTimeout(() => setDeliverySuccess(""), 3000);
    } catch (err) {
      console.error("Delivery address save failed", err);
      setDeliveryError("Failed to save address. Please try again.");
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleDeliveryZonesUpdate = (zones) => {
    setStore((prev) => ({ ...prev, deliveryZones: zones }));
  };

  const handleLogoUpload = async (file) => {
    setLogoUploading(true);
    try {
      const url = await uploadSingleImage(file, "sellapage/logos");
      await updateStore(store.id, { logoUrl: url });
      setStore((prev) => ({ ...prev, logoUrl: url }));
    } catch (err) {
      console.error("Logo upload failed", err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleColorSave = async (color) => {
    try {
      await updateStore(store.id, { themeColor: color });
      setStore((prev) => ({ ...prev, themeColor: color }));
    } catch (err) {
      console.error("Color save failed", err);
    }
  };

  const handleLayoutSave = async (layout) => {
    try {
      await updateStore(store.id, { storeLayout: layout });
      setStore((prev) => ({ ...prev, storeLayout: layout }));
    } catch (err) {
      console.error("Layout save failed", err);
    }
  };

  const handleThemeSave = async (themeId, themeMetadata) => {
    try {
      await updateStore(store.id, { storeTheme: themeId, themeMetadata });
      setStore((prev) => ({ ...prev, storeTheme: themeId, themeMetadata }));
    } catch (err) {
      console.error("Theme save failed", err);
    }
  };

  const handleSubaccountCreated = async ({
    subaccountCode,
    payoutBankName,
    payoutAccountNumberMasked,
  }) => {
    try {
      await updateStore(store.id, {
        subaccountCode,
        payoutBankName,
        payoutAccountNumberMasked,
      });
      setStore((prev) => ({
        ...prev,
        subaccountCode,
        payoutBankName,
        payoutAccountNumberMasked,
      }));
    } catch (err) {
      console.error("Failed to save subaccount details", err);
    }
  };

  const handleGenerateDescription = async () => {
    const isService = activeTab === "services";
    const targetName = isService ? serviceForm.name : form.name;
    const targetCategory = isService ? serviceForm.category : form.category;
    const targetPrice = isService ? serviceForm.price : form.price;

    if (!targetName.trim()) return;
    if (!user || !store?.id) {
      setAiDescError("Please sign in again to generate descriptions.");
      return;
    }
    setGeneratingDesc(true);
    setAiDescError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ai-describe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          productName: targetName.trim(),
          category: targetCategory?.trim() || "",
          price: targetPrice || "",
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok && data.description) {
        if (isService) {
          setServiceForm((p) => ({ ...p, description: data.description }));
        } else {
          setForm((p) => ({ ...p, description: data.description }));
        }
      } else {
        setAiDescError(
          data.error || "Failed to generate description. Please try again.",
        );
      }
    } catch (err) {
      console.error("AI description generation failed", err);
      setAiDescError("Failed to generate description. Please try again.");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleGenerateServiceDescription = async () => {
    const targetName = serviceForm.name;
    const targetCategory = serviceForm.category;
    const targetPrice = serviceForm.price;

    if (!targetName.trim()) return;
    if (!user || !store?.id) {
      setServiceAiDescError("Please sign in again to generate descriptions.");
      return;
    }
    setGeneratingServiceDesc(true);
    setServiceAiDescError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ai-describe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          productName: targetName.trim(),
          category: targetCategory?.trim() || "",
          price: targetPrice || "",
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok && data.description) {
        setServiceForm((p) => ({ ...p, description: data.description }));
      } else {
        setServiceAiDescError(
          data.error || "Failed to generate description. Please try again.",
        );
      }
    } catch (err) {
      console.error("AI description generation failed", err);
      setServiceAiDescError(
        "Failed to generate description. Please try again.",
      );
    } finally {
      setGeneratingServiceDesc(false);
    }
  };

  const handleDeleteAccount = async (password) => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Acquire a fresh ID token (modular SDK user from useAuth)
      const token = await user.getIdToken();

      // Fire-and-forget background deletion request; do not await.
      void fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: store?.id }),
        keepalive: true,
      }).catch((err) => {
        console.error("Background delete request failed", err);
      });

      // Immediately purge local auth state and navigate home for optimistic UX
      logoutSeller().catch((err) => console.error("Logout failed", err));
      navigate("/");
    } catch (err) {
      console.error("Delete account failed", err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setDeleteError("Wrong password. Please try again.");
      } else if (err.code === "auth/requires-recent-login") {
        setDeleteError(
          "For security, please sign out and sign in again before deleting your account.",
        );
      } else {
        setDeleteError(
          "Failed to delete account. Please try again or contact support.",
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSupportSubmit = async (formData) => {
    if (!formData.message.trim()) return;
    setSupportSubmitting(true);
    setSupportError("");
    setSupportSuccess("");
    try {
      await addDoc(collection(db, "supportMessages"), {
        storeId: store.id,
        businessName: store.businessName,
        email: store.email,
        whatsappNumber: store.whatsappNumber,
        storeName: store.storeName,
        plan,
        category: formData.category,
        message: formData.message.trim(),
        status: "open",
        createdAt: new Date(),
      });
      setSupportSuccess("Message sent!");
    } catch (err) {
      console.error("Support submit failed", err);
      setSupportError("Failed to send message. Please try again.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleUpgrade = async (selectedPlan, billingPeriod = 'monthly') => {
    if (!store?.id || !selectedPlan) return;
    setBillingLoading(selectedPlan);
    setBillingError("");
    try {
      const res = await fetch("/api/billing-initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, plan: selectedPlan, billingPeriod }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBillingError(
          data.error || "Could not start checkout. Please try again.",
        );
        return;
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error("Billing initialize failed", err);
      setBillingError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setBillingLoading("");
    }
  };

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      store={store}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      storeUrl={storeUrl}
      isGrowthOrPro={isGrowthOrPro}
      isPro={isPro}
      vendorType={store?.vendorType || "products"}
    >
      {activeTab === "overview" && (
        <div className="animate-in fade-in duration-300 w-full">
          {showPushBanner && (
            <div className="w-full bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">
                    Enable notifications to get real-time alerts for new orders
                    and payments
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const token = await requestFCMPermission(
                        store.id,
                        async (data) => {
                          await updateDoc(doc(db, "stores", store.id), data);
                        },
                      );
                      if (token) setShowPushBanner(false);
                    }}
                    className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowPushBanner(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          {showChecklist && (
            <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Welcome to Sellapage! Let's get you set up.
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Complete these quick steps to launch your store and start
                    making sales.
                  </p>
                </div>
                <button
                  onClick={dismissChecklist}
                  className="text-gray-400 hover:text-gray-600 text-sm font-bold bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("products")}
                  className="flex flex-col items-start p-4 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl transition-all text-left group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-green-500 group-hover:border-green-200 mb-3 font-bold text-xs">
                    1
                  </span>
                  <span className="font-bold text-gray-900 text-sm mb-1 group-hover:text-green-700">
                    Upload First Product
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-green-600">
                    Add your items, descriptions, and prices.
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("online-store")}
                  className="flex flex-col items-start p-4 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl transition-all text-left group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-green-500 group-hover:border-green-200 mb-3 font-bold text-xs">
                    2
                  </span>
                  <span className="font-bold text-gray-900 text-sm mb-1 group-hover:text-green-700">
                    Share Store Link
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-green-600">
                    Copy your unique link to your social bios.
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("marketing")}
                  className="flex flex-col items-start p-4 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl transition-all text-left group"
                >
                  <span className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-green-500 group-hover:border-green-200 mb-3 font-bold text-xs">
                    3
                  </span>
                  <span className="font-bold text-gray-900 text-sm mb-1 group-hover:text-green-700">
                    Start Daily Growth
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-green-600">
                    Check your growth workspace to complete your daily tasks.
                  </span>
                </button>
              </div>
            </div>
          )}
          {!showChecklist && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowChecklist(true)}
                className="text-xs font-semibold text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1 bg-white border border-gray-100 shadow-sm px-3 py-1.5 rounded-lg"
              >
                View Setup Guide
              </button>
            </div>
          )}
          <OverviewTab
            store={store}
            plan={plan}
            maxProducts={maxProducts}
            productCount={productCount}
            serviceCount={serviceCount}
            services={services}
            vendorType={store?.vendorType || "products"}
            limitReached={limitReached}
            isGrowthOrPro={isGrowthOrPro}
            isPro={isPro}
            leads={leads}
            products={products}
            storeUrl={storeUrl}
            copied={copied}
            copyLink={copyLink}
            navigateTo={setActiveTab}
            setShowForm={setShowForm}
            analyticsData={analyticsData}
          />
        </div>
      )}

      {activeTab === "products" && (
        <ProductsTab
          plan={plan}
          productCount={productCount}
          maxProducts={maxProducts}
          maxImagesPerProduct={maxImagesPerProduct}
          isGrowthOrPro={isGrowthOrPro}
          isPremium={isPremium}
          limitReached={limitReached}
          showForm={showForm}
          setShowForm={setShowForm}
          editingProduct={editingProduct}
          form={form}
          formError={formError}
          saving={saving}
          loading={loading}
          products={products}
          deleting={deleting}
          handleImageChange={handleImageChange}
          handleRemoveExistingImage={handleRemoveExistingImage}
          handleRemoveNewImage={handleRemoveNewImage}
          handleFormName={(e) =>
            setForm((p) => ({ ...p, name: e.target.value }))
          }
          handleFormPrice={(e) =>
            setForm((p) => ({ ...p, price: e.target.value }))
          }
          handleFormDesc={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          handleFormCategory={(e) =>
            setForm((p) => ({ ...p, category: e.target.value }))
          }
          handleFormStock={(e) =>
            setForm((p) => ({ ...p, stock: e.target.value }))
          }
          onGenerateDescription={handleGenerateDescription}
          generatingDesc={generatingDesc}
          aiDescError={aiDescError}
          handleSave={handleSave}
          resetForm={resetForm}
          startEdit={startEdit}
          handleDelete={handleDelete}
          onToggleActive={handleToggleActive}
          customCategories={customCategories}
          onSaveCustomCategory={handleSaveCustomCategory}
          setForm={setForm}
        />
      )}

      {activeTab === "services" && (
        <ServicesTab
          plan={plan}
          serviceCount={serviceCount}
          maxServices={maxProducts}
          maxImagesPerProduct={maxImagesPerProduct}
          isGrowthOrPro={isGrowthOrPro}
          limitReached={serviceCount >= maxProducts}
          showForm={showServiceForm}
          setShowForm={setShowServiceForm}
          editingService={editingService}
          form={serviceForm}
          formError={serviceFormError}
          saving={savingService}
          loading={servicesLoading}
          services={services}
          deleting={deletingService}
          handleImageChange={handleServiceImageChange}
          handleRemoveExistingImage={handleRemoveExistingServiceImage}
          handleRemoveNewImage={handleRemoveNewServiceImage}
          handleFormName={(e) =>
            setServiceForm((p) => ({ ...p, name: e.target.value }))
          }
          handleFormPrice={(e) =>
            setServiceForm((p) => ({ ...p, price: e.target.value }))
          }
          handleFormDesc={(e) =>
            setServiceForm((p) => ({ ...p, description: e.target.value }))
          }
          handleFormCategory={(e) =>
            setServiceForm((p) => ({ ...p, category: e.target.value }))
          }
          handleFormDuration={(e) =>
            setServiceForm((p) => ({ ...p, duration: e.target.value }))
          }
          handleFormLocationType={(val) =>
            setServiceForm((p) => ({ ...p, locationType: val }))
          }
          handleFormBookingNote={(e) =>
            setServiceForm((p) => ({ ...p, bookingNote: e.target.value }))
          }
          onGenerateDescription={handleGenerateServiceDescription}
          generatingDesc={generatingServiceDesc}
          aiDescError={serviceAiDescError}
          handleSave={handleSaveService}
          resetForm={resetServiceForm}
          startEdit={startEditService}
          handleDelete={handleDeleteService}
          onToggleActive={handleToggleServiceActive}
        />
      )}

      {activeTab === "leads" && (
        <LeadsTab leadsLoading={leadsLoading} leads={leads} isPro={isPro} />
      )}

      {activeTab === "settings" && (
        <SettingsTab
          store={store}
          plan={plan}
          planStatus={planStatus}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          isPremium={isPremium}
          onSave={handleSettingsSave}
          saveLoading={settingsSaving}
          saveError={settingsError}
          saveSuccess={settingsSuccess}
          onDeleteAccount={handleDeleteAccount}
          deleteLoading={deleteLoading}
          deleteError={deleteError}
          onClearDeleteError={() => setDeleteError("")}
          onLogoUpload={handleLogoUpload}
          logoUploading={logoUploading}
          navigateTo={setActiveTab}
        />
      )}

      {activeTab === "support" && (
        <SupportTab
          store={store}
          plan={plan}
          isGrowthOrPro={isGrowthOrPro}
          onSubmit={handleSupportSubmit}
          submitting={supportSubmitting}
          submitError={supportError}
          submitSuccess={supportSuccess}
        />
      )}

      {activeTab === "billing" && (
        <BillingTab
          store={store}
          plan={plan}
          planStatus={planStatus}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          isPremium={isPremium}
          onUpgrade={handleUpgrade}
          upgradeLoading={billingLoading}
          upgradeError={billingError}
        />
      )}

      {activeTab === "orders" && isGrowthOrPro && (
        <OrdersTab
          store={store}
          user={user}
          whatsappNumber={store?.whatsappNumber}
          orders={orders}
          ordersLoading={ordersLoading}
          onAddOrder={handleAddOrder}
          onUpdateOrder={handleUpdateOrder}
          onDeleteOrder={handleDeleteOrder}
          isGrowthOrPro={isGrowthOrPro}
          navigateTo={setActiveTab}
        />
      )}
      {activeTab === "ledger" && <LedgerTab />}
      {activeTab === "delivery" && isGrowthOrPro && (
        <DeliveryTab
          store={store}
          onSave={handleDeliverySave}
          saveLoading={deliverySaving}
          saveError={deliveryError}
          saveSuccess={deliverySuccess}
          isPro={isPro}
          onDeliveryZonesUpdate={handleDeliveryZonesUpdate}
          orders={orders}
        />
      )}
      {activeTab === "customers" && (
        <CustomersTab
          store={store}
          isPro={isPro}
          navigateTo={setActiveTab}
        />
      )}
      {activeTab === "categories" && (
        <CategoriesTab
          isGrowthOrPro={isGrowthOrPro}
          navigateTo={setActiveTab}
          products={products}
          services={services}
          vendorType={store?.vendorType || "products"}
        />
      )}
      {activeTab === "reviews" && (
        <ReviewsTab
          store={store}
          orders={orders}
          isPro={isPro}
          navigateTo={setActiveTab}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsTab
          storeId={store.id}
          products={products}
          services={services}
          vendorType={store?.vendorType || "products"}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          navigateTo={setActiveTab}
          analyticsData={analyticsData}
        />
      )}
      {activeTab === "marketing" && (
        <MarketingTab
          store={store}
          storeUrl={storeUrl}
          navigateTo={setActiveTab}
        />
      )}
      {activeTab === "discounts" && (
        <DiscountsTab store={store} isPro={isPro} navigateTo={setActiveTab} />
      )}
      {activeTab === "online-store" && (
        <OnlineStoreTab
          store={store}
          storeUrl={storeUrl}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          isPremium={isPremium}
          navigateTo={setActiveTab}
          onLogoUpload={handleLogoUpload}
          onColorSave={handleColorSave}
          onLayoutSave={handleLayoutSave}
          onThemeSave={handleThemeSave}
          previewProducts={products
            .filter((p) => p.isActive !== false)
            .slice(0, 2)}
        />
      )}
      {activeTab === "mobile-app" && <MobileAppTab />}
      {activeTab === "payouts" && isPro && (
        <PayoutsTab
          store={store}
          orders={orders}
          ordersLoading={ordersLoading}
          user={user}
          onSubaccountCreated={handleSubaccountCreated}
        />
      )}
      {activeTab === "payouts" && !isPro && (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet size={24} className="text-green-500" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-lg mb-2">
              Payouts — Pro Feature
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto mb-5">
              Connect your bank account and receive automatic settlements from
              in-app checkout orders. Available on Pro and Premium plans.
            </p>
            <button
              onClick={() => setActiveTab("billing")}
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
