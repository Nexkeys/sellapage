import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, LogOut, Store, Package,
  Copy, Check, UploadCloud, X, Loader2,
  ExternalLink, LayoutDashboard, Settings,
  Menu, ChevronRight, Users, AlertCircle,
  ImageIcon, Sparkles, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { logoutSeller } from '../firebase/auth'
import {
  addProduct, getProducts, deleteProduct,
  updateProduct, removeProductImage,
  checkProductLimit, FREE_PLAN_LIMIT,
} from '../firebase/products'
import { db } from '../firebase/config'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'


const EMPTY_FORM = {
  name: '', price: '', description: '',
  imageFiles: [],
  imagePreviews: [],
  imageUrls: [],
}


// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',  label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'products',  label: 'Products',     icon: Package },
  { id: 'leads',     label: 'Leads',        icon: Users },
  { id: 'settings',  label: 'Settings',     icon: Settings, comingSoon: true },
]


// ── Tab: Overview (outside Dashboard to keep component identity stable) ───────
function OverviewTab({ store, productCount, limitReached, leads, storeUrl, copied, copyLink, navigateTo, setShowForm }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900">
          Welcome back 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">{store?.businessName}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-400 text-xs mb-1">Products Listed</p>
          <p className="font-display font-bold text-3xl text-gray-900">{productCount}</p>
          <p className="text-gray-400 text-xs mt-1">of {FREE_PLAN_LIMIT} free limit</p>
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                limitReached ? 'bg-red-400' : 'bg-brand-500'
              }`}
              style={{ width: `${Math.min((productCount / FREE_PLAN_LIMIT) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="card">
          <p className="text-gray-400 text-xs mb-1">Enquiries</p>
          <p className="font-display font-bold text-3xl text-gray-900">{leads.length || '—'}</p>
          <p className="text-gray-400 text-xs mt-1">from lead form</p>
        </div>
        <div className="card col-span-2 md:col-span-1">
          <p className="text-gray-400 text-xs mb-1">Current Plan</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display font-bold text-gray-900 text-lg">Free</span>
            <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              EARLY ACCESS
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1">Paid plans coming soon</p>
        </div>
      </div>

      {/* Store link card */}
      <div className="bg-gradient-to-r from-brand-500 to-emerald-600 rounded-2xl p-5 md:p-6 text-white">
        <p className="text-brand-100 text-xs font-semibold uppercase tracking-widest mb-2">
          Your Store Link
        </p>
        <p className="font-display font-bold text-sm md:text-base break-all mb-4">{storeUrl}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          >
            <ExternalLink size={15} />
            View Store
          </a>
        </div>
        <p className="text-brand-200 text-xs mt-3">
          Share this in your WhatsApp status, Instagram bio, or anywhere your customers see you.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => { navigateTo('products'); setShowForm(true) }}
          disabled={limitReached}
          className="card flex items-center gap-4 hover:shadow-md transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
            <Plus size={22} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Add New Product</p>
            <p className="text-gray-400 text-xs">
              {limitReached ? `Limit reached (${FREE_PLAN_LIMIT}/${FREE_PLAN_LIMIT})` : `${productCount}/${FREE_PLAN_LIMIT} products used`}
            </p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-brand-400 transition-colors" />
        </button>

        <button
          onClick={() => navigateTo('leads')}
          className="card flex items-center gap-4 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Users size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">View Enquiries</p>
            <p className="text-gray-400 text-xs">Customers who left their details</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-emerald-400 transition-colors" />
        </button>
      </div>
    </div>
  )
}


