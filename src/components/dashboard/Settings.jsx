//src/components/dashboard/Settings.jsx/
import { useState, useEffect } from 'react'
import {
  Save, Loader2, UploadCloud, CheckCircle, AlertCircle,
  Trash2, X, Sparkles, ArrowRight, Check, Shield, Lock,
} from 'lucide-react'
import { FREE_PLAN_LIMIT } from '../../firebase/products'
import { PLAN_PRICES, formatPrice } from '../../utils/billingPlans'


const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}


// Theme colors removed (now in OnlineStoreTab)


const PLAN_INFO = {
  free: {
    label: 'Starter (Free)',
    products: '15 listings',
    images: '3 images / listing',
    features: ['Commerce page', 'WhatsApp order button', 'Lead capture form', 'Shareable business link', 'Offer & Name Lab', 'Policy Generator'],
    upgradeLabel: `Upgrade to Growth - ${formatPrice(PLAN_PRICES.growth.monthly)}/mo`,
    upgradePlan: 'growth',
  },
  starter: {
    label: 'Starter (Free)',
    products: '15 listings',
    images: '3 images / listing',
    features: ['Commerce page', 'WhatsApp order button', 'Lead capture form', 'Shareable business link', 'Offer & Name Lab', 'Policy Generator'],
    upgradeLabel: `Upgrade to Growth - ${formatPrice(PLAN_PRICES.growth.monthly)}/mo`,
    upgradePlan: 'growth',
  },
  growth: {
    label: 'Growth',
    products: '50 listings',
    images: '10 images / listing',
    features: ['Everything in Starter', 'Logo and brand colours', 'Analytics and click tracking', 'Offer visibility toggle', 'Priority WhatsApp support'],
    upgradeLabel: `Upgrade to Pro - ${formatPrice(PLAN_PRICES.pro.monthly)}/mo`,
    upgradePlan: 'pro',
  },
  pro: {
    label: 'Pro',
    products: 'Unlimited listings',
    images: '50 images / listing',
    features: ['Everything in Growth', 'Hot leads list', 'Top performing offers', 'Better commerce insights', 'Pro badge', 'Early access features'],
    upgradeLabel: null,
    upgradePlan: null,
  },
  premium: {
    label: 'Premium',
    products: 'Unlimited listings',
    images: '50 images / listing',
    features: ['Everything in Pro', 'White-label customer experience', 'WhatsApp Business automation', 'Broadcast and loyalty tools', 'Staff access controls', 'Advanced integrations'],
    upgradeLabel: null,
    upgradePlan: null,
  },
}


