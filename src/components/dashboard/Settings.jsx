import { useState, useEffect } from 'react'
import {
  Save, Loader2, UploadCloud, CheckCircle, AlertCircle,
  Trash2, X, Sparkles, ArrowRight, Check, Shield, Lock,
} from 'lucide-react'
import { FREE_PLAN_LIMIT } from '../../firebase/products'

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const THEME_COLORS = [
  { label: 'Green',  value: '#16a34a' },
  { label: 'Blue',   value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Rose',   value: '#e11d48' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Teal',   value: '#0d9488' },
]

const PLAN_INFO = {
  starter: {
    label:      'Starter (Free)',
    products:   '10 products',
    images:     '3 images / product',
    features:   ['Basic store page', 'WhatsApp order button', 'Lead capture form', 'Shareable store link'],
    upgradeLabel: 'Upgrade to Growth — ₦5,000/mo',
    upgradePlan:  'growth',
  },
  growth: {
    label:      'Growth',
    products:   '50 products',
    images:     '10 images / product',
    features:   ['Everything in Starter', 'Store logo & colours', 'Analytics & click tracking', 'Product on/off toggle', 'Priority WA support'],
    upgradeLabel: 'Upgrade to Pro — ₦12,000/mo',
    upgradePlan:  'pro',
  },
  pro: {
    label:    'Pro ✦',
    products: 'Unlimited products',
    images:   '50 images / product',
    features: ['Everything in Growth', 'Hot leads list', 'Top performing products', 'Better store insights', 'Pro store badge', 'Early access features'],
    upgradeLabel: null,
    upgradePlan:  null,
  },
}

export default function SettingsTab({
  store, plan, isGrowthOrPro, isPro,
  onSave, saveLoading, saveError, saveSuccess,
  onDeleteAccount, deleteLoading, deleteError, onClearDeleteError,
  onLogoUpload, logoUploading,
}) {
  const [form, setForm] = useState({
    businessName:   store?.businessName   || '',
    storeName:      store?.storeName      || '',
    whatsappNumber: store?.whatsappNumber || '',
    description:    store?.description    || '',
  })
  const [slugError, setSlugError]         = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep]       = useState(1)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter

  useEffect(() => {
    setForm({
      businessName:   store?.businessName   || '',
      storeName:      store?.storeName      || '',
      whatsappNumber: store?.whatsappNumber || '',
      description:    store?.description    || '',
    })
  }, [store?.businessName, store?.storeName, store?.whatsappNumber, store?.description])

  const handleSlugChange = e => {
    const val = e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(p => ({ ...p, storeName: val }))
    if (!val) setSlugError('Store URL slug is required.')
    else if (val.startsWith('-') || val.endsWith('-')) setSlugError('Cannot start or end with a hyphen.')
    else if (val.includes('--')) setSlugError('Cannot contain consecutive hyphens.')
    else setSlugError('')
  }

  const handleSubmit = () => {
    if (!form.businessName.trim() || !form.storeName.trim() || slugError) return
    onSave(form)
  }

  const handleDeleteClick = () => { onClearDeleteError(); setDeleteStep(1); setShowDeleteModal(true) }
  const closeModal        = () => { setShowDeleteModal(false); setDeleteStep(1) }
  const handleConfirmStep = () => { if (deleteStep === 1) setDeleteStep(2); else onDeleteAccount() }

  // Upgrade button — wires to Cloud Function when backend is ready
  const handleUpgrade = async (targetPlan) => {
    setUpgradeLoading(true)
    try {
      // TODO: replace with real Cloud Function call
      // const res = await fetch('/api/billing/initialize', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ storeId: store.id, plan: targetPlan }),
      // })
      // const { authorization_url } = await res.json()
      // window.location.href = authorization_url
      alert(`Paystack integration coming soon!\nPlan: ${targetPlan}`)
    } catch (err) {
      console.error('Upgrade failed', err)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handleThemeColor = async (color) => {
    if (!isGrowthOrPro) return
    try {
      await onSave({ ...form, themeColor: color })
    } catch (err) {
      console.error('Theme colour save failed', err)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your store and account preferences.</p>
      </div>

      {/* ── Store Info ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="font-bold text-gray-900 text-base">Store Information</h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Store Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow-sm">
              {store?.logoUrl
                ? <img src={store.logoUrl} alt="Store logo" className="w-16 h-16 object-cover" />
                : <span className="text-white text-xl font-bold">{getInitials(store?.businessName)}</span>
              }
            </div>
            <div className="flex-1">
              {isGrowthOrPro ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-fit">
                    {logoUploading
                      ? <><Loader2 size={14} className="animate-spin text-green-500" /> Uploading...</>
                      : <><UploadCloud size={14} className="text-green-500" /> Change Logo</>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && onLogoUpload(e.target.files[0])} disabled={logoUploading} />
                  </label>
                  <p className="text-gray-400 text-xs mt-1.5">PNG or JPG, max 5MB. Shown on your store page.</p>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-dashed border-gray-200 rounded-xl w-fit">
                  <Lock size={13} className="text-gray-400" />
                  <p className="text-gray-500 text-xs font-medium">Logo upload available on Growth+</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme colours — Growth/Pro only */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Store Colour
            {!isGrowthOrPro && <span className="ml-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Growth+</span>}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {THEME_COLORS.map(c => (
              <button
                key={c.value}
                disabled={!isGrowthOrPro}
                onClick={() => handleThemeColor(c.value)}
                title={c.label}
                className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                  !isGrowthOrPro ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
                } ${store?.themeColor === c.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c.value }}
              >
                {store?.themeColor === c.value && <Check size={12} className="text-white" strokeWidth={3} />}
              </button>
            ))}
            {!isGrowthOrPro && (
              <span className="text-xs text-gray-400 ml-1">Unlock on Growth plan</span>
            )}
          </div>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name</label>
          <input
            value={form.businessName}
            onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            placeholder="e.g. Bola's Boutique"
          />
        </div>

        {/* Store URL slug */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store URL</label>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-400/20 transition-all">
            <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap flex-shrink-0">
              {window.location.origin}/
            </span>
            <input
              value={form.storeName}
              onChange={handleSlugChange}
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
              placeholder="your-store"
            />
          </div>
          {slugError && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{slugError}</p>
          )}
          {!slugError && form.storeName && (
            <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1">
              <Check size={11} className="text-green-500" />
              {window.location.origin}/{form.storeName}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number</label>
          <input
            value={form.whatsappNumber}
            onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            placeholder="+234 801 234 5678"
          />
          <p className="text-gray-400 text-xs mt-1.5">Used for customer order messages on your store page.</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 resize-none transition-all"
            placeholder="Tell customers what your store is about..."
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
          <input
            value={store?.email || ''}
            readOnly
            className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
          />
          <p className="text-gray-400 text-xs mt-1.5">To change your email, please contact support.</p>
        </div>

        {/* Save */}
        {saveError   && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={14} />{saveError}</p>}
        {saveSuccess && <p className="text-green-600 text-sm flex items-center gap-2"><CheckCircle size={14} />{saveSuccess}</p>}

        <button
          onClick={handleSubmit}
          disabled={saveLoading || !!slugError}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all"
        >
          {saveLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Changes
        </button>
      </div>

      {/* ── Plan & Billing ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900 text-base">Plan & Billing</h2>

        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{planInfo.label}</p>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">CURRENT PLAN</span>
            </div>
            <div className="mt-2 space-y-1">
              {[planInfo.products, planInfo.images, ...planInfo.features].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Check size={11} className="text-green-500 flex-shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {planInfo.upgradeLabel && (
          <button
            onClick={() => handleUpgrade(planInfo.upgradePlan)}
            disabled={upgradeLoading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white py-3 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
          >
            {upgradeLoading
              ? <Loader2 size={15} className="animate-spin" />
              : <><Sparkles size={15} /> {planInfo.upgradeLabel}</>
            }
          </button>
        )}

        {isPro && (
          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm font-medium">
            <span>✦</span> You're on the Pro plan — enjoy all features!
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-gray-900 text-base">Danger Zone</h2>
        <p className="text-gray-500 text-sm">Permanently delete your store and all associated data.</p>
        <button
          onClick={handleDeleteClick}
          className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <Trash2 size={14} /> Delete Store
        </button>
        {deleteError && (
          <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={13} />{deleteError}</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                {deleteStep === 1 ? <Trash2 size={18} className="text-red-600" /> : <Shield size={18} className="text-red-600" />}
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            {deleteStep === 1 ? (
              <>
                <div>
                  <p className="font-bold text-gray-900 text-base">Delete your store?</p>
                  <p className="text-gray-500 text-sm mt-1">
                    This will permanently delete your store, all products, and all customer enquiry data. This cannot be undone.
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {['All products and images', 'All customer leads', 'Your store settings', 'Your store URL'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-red-600">
                      <X size={12} className="flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div>
                <p className="font-bold text-gray-900 text-base">Are you absolutely sure?</p>
                <p className="text-gray-500 text-sm mt-1">
                  You're about to delete <strong>{store?.businessName}</strong> and everything associated with it. This is the last step. There is no going back.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl text-sm font-bold transition-all">
                Cancel
              </button>
              <button
                onClick={handleConfirmStep}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                {deleteStep === 1 ? 'Continue' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
