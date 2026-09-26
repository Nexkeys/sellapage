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

const shot = new URLSearchParams(window.location.search).get('shot')
const Shot = new URLSearchParams(window.location.search).get('preview') === 'dashboard' ? DashboardPreview : SHOTS[shot]

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