export default function SettingsTab({
  store, plan, isGrowthOrPro, isPro, isPremium,
  onSave, saveLoading, saveError, saveSuccess,
  onDeleteAccount, deleteLoading, deleteError, onClearDeleteError,
  onLogoUpload, logoUploading,
  onWhatsAppToggle,
}) {
  const hasCustomDomain = !!store?.customDomain
  const [form, setForm] = useState({
    businessName: store?.businessName || '',
    storeName: store?.storeName || '',
    whatsappNumber: store?.whatsappNumber || '',
    showWhatsApp: store?.showWhatsApp !== false,
    description: store?.description || '',
    vendorType: store?.vendorType || 'products',
  })
  const [slugError, setSlugError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [upgradeLoading, setUpgradeLoading] = useState('')
  const [upgradeError, setUpgradeError] = useState('')


  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter


  useEffect(() => {
    setForm({
      businessName: store?.businessName || '',
      storeName: store?.storeName || '',
      whatsappNumber: store?.whatsappNumber || '',
      showWhatsApp: store?.showWhatsApp !== false,
      description: store?.description || '',
      vendorType: store?.vendorType || 'products',
    })
  }, [store?.businessName, store?.storeName, store?.whatsappNumber, store?.showWhatsApp, store?.description, store?.vendorType])


  const handleSlugChange = e => {
    const val = e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(p => ({ ...p, storeName: val }))
    if (!val) setSlugError('Business link slug is required.')
    else if (val.startsWith('-') || val.endsWith('-')) setSlugError('Cannot start or end with a hyphen.')
    else if (val.includes('--')) setSlugError('Cannot contain consecutive hyphens.')
    else setSlugError('')
  }


  const handleSubmit = () => {
    if (!form.businessName.trim() || !form.storeName.trim() || slugError) return
    onSave(form)
  }


  const handleDeleteClick = () => { onClearDeleteError(); setDeleteStep(1); setDeletePassword(''); setShowDeleteModal(true) }
  const closeModal = () => { setShowDeleteModal(false); setDeleteStep(1); setDeletePassword('') }
  const handleConfirmStep = () => {
    if (deleteStep === 1) {
      setDeleteStep(2);
    } else {
      if (!deletePassword.trim()) return;
      onDeleteAccount(deletePassword);
    }
  }


  const handleUpgrade = async (targetPlan) => {
    setUpgradeError('')
    setUpgradeLoading(targetPlan)
    try {
      const res = await fetch('/api/billing-initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, plan: targetPlan }),
      })
      const data = await res.json()
      if (!res.ok || !data.authorization_url) {
        throw new Error('No authorization URL returned')
      }
      window.location.href = data.authorization_url
    } catch (err) {
      console.error('Upgrade failed', err)
      setUpgradeError('Something went wrong. Please try again or contact support.')
    } finally {
      setUpgradeLoading('')
    }
  }


  return (
    <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-xs mt-0.5">Manage your business page and account preferences.</p>
      </div>


      {/* ── Store Info ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm">Business Information</h2>


        {/* Logo */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">Business Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-600 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
              {store?.logoUrl
                ? <img src={store.logoUrl} alt="Store logo" className="w-14 h-14 object-cover" />
                : <span className="text-white text-base font-bold">{getInitials(store?.businessName)}</span>
              }
            </div>
            <div className="flex-1">
              {isGrowthOrPro ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-fit">
                    {logoUploading
                      ? <><Loader2 size={14} className="animate-spin text-green-500" /> Uploading...</>
                      : <><UploadCloud size={14} className="text-green-500" /> Change Logo</>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && onLogoUpload(e.target.files[0])} disabled={logoUploading} />
                  </label>
                  <p className="text-gray-400 text-xs mt-1.5">PNG or JPG, max 5MB. Shown on your public commerce page.</p>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-dashed border-gray-200 rounded-xl w-fit">
                  <Lock size={13} className="text-gray-400" />
                  <p className="text-gray-500 text-xs font-medium">Logo upload available on Growth+</p>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Business Type */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">What do you sell/offer?</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'products', label: 'Physical/Digital Products' },
              { id: 'services', label: 'Bookable Services' },
              { id: 'both', label: 'Both' },
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setForm(p => ({ ...p, vendorType: type.id }))}
                className={`py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${form.vendorType === type.id
                    ? 'border-green-500 bg-green-50/50 text-green-700'
                    : 'border-gray-100 hover:border-gray-200 text-gray-600 bg-white'
                  }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>


        {/* Business Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Business Name</label>
          <input
            value={form.businessName}
            onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="e.g. Bola's Boutique"
          />
        </div>


        {/* Store URL slug */}
        {hasCustomDomain && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 mb-1.5">
            <Lock size={12} className="text-amber-600" />
            <p className="text-[11px] text-amber-700">
              Your slug is locked while a custom domain is active. Remove it in <strong>Custom Domain</strong> settings to edit.
            </p>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Business Link</label>
          <div className={`flex items-center border rounded-xl overflow-hidden transition-all ${
            hasCustomDomain
              ? 'border-gray-200 opacity-60'
              : 'border-gray-200 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-400/20'
          }`}>
            <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-xs border-r border-gray-200 whitespace-nowrap flex-shrink-0">
              {hasCustomDomain ? `https://${store.customDomain}/` : `${window.location.origin}/`}
            </span>
            <input
              value={form.storeName}
              onChange={handleSlugChange}
              disabled={hasCustomDomain}
              readOnly={hasCustomDomain}
              className="flex-1 px-3 py-2.5 text-xs outline-none bg-white disabled:cursor-not-allowed"
              placeholder="your-store"
            />
          </div>
          {slugError && !hasCustomDomain && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={11} />{slugError}</p>
          )}
          {!hasCustomDomain && !slugError && form.storeName && (
            <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1">
              <Check size={11} className="text-green-500" />
              {window.location.origin}/{form.storeName}
            </p>
          )}
          {hasCustomDomain && (
            <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1">
              <Lock size={11} className="text-gray-400" />
              Your live URL uses your custom domain
            </p>
          )}
        </div>


        {/* WhatsApp */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp Number</label>
          <input
            value={form.whatsappNumber}
            onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="+234 801 234 5678"
          />
          <p className="text-gray-400 text-xs mt-1.5">Used for customer order and booking messages from your public page.</p>
        </div>

        {/* Show WhatsApp Toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-bold text-gray-700">Show Chat button on store page</p>
            <p className="text-gray-400 text-xs mt-0.5">Visitors will see a "Chat on WhatsApp" button</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const newVal = !form.showWhatsApp
              setForm(p => ({ ...p, showWhatsApp: newVal }))
              if (onWhatsAppToggle) onWhatsAppToggle(newVal)
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.showWhatsApp ? 'bg-green-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.showWhatsApp ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>


        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Business Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none transition-all"
            placeholder="Tell customers what your store is about..."
          />
        </div>


        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
          <input
            value={store?.email || ''}
            readOnly
            className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-xs text-gray-400 bg-gray-50 cursor-not-allowed"
          />
          <p className="text-gray-400 text-xs mt-1.5">To change your email, please contact support.</p>
        </div>


        {/* Save */}
        {saveError && <p className="text-red-500 text-sm flex items-center gap-2"><AlertCircle size={14} />{saveError}</p>}
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
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="font-bold text-gray-900 text-sm">Plan & Billing</h2>


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


        {(plan === 'starter' || plan === 'free') && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleUpgrade('growth')}
              disabled={upgradeLoading === 'growth'}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {upgradeLoading === 'growth'
                ? <Loader2 size={15} className="animate-spin" />
                : <><Sparkles size={15} /> Upgrade to Growth - {formatPrice(PLAN_PRICES.growth.monthly)}/mo</>
              }
            </button>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={upgradeLoading === 'pro'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {upgradeLoading === 'pro'
                ? <Loader2 size={15} className="animate-spin" />
                : <><Sparkles size={15} /> Upgrade to Pro - {formatPrice(PLAN_PRICES.pro.monthly)}/mo</>
              }
            </button>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={upgradeLoading === 'premium'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {upgradeLoading === 'premium'
                ? <Loader2 size={15} className="animate-spin" />
                : <><Sparkles size={15} /> Upgrade to Premium - {formatPrice(PLAN_PRICES.premium.monthly)}/mo</>
              }
            </button>
          </div>
        )}

        {plan === 'growth' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={upgradeLoading === 'pro'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {upgradeLoading === 'pro'
                ? <Loader2 size={15} className="animate-spin" />
                : <><Sparkles size={15} /> Upgrade to Pro - {formatPrice(PLAN_PRICES.pro.monthly)}/mo</>
              }
            </button>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={upgradeLoading === 'premium'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {upgradeLoading === 'premium'
                ? <Loader2 size={15} className="animate-spin" />
                : <><Sparkles size={15} /> Upgrade to Premium - {formatPrice(PLAN_PRICES.premium.monthly)}/mo</>
              }
            </button>
          </div>
        )}

        {plan === 'pro' && (
          <button
            onClick={() => handleUpgrade('premium')}
            disabled={upgradeLoading === 'premium'}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
          >
            {upgradeLoading === 'premium'
              ? <Loader2 size={15} className="animate-spin" />
              : <><Sparkles size={15} /> Upgrade to Premium - {formatPrice(PLAN_PRICES.premium.monthly)}/mo</>
            }
          </button>
        )}

        {upgradeError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle size={14} className="shrink-0" />
            {upgradeError}
          </p>
        )}


        {isPro && !isPremium && (
          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-xs font-medium">
            <span>✦</span> You're on the Pro plan - enjoy all features!
          </div>
        )}

        {isPremium && (
          <div className="flex items-center gap-2 text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-xs font-medium">
            <span>👑</span> You're on the Premium plan - enjoy ultimate scale & automation!
          </div>
        )}
      </div>


      {/* ── Danger Zone ── */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 space-y-3">
        <h2 className="font-bold text-gray-900 text-sm">Danger Zone</h2>
        <p className="text-gray-500 text-xs">Permanently delete your business page and all associated data.</p>
        <button
          onClick={handleDeleteClick}
          className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <Trash2 size={14} /> Delete Business Page
        </button>
        {deleteError && (
          <p className="text-red-500 text-xs flex items-center gap-2"><AlertCircle size={13} />{deleteError}</p>
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
                  <p className="font-bold text-gray-900 text-base">Delete your business page?</p>
                  <p className="text-gray-500 text-sm mt-1">
                    This will permanently delete your business page, all listings, and all customer enquiry data. This cannot be undone.
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {['All listings and images', 'All customer leads', 'Your page settings', 'Your business link'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-red-600">
                      <X size={12} className="flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="space-y-4">
                <p className="font-bold text-gray-900 text-base">Are you absolutely sure?</p>
                <p className="text-gray-500 text-sm mt-1">
                  You're about to delete <strong>{store?.businessName}</strong> and everything associated with it. This is the last step. There is no going back.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enter your password to confirm</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all"
                    placeholder="Your account password"
                    autoComplete="current-password"
                  />
                </div>
                {deleteError && (
                  <p className="text-red-500 text-sm flex items-center gap-2">
                    <AlertCircle size={13} />
                    {deleteError}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-xl text-sm font-bold transition-all">
                Cancel
              </button>
              <button
                onClick={handleConfirmStep}
                disabled={deleteLoading || (deleteStep === 2 && !deletePassword.trim())}
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
