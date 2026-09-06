// src/api-handlers/_lib/ai-schema.js
// The tab registry Sella reads the dashboard through.
// See Docs/Sella-AI-Rework-Plan.md Part C.
//
// WHY A REGISTRY INSTEAD OF ONE TOOL PER TAB
// The original plan listed a hand-written tool per tab. There were 23 tabs when
// it was written; there are 30 now. Seven appeared in the time it took to write
// the plan, so per-tab tools were guaranteed to rot into silent blind spots.
// Here, ONE entry per tab drives a handful of generic tools. Adding a tab next
// year means adding an entry - no new tool, no prompt surgery.
//
// It also encodes MEANING, not just access. A tool says "you can edit stock".
// A field description says "stock 0 hides the buy button" - which is the
// difference between an assistant that can change a number and one that
// understands the consequence.
//
// TOKEN COST: 30 tool definitions would ride in the prompt on EVERY message.
// The registry is summarised cheaply (tab ids + one line each) and only the
// requested tab's field detail is expanded, so cost stays roughly flat as tabs
// grow.
//
// ADDING A TAB: append an entry. If it should never be AI-writable, also add
// its id to AI_NEVER_WRITE. Nothing else changes.

/**
 * Tabs the AI must NEVER write to, regardless of vendor toggles or role.
 * Mirrors OWNER_ONLY_TABS in src/utils/staffRoles.js: money movement, bank
 * details, staff management and account-level destruction.
 */
export const AI_NEVER_WRITE = new Set([
  'billing',
  'payouts',
  'team',
  'settings-security',
  'account-deletion',
  'referral-program', // the owner's own commission balance and withdrawals
])

/** Where a tab's data lives. `sub` = subcollection of stores/{storeId}. */
const SUB = (name) => ({ kind: 'sub', name })
/** Top-level collection filtered by a field equal to the storeId. */
const TOP = (name, field) => ({ kind: 'top', name, field })
/** Fields living directly on the stores/{storeId} document. */
const STORE_DOC = { kind: 'storeDoc' }

