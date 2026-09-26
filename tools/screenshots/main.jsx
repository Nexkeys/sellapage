// tools/screenshots/main.jsx
//
// Renders ONE real dashboard screen, chosen by ?shot=<slot>, filled with the
// sample store from data.js. shoot.mjs opens each shot in headless Chrome and
// saves the picture into media-src/<slot>/.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../../src/index.css'
import { STORE, DATA, API } from './data.js'

import CustomersTab from '../../src/components/dashboard/CustomersTab.jsx'
import DiscountsTab from '../../src/components/dashboard/DiscountsTab.jsx'
import DeliveryTab from '../../src/components/dashboard/DeliveryTab.jsx'
import AbandonedCheckoutsTab from '../../src/components/dashboard/AbandonedCheckoutsTab.jsx'
import LoyaltyTab from '../../src/components/dashboard/LoyaltyTab.jsx'
import ReviewsTab from '../../src/components/dashboard/ReviewsTab.jsx'
import AnalyticsTab from '../../src/components/dashboard/AnalyticsTab.jsx'
import ReceiptPreview from '../../src/components/receipts/ReceiptPreview.jsx'
import { recalcTotals } from '../../src/utils/receiptTemplates.js'
import DashboardLayout from '../../src/components/dashboard/DashboardLayout.jsx'
import OverviewTab from '../../src/components/dashboard/Overview.jsx'
import Celebration from '../../src/components/dashboard/ui/Celebration.jsx'
import ProductsTab from '../../src/components/dashboard/Products.jsx'
import ServicesTab from '../../src/components/dashboard/ServicesTab.jsx'
import { Timestamp } from './shims/firestore.js'
import BillingTab from '../../src/components/dashboard/BillingTab.jsx'
import { PaymentSuccessModal, PaymentProblemModal, RetentionModal } from '../../src/components/dashboard/billing/PlanMoments.jsx'
import BrandLoader from '../../src/components/BrandLoader.jsx'
import OnlineStoreTab from '../../src/components/dashboard/OnlineStoreTab.jsx'