// ── Tab: Products (outside Dashboard to keep component identity stable) ────────
function ProductsTab({
  productCount, limitReached, showForm, setShowForm,
  editingProduct, form, formError, saving, loading,
  products, deleting,
  handleImageChange, handleRemoveExistingImage, handleRemoveNewImage,
  handleFormName, handleFormPrice, handleFormDesc,
  handleSave, resetForm, startEdit, handleDelete,
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-gray-900 text-2xl">My Products</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {productCount} of {FREE_PLAN_LIMIT} products used
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              if (limitReached) return
              setShowForm(true)
            }}
            disabled={limitReached}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Plan limit banner */}
      {limitReached && !showForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-0.5">
              Free plan limit reached ({FREE_PLAN_LIMIT}/{FREE_PLAN_LIMIT} products)
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              You have used all {FREE_PLAN_LIMIT} product slots on the free plan. Paid plans with more product slots are coming soon.
            </p>
            <a
              href="/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-amber-700 hover:text-amber-900 text-xs font-semibold transition-colors"
            >
              <Sparkles size={13} />
              See upcoming plans
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      )}

      {/* Product form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-gray-900 text-xl">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
              <X size={22} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Image upload area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
                <span className="text-gray-400 font-normal ml-1">
                  ({(form.imageUrls.length + form.imageFiles.length)}/3 max)
                </span>
              </label>

              {/* Existing + new previews */}
              {(form.imageUrls.length > 0 || form.imagePreviews.length > 0) && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {form.imageUrls.map((url, i) => (
                    <div key={`existing-${i}`} className="relative">
                      <img src={url} alt={`Product ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                      <button
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.imagePreviews.map((preview, i) => (
                    <div key={`new-${i}`} className="relative">
                      <img src={preview} alt={`New ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-brand-200" />
                      <button
                        onClick={() => handleRemoveNewImage(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[9px] bg-brand-500 text-white px-1 rounded font-bold">NEW</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone — only show if slots remain */}
              {(form.imageUrls.length + form.imageFiles.length) < 3 && (
                <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all text-center">
                  <UploadCloud size={24} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Click to add images</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    PNG or JPG, up to 5MB each.{' '}
                    {3 - form.imageUrls.length - form.imageFiles.length} slot{3 - form.imageUrls.length - form.imageFiles.length !== 1 ? 's' : ''} left.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={handleFormName}
                placeholder="E.g. Red Ankara Midi Dress"
                className="input-field"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₦) *</label>
              <input
                type="number"
                value={form.price}
                onChange={handleFormPrice}
                placeholder="E.g. 15000"
                min="1"
                className="input-field"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
                <span className="text-gray-400 font-normal"> (Optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={handleFormDesc}
                placeholder="E.g. Available in S, M, L. Pure cotton fabric. Colours: red, blue, black."
                rows={3}
                className="input-field resize-none"
              />
            </div>

            {formError && (
              <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {formError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={resetForm}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-brand-300" />
          </div>
          <h3 className="font-display font-bold text-gray-900 mb-1">No products yet</h3>
          <p className="text-gray-400 text-sm mb-5">Add your first product to start selling.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            Add First Product
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* Images */}
              <div className="flex gap-1.5 flex-shrink-0">
                {product.imageUrls?.length > 0 ? (
                  <>
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="w-14 h-14 object-cover rounded-xl"
                    />
                    {product.imageUrls.length > 1 && (
                      <div className="w-7 h-14 flex flex-col gap-1">
                        {product.imageUrls.slice(1, 3).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-7 h-6.5 object-cover rounded-md flex-1"
                            style={{ height: '26px' }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                    <ImageIcon size={20} className="text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                <p className="font-display font-bold text-brand-600 text-lg">
                  ₦{Number(product.price).toLocaleString()}
                </p>
                {product.description && (
                  <p className="text-gray-400 text-xs truncate mt-0.5">{product.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(product)}
                  className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  disabled={deleting === product.id}
                  className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-40"
                  title="Delete"
                >
                  {deleting === product.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Tab: Leads (outside Dashboard to keep component identity stable) ───────────
function LeadsTab({ leadsLoading, leads }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-bold text-gray-900 text-2xl">Customer Enquiries</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          People who left their details on your store page.
        </p>
      </div>

      {leadsLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-emerald-300" />
          </div>
          <h3 className="font-display font-bold text-gray-900 mb-1">No enquiries yet</h3>
          <p className="text-gray-400 text-sm">
            When customers fill out the form on your store, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <div key={lead.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
                  <p className="text-brand-600 text-sm font-medium">{lead.phone}</p>
                </div>
                <p className="text-gray-400 text-xs flex-shrink-0">
                  {lead.createdAt?.toDate
                    ? lead.createdAt.toDate().toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })
                    : 'Recently'}
                </p>
              </div>
              {lead.interest && (
                <p className="text-gray-500 text-xs bg-gray-50 rounded-lg px-3 py-2 mt-2 leading-relaxed">
                  "{lead.interest}"
                </p>
              )}
              <a
                href={`https://wa.me/${lead.phone.replace(/[\s\-\(\)\+]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-whatsapp font-semibold hover:opacity-80 transition-opacity"
              >
                <ExternalLink size={12} />
                Reply on WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function Dashboard() {
  const { store }   = useAuth()
  const navigate    = useNavigate()

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

  const limitReached  = productCount >= FREE_PLAN_LIMIT
  const storeUrl      = store ? `${window.location.origin}/${store.storeName}` : ''

  useEffect(() => {
    if (store?.id) {
      fetchProducts()
    }
  }, [store])

  useEffect(() => {
    if (activeTab === 'leads' && store?.id && leads.length === 0) {
      fetchLeads()
    }
  }, [activeTab, store])

  const fetchProducts = async () => {
    try {
      const data = await getProducts(store.id)
      setProducts(data)
      setProductCount(data.length)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async () => {
    setLeadsLoading(true)
    try {
      const q = query(
        collection(db, 'leads'),
        orderBy('createdAt', 'desc')
      )
      const snap = await getDocs(q)
      const storeleads = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.storeId === store.id)
      setLeads(storeleads)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLeadsLoading(false)
    }
  }

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

  const startEdit = (product) => {
    setEditingProduct(product)
    setForm({
      name:          product.name,
      price:         product.price,
      description:   product.description || '',
      imageFiles:    [],
      imagePreviews: [],
      imageUrls:     product.imageUrls || [],
    })
    setShowForm(true)
    setActiveTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const currentTotal = form.imageUrls.length + form.imageFiles.length
    const slotsLeft    = 3 - currentTotal
    if (slotsLeft <= 0) {
      setFormError('Maximum 3 images allowed per product.')
      return
    }

    const toAdd = files.slice(0, slotsLeft)
    const previews = []

    toAdd.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Each image must be under 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        previews.push(reader.result)
        if (previews.length === toAdd.length) {
          setForm(p => ({
            ...p,
            imageFiles:    [...p.imageFiles, ...toAdd],
            imagePreviews: [...p.imagePreviews, ...previews],
          }))
        }
      }
      reader.readAsDataURL(file)
    })

    setFormError('')
  }

  const handleRemoveExistingImage = async (url) => {
    if (!editingProduct) return
    const updated = await removeProductImage(
      store.id, editingProduct.id, url, form.imageUrls
    )
    setForm(p => ({ ...p, imageUrls: updated }))
  }

  const handleRemoveNewImage = (index) => {
    setForm(p => ({
      ...p,
      imageFiles:    p.imageFiles.filter((_, i) => i !== index),
      imagePreviews: p.imagePreviews.filter((_, i) => i !== index),
    }))
  }

  // Stable form field handlers — useCallback ensures same reference across re-renders
  const handleFormName  = useCallback((e) => setForm(p => ({ ...p, name: e.target.value })), [])
  const handleFormPrice = useCallback((e) => setForm(p => ({ ...p, price: e.target.value })), [])
  const handleFormDesc  = useCallback((e) => setForm(p => ({ ...p, description: e.target.value })), [])

  const handleSave = async () => {
    if (!form.name.trim())  return setFormError('Product name is required.')
    if (!form.price)        return setFormError('Price is required.')
    if (isNaN(Number(form.price)) || Number(form.price) <= 0)
      return setFormError('Please enter a valid price greater than 0.')

    setSaving(true)
    setFormError('')

    const productData = {
      name:        form.name.trim(),
      price:       Number(form.price),
      description: form.description.trim(),
      imageUrls:   form.imageUrls,
      imageUrl:    form.imageUrls[0] || '',
    }

    try {
      if (editingProduct) {
        const updated = await updateProduct(
          store.id, editingProduct.id, productData, form.imageFiles
        )
        setProducts(p => p.map(prod =>
          prod.id === editingProduct.id ? { ...prod, ...updated } : prod
        ))
      } else {
        const newProd = await addProduct(store.id, productData, form.imageFiles)
        setProducts(p => [newProd, ...p])
        setProductCount(c => c + 1)
      }
      resetForm()
    } catch (err) {
      if (err.message === 'FREE_PLAN_LIMIT_REACHED') {
        setFormError(`You have reached the ${FREE_PLAN_LIMIT}-product limit on the free plan.`)
      } else {
        setFormError(err.message || 'Failed to save. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      await deleteProduct(store.id, product.id)
      setProducts(p => p.filter(prod => prod.id !== product.id))
      setProductCount(c => c - 1)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  const handleLogout = async () => {
    await logoutSeller()
    navigate('/')
  }

  const navigateTo = (tabId) => {
    setActiveTab(tabId)
    setSidebarOpen(false)
    if (showForm) resetForm()
  }

  // ── Sidebar content ───────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setSidebarOpen(false)}>
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-brand-600 transition-colors">
            <Store size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-gray-900 text-xl">Sellapage</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => item.comingSoon ? null : navigateTo(item.id)}
            disabled={item.comingSoon}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors text-left ${
              activeTab === item.id
                ? 'bg-brand-50 text-brand-700'
                : item.comingSoon
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon size={18} />
            <span className="text-sm font-semibold">{item.label}</span>
            {item.comingSoon && (
              <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">
                Soon
              </span>
            )}
            {activeTab === item.id && !item.comingSoon && (
              <ChevronRight size={14} className="ml-auto text-brand-400" />
            )}
          </button>
        ))}

        <div className="pt-2 border-t border-gray-100 mt-2">
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors group"
          >
            <ExternalLink size={18} />
            <span className="text-sm font-semibold">View My Store</span>
            <ExternalLink size={13} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
          </a>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-gray-400 truncate">{store?.email}</p>
          <p className="text-sm font-semibold text-gray-700 truncate">{store?.businessName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all w-full"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-100 z-50 flex flex-col md:hidden transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors -ml-2"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-gray-900">Sellapage</span>
          </Link>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-brand-600 transition-colors -mr-2"
            title="View Store"
          >
            <ExternalLink size={20} />
          </a>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-8 max-w-3xl">
          {activeTab === 'overview' && (
            <OverviewTab
              store={store}
              productCount={productCount}
              limitReached={limitReached}
              leads={leads}
              storeUrl={storeUrl}
              copied={copied}
              copyLink={copyLink}
              navigateTo={navigateTo}
              setShowForm={setShowForm}
            />
          )}
          {activeTab === 'products' && (
            <ProductsTab
              productCount={productCount}
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
              handleFormName={handleFormName}
              handleFormPrice={handleFormPrice}
              handleFormDesc={handleFormDesc}
              handleSave={handleSave}
              resetForm={resetForm}
              startEdit={startEdit}
              handleDelete={handleDelete}
            />
          )}
          {activeTab === 'leads' && (
            <LeadsTab
              leadsLoading={leadsLoading}
              leads={leads}
            />
          )}
        </div>
      </main>
    </div>
  )
}