export const TAB_SCHEMA = {
  // ---------------------------------------------------------------- COMMERCE
  overview: {
    label: 'Dashboard', source: STORE_DOC, writable: false,
    summary: 'Headline metrics: listings, leads, store views, engagement.',
  },
  products: {
    label: 'Products', source: SUB('products'), writable: true,
    summary: 'Physical/digital products sold on the storefront.',
    fields: {
      name: 'Product name shown to customers',
      price: 'Price in naira. Customer-visible; changing it changes checkout',
      stock: 'Units available. 0 hides the buy button',
      isActive: 'False removes it from the public storefront entirely',
      category: 'Category slug used for storefront filtering',
      description: 'Sales copy shown on the product page',
    },
  },
  services: {
    label: 'Services', source: SUB('services'), writable: true,
    summary: 'Bookable services with duration and location type.',
    fields: {
      name: 'Service name', price: 'Price in naira',
      duration: 'How long the service takes',
      locationType: 'Where it happens (in person, online, customer location)',
      isActive: 'False hides it from the storefront',
      bookingRequests: 'Count of booking requests received',
    },
  },
  categories: {
    label: 'Categories', source: SUB('categories'), writable: true,
    summary: 'Custom product categories for storefront grouping.',
    fields: { name: 'Category name shown in storefront filters' },
  },
  ledger: {
    label: 'Ledger', source: SUB('ledger'), writable: true,
    summary: 'Manually logged offline/WhatsApp sales. Free on all plans.',
    fields: {
      customerName: 'Who bought', itemName: 'What they bought',
      amount: 'Amount in naira', date: 'Date of sale (YYYY-MM-DD)',
      status: 'Paid, Pending or Partial', notes: 'Free-text note',
    },
  },
  receipts: {
    label: 'Receipts', source: SUB('receipts'), writable: false,
    summary: 'Generated customer receipts.',
  },
  orders: {
    label: 'Orders', source: SUB('orders'), writable: true,
    summary: 'Product orders from storefront checkout.',
    fields: {
      customerName: 'Buyer name', items: 'What was ordered',
      grandTotal: 'Total paid in naira',
      status: 'pending | confirmed | dispatched | delivered | cancelled. Delivered is LOCKED and cannot be changed back',
      paymentStatus: 'Whether payment cleared',
      customerPhone: 'Buyer phone for delivery contact',
    },
  },
  abandoned: {
    label: 'Abandoned Checkouts', source: SUB('abandonedCheckouts'), writable: false,
    summary: 'Checkouts started but never paid. Recovery email is vendor-triggered.',
  },
  bookings: {
    label: 'Bookings', source: SUB('bookings'), writable: true,
    summary: 'Service bookings with scheduled date and time.',
    fields: {
      customerName: 'Who booked', serviceName: 'Which service',
      bookingDate: 'Scheduled date', bookingTime: 'Scheduled time',
      status: 'pending | confirmed | in_progress | rescheduled | completed | cancelled | no_show | refunded',
      grandTotal: 'Amount in naira',
    },
  },
  delivery: {
    label: 'Delivery', source: STORE_DOC, writable: true,
    summary: 'Delivery zones, fees and pickup address.',
    fields: {
      deliveryZones: 'Zones with their fees',
      pickupAddress: 'Where couriers collect parcels',
    },
  },
  customers: {
    label: 'Customers', source: SUB('customers'), writable: true,
    summary: 'Customer records built from orders. Pro+.',
    fields: {
      name: 'Customer name', phone: 'Contact number',
      totalSpent: 'Lifetime spend in naira', orderCount: 'Number of orders',
    },
  },
  leads: {
    label: 'Leads', source: TOP('leads', 'storeId'), writable: true,
    summary: 'Enquiries captured from the storefront lead form.',
    fields: { name: 'Lead name', phone: 'Contact number', interest: 'What they asked about' },
  },

  // -------------------------------------------------------------------- GROW
  analytics: {
    label: 'Analytics', source: SUB('analytics'), writable: false,
    summary: 'Store views, link clicks, engagement rate.',
  },
  marketing: {
    label: 'Marketing', source: STORE_DOC, writable: true,
    summary: 'Marketing points balance and campaign settings.',
  },
  discounts: {
    label: 'Discounts', source: SUB('discounts'), writable: true,
    summary: 'Promo codes applied at checkout.',
    fields: {
      code: 'The code customers type', type: 'percentage or flat',
      value: 'Percent off, or naira off', usageLimit: 'Max redemptions',
      usageCount: 'How many times used so far',
      isActive: 'False stops it working at checkout',
      expiryDate: 'When it stops working',
    },
  },
  reviews: {
    label: 'Reviews', source: SUB('reviews'), writable: false,
    summary: 'Customer reviews. Stored per product/service, verified only.',
  },
  loyalty: {
    label: 'Loyalty', source: SUB('loyalty'), writable: true,
    summary: 'Repeat-customer points and redemption. Premium.',
  },
  'referral-program': {
    label: 'Referral Program', source: TOP('referralRewards', 'referrerId'), writable: false,
    summary: "The OWNER'S OWN commission earnings. Read-only to the AI.",
  },
  'google-ads': {
    label: 'Google Ads', source: TOP('googleAdsCampaigns', 'storeId'), writable: false,
    summary: 'Ad campaigns, budgets and performance.',
  },
  'meta-pixel': {
    label: 'Meta Pixel', source: STORE_DOC, writable: true,
    summary: 'Meta pixel id for conversion tracking.',
  },
  'job-listings': {
    label: 'Job Listings', source: TOP('jobListings', 'storeId'), writable: true,
    summary: 'Vacancies posted to the public jobs board. Admin-reviewed.',
    fields: {
      title: 'Job title', pay: 'Pay/offer', location: 'Where the role is based',
      jobType: 'full time, part time, contract, freelance, side gig',
      status: 'pending | approved | rejected (admin decides)',
      isActive: 'Vendor toggle; false hides an approved job',
    },
  },

  // ---------------------------------------------------------------- BUSINESS
  'online-store': {
    label: 'Business Page', source: STORE_DOC, writable: true,
    summary: 'Storefront appearance: theme, description, socials.',
    fields: {
      businessName: 'Name shown on the storefront',
      storeTheme: 'Visual theme', description: 'Store description',
      whatsappNumber: 'Contact number customers message',
    },
  },
  payouts: {
    label: 'Payouts', source: STORE_DOC, writable: false,
    summary: 'Settlement status and bank details. READ-ONLY, never AI-writable.',
  },
  'mobile-app': {
    label: 'Mobile App', source: STORE_DOC, writable: false,
    summary: 'PWA install and push notification config.',
  },

  // ----------------------------------------------------------------- ACCOUNT
  billing: {
    label: 'Billing', source: STORE_DOC, writable: false,
    summary: 'Plan, status and renewal dates. READ-ONLY.',
  },
  'custom-domain': {
    label: 'Custom Domain', source: STORE_DOC, writable: false,
    summary: 'Custom domain and DNS verification status.',
  },
  'cac-verification': {
    label: 'CAC Verification', source: STORE_DOC, writable: false,
    summary: 'CAC business verification status and badge.',
  },
  team: {
    label: 'Team', source: TOP('staffMemberships', 'storeId'), writable: false,
    summary: 'Staff members and their roles. READ-ONLY, never AI-writable.',
  },
  settings: {
    label: 'Settings', source: STORE_DOC, writable: true,
    summary: 'Store profile and preferences. Security fields are never writable.',
  },
  support: {
    label: 'Support', source: TOP('supportEnquiries', 'storeId'), writable: false,
    summary: 'Support tickets raised by this vendor.',
  },
}

