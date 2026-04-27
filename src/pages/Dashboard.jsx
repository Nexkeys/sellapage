import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, LogOut, Store, Package,
  Copy, Check, UploadCloud, X, Loader2,
  ExternalLink, LayoutDashboard, Settings
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { logoutSeller } from '../firebase/auth'
import { addProduct, getProducts, deleteProduct, updateProduct } from '../firebase/products'

const EMPTY_FORM = {
  name: '', price: '', description: '',
  imageFile: null, imagePreview: null, imageUrl: ''
}

export default function Dashboard() {
  const { store }  = useAuth()
  const navigate   = useNavigate()

  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [copied, setCopied]             = useState(false)
  const [showForm, setShowForm]         = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleting, setDeleting]         = useState(null)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')
  const [form, setForm]                 = useState(EMPTY_FORM)

  const storeUrl = store ? `${window.location.origin}/${store.storeName}` : ''

  useEffect(() => {
    if (store?.id) fetchProducts()
  }, [store])

  const fetchProducts = async () => {
    try {
      const data = await getProducts(store.id)
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
      name:        product.name,
      price:       product.price,
      description: product.description || '',
      imageFile:   null,
      imagePreview: null,
      imageUrl:    product.imageUrl || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be under 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () =>
      setForm(p => ({ ...p, imageFile: file, imagePreview: reader.result }))
    reader.readAsDataURL(file)
    setFormError('')
  }

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
      imageUrl:    form.imageUrl,
    }

    try {
      if (editingProduct) {
        const updated = await updateProduct(store.id, editingProduct.id, productData, form.imageFile)
        setProducts(p => p.map(prod => prod.id === editingProduct.id ? { ...prod, ...updated } : prod))
      } else {
        const newProd = await addProduct(store.id, productData, form.imageFile)
        setProducts(p => [newProd, ...p])
      }
      resetForm()
    } catch (err) {
      console.error(err)
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      await deleteProduct(store.id, product.id, product.imageUrl)
      setProducts(p => p.filter(prod => prod.id !== product.id))
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar (desktop) ─────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 z-30">
        <div className="p-5 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-brand-600 transition-colors">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-gray-900 text-xl">Sellapage</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 text-brand-700 rounded-xl">
            <LayoutDashboard size={18} />
            <span className="text-sm font-semibold">Dashboard</span>
          </div>

          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors group"
          >
            <Store size={18} />
            <span className="text-sm font-medium">View My Store</span>
            <ExternalLink size={14} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
          </a>

          <div className="flex items-center gap-3 px-3 py-2.5 text-gray-300 rounded-xl cursor-not-allowed">
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
            <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Soon</span>
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
      </aside>

      {/* ── Main Content ──────────────────────────── */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 max-w-4xl">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-gray-900">Sellapage</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
              <ExternalLink size={18} />
            </a>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900">
            Welcome back 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {store?.businessName} — manage your products and share your store link below.
          </p>
        </div>

        {/* Store link card */}
        <div className="bg-gradient-to-r from-brand-500 to-emerald-600 rounded-2xl p-5 md:p-6 mb-8 text-white">
          <p className="text-brand-100 text-xs font-semibold uppercase tracking-widest mb-2">Your Store Link</p>
          <p className="font-display font-bold text-base md:text-lg break-all mb-3">{storeUrl}</p>
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
            Share this link on WhatsApp status, Instagram bio, or anywhere your customers see you.
          </p>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-gray-900 text-xl">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                <div className="flex items-start gap-4">
                  {(form.imagePreview || form.imageUrl) && (
                    <img
                      src={form.imagePreview || form.imageUrl}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                    />
                  )}
                  <label className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all text-center">
                    <UploadCloud size={24} className="text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Click to upload image</p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
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
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
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
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="E.g. Available in S, M, L. Pure cotton fabric. Colours: red, blue, black."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {formError && <p className="text-red-500 text-sm">{formError}</p>}

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
                  ) : (
                    editingProduct ? 'Update Product' : 'Add Product'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-gray-900 text-xl">My Products</h2>
              <p className="text-gray-400 text-sm">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
              >
                <Plus size={18} />
                Add Product
              </button>
            )}
          </div>

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
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={22} className="text-gray-300" />
                    </div>
                  )}

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
                      title="Edit product"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      disabled={deleting === product.id}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-40"
                      title="Delete product"
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
      </main>
    </div>
  )
}