// Every /api call is answered from data.js. Anything unknown gets an empty
// success rather than a network request: the sandbox never goes online.
window.fetch = async (input) => {
  const url = typeof input === 'string' ? input : input.url
  const pathname = new URL(url, window.location.origin).pathname
  const body = API[pathname] ?? { success: true }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const user = { uid: 'demo', email: 'ada@adaskincare.ng', getIdToken: async () => 'demo-token' }
const noop = () => {}
const products = DATA['stores/demo/products']
const orders = DATA['stores/demo/orders']

// A receipt as a vendor would issue it after a WhatsApp order, built with the
// app's own totals helper so the arithmetic on it is the app's, not ours.
const receiptDraft = recalcTotals({
  vendorName: STORE.businessName,
  vendorPhone: '0803 123 4567',
  vendorAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
  customerName: 'Chioma Okafor',
  customerPhone: '0803 123 4501',
  customerEmail: 'chioma.okafor@gmail.com',
  items: [
    { label: 'Vitamin C Brightening Serum', qty: 1, unitPrice: 18500 },
    { label: 'SPF 50 Daily Sunscreen', qty: 1, unitPrice: 15000 },
    { label: 'Delivery to Lekki', qty: 1, unitPrice: 2500 },
  ],
  discount: 0,
  tax: 0,
  amountPaid: 36000,
  paymentMethod: 'Bank Transfer',
  status: 'Paid',
  notes: 'Thank you for shopping with Ada Skincare. Store away from direct sunlight.',
  date: new Date().toISOString().split('T')[0],
  receiptNumber: 'ADA-0142',
  templateId: 'template-1',
  primaryColor: '#16a34a',
  secondaryColor: '#0f172a',
  fontFamily: 'Helvetica',
  stampType: null, stampUrl: null, stampLabel: null, stampColor: null, stampPosition: 'bottom-right',
  qrCodeEnabled: false, qrCodeUrl: null, qrCodePosition: 'bottom-left',
  logoUrl: null, logoPosition: 'top-center',
})

const SHOTS = {
  'feature-receipts': () => (
    <ReceiptPreview draft={receiptDraft} savedReceipt={null} onSave={noop} saving={false}
      canPng whiteLabel={false} isEditing={false} />
  ),
  'feature-customers': () => <CustomersTab store={STORE} isPro navigateTo={noop} />,
  'feature-discounts': () => <DiscountsTab store={STORE} isPro navigateTo={noop} />,
  'feature-delivery': () => (
    <DeliveryTab store={STORE} user={user} isPro orders={orders} onSave={noop}
      saveLoading={false} saveError="" saveSuccess={false} onDeliveryZonesUpdate={noop} />
  ),
  'feature-abandoned': () => <AbandonedCheckoutsTab store={STORE} user={user} isPremium navigateTo={noop} />,
  'feature-loyalty': () => <LoyaltyTab store={STORE} user={user} isPremium navigateTo={noop} />,
  'feature-reviews': () => <ReviewsTab store={STORE} orders={orders} isPro navigateTo={noop} />,
  'feature-analytics': () => (
    <AnalyticsTab storeId="demo" products={products} services={[]} vendorType="products"
      isGrowthOrPro isPro navigateTo={noop}
      analyticsData={{ totalViews: 3840, totalClicks: 1612, productClicks: 1612, serviceClicks: 0,
        totalOrders: orders.length, totalBookings: 0, totalBookingRequests: 0, salesStatus: 'ok' }} />
  ),
}

// ?preview=dashboard[&plan=starter|growth|pro|premium][&empty=1]: the whole
// dashboard home inside its shell, for checking the layout by eye at phone
// and desktop widths. Not a shot: shoot.mjs never saves it.
function DashboardPreview() {
  const params = new URLSearchParams(window.location.search)
  const plan = params.get('plan') || 'premium'
  const empty = params.get('empty') === '1'
  const flags = {
    starter: [false, false, false], growth: [true, false, false], pro: [true, true, false], premium: [true, true, true],
  }[plan] || [true, true, true]
  const store = {
    ...STORE, plan, hasGrowthFeatures: flags[0], hasProFeatures: flags[1], hasPremiumFeatures: flags[2],
    email: 'ada@adaskincare.ng', logoUrl: params.get('logo') === '0' ? '' : STORE.logoUrl,
  }
  const [tab, setTab] = React.useState('overview')
  const [open, setOpen] = React.useState(false)
  const list = empty ? [] : products
  const leadRows = empty ? [] : DATA.leads
  return (
    <DashboardLayout store={store} activeTab={tab} setActiveTab={setTab} sidebarOpen={open} setSidebarOpen={setOpen}
      storeUrl="https://sellapage.com/adaskincare" isGrowthOrPro={flags[0]} isPro={flags[1]} vendorType="products">
      <OverviewTab store={store} plan={plan} maxProducts={plan === 'starter' ? 10 : 999999} productCount={list.length}
        serviceCount={0} services={[]} vendorType="products" limitReached={false} isGrowthOrPro={flags[0]} isPro={flags[1]}
        leads={leadRows} products={list} storeUrl="https://sellapage.com/adaskincare" copied={false} copyLink={noop}
        navigateTo={setTab} setShowForm={noop} setShowServiceForm={noop} onOpenSetupGuide={noop}
        analyticsData={{ totalViews: empty ? 0 : 3840, totalOrders: empty ? 0 : orders.length, totalBookings: 0, salesStatus: 'ready' }} />
      {params.get('celebrate') === '1' && (
        <Celebration open kind="product" name="Vitamin C Brightening Serum" storeUrl="https://sellapage.com/adaskincare"
          onClose={noop} onGoToBusinessPage={noop} onAddAnother={noop} />
      )}
    </DashboardLayout>
  )
}

// ?preview=products|services[&empty=1][&form=1][&plan=...]: the Products or
// Services tab in its shell, with working local state, for checking by eye.
function ListingsPreview() {
  const params = new URLSearchParams(window.location.search)
  const isService = params.get('preview') === 'services'
  const plan = params.get('plan') || 'growth'
  const store = { ...STORE, plan, hasGrowthFeatures: plan !== 'starter', hasProFeatures: plan === 'pro' || plan === 'premium', hasPremiumFeatures: plan === 'premium', email: 'ada@adaskincare.ng' }
  const sampleServices = [
    { id: 's1', name: 'Bridal Makeup (Home Service)', price: 85000, category: 'Makeup', duration: 'Half day', locationType: 'physical', description: 'Full glam for the bride.', bookingRequests: 12, createdAt: products[0].createdAt },
    { id: 's2', name: 'Skincare Consultation', price: 15000, category: 'Consultations', duration: '45 mins', locationType: 'virtual', description: 'A video call to plan your routine.', bookingRequests: 4, createdAt: products[1].createdAt },
    { id: 's3', name: 'Facial and Glow Treatment', price: 25000, category: 'Spa', duration: '1 hour', locationType: 'physical', isActive: false, createdAt: products[2].createdAt },
  ]
  const [items, setItems] = React.useState(params.get('empty') === '1' ? [] : isService ? sampleServices : products.map((p, i) => ({ ...p, stock: [40, 3, 0, 22, 12, null][i], description: i % 2 ? 'Gentle, everyday formula.' : '' })))
  const [showForm, setShowForm] = React.useState(params.get('form') === '1')
  const blank = isService
    ? { name: '', price: '', description: '', category: '', duration: '', locationType: 'physical', bookingNote: '', imageFiles: [], imagePreviews: [], imageUrls: [] }
    : { name: '', price: '', description: '', category: '', stock: '', type: 'physical', imageFiles: [], imagePreviews: [], imageUrls: [], variations: [] }
  const [form, setForm] = React.useState(blank)
  const [editing, setEditing] = React.useState(null)
  const [tab, setTab] = React.useState(isService ? 'services' : 'products')
  const [open, setOpen] = React.useState(false)
  const reset = () => { setForm(blank); setEditing(null); setShowForm(false) }
  const common = {
    plan, maxImagesPerProduct: plan === 'starter' ? 3 : 10, isGrowthOrPro: plan !== 'starter', isPremium: plan === 'premium',
    limitReached: false, showForm, setShowForm, form, setForm, formError: '', saving: false, loading: params.get('loading') === '1',
    deleting: null, handleImageChange: noop, handleRemoveExistingImage: noop, handleRemoveNewImage: noop,
    onGenerateDescription: noop, generatingDesc: false, aiDescError: '',
    handleSave: async () => { const it = { ...form, id: `n${Date.now()}`, createdAt: Timestamp.now() }; setItems((l) => [it, ...l]); reset(); return it },
    resetForm: reset, startEdit: (it) => { setEditing(it); setForm({ ...blank, ...it, imageFiles: [], imagePreviews: [] }); setShowForm(true) },
    handleDelete: async (id) => setItems((l) => l.filter((x) => x.id !== id)), handleDeleteMany: async (ids) => setItems((l) => l.filter((x) => !ids.includes(x.id))),
    onToggleActive: (it) => setItems((l) => l.map((x) => (x.id === it.id ? { ...x, isActive: x.isActive === false } : x))),
    storeId: 'demo', storeUrl: 'https://sellapage.com/adaskincare', navigateTo: setTab,
  }
  return (
    <DashboardLayout store={store} activeTab={tab} setActiveTab={setTab} sidebarOpen={open} setSidebarOpen={setOpen}
      storeUrl="https://sellapage.com/adaskincare" isGrowthOrPro={plan !== 'starter'} isPro={common.isPremium || plan === 'pro'} vendorType="both">
      {isService
        ? <ServicesTab {...common} serviceCount={items.length} maxServices={plan === 'starter' ? 10 : 999999} editingService={editing} services={items} />
        : <ProductsTab {...common} productCount={items.length} maxProducts={plan === 'starter' ? 10 : 999999} editingProduct={editing} products={items} customCategories={[]} onSaveCustomCategory={async () => 'x'} />}
    </DashboardLayout>
  )
}

// ?preview=billing[&plan=growth|starter][&status=active|grace|expired][&left=hours][&moment=success|failed|cancelled|pending|retain|downgraded]
function BillingPreview() {
  const params = new URLSearchParams(window.location.search)
  const plan = params.get('plan') || 'growth'
  const status = params.get('status') || 'active'
  const hoursLeft = Number(params.get('left') || 27 * 24 + 14.5)
  const end = Timestamp.fromMillis(Date.now() + hoursLeft * 3600 * 1000)
  const store = { ...STORE, plan: status === 'expired' ? 'starter' : plan, planStatus: status, billingPeriod: 'monthly', email: 'ada@adaskincare.ng',
    hasGrowthFeatures: plan !== 'starter', hasProFeatures: ['pro', 'premium'].includes(plan), hasPremiumFeatures: plan === 'premium',
    planEndDate: plan === 'starter' && status !== 'expired' ? null : end, graceUntil: status === 'expired' ? Timestamp.fromMillis(Date.now() - 20 * 3600 * 1000) : Timestamp.fromMillis(end.toMillis() + 2 * 864e5) }
  const [tab, setTab] = React.useState('billing')
  const [open, setOpen] = React.useState(false)
  const moment = params.get('moment')
  return (
    <DashboardLayout store={store} activeTab={tab} setActiveTab={setTab} sidebarOpen={open} setSidebarOpen={setOpen}
      storeUrl="https://sellapage.com/adaskincare" isGrowthOrPro={plan !== 'starter'} isPro={false} vendorType="products">
      <BillingTab store={store} plan={store.plan} planStatus={status} isPro={['pro', 'premium'].includes(store.plan)} isPremium={store.plan === 'premium'}
        onUpgrade={noop} upgradeLoading="" upgradeError="" navigateTo={setTab} initialView={params.get('view') || 'plan'} />
      <PaymentSuccessModal open={moment === 'success'} plan="growth" period="monthly" onClose={noop} onViewHistory={noop} />
      <PaymentProblemModal open={['failed', 'cancelled', 'pending'].includes(moment)} kind={moment} plan="growth" reason={moment === 'failed' ? 'Insufficient Funds' : ''} onRetry={noop} onMessage={noop} onClose={noop} />
      <RetentionModal open={moment === 'retain' || moment === 'downgraded'} mode={moment === 'retain' ? 'expiring' : 'downgraded'} plan="growth"
        endsAt={Date.now() + 14 * 3600 * 1000 + 32 * 60 * 1000} since={new Date(Date.now() - 864e5)} onRenew={noop} onClose={noop} />
    </DashboardLayout>
  )
}

// ?preview=business[&plan=starter|growth|pro][&qr=1][&sub=theme][&nudge=1]
function BusinessPreview() {
  const params = new URLSearchParams(window.location.search)
  const plan = params.get('plan') || 'pro'
  const [store, setStore] = React.useState(() => ({
    ...STORE, plan, email: 'ada@adaskincare.ng', logoUrl: '', themeColor: '#16a34a', storeLayout: 'grid',
    hasGrowthFeatures: plan !== 'starter', hasProFeatures: ['pro', 'premium'].includes(plan), hasPremiumFeatures: plan === 'premium',
    qrCode: params.get('qr') === '1' ? { url: 'https://sellapage.com/adaskincare', createdAt: new Date().toISOString() } : null,
  }))
  const [tab, setTab] = React.useState('online-store')
  const [open, setOpen] = React.useState(false)
  const save = async (fields) => setStore((s) => ({ ...s, ...fields }))
  return (
    <DashboardLayout store={store} activeTab={tab} setActiveTab={setTab} sidebarOpen={open} setSidebarOpen={setOpen}
      storeUrl="https://sellapage.com/adaskincare" isGrowthOrPro={plan !== 'starter'} isPro={['pro', 'premium'].includes(plan)} vendorType="products">
      <OnlineStoreTab store={store} storeUrl="https://sellapage.com/adaskincare" isGrowthOrPro={plan !== 'starter'} isPro={['pro', 'premium'].includes(plan)}
        navigateTo={setTab} onLogoUpload={noop} logoError="" onColorSave={(c) => save({ themeColor: c })} onLayoutSave={(l) => save({ storeLayout: l })}
        onThemeSave={(id, meta) => save({ storeTheme: id, themeMetadata: meta })} onStoreSave={save} previewProducts={products.slice(0, 4)} />
    </DashboardLayout>
  )
}

const shot = new URLSearchParams(window.location.search).get('shot')
const previewKind = new URLSearchParams(window.location.search).get('preview')
const Shot = previewKind === 'business' ? BusinessPreview : previewKind === 'loader' ? () => <BrandLoader /> : previewKind === 'billing' ? BillingPreview : previewKind === 'dashboard' ? DashboardPreview : (previewKind === 'products' || previewKind === 'services') ? ListingsPreview : SHOTS[shot]

ReactDOM.createRoot(document.getElementById('root')).render(
  <MemoryRouter>
    {/* The dashboard's own content background, so each shot looks like it
        was taken inside the product rather than cut out of it. */}
    <div style={{ background: '#f9fafb', minHeight: '100vh', paddingTop: 8 }} data-shot-ready="1">
      {Shot ? <Shot /> : <p style={{ padding: 24 }}>Unknown shot: {String(shot)}. Known: {Object.keys(SHOTS).join(', ')}</p>}
    </div>
  </MemoryRouter>,
)

window.__SHOTS__ = Object.keys(SHOTS)