/** Tab ids the AI may read, given what the vendor/staff role allows. */
export function readableTabs(allowedTabIds = null) {
  return Object.keys(TAB_SCHEMA).filter(
    id => !allowedTabIds || allowedTabIds.includes(id),
  )
}

export function isTabWritable(tabId) {
  const t = TAB_SCHEMA[tabId]
  return !!t && t.writable === true && !AI_NEVER_WRITE.has(tabId)
}

/**
 * Compact catalogue for the system prompt: one line per tab. Cheap enough to
 * include on every message, and it means Sella knows a tab EXISTS even before
 * reading it - so it says "let me check your Loyalty tab" instead of inventing
 * an answer or claiming it has no access.
 */
export function describeTabsForPrompt(allowedTabIds = null) {
  return readableTabs(allowedTabIds)
    .map(id => {
      const t = TAB_SCHEMA[id]
      const w = isTabWritable(id) ? '' : ' [read-only]'
      return `- ${id} (${t.label})${w}: ${t.summary}`
    })
    .join('\n')
}

/** Field-level detail for one tab, expanded only when that tab is read. */
export function describeFields(tabId) {
  const t = TAB_SCHEMA[tabId]
  if (!t?.fields) return null
  return Object.entries(t.fields).map(([k, v]) => `${k}: ${v}`).join('\n')
}

/**
 * Reads one tab's live data. Returns { ok, rows, note } - never throws, because
 * a failed read must degrade to "I couldn't load that" rather than killing the
 * whole reply.
 */
