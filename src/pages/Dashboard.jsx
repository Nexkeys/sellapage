//src/pages/Dashboard.jsx/
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  addProduct, getProducts, deleteProduct, updateProduct,
  removeProductImage, checkProductLimit, FREE_PLAN_LIMIT,
  deleteAllStoreProducts, uploadSingleImage,
} from '../firebase/products'
import { logoutSeller, updateStore, deleteAuthUser } from '../firebase/auth'
import { db } from '../firebase/config'
import {
  collection, getDocs, query, orderBy,
  writeBatch, deleteDoc, doc, addDoc, setDoc, getDoc, updateDoc,
  onSnapshot,
} from 'firebase/firestore'



import DashboardLayout  from '../components/dashboard/DashboardLayout'
import OverviewTab      from '../components/dashboard/Overview'
import ProductsTab      from '../components/dashboard/Products'
import LeadsTab         from '../components/dashboard/LeadsTab'
import SettingsTab      from '../components/dashboard/Settings'
import SupportTab       from '../components/dashboard/SupportTab'
import OrdersTab        from '../components/dashboard/OrdersTab'
import CustomersTab     from '../components/dashboard/CustomersTab'
import CategoriesTab    from '../components/dashboard/CategoriesTab'
import ReviewsTab       from '../components/dashboard/ReviewsTab'
import AnalyticsTab     from '../components/dashboard/AnalyticsTab'
import MarketingTab     from '../components/dashboard/MarketingTab'
import DiscountsTab     from '../components/dashboard/DiscountsTab'
import OnlineStoreTab   from '../components/dashboard/OnlineStoreTab'
import MobileAppTab     from '../components/dashboard/MobileAppTab'
import PayoutsTab       from '../components/dashboard/PayoutsTab'
import BillingTab       from '../components/dashboard/BillingTab'



const EMPTY_FORM = {
  name: '', price: '', description: '', category: '', stock: '',
  imageFiles: [], imagePreviews: [], imageUrls: [],
}



