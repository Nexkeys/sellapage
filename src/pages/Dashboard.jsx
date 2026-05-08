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
  name: '', price: '', description: '',
  imageFiles: [], imagePreviews: [], imageUrls: [],
}


export default function Dashboard() {
  const { store, setStore } = useAuth()
  const navigate = useNavigate()

  // ── Plan-aware derivations ─────────────────────────────────────────────────
  const plan                = store?.plan || 'starter'
  const planStatus          = store?.planStatus || 'active'
  const maxProducts         = store?.maxProducts || FREE_PLAN_LIMIT
  const maxImagesPerProduct = store?.maxImagesPerProduct || 3
  const isGrowthOrPro       = store?.hasGrowthFeatures || false
  const isPro               = store?.hasProFeatures || false

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

  const [settingsSaving, setSettingsSaving]   = useState(false)
  const [settingsError, setSettingsError]     = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [deleteLoading, setDeleteLoading]     = useState(false)
  const [deleteError, setDeleteError]         = useState('')
  const [logoUploading, setLogoUploading]     = useState(false)

  const [supportSubmitting, setSupportSubmitting] = useState(false)
  const [supportError, setSupportError]           = useState('')
  const [supportSuccess, setSupportSuccess]       = useState('')

  const [pollLoading, setPollLoading]       = useState(true)
  const [pollSubmitting, setPollSubmitting] = useState(false)
  const [pollSuccess, setPollSuccess]       = useState('')
  const [pollError, setPollError]           = useState('')
  const [pollReason, setPollReason]         = useState('')
  const [existingVote, setExistingVote]     = useState(null)

  // Billing
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError]     = useState('')

  const limitReached = productCount >= maxProducts
  const storeUrl     = store ? `${window.location.origin}/${store.storeName}` : ''

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { if (store?.id) fetchProducts() }, [store])

  useEffect(() => {
    if (activeTab === 'leads' && store?.id && leads.length === 0) fetchLeads()
  }, [activeTab, store])

  useEffect(() => {
    if (activeTab !== 'support') { setSupportSuccess(''); setSupportError('') }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'billing') setBillingError('')
  }, [activeTab])

  useEffect(() => {
    if (!store?.id) return
    const loadUpgradeVote = async () => {
      setPollLoading(true)
      try {
        const voteSnap = await getDoc(doc(db, 'upgradeVotes', store.id))
        if (voteSnap.exists()) {
          const data = voteSnap.data()
          setExistingVote({ id: voteSnap.id, ...data })
          setPollReason(data.reason || '')
        } else {
          setExistingVote(null)
          setPollReason('')
        }
      } catch (err) {
        console.error('Failed to load upgrade vote', err)
      } finally {
        setPollLoading(false)
      }
    }
    loadUpgradeVote()
  }, [store?.id])

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

  // ── Handlers ───────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditingProduct(null)
    setShowForm(false)
  }

  const startEdit = product => {
    setEditingProduct(product)
    setForm({
      name: product.name, price: product.price,
      description: product.description || '',
      imageFiles: [], imagePreviews: [],
      imageUrls: product.imageUrls || [],
    })
    setShowForm(true)
    setActiveTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          { name: form.name.trim(), price: form.price, description: form.description.trim(), imageUrls: form.imageUrls },
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
          { name: form.name.trim(), price: form.price, description: form.description.trim() },
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
    // Optimistic update
    setProducts(prev =>
      prev.map(p => p.id === product.id ? { ...p, isActive: newValue } : p)
    )
    try {
      await updateDoc(doc(db, 'stores', store.id, 'products', product.id), {
        isActive: newValue,
      })
    } catch (err) {
      console.error('Toggle failed', err)
      // Revert on failure
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
      })
      setStore(prev => ({ ...prev, ...formData }))
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

  const handlePollVote = async vote => {
    if (!store?.id) return
    setPollSubmitting(true)
    setPollError('')
    try {
      await setDoc(doc(db, 'upgradeVotes', store.id), {
        storeId:      store.id,
        businessName: store.businessName,
        vote,
        reason:       pollReason.trim(),
        createdAt:    new Date(),
      })
      setExistingVote({ vote, reason: pollReason.trim() })
      setPollSuccess('Thanks for your feedback!')
    } catch (err) {
      console.error('Poll vote failed', err)
      setPollError('Could not save your response. Please try again.')
    } finally {
      setPollSubmitting(false)
    }
  }

  const handleUpgrade = async (selectedPlan) => {
    if (!store?.id || !selectedPlan) return
    setBillingLoading(true)
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
      setBillingLoading(false)
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
          storeUrl={storeUrl}
          copied={copied}
          copyLink={copyLink}
          navigateTo={setActiveTab}
          setShowForm={setShowForm}
          pollLoading={pollLoading}
          pollSubmitting={pollSubmitting}
          pollSuccess={pollSuccess}
          pollError={pollError}
          existingVote={existingVote}
          pollReason={pollReason}
          setPollReason={setPollReason}
          onVote={handlePollVote}
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

      {activeTab === 'orders'       && <OrdersTab store={store} whatsappNumber={store?.whatsappNumber} />}
      {activeTab === 'customers'    && <CustomersTab />}
      {activeTab === 'categories'   && <CategoriesTab />}
      {activeTab === 'reviews'      && <ReviewsTab />}
      {activeTab === 'analytics'    && (
        <AnalyticsTab
          storeId={store.id}
          products={products}
          isGrowthOrPro={isGrowthOrPro}
          isPro={isPro}
          navigateTo={setActiveTab}
        />
      )}
      {activeTab === 'marketing'    && <MarketingTab store={store} storeUrl={storeUrl} />}
      {activeTab === 'discounts'    && <DiscountsTab />}
      {activeTab === 'online-store' && <OnlineStoreTab store={store} storeUrl={storeUrl} />}
      {activeTab === 'mobile-app'   && <MobileAppTab />}
      {activeTab === 'payouts'      && <PayoutsTab />}
    </DashboardLayout>
  )
}