export async function readTab(db, storeId, tabId, limit = 50) {
  const t = TAB_SCHEMA[tabId]
  if (!t) {
    // Explicitly unknown, so Sella says so instead of hallucinating a tab.
    return { ok: false, note: `There is no "${tabId}" tab. Ask about one of the known tabs.` }
  }

  try {
    const storeRef = db.collection('stores').doc(storeId)

    if (t.source.kind === 'storeDoc') {
      const snap = await storeRef.get()
      if (!snap.exists) return { ok: false, note: 'Store not found.' }
      const data = snap.data()
      // Never leak server-only material into the model's context.
      const SENSITIVE = /^(referralBank|googleAdsRefreshToken|fcmToken|subaccountCode|verifiedPhone)/
      const safe = Object.fromEntries(
        Object.entries(data).filter(([k]) => !SENSITIVE.test(k)),
      )
      return { ok: true, rows: [safe] }
    }

    if (t.source.kind === 'sub') {
      const snap = await storeRef.collection(t.source.name).limit(limit).get()
      return { ok: true, rows: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
    }

    // Top-level collection scoped to this store - single-field equality only,
    // so no composite index is ever required.
    const snap = await db
      .collection(t.source.name)
      .where(t.source.field, '==', storeId)
      .limit(limit)
      .get()
    return { ok: true, rows: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (err) {
    console.error(`[ai-schema] readTab(${tabId}) failed:`, err.message)
    return { ok: false, note: `Could not load the ${t.label} tab right now.` }
  }
}

// ---------------------------------------------------------------------------
// GENERIC WRITES
//
// The 8 hand-written write tools (add_product, update_order_status, ...) cover
// the common journeys well, but they are a fixed list: every OTHER field a
// vendor can edit was unreachable, so Sella had to say "do that from the X tab".
// This closes that gap using the same registry, so a new tab or field becomes
// writable by adding a registry entry - not by writing another tool.
//
// It does NOT bypass any safety: update_tab_record produces a pendingAction
// exactly like the specific tools, so the vendor still sees the confirm card
// and nothing is saved without their explicit yes.

/** Fields that must never be set through the generic path, on any tab. */
const NEVER_SETTABLE = new Set([
  'id', 'storeId', 'ownerId', 'createdAt', 'uid', 'staffUid',
  // money/verification/entitlement state - server-owned, mirrors firestore.rules
  'plan', 'planStatus', 'planEndDate', 'hasPremiumFeatures', 'hasProFeatures',
  'hasGrowthFeatures', 'maxProducts', 'maxJobListings', 'cacVerified',
  'phoneVerified', 'phoneGateExempt', 'referralAvailable', 'referralTotalEarned',
  'referralBankAccount', 'referralBankVerified', 'subaccountCode',
  'googleAdsRefreshToken', 'paymentStatus', 'grandTotal', 'amountPaid',
])

/**
 * Validates a proposed generic write BEFORE it reaches the confirm card, so an
 * impossible change is refused with a reason the model can relay, rather than
 * being shown to the vendor and then failing on save.
 * @returns {{ok: true, tab, docId, changes} | {ok: false, reason: string}}
 */
export function validateGenericWrite({ tab, docId, changes }) {
  const t = TAB_SCHEMA[tab]
  if (!t) return { ok: false, reason: `There is no "${tab}" tab.` }
  if (!isTabWritable(tab)) {
    return { ok: false, reason: `The ${t.label} tab is read-only - I can never change it for you.` }
  }
  if (!changes || typeof changes !== 'object' || !Object.keys(changes).length) {
    return { ok: false, reason: 'No changes were specified.' }
  }

  const blocked = Object.keys(changes).filter(k => NEVER_SETTABLE.has(k))
  if (blocked.length) {
    return { ok: false, reason: `These fields are managed by the system and can't be edited: ${blocked.join(', ')}.` }
  }

  // storeDoc tabs edit the store document itself, so no docId is required.
  if (t.source.kind !== 'storeDoc' && !docId) {
    return { ok: false, reason: `I need to know WHICH ${t.label} record to change.` }
  }

  return { ok: true, tab, docId: docId || null, changes }
}

/** Applies a validated generic write. Called only after vendor confirmation. */
export async function applyGenericWrite(db, storeId, { tab, docId, changes }) {
  const check = validateGenericWrite({ tab, docId, changes })
  if (!check.ok) return { ok: false, message: check.reason }

  const t = TAB_SCHEMA[tab]
  const storeRef = db.collection('stores').doc(storeId)
  const payload = { ...changes, updatedAt: new Date().toISOString() }

  try {
    if (t.source.kind === 'storeDoc') {
      await storeRef.update(payload)
    } else if (t.source.kind === 'sub') {
      await storeRef.collection(t.source.name).doc(docId).update(payload)
    } else {
      // Top-level collection: confirm the doc belongs to THIS store before
      // touching it - the id came from the model, so it is not trusted.
      const ref = db.collection(t.source.name).doc(docId)
      const snap = await ref.get()
      if (!snap.exists || snap.data()[t.source.field] !== storeId) {
        return { ok: false, message: `I couldn't find that ${t.label} record on your store.` }
      }
      await ref.update(payload)
    }
    const what = Object.keys(changes).join(', ')
    return { ok: true, message: `Updated ${what} on your ${t.label} tab.` }
  } catch (err) {
    console.error(`[ai-schema] applyGenericWrite(${tab}) failed:`, err.message)
    return { ok: false, message: `That change didn't save - please try from the ${t.label} tab.` }
  }
}

/** Tab ids the AI may write to, for the tool description. */
export function writableTabs() {
  return Object.keys(TAB_SCHEMA).filter(isTabWritable)
}