export default function Dashboard() {
  const { user, store, setStore } = useAuth()
  const navigate = useNavigate()


  // ── Plan-aware derivations ─────────────────────────────────────────────────
  const plan                = store?.plan || 'starter'
  const planStatus          = store?.planStatus || 'active'
  const isGrowthOrPro       = store?.hasGrowthFeatures ?? (plan === 'growth' || plan === 'pro')
  const isPro               = store?.hasProFeatures ?? (plan === 'pro')
  const maxProducts         = store?.maxProducts ?? (plan === 'pro' ? 999999 : plan === 'growth' ? 50 : FREE_PLAN_LIMIT)
  const maxImagesPerProduct = store?.maxImagesPerProduct ?? (plan === 'pro' ? 50 : plan === 'growth' ? 10 : 3)


  const [activeTab, setActiveTab]           = useState('overview')
  const [products, setProducts]             = useState([])
  const [leads, setLeads]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [leadsLoading, setLeadsLoading]     = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [showForm, setShowForm]             = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleting, setDeleting]             = useState(null)
  const [saving, setSaving]                 = useState(false)
  const [formError, setFormError]           = useState('')
  const [form, setForm]                     = useState(EMPTY_FORM)
  const [productCount, setProductCount]     = useState(0)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [aiDescError, setAiDescError]       = useState('')


  const [settingsSaving, setSettingsSaving]   = useState(false)
  const [settingsError, setSettingsError]     = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [deleteLoading, setDeleteLoading]     = useState(false)
  const [deleteError, setDeleteError]         = useState('')
  const [logoUploading, setLogoUploading]     = useState(false)


  const [supportSubmitting, setSupportSubmitting] = useState(false)
  const [supportError, setSupportError]           = useState('')
  const [supportSuccess, setSupportSuccess]       = useState('')


  // Billing
  const [billingLoading, setBillingLoading] = useState('')
  const [billingError, setBillingError]     = useState('')

  const [orders, setOrders]               = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersSynced, setOrdersSynced]   = useState(false)


  // Analytics — lifted here so Overview and AnalyticsTab share the same data
  const [analyticsData, setAnalyticsData] = useState({ totalViews: 0, totalClicks: 0, engagedViews: 0 })


  const limitReached = productCount >= maxProducts
  const storeUrl     = store ? `${window.location.origin}/${store.storeName}` : ''


  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { if (store?.id) fetchProducts() }, [store])


  useEffect(() => { if (store?.id) fetchLeads() }, [store])


  useEffect(() => {
    if (activeTab !== 'support') { setSupportSuccess(''); setSupportError('') }
  }, [activeTab])


  useEffect(() => {
    if (activeTab !== 'billing') setBillingError('')
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'orders' && !isGrowthOrPro) setActiveTab('overview')
  }, [activeTab, isGrowthOrPro])

  useEffect(() => {
    if (activeTab === 'orders' && store?.id && isGrowthOrPro && !ordersSynced) fetchOrders()
  }, [activeTab, store?.id, isGrowthOrPro, ordersSynced])

  useEffect(() => {
    setOrdersSynced(false)
    setOrders([])
  }, [store?.id])


  // Analytics real-time listener — only for Growth/Pro, lives at Dashboard level
  useEffect(() => {
    if (!store?.id || !isGrowthOrPro) return
    const unsubscribe = onSnapshot(
      doc(db, 'stores', store.id, 'analytics', 'storeSummary'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setAnalyticsData({
            totalViews:   data.totalViews   ?? 0,
            totalClicks:  data.totalClicks  ?? 0,
            engagedViews: data.engagedViews ?? 0,
          })
        } else {
          setAnalyticsData({ totalViews: 0, totalClicks: 0, engagedViews: 0 })
        }
      },
      () => {
        setAnalyticsData({ totalViews: 0, totalClicks: 0, engagedViews: 0 })
      }
    )
    return unsubscribe
  }, [store?.id, isGrowthOrPro])


  // Mount-time Firestore re-fetch with self-healing migration for legacy store documents
  useEffect(() => {
    if (!store?.id) return
    const syncStoreOnMount = async () => {
      try {
        const snap = await getDoc(doc(db, 'stores', store.id))
        if (snap.exists()) {
          const data = snap.data()

          // Detect legacy documents missing plan fields and backfill them
          if (data.maxProducts === undefined || data.hasGrowthFeatures === undefined) {
            const existingPlan = data.plan || 'starter'
            let planFields = {}

            if (existingPlan === 'pro') {
              planFields = {
                maxProducts:         999999,
                maxImagesPerProduct: 50,
                hasGrowthFeatures:   true,
                hasProFeatures:      true,
              }
            } else if (existingPlan === 'growth') {
              planFields = {
                maxProducts:         50,
                maxImagesPerProduct: 10,
                hasGrowthFeatures:   true,
                hasProFeatures:      false,
              }
            } else {
              planFields = {
                maxProducts:         FREE_PLAN_LIMIT,
                maxImagesPerProduct: 3,
                hasGrowthFeatures:   false,
                hasProFeatures:      false,
              }
            }

            planFields.planStatus   = data.planStatus   ?? 'active'
            planFields.productCount = data.productCount ?? 0

            try {
              await updateDoc(doc(db, 'stores', store.id), planFields)
            } catch (writeErr) {
              console.error('Failed to migrate legacy store fields', writeErr)
            }

            Object.assign(data, planFields)
          }

          setStore(prev => ({ ...prev, ...data }))

          try {
            await updateDoc(doc(db, 'stores', store.id), {
              lastSeen: new Date()
            });
          } catch {
            // non-critical background signature logging; silently suppress anomalies
          }
        }
      } catch (err) {
        console.error('Failed to sync store on mount', err)
      }
    }
    syncStoreOnMount()
  }, [])


  // Sync store plan state from Firestore after returning from billing callback
  useEffect(() => {
    if (activeTab !== 'billing' || !store?.id) return
    const syncPlan = async () => {
      try {
        const snap = await getDoc(doc(db, 'stores', store.id))
        if (snap.exists()) {
          setStore(prev => ({ ...prev, ...snap.data() }))
        }
      } catch (err) {
        console.error('Failed to sync plan state', err)
      }
    }
    syncPlan()
  }, [activeTab, store?.id])


  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      const data = await getProducts(store.id)
      setProducts(data)
      setProductCount(data.length)
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setLoading(false)
    }
  }


  const fetchLeads = async () => {
    setLeadsLoading(true)
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      const storeLeads = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.storeId === store.id)
      setLeads(storeLeads)
    } catch (err) {
      console.error('Failed to fetch leads', err)
    } finally {
      setLeadsLoading(false)
    }
  }


  const fetchOrders = async () => {
    setOrdersLoading(true)
    try {
      const q = query(
        collection(db, 'stores', store.id, 'orders'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setOrdersSynced(true)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    } finally {
      setOrdersLoading(false)
    }
  }


  const handleAddOrder = async (orderData) => {
    if (!store?.id || !isGrowthOrPro) return
    const now = new Date()
    const orderRef = doc(collection(db, 'stores', store.id, 'orders'))
    const newOrder = {
      id: orderRef.id,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || '',
      items: orderData.items,
      total: orderData.total ?? null,
      notes: orderData.notes || '',
      status: orderData.status || 'pending',
      paymentStatus: orderData.paymentStatus || 'unpaid',
      paymentMethod: orderData.paymentMethod || 'bank_transfer',
      createdAt: now,
      updatedAt: now,
    }

    setOrders(prev => [newOrder, ...prev])

    try {
      const { id, ...payload } = newOrder
      await setDoc(orderRef, payload)
      setOrdersSynced(true)
    } catch (err) {
      console.error('Failed to add order', err)
      setOrders(prev => prev.filter(order => order.id !== orderRef.id))
      throw err
    }
  }

  const handleUpdateOrder = async (orderId, updates) => {
    if (!store?.id || !isGrowthOrPro) return
    const previousOrder = orders.find(order => order.id === orderId)
    if (!previousOrder) return

    const normalizedUpdates =
      typeof updates === 'string' ? { status: updates } : { ...updates }
    const updatedAt = new Date()
    const nextOrder = { ...previousOrder, ...normalizedUpdates, updatedAt }

    setOrders(prev => prev.map(order => (
      order.id === orderId ? { ...order, ...normalizedUpdates, updatedAt } : order
    )))

    try {
      await updateDoc(doc(db, 'stores', store.id, 'orders', orderId), {
        ...normalizedUpdates,
        updatedAt,
      })
    } catch (err) {
      console.error('Failed to update order', err)
      setOrders(prev => prev.map(order => (
        order.id === orderId ? previousOrder : order
      )))
      throw err
    }

    return nextOrder
  }

  const handleDeleteOrder = async (orderId) => {
    if (!store?.id || !isGrowthOrPro) return
    const deletedOrder = orders.find(order => order.id === orderId)
    const deletedIndex = orders.findIndex(order => order.id === orderId)
    if (!deletedOrder) return

    setOrders(prev => prev.filter(order => order.id !== orderId))

    try {
      await deleteDoc(doc(db, 'stores', store.id, 'orders', orderId))
    } catch (err) {
      console.error('Failed to delete order', err)
      setOrders(prev => {
        if (prev.some(order => order.id === orderId)) return prev
        const next = [...prev]
        next.splice(Math.max(deletedIndex, 0), 0, deletedOrder)
        return next
      })
      throw err
    }
  }


  // ── Handlers ───────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  const resetForm = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setAiDescError('')
    setEditingProduct(null)
    setShowForm(false)
  }


  const startEdit = product => {
    setEditingProduct(product)
    setAiDescError('')
    setForm({
      name:          product.name,
      price:         product.price,
      description:   product.description || '',
      category:      product.category || '',
      stock:         product.stock ?? '',
      imageFiles:    [],
      imagePreviews: [],
      imageUrls:     product.imageUrls || [],
    })
    setShowForm(true)
  }


  const handleImageChange = e => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const currentTotal = form.imageUrls.length + form.imageFiles.length
    const slotsLeft = maxImagesPerProduct - currentTotal
    if (slotsLeft <= 0) { setFormError(`Maximum ${maxImagesPerProduct} images allowed per product.`); return }
    const toAdd = files.slice(0, slotsLeft)
    const previews = []
    toAdd.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { setFormError('Each image must be under 5MB.'); return }
      const reader = new FileReader()
      reader.onloadend = () => {
        previews.push(reader.result)
        if (previews.length === toAdd.length) {
          setForm(p => ({
            ...p,
            imageFiles: [...p.imageFiles, ...toAdd],
            imagePreviews: [...p.imagePreviews, ...previews],
          }))
        }
      }
      reader.readAsDataURL(file)
    })
    setFormError('')
  }


  const handleRemoveExistingImage = async url => {
    if (!editingProduct) {
      setForm(p => ({ ...p, imageUrls: p.imageUrls.filter(u => u !== url) }))
      return
    }
    try {
      const newUrls = await removeProductImage(store.id, editingProduct.id, url, form.imageUrls)
      setForm(p => ({ ...p, imageUrls: newUrls }))
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id ? { ...p, imageUrls: newUrls, imageUrl: newUrls[0] || '' } : p
      ))
    } catch (err) {
      console.error('Failed to remove image', err)
      setFormError('Could not remove image. Please try again.')
    }
  }


  const handleRemoveNewImage = index => {
    setForm(p => ({
      ...p,
      imageFiles: p.imageFiles.filter((_, i) => i !== index),
      imagePreviews: p.imagePreviews.filter((_, i) => i !== index),
    }))
  }


  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Product name is required.'); return }
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
      setFormError('Please enter a valid price.'); return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingProduct) {
        const updatedData = await updateProduct(
          store.id, editingProduct.id,
          {
            name:        form.name.trim(),
            price:       form.price,
            description: form.description.trim(),
            category:    form.category.trim(),
            stock:       form.stock !== '' && form.stock !== null && form.stock !== undefined ? Number(form.stock) : null,
            imageUrls:   form.imageUrls,
          },
          form.imageFiles
        )
        setProducts(prev => prev.map(p =>
          p.id === editingProduct.id ? { ...p, ...updatedData } : p
        ))
        resetForm()
      } else {
        const { limitReached: reached } = await checkProductLimit(store.id)
        if (reached) { setFormError(`You've reached the ${maxProducts} product limit.`); setSaving(false); return }
        const newProduct = await addProduct(
          store.id,
          {
            name:        form.name.trim(),
            price:       form.price,
            description: form.description.trim(),
            category:    form.category.trim(),
            stock:       form.stock !== '' && form.stock !== null && form.stock !== undefined ? Number(form.stock) : null,
          },
          form.imageFiles
        )
        setProducts(prev => [newProduct, ...prev])
        setProductCount(c => c + 1)
        resetForm()
      }
    } catch (err) {
      console.error('Failed to save product', err)
      if (err.message === 'FREE_PLAN_LIMIT_REACHED') {
        setFormError(`You've reached the ${maxProducts} product limit on the ${plan} plan.`)
      } else {
        setFormError('Failed to save product. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }


  const handleDelete = async id => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteProduct(store.id, id)
      setProducts(prev => prev.filter(p => p.id !== id))
      setProductCount(c => c - 1)
    } catch (err) {
      console.error('Failed to delete product', err)
    } finally {
      setDeleting(null)
    }
  }


  const handleToggleActive = async product => {
    if (!isGrowthOrPro) return
    const newValue = !product.isActive
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, isActive: newValue } : p)
    )
    try {
      await updateDoc(doc(db, 'stores', store.id, 'products', product.id), {
        isActive: newValue,
      })
    } catch (err) {
      console.error('Toggle failed', err)
      setProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, isActive: !newValue } : p)
      )
    }
  }


  const handleSettingsSave = async formData => {
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsSuccess('')
    try {
      await updateStore(store.id, {
        businessName:   formData.businessName.trim(),
        storeName:      formData.storeName.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        description:    formData.description.trim(),
        themeColor:     formData.themeColor || '',
      })
      setStore(prev => ({ ...prev, ...formData, themeColor: formData.themeColor || '' }))
      setSettingsSuccess('Settings saved successfully.')
      setTimeout(() => setSettingsSuccess(''), 3000)
    } catch (err) {
      console.error('Settings save failed', err)
      setSettingsError('Failed to save settings. Please try again.')
    } finally {
      setSettingsSaving(false)
    }
  }


  const handleLogoUpload = async file => {
    setLogoUploading(true)
    try {
      const url = await uploadSingleImage(file, 'sellapage/logos')
      await updateStore(store.id, { logoUrl: url })
      setStore(prev => ({ ...prev, logoUrl: url }))
    } catch (err) {
      console.error('Logo upload failed', err)
    } finally {
      setLogoUploading(false)
    }
  }


  const handleColorSave = async (color) => {
    try {
      await updateStore(store.id, { themeColor: color })
      setStore(prev => ({ ...prev, themeColor: color }))
    } catch (err) {
      console.error('Color save failed', err)
    }
  }


  const handleLayoutSave = async (layout) => {
    try {
      await updateStore(store.id, { storeLayout: layout })
      setStore(prev => ({ ...prev, storeLayout: layout }))
    } catch (err) {
      console.error('Layout save failed', err)
    }
  }


  const handleThemeSave = async (themeId, themeMetadata) => {
    try {
      await updateStore(store.id, { storeTheme: themeId, themeMetadata })
      setStore(prev => ({ ...prev, storeTheme: themeId, themeMetadata }))
    } catch (err) {
      console.error('Theme save failed', err)
    }
  }


  const handleGenerateDescription = async () => {
    if (!form.name.trim()) return
    if (!user || !store?.id) {
      setAiDescError('Please sign in again to generate descriptions.')
      return
    }
    setGeneratingDesc(true)
    setAiDescError('')
    try {
      const token = await user.getIdToken()
      const res = await fetch('/.netlify/functions/ai-describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: store.id,
          productName: form.name.trim(),
          category: form.category?.trim() || '',
          price: form.price || '',
        }),
      })
      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }
      if (res.ok && data.description) {
        setForm(p => ({ ...p, description: data.description }))
      } else {
        setAiDescError(data.error || 'Failed to generate description. Please try again.')
      }
    } catch (err) {
      console.error('AI description generation failed', err)
      setAiDescError('Failed to generate description. Please try again.')
    } finally {
      setGeneratingDesc(false)
    }
  }


  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteAllStoreProducts(store.id)
      const leadsSnap = await getDocs(
        query(collection(db, 'leads'), orderBy('createdAt', 'desc'))
      )
      const batch = writeBatch(db)
      leadsSnap.docs
        .filter(d => d.data().storeId === store.id)
        .forEach(d => batch.delete(d.ref))
      await batch.commit()
      await deleteDoc(doc(db, 'stores', store.id))
      await deleteAuthUser()
      navigate('/')
    } catch (err) {
      console.error('Delete account failed', err)
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('For security, please sign out and sign in again before deleting your account.')
      } else {
        setDeleteError('Failed to delete account. Please try again or contact support.')
      }
    } finally {
      setDeleteLoading(false)
    }
  }


  const handleSupportSubmit = async formData => {
    if (!formData.message.trim()) return
    setSupportSubmitting(true)
    setSupportError('')
    setSupportSuccess('')
    try {
      await addDoc(collection(db, 'supportMessages'), {
        storeId:        store.id,
        businessName:   store.businessName,
        email:          store.email,
        whatsappNumber: store.whatsappNumber,
        storeName:      store.storeName,
        plan,
        category:       formData.category,
        message:        formData.message.trim(),
        status:         'open',
        createdAt:      new Date(),
      })
      setSupportSuccess('Message sent!')
    } catch (err) {
      console.error('Support submit failed', err)
      setSupportError('Failed to send message. Please try again.')
    } finally {
      setSupportSubmitting(false)
    }
  }


  const handleUpgrade = async (selectedPlan) => {
    if (!store?.id || !selectedPlan) return
    setBillingLoading(selectedPlan)
    setBillingError('')
    try {
      const res = await fetch('/.netlify/functions/billing-initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, plan: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBillingError(data.error || 'Could not start checkout. Please try again.')
        return
      }
      window.location.href = data.authorization_url
    } catch (err) {
      console.error('Billing initialize failed', err)
      setBillingError('Network error. Please check your connection and try again.')
    } finally {
      setBillingLoading('')
    }
  }


  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
    >
      {activeTab === 'overview' && (
        <OverviewTab
          store={store}
          plan={plan}
          maxProducts={maxProducts}
          productCount={productCount}
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
      )}


      {activeTab === 'products' && (
        <ProductsTab
          plan={plan}
          productCount={productCount}
          maxProducts={maxProducts}
          maxImagesPerProduct={maxImagesPerProduct}
          isGrowthOrPro={isGrowthOrPro}
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
          handleFormName={e => setForm(p => ({ ...p, name: e.target.value }))}
          handleFormPrice={e => setForm(p => ({ ...p, price: e.target.value }))}
          handleFormDesc={e => setForm(p => ({ ...p, description: e.target.value }))}
          handleFormCategory={e => setForm(p => ({ ...p, category: e.target.value }))}
          handleFormStock={e => setForm(p => ({ ...p, stock: e.target.value }))}
          onGenerateDescription={handleGenerateDescription}
          generatingDesc={generatingDesc}
          aiDescError={aiDescError}
          handleSave={handleSave}
          resetForm={resetForm}
          startEdit={startEdit}
          handleDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}


      {activeTab === 'leads' && (
        <LeadsTab
          leadsLoading={leadsLoading}
          leads={leads}
          isPro={isPro}
        />
      )}


      {activeTab === 'settings' && (
        <SettingsTab
          store={store}
          plan={plan}
          planStatus={planStatus}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          onSave={handleSettingsSave}
          saveLoading={settingsSaving}
          saveError={settingsError}
          saveSuccess={settingsSuccess}
          onDeleteAccount={handleDeleteAccount}
          deleteLoading={deleteLoading}
          deleteError={deleteError}
          onClearDeleteError={() => setDeleteError('')}
          onLogoUpload={handleLogoUpload}
          logoUploading={logoUploading}
          navigateTo={setActiveTab}
        />
      )}


      {activeTab === 'support' && (
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


      {activeTab === 'billing' && (
        <BillingTab
          store={store}
          plan={plan}
          planStatus={planStatus}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          onUpgrade={handleUpgrade}
          upgradeLoading={billingLoading}
          upgradeError={billingError}
        />
      )}


      {activeTab === 'orders' && isGrowthOrPro && (
        <OrdersTab
          store={store}
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
      {activeTab === 'customers'    && <CustomersTab />}
      {activeTab === 'categories'   && (
        <CategoriesTab
          isGrowthOrPro={isGrowthOrPro}
          navigateTo={setActiveTab}
          products={products}
        />
      )}
      {activeTab === 'reviews'      && <ReviewsTab />}
      {activeTab === 'analytics'    && (
        <AnalyticsTab
          storeId={store.id}
          products={products}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          navigateTo={setActiveTab}
          analyticsData={analyticsData}
        />
      )}
      {activeTab === 'marketing'    && <MarketingTab store={store} storeUrl={storeUrl} navigateTo={setActiveTab} />}
      {activeTab === 'discounts'    && <DiscountsTab />}
      {activeTab === 'online-store' && (
        <OnlineStoreTab
          store={store}
          storeUrl={storeUrl}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          navigateTo={setActiveTab}
          onLogoUpload={handleLogoUpload}
          onColorSave={handleColorSave}
          onLayoutSave={handleLayoutSave}
          onThemeSave={handleThemeSave}
          previewProducts={products.filter(p => p.isActive !== false).slice(0, 2)}
        />
      )}
      {activeTab === 'mobile-app'   && <MobileAppTab />}
      {activeTab === 'payouts'      && <PayoutsTab />}
    </DashboardLayout>
  )
}
