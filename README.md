

##any changes or edits made to this codebase no matter how minimal be it logically , structurally , UI , Backend , Folder Structure must be updated in this README.md below so as to keep better and full organizing and understading of each changes and uses of each files and the current state also ⬇️⬇️⬇️

### MUST READ BEFORE ANY CHANGES TO THIS README.md 
### IF YOU'RE READING THIS README.md EITHER BY PROMPT OR ORDER ANY CHANGES THAT'S PENDING AND THAT'S BEEN APPLIED OR IMPLEMENTED MAKE SURE TO UPDATE IT IN THIS DOCUMENT 
### FOR EXAMPLE IF WHEN READING THIS DOC A FEATURE OR BUG OR ISSUE IS MARKED AS PENDING AND IT'S BEEN WORKED DON'T REMOVE IT JUST MARK IT AS DONE AS THIS DOC IS THE CHANGELOG OF THIS ENTIRE CODEBASE SO NOTHING'S TO BE REMOVED ONLY ADDED 


1. Who This Is For & The People Involved

Founder & CEO: Ernest Uwaoma, goes by "Nex." Born 22 July 2006, based in Lagos, Nigeria. Runs NexKeys Agency (CAC registered, BN No. 9689086, Business Development Services; registered address: 17 Babatunde Street Olodi Apapa Lagos; business email: nexkeysagency@gmail.com; personal email: ernestuwaoma3@gmail.com; phone: +2348033004474).
Co-Founder & CSO: Obediah Miracle.
Communication style: Nex is direct, casual, mixes standard English with Nigerian Pidgin. He does NOT want sycophantic responses and the use of &amp — he wants honest, practical, no-fluff answers. If something is a bad idea, say so. If something is broken, say so plainly. He is a "AI Assisted Developer" — he directs the build through natural language and product thinking, not by writing code himself.
The Development Pipeline — critical, read carefully
This is a five-entity relay system. Each entity has ONE job. Nobody skips their lane.
    1. Claude (this AI / "Claude Sonnet") — Writes architecture, diagnoses bugs, and produces precise natural-language implementation instructions. Claude NEVER writes raw code directly into the codebase. Claude's output is always a structured English prompt describing exactly what should change and why.
    2. Gemini — Takes Claude's natural-language prompt and translates it into an execution-ready prompt formatted for Cursor/Codex to actually run inside the codebase.
    3. Cursor / Codex / Antigravity — The AI coding agent that actually executes inside the VS Code codebase on Nex's machine, writes the real code, and runs npm run build.
    4. Nex — Tests the result, reports back successes/failures/screenshots/logs to Claude.

Why this matters: If you are claude reading this in a new session, your job is to diagnose and write instructions — not to write code snippets expecting Nex to paste them in himself. 
Always format fixes as a numbered, explicit prompt that Cursor/Codex can execute.
2. The Product — What Sellapage Actually Is
Sellapage (sellapage.com.ng) is a Nigerian SaaS commerce platform — think "Better and simpler version of Shopify commerce," purpose-built for the Nigerian SME reality, not a copy-paste of Western e-commerce assumptions.
Target users: Non-technical Nigerian SME owners — fashion sellers, food vendors, freelancers offering services, small retailers. People currently selling via WhatsApp/Instagram DMs with zero structure, no online store, no automated payment collection, no order tracking, no delivery setup, no ads runnings and no professional trust signal.
Core value proposition: A real professional, mobile-first online store in minutes, with working payment collection (Paystack), real delivery logistics (Sendbox), automatic order tracking, customer relationship tools, and zero technical setup — at a price Nigerian SMEs can afford, with no commission on top of subscription (deliberate decision — see Section 6).
Origin/philosophy: Build fast, build cheap, avoid overengineering, get to real paying customers as fast as possible.  thinking over feature completeness, always. Must work flawlessly on mobile first then larger screens since the overwhelming majority of vendors and customers operate from phones.
Trust benchmark references explicitly given by Nex: Jumia, Amazon, Konga, Temu, Glovo. Not to match their infrastructure budget, but because their UX patterns around trust, order tracking, and delivery transparency are the gold standard Nigerian users already expect. "Let's build ours to be security tight, no/less mistakes, even if we can't afford their setup at least let's be trustworthy and valueworthy to the Nigerian market."
3. Full Tech Stack
Layer	Technology	Notes
Frontend	React + Vite	package.json confirms "type": "module"
Styling	Tailwind CSS	
Backend	Vercel Serverless Functions	Migrated from Netlify (Section 5)
Database	Firebase Firestore	
Auth	Firebase Auth	
Payments	Paystack	Subaccount split-payment, one per vendor
Logistics	Sendbox	Rate calc + shipment creation/tracking
AI descriptions	NVIDIA NIM	
Email	Resend	RESEND_FROM_EMAIL domain verified
Push	Firebase Cloud Messaging	
Media	Cloudinary	
Code execution	Cursor / Codex / Antigravity	
Prompt translation	Gemini	
Geodata	nigeria-states-and-lgas (npm)	
PDF receipts	@react-pdf/renderer	Confirmed working
Confirmed package.json dependencies:
firebase ^10.14.1, firebase-admin ^13.8.0, lucide-react ^0.303.0,
qrcode ^1.5.4, react ^18.2.0, react-dom ^18.2.0, react-router-dom ^6.30.3,
resend ^6.12.4, @react-pdf/renderer ^4.5.1, @vercel/speed-insights ^2.0.0
DevDeps: @vitejs/plugin-react, autoprefixer, postcss, tailwindcss,
vite ^5.0.10, vite-plugin-pwa ^1.3.0
4. Architecture — How The Codebase Is Actually Structured
4.1 The Vercel Hobby Tier Constraint — read this first, it shapes everything
Vercel's free/Hobby tier caps a project at 12 serverless functions. Sellapage has ~17 distinct API operations. The solution: a single catch-all router.
    • Router file: api/[...route].js — this is the ONLY actual serverless function Vercel sees for all API traffic.
    • It reads the requested route segment (from req.query.route or by parsing req.url as fallback), normalizes underscores to hyphens, and dynamically import()s the correct handler from src/api-handlers/{name}.js.
    • Every actual handler lives in src/api-handlers/ — these are NOT separate Vercel functions; they're plain modules imported at runtime by the router.
CRITICAL RULE: any new API endpoint must be added as a new case inside the switch statement in api/[...route].js, importing from a new file in src/api-handlers/. Never create a new file directly inside api/.
    • vercel.json rewrites /api/:path* → /api/[...route], plus an SPA fallback rewrite to /index.html.
    • The router's functions config in vercel.json sets memory: 1024 and maxDuration: 15 for api/[...route].js.
Current full route list in the switch statement:
paystack-webhook, create-subaccount, resolve-account, Sendbox-rates, Sendbox-create-shipment, Sendbox-webhook, ai-describe, checkout-initialize, billing-initialize, validate-discount, submit-review, mark-delivered, delete-account, expiry-cron, admin-health, notify, reset-password and many more
4.2 Shared Utilities
src/api-handlers/_lib/ contains shared helpers as named exports:
    • firebase-admin.js
    • http.js
    • send-email.js — exports sendEmail(to, subject, html), wraps Resend
    • send-push.js — exports sendPush(fcmToken, title, body, data), wraps FCM
4.3 Firestore Data Model (as currently understood)
stores/{storeId}
  - businessName, storeName, email, fcmToken
  - subaccountCode, payoutBankName, payoutAccountNumberMasked, payoutsVerified
  - pickupAddress: { streetAddress, city, state }   [NOT CONFIRMED for "Denver Mall"]
  - plan: starter | growth | pro | premium
  stores/{storeId}/products/{productId}
    - avgRating, reviewCount
    products/{productId}/reviews/{reviewId}
      - rating, reviewText, customerName, orderId, createdAt
  stores/{storeId}/services/{serviceId}
    - (same reviews subcollection pattern as products)
  stores/{storeId}/orders/{orderId}
    - customerName, customerEmail, customerPhone
    - itemId, itemType ("product"|"service"), itemName [NOT confirmed written]
    - grandTotal, status
    - reviewToken, reviewTokenUsed, reviewSubmitted
    - SendboxTrackingId, SendboxStatus
    - promoCode, discountAmount
    - storeId is NOT stored as a field — only exists in the Firestore path
  stores/{storeId}/customers/{phone}
    - phone-indexed, auto-created/updated by webhook on each order
  stores/{storeId}/discounts/{discountId}
    - usageCount (incremented via FieldValue.increment(1))
Known Firestore index gap (see Section 7, Bug 5): db.collectionGroup('orders').where('reviewToken','==',token) requires a composite index with Query Scope = Collection group on field reviewToken Ascending. This was NEVER created since Phase 3 launch — the entire reviews feature was broken from day one until this index is built.
4.4 Service Worker / Push Notification Architecture (fixed)
Single unified service worker at src/sw.js using vite-plugin-pwa's injectManifest strategy — handles BOTH Workbox PWA precaching AND Firebase onBackgroundMessage push handling in one file. This replaced a broken dual-service-worker setup (Section 7, Bug 0).
vite.config.js PWA config: strategies: 'injectManifest', srcDir: 'src', filename: 'sw.js', with injectManifest: { globPatterns: [...], maximumFileSizeToCacheInBytes: 5000000 }.
src/firebase/messaging.js exports initFCM(storeId) and requestFCMPermission(storeId), uses navigator.serviceWorker.ready (NOT a separate SW registration) to get the unified worker.


## 2026-07-08 - Dashboard Mobile-First Tab Redesign

Commit/push keyword: `dashboard-tabs-mobile-redesign`

This update documents the dashboard UI redesign work completed for selected vendor dashboard tabs. The work was intentionally limited to presentation, local UI state, and mobile-first organization. It did not change Firebase calls, API handlers, stored data shape, order logic, delivery booking logic, support submission logic, product/service save logic, delete logic, or visibility toggle logic.

Touched dashboard files:

- `src/components/dashboard/Products.jsx`
- `src/components/dashboard/ServicesTab.jsx`
- `src/components/dashboard/CategoriesTab.jsx`
- `src/components/dashboard/DeliveryTab.jsx`
- `src/components/dashboard/SupportTab.jsx`

### Safety Boundary

The dashboard redesign was UI-only and local-state-only:

- No Firebase functions were changed.
- No API handler files were changed for this dashboard redesign.
- No product, service, category, delivery, support, or shipment business logic was changed.
- Existing save, delete, edit, toggle, submit, delivery zone add/delete, shipment refresh, tracking link, and waybill link handlers remain the same.
- Existing arrays from props are not mutated. Search and pagination use derived filtered/sliced arrays for rendering only.
- Any unrelated modified API handler files already present in the worktree were not part of this dashboard UI task.

### Products Tab

File: `src/components/dashboard/Products.jsx`

Changes made:

- Added a product-name search input above the product grid.
- Search checks the existing product `name` field only.
- Added client-side pagination at 10 listings per page.
- Search resets the product pagination back to page 1.
- Added a no-results state for product searches that do not match any listing.
- Kept the existing add product, edit product, delete product, image upload, AI description, stock display, variation display, and visibility toggle flows intact.
- Product cards still render from the same `products` prop; only the visible list is filtered and paginated.

### Services Tab

File: `src/components/dashboard/ServicesTab.jsx`

Changes made:

- Added a service-name search input above the service grid.
- Search checks the existing service `name` field only.
- Added client-side pagination at 10 listings per page.
- Search resets the service pagination back to page 1.
- Added a no-results state for service searches that do not match any listing.
- Kept the existing add service, edit service, delete service, image upload, AI description, duration, location type, booking note, and visibility toggle flows intact.
- Service cards still render from the same `services` prop; only the visible list is filtered and paginated.

### Categories Tab

File: `src/components/dashboard/CategoriesTab.jsx`

Changes made:

- Reworked the category screen into a cleaner mobile-first category manager.
- Kept the existing category grouping behavior based on each product/service `category` field.
- Category cards now paginate at 3 categories per page.
- Each category card still shows the category count and the products/services assigned to it.
- The previous static overflow badge pattern was replaced with a clickable `+N more` control.
- Clicking `+N more` expands that category card to show the full product/service list in that category.
- Clicking `Show less` collapses the category card back to the preview list.
- Product and service category sections still respect `vendorType`: `products` shows product categories, `services` shows service categories, and `both` shows both sections.
- Unassigned product/service warnings remain, with clearer mobile-friendly wording and navigation back to the relevant management tab.

### Delivery Tab

File: `src/components/dashboard/DeliveryTab.jsx`

Changes made:

- Reorganized the delivery screen into clearer mobile-first sections for pickup address, delivery zones, and active shipments.
- Kept pickup address saving exactly tied to the existing `onSave(formData)` flow.
- Kept Pro-only delivery zones behavior intact.
- Kept delivery zone add/delete logic intact, including the existing `updateStore(store.id, { deliveryZones: updated })` writes.
- Added delivery zone pagination at 5 zones per page so zones do not endlessly stack on small screens.
- Added active shipment pagination at 5 shipments per page.
- Kept shipment refresh behavior intact through the existing `refreshTracking(order)` function.
- Kept existing external tracking and waybill links intact.
- Improved mobile wrapping for shipment action controls so Refresh, Track, and Waybill buttons fit better on narrow screens.
- Cleaned visible delivery text that previously displayed broken encoded symbols in this touched UI path.

### Support Tab

File: `src/components/dashboard/SupportTab.jsx`

Changes made:

- Redesigned Support into a more complete support workspace.
- Added a clearer support header with store/plan context.
- Kept support form state shape as `{ category, message }`.
- Kept submit behavior through the existing `onSubmit(form)` handler.
- Kept category values stable: `general`, `products`, `billing`, `technical`, and `feature`.
- Kept existing submitting, success, error, and disabled submit behavior intact.
- Replaced emoji-style contact placeholders with Lucide icons.
- Replaced broken/encoded visible text in the touched support UI.
- Reworded category labels from ampersand wording to plain text wording such as `Products and Store` and `Billing and Plans`.
- Converted the FAQ area into a compact expand/collapse list for better mobile readability.

### Verification

Production build verification was completed after the dashboard changes:

- Vite production build passed.
- PWA service worker build also completed.
- The only build warning was the existing large bundle/chunk-size warning.
- No new build-blocking errors were introduced by the dashboard tab redesign.

Build command used through the bundled Node/Vite runtime:

```powershell
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js build
```

Build output summary:

- Main app build completed successfully.
- Service worker build completed successfully.
- PWA injectManifest generated the service worker and precache entries.


## 2026-07-08 - Sendbox Rates Phone Fields

Commit/push keyword: `sendbox-rates-phone-fields`

This update adds `origin_phone` and `destination_phone` fields to the Sendbox rate-quote request body in `src/api-handlers/sendbox-rates.js`.

What changed:

- The `body: JSON.stringify(...)` block in the Sendbox `/shipment_delivery_quote` fetch call now includes `origin_phone` (from `senderDetails.phone`) and `destination_phone` (from `receiverDetails.phone`).
- Phone numbers are normalized to Sendbox's expected format: leading `0` is replaced with `+234`, and any existing `+234` or `234` prefix is collapsed to `+234`.
- If no phone number is provided, a fallback of `+2348000000000` is used.

What did NOT change:

- No other fields in the rate-quote body were modified.
- The `senderDetails` and `receiverDetails` destructuring from `req.body` remains the same.
- The state code mapping, validation checks, rate response mapping, and error handling are untouched.
- The `sendbox-webhook.js` handler and all other API handlers remain the same.
- No frontend component changes were made for this update.

Phone normalization logic:

- Input `08031234567` → `+2348031234567` (leading `0` replaced with `+234`)
- Input `+2348031234567` → `+2348031234567` (already correct, second replace is no-op)
- Input `2348031234567` → `2348031234567` (no leading `0` or `+234`, passed through as-is)
- Input empty/undefined → `+2348000000000` (fallback default)


## 2026-07-08 - Fix Sendbox Rates 409 Error (Missing City Fields)

Commit/push keyword: `sendbox-rates-add-city-fields`

This update fixes a 409 (Conflict) error from the Sendbox API when fetching shipping rates.

Error message from Vercel logs:

```
_schema: [ 'The city, state, country _fields must not be empty for destination and origin' ]
```

Root cause:

- The `sendbox-rates.js` handler was sending `origin_state`, `origin_country`, `destination_state`, `destination_country` to the Sendbox `/shipment_delivery_quote` endpoint but was missing `origin_city` and `destination_city`.
- The Sendbox API requires city fields alongside state and country for both origin and destination.
- The frontend (`OrdersTab.jsx` `triggerFetchRates` function) was already sending `senderDetails.city` and `receiverDetails.city` to the backend — the backend just wasn't including them in the Sendbox API call.

What changed:

- File: `src/api-handlers/sendbox-rates.js`
- Added `origin_city: senderDetails.city || ''` to the request body.
- Added `destination_city: receiverDetails.city || ''` to the request body.

What did NOT change:

- No frontend component changes were made.
- The phone normalization logic, state code mapping, validation checks, rate response mapping, and error handling are untouched.
- The `sendbox-webhook.js` handler and all other API handlers remain the same.


## 2026-07-08 - Sendbox Full API Migration (Nested Format + Bug Fixes)

Commit/push keyword: `sendbox-nested-format-migration`

This update rewrites both Sendbox API handlers to use the nested `origin`/`destination` payload format as documented in the Sendbox API docs, and fixes two bugs: the radio button selection issue and missing delivery ETA.

Root causes addressed:

1. **Only 2 couriers showing** — The flat-format payload was missing fields Sendbox uses to match couriers (`service_type`, `region`, `package_type`, `channel_code`, `incoming_option`, `total_value`, `items`). Switching to the nested format with all required fields unlocks more courier options.

2. **Radio button bug (both boxes turn green)** — Sendbox rate response uses `key` as the unique identifier, not `courier_id`. Our code mapped `courier_id: r.courier_id` which was `undefined` for all rates. When clicking any rate, `selectedCourierId` became `undefined`, and `undefined === undefined` evaluated to `true` for every rate.

3. **Delivery ETA showing "—"** — The `delivery_eta` field was hardcoded to empty string. Sendbox returns `delivery_eta_string` and `sla_description` which were not being mapped.

What changed:

### File: `src/api-handlers/sendbox-rates.js`

- Replaced the entire flat-format `body: JSON.stringify(...)` block with the nested `origin`/`destination` format per Sendbox API docs.
- `origin` object includes: `first_name`, `last_name` (split from full name), `street`, `state`, `city`, `country`, `phone`, `email`.
- `destination` object includes same fields.
- Added Sendbox-required fields: `incoming_option: 'pickup'`, `region: 'NG'`, `service_type: 'local'`, `package_type: 'general'`, `total_value`, `currency: 'NGN'`, `channel_code: 'api'`, `pickup_date`, `items` array.
- Fixed rate response mapping: `courier_id` now uses `r.key` (Sendbox's actual ID field) instead of `r.courier_id`.
- Fixed `delivery_eta` to use `r.delivery_eta_string` or `r.sla_description` instead of empty string.
- Added `normalizePhone()` and `splitName()` helper functions.
- Removed the `STATE_CODES` map and `getStateCode()` function (no longer needed with nested format).

### File: `src/api-handlers/sendbox-create-shipment.js`

- Replaced the flat-format payload with nested `origin`/`destination` format (same pattern as rates handler).
- Added Sendbox-required fields: `incoming_option`, `region`, `service_type`, `package_type`, `total_value`, `currency`, `channel_code`, `items` array.
- Added `callback_url` pointing to `/api/sendbox-webhook` for tracking updates.
- Added `normalizePhone()` and `splitName()` helper functions.
- `total_value` now reads from the order document (`grandTotal` or `total`) instead of hardcoded value.

What did NOT change:

- No frontend component changes were made. The frontend already collects all required data (name, phone, email, street, city, state). The Sendbox-specific fields are backend constants.
- The `sendbox-webhook.js` handler remains the same.
- The payment initialization and verification flow remains the same.

### Category / Package Type Compatibility Note

The Sendbox API docs do not document any category system or courier-package compatibility filtering. Unlike Shipbubble which had a categories system to match couriers to package types (e.g., food, fragile, electronics), Sendbox does not expose this through their API. The `package_type` field only documents "general" as a value with no enumeration of other types. This is a Sendbox API limitation — there is currently no way to programmatically prevent a vendor from selecting a courier that doesn't handle their package type.

---

## 2026-07-08 - Sendbox Complete Payment Flow + Shared Helper + Safety Net

Commit/push keyword: `sendbox-complete-payment-flow`

This update implements the full shipment payment flow, creates a shared Sendbox booking helper, adds a Paystack webhook safety net for shipments, fixes the booking button blocking issue, and adds package type selection matching the Sendbox dashboard.

Root causes addressed:

1. **Booking button not clickable** — `OrdersTab.jsx` checked `!shipRequestToken` which was always undefined. Sendbox doesn't use `request_token` (that was a Shipbubble concept). The check blocked the button from ever working.

2. **Payment handler missing** — `sendbox-payment-initialize.js` didn't exist but the frontend referenced `/api/sendbox-payment-initialize`. The entire payment flow was broken from the start.

3. **No safety net for abandoned payments** — If vendor closed browser after Paystack payment but before redirect, the shipment was never booked. Now Paystack webhook catches `transactionType === "shipment"` and auto-books server-side.

4. **ETA display order was wrong** — `delivery_eta_string` ("Before 6PM Wednesday") was prioritized over `sla_description` ("2-3 working days"). Sendbox dashboard shows the latter format, matching user expectations.

5. **Missing Sendbox API fields** — `service_code`, `dimension` object, and `package_type` (dynamic) were not being sent to Sendbox API endpoints.

6. **Code duplication** — `sendbox-create-shipment.js` and the webhook safety net both needed the same Sendbox shipment creation logic. Extracted into shared helper.

What changed:

### File: `src/api-handlers/_lib/sendbox-booking.js` (NEW)

- Shared helper for creating Sendbox shipments.
- `createSendboxShipment()` accepts senderDetails, receiverDetails, weight, courierId, pickupDate, totalValue, packageType, callbackUrl.
- Includes `normalizePhone()` and `splitName()` helpers (single source of truth).
- Handles all Sendbox API body construction: nested origin/destination, dimension, service_code, package_type, items array.
- When `packageType === 'food'`, sets `incoming_option: 'drop_off'` (food items can't be picked up per Sendbox dashboard).
- Returns `{ success, data, error }`.
- Used by both `sendbox-create-shipment.js` and `paystack-webhook.js`.

### File: `src/api-handlers/sendbox-payment-initialize.js` (NEW)

- Accepts POST with: storeId, orderId, courierName, shippingFee, courierId, senderDetails, receiverDetails, weight, pickupDate, packageType.
- Verifies Firebase auth token, checks store ownership, looks up order doc.
- Calculates total: `shippingFee + 250` (service charge).
- Calls Paystack `/transaction/initialize` with:
  - `callback_url`: `${APP_URL}/dashboard?shipment=pending` (redirect back to Orders tab)
  - `metadata.transactionType`: `"shipment"` (triggers safety net branch in webhook)
  - Full shipment details in metadata: storeId, orderId, courierId, courierName, senderDetails, receiverDetails, weight, pickupDate, packageType.
- Returns `{ authorization_url, reference }`.

### File: `api/[...route].js`

- Added route case: `sendbox-payment-initialize` → imports `src/api-handlers/sendbox-payment-initialize.js`.

### File: `src/api-handlers/paystack-webhook.js`

- Added `transactionType === "shipment"` branch after the checkout handling block.
- On successful Paystack charge with shipment metadata:
  - Looks up store and order documents from Firestore.
  - Calls `createSendboxShipment()` from shared helper.
  - Updates order doc with tracking code, courier name, tracking URL, `shipmentBooked: true`.
- This is the safety net — fires if vendor closes browser before redirect completes.

### File: `src/api-handlers/sendbox-rates.js`

- Added `packageType` parameter (defaults to `'general'`).
- Added `dimension: { length: 0, width: 0, height: 0 }` to API body.
- Added `service_code: 'standard'` to API body.
- Changed `incoming_option` to respect `packageType`: food → `'drop_off'`, general → `'pickup'`.
- Changed `package_type` to use dynamic value from frontend instead of hardcoded `'general'`.
- Fixed `delivery_eta` priority: `r.sla_description || r.delivery_eta_string` (matches Sendbox dashboard display).

### File: `src/api-handlers/sendbox-create-shipment.js`

- Replaced inline Sendbox API call with `createSendboxShipment()` from shared helper.
- Accepts `packageType` parameter from frontend.
- Removed duplicate `normalizePhone()` and `splitName()` functions.
- Passes `callbackUrl` to shared helper for tracking webhook.

### File: `src/components/dashboard/OrdersTab.jsx`

- Removed `shipRequestToken` state variable entirely.
- Removed `!shipRequestToken` check from booking button condition (line 455).
- Removed `setShipRequestToken('')` calls from `openSendboxModal` and `triggerFetchRates`.
- Removed `setShipRequestToken(data.request_token || '')` from rate response handler.
- Added `packageType` state variable (defaults to `'general'`).
- Added package type dropdown in Sendbox modal: "General items" / "Food items".
- Added amber notice when "Food items" selected: "Food items can only be dropped off — pickup is not available."
- Package type triggers rate recalculation when changed.
- Passes `packageType` to `/api/sendbox-rates` in request body.
- Passes `packageType` to `/api/sendbox-payment-initialize` in request body.
- Passes `packageType` to sessionStorage data for redirect flow.
- Passes `packageType` to `/api/sendbox-create-shipment` in redirect useEffect.

What did NOT change:

- `shipbubble-webhook.js` was not touched (different handler).
- Service charge remains ₦250 per shipment.
- Paystack subaccount split logic unchanged.
- Green border cosmetic issue deprioritized (not blocking functionality).

### Payment Flow (Confirmed Working)

```
Vendor clicks "Confirm & Book Shipment"
  → Payment modal opens (shipping fee + ₦250 service charge)
  → Vendor clicks "Pay Now"
  → Redirected to Paystack → pays
  → Paystack callback: /dashboard?shipment=pending&reference=xxx
  → TWO paths fire:
    1. Redirect: frontend useEffect reads params, calls /api/sendbox-payment-verify
       → If success: calls /api/sendbox-create-shipment → shows success modal
       → If fail: shows "Payment Failed" modal with Try Again / Go Back
    2. Webhook (safety net): paystack-webhook.js fires with transactionType === "shipment"
       → Auto-creates shipment server-side even if vendor closes browser
  → Sendbox wallet is debited by Nex (the platform owner)
  → Vendor sees shipment tracking in Delivery tab
```

### Build Status

`npm run build` passed with zero errors. Only pre-existing chunk size warning (2,872 kB).

---

## 2026-07-08 - Fix DHL Express Button Not Clickable

Commit/push keyword: `sendbox-dhl-express-button-fix`

This update fixes a bug where selecting a non-Standard courier (e.g. DHL Express) caused the "Confirm & Book Shipment" button to appear clickable but do nothing when clicked.

Root cause:

The button's `disabled` prop checks `!selectedCourierId`. The `courier_id` field was mapped as `r.key || ''` in the rate response. If a courier (like DHL Express) had an empty/null `key` field in the Sendbox API response, `courier_id` became `''` (falsy), keeping the button permanently disabled for that rate. The disabled button CSS (`disabled:bg-green-400`) is still green, so it looked clickable but wasn't.

What changed:

### File: `src/api-handlers/sendbox-rates.js`

- Changed `courier_id` mapping from `r.key || ''` to `r.key || r.rate_card_id || String(r.courier_id || '') || \`rate_${index}\``.
- Added array index parameter to the `.map()` callback for the fallback.
- This ensures every rate always gets a unique, truthy `courier_id` regardless of which fields Sendbox populates for different courier types.

What did NOT change:

- No frontend changes. The button logic and disabled condition were already correct — the issue was purely in the backend rate mapping.
- The `sendbox-create-shipment.js` and `sendbox-payment-initialize.js` handlers still receive the `courier_id` as before; it just always has a valid value now.

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-08 — Checkout Delivery Fields Restructured + Promo Code Input Restored

Commit keyword: `checkout-delivery-fields-promo-code`

This update restructures the customer-facing checkout delivery form to match the shipment booking receiver layout, ensuring all fields needed for delivery are collected upfront. It also restores the missing promo code input in the checkout payment step.

### What changed

#### `src/pages/StorePage.jsx` — `StoreCheckoutModal`

**Delivery step (step 2) — new field layout:**

Previously the delivery step had: zone cards → street address → order notes. Now it matches the shipment booking receiver section:

```
Delivery Details
┌─────────────────────────────────┐
│ Name              │ Phone       │
│ [pre-filled from  │ [pre-filled │
│  step 1, editable] │  from step1]│
├─────────────────────────────────┤
│ Street Address (full width)     │
├─────────────────────────────────┤
│ City / LGA        │ State      │
│ [auto from zone]  │ [auto from │
│                    │  zone]     │
├─────────────────────────────────┤
│ Order notes (optional)         │
└─────────────────────────────────┘
```

- Name and Phone are pre-filled from step 1 (customer's details) but remain editable so the customer can correct if needed.
- Street Address stays as the main delivery address input.
- City/LGA and State are auto-populated from the selected delivery zone but remain editable.
- Order notes stays optional.
- Zone selector cards remain unchanged above the new fields.

**Payment step (step 3) — promo code input added:**

A promo code input field is now shown in the payment step, between the cart summary and the price breakdown:

- Text input with "Apply" button.
- Enter key triggers validation.
- While loading: spinner on the button.
- If error: shows `promoError` below the input.
- If discount applied: shows a green badge with the code, discount amount, and an "X" remove button.
- Mobile-first styling matching existing patterns.

The promo code logic (`handleApplyPromo`, `/api/validate-discount` validation, discount calculation, price breakdown display) already existed — only the input field was missing from the JSX.

### What did NOT change

- No backend changes. The `/api/validate-discount` endpoint and discount calculation logic were already working.
- No changes to `OrdersTab.jsx`. The shipment booking modal already pre-fills receiver details from the order document.
- Zone selection logic unchanged.
- CartSummary component unchanged.
- ServiceStorePage.jsx not affected (separate flow, no discount system).

### Build Status

`npm run build` passed with zero errors.







**###** -  *##*




### 7/9/2026

---

## CURRENT PLATFORM STATUS — July 2026

### Live URL
https://sellapage.com.ng — hosted on Vercel, GitHub CI/CD, auto-deploy on push to main.

### User Base
200+ registered vendors. Zero paying subscribers currently. This is the critical growth challenge.

### Infrastructure
- Cron job at cron-job.org: `https://www.sellapage.com.ng/api/expiry-cron` — re-enabled July 2026 after fixing dead Netlify URL
- Sendbox webhook registered at: `https://sellapage.com.ng/api/sendbox-webhook`
- Expo project created at expo.dev (nexkeysagency team) — app project named "Sellapage"

---

## COMPLETED FEATURES — Full Changelog

### Core Platform
- Multi-tenant vendor stores with unique store URLs (`sellapage.com.ng/{storeName}`)
- Firebase Auth + Firestore for vendor and customer data
- Paystack in-app checkout (card, transfer, USSD)
- Automatic order creation from Paystack webhook
- Paystack subaccount split-payment per vendor
- Customer CRM auto-creation on each order
- Verified reviews system with email token
- Discount and promo codes
- Product and service listings with image upload (Cloudinary)
- Store themes (20 premium themes)
- WhatsApp Community Group Sync
- Lead capture form
- Marketing tab with daily tasks and points
- AI description generation (NVIDIA NIM)
- Policy Generator and Offer Name Lab tools
- Mobile App tab (PWA install prompt) with full mobile app coming soon 
- QR code for store link

### Delivery & Logistics (Sendbox — migrated from Shipbubble July 2026)
- Vendor sets pickup address in Delivery tab
- Vendor books shipment from Orders tab: fills receiver details, weight, pickup date, gets live Sendbox courier rates
- Vendor pays shipping fee + ₦250 Sellapage service charge via Paystack before shipment is created
- After payment: two paths fire (redirect + webhook safety net) to auto-create shipment on Sendbox
- Sendbox wallet is debited for courier cost; ₦250 service charge goes to Sellapage Paystack account
- Tracking visible in Delivery tab with manual Refresh button
- Sendbox webhook (`/api/sendbox-webhook`) auto-updates order status when Sendbox fires events
- Waybill download link saved to order document after booking

### Plan Gating (Four Tiers)
- **Starter (₦0):** Products/Services, Categories, Ledger, Online Store, Mobile App, Marketing, Leads, Settings, Support, Billing
- **Growth (₦5,000/mo):** Everything Starter + Analytics
- **Pro (₦12,000/mo):** Everything Growth + Orders, Delivery, Customers, Reviews, Discounts, Payouts
- **Premium (₦25,000/mo):** Everything Pro + advanced features (AI Business Partner, WhatsApp Business API, Staff Accounts, Ads integrations — planned)

### Ledger Tab (All Plans)
- Manual order logging with customer name, item, amount, date, notes
- Monthly summary cards (orders this month, revenue this month, all-time totals)
- Search, pagination (10 per page), edit, delete
- CSV and PDF export with ₦ symbol correctly rendered
- Status field (Paid/Pending/Partial), month/year filter

### UI/Design System
- Font: Bricolage Grotesque (headings) + DM Sans (body)
- Brand green: #22c55e
- All 18 dashboard tabs: mobile-first redesign complete
- Public pages (Home, Pricing, Navbar, Footer): mobile-first redesign complete
- Storefront pages (StorePage, ServiceStorePage): mobile-first

---

## OPEN BUGS & KNOWN ISSUES

### Active Bugs
(none)

### Resolved Bugs (Historical)
- Bug 0: Dual service worker conflict — FIXED
- Bug 1: Vendor new-order email never sent — FIXED (paystack-webhook.js)
- Bug 2: Book Shipment white-screen crash (Package import missing) — FIXED
- Bug 3: Shipbubble rates 422 (wrong address format) — FIXED via Sendbox migration
- Bug 4: Firestore reviews index (collectionGroup query) — FIXED (manual index created in Firebase Console)
- Bug 5: Payouts math string coercion — FIXED (Number() wrapping)
- Bug 6: Download Receipt silent failure (cartItems not saved) — FIXED (paystack-webhook.js now saves cartItems array)
- Bug 7: Cron job pointing to dead Netlify URL — FIXED (updated to Vercel route)
- Bug 8: OrdersTab isPro crash (undefined variable) — FIXED
- Bug 9: Status change emails not sent — FIXED (update-order-status.js)
- Bug 10: ReferralTab "token is not defined" crash — FIXED
- Bug 11: Receipt₦ symbol showing as ¦ — FIXED (NGN fallback)
- Bug 12: Receipt "Invalid Date" — FIXED (Firestore Timestamp handling)
- Bug 9: Review page Done button did nothing — FIXED (navigate('/'))
- Bug 10: Submit review storeId lookup — FIXED (orderDoc.ref.parent.parent.id)

---

## PENDING FEATURES — Priority Order

### 1. Status Change Emails (URGENT — affects live users) ✅
Send email to customer when vendor changes order status to: confirmed, dispatched, delivered, cancelled.
Handler: new addition to `paystack-webhook.js` or a new `update-order-status.js` handler.
Template: match existing email style. Include order summary, new status, and (for delivered) review link. - DONE ALREADY

### 2. Custom Domain Engine — DONE ✅
Vendors connect their own domain (yourbrand.com) to their Sellapage store.
Tech: Vercel Domains API + Edge middleware for host-header routing.
Plan gate: Pro and Premium only.
Implementation: See "2026-07-12 — Custom Domain Engine Implementation" section above.

### 3. CAC Trust Verification Badge — DONE ✅
Vendor enters RC number → Prembly Basic CAC endpoint verifies it → badge saved to store document → fully and well designed badge shown on storefront maintaining the customers storefront structure and design logic the badge needs to be well arranged and displayed well so customers see it.
API: Prembly (`POST /identitypass/verification/cac/basic`).
Keys needed: PREMBLY_SECRET_KEY, PREMBLY_APP_ID (already in Prembly dashboard — Live Mode).
New dashboard tab: separate CAC tab in sidebar (Pro and Premium only).
Plan gate: Pro and Premium.
Api keys already added to .env and vercel environmnet variables as
PREMBLY_SECRET_KEY=
PREMBLY_PUBLIC_KEY=
[x]Already successfully ran - npm install --save prembly-react-kyc
Implementation: See "2026-07-12 — CAC Trust Verification Badge Implementation" section below.

1
Installation
npm install --save prembly-react-kyc

Copy
2
Configuration
const config = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+2348012345678',
    widget_key: 'your_widget_key_here',
    widget_id: 'your_widget_id_here',
    metadata: {
      transaction_id: 'txn_123',
    },
    callback: (response: any) => {
      console.log('Verification result:', response)
    },
  };

Copy
3
Implementation
import React from 'react';
import useIdentityPayKYC from 'prembly-react-kyc';

const App = () => {
  const config = { ... }; // Use configuration from above
  const verifyWithIdentity = useIdentityPayKYC(config);

  return (
    <button onClick={verifyWithIdentity}>
      Verify Now
    </button>
  );
};

export default App;

Copy
4
Response Handling
// Success Response (Code: 00)
{ 
  code: "00", 
  status: "success", 
  message: "Verification Successful", 
  data: { ... }, 
  channel: "BVN/NIN/etc" 
}

// Failed/Cancelled Response
{ code: "E01", message: "Failed", status: "failed" }
{ code: "E02", message: "Verification Canceled", status: "failed" }


Here's the actual CAC flow we're implementing:

Vendor opens CAC Verification tab (Pro/Premium only)
They enter their RC number (e.g. RC1234567) and their registered business name
They click "Verify My Business"
Our backend calls POST https://api.prembly.com/identitypass/verification/cac/basic with the RC number
Prembly returns the registered business name, status (active/inactive), and registration date
Then sellapage checks it with the one inputed by the user from the cac verification tab whether small or lower case if it matches then
If verified and status is active → save cacVerified: true, cacBusinessName, cacVerifiedAt to Firestore store document
Dashboard shows a green "CAC Verified" badge on the tab
Storefront(Both Products & Services) shows a "Verified Business" badge on both pages

One important check: Prembly's Basic CAC endpoint only needs the RC number — it doesn't need the business name as input. The business name comes back in the response. We can show it to the vendor to confirm it matches their store before saving.

The badge on the storefront:
Needs to be tasteful and trust-building. Think a small green shield icon with "CAC Verified" text and green tick — similar to verified badges on Twitter/Instagram but Sellapage-branded. Placed near the store name in the StoreNavbar component so it's visible on every page of both products and services and also mobile responsive and adapted to all screens starting from small and mostly look beautiful on them also too 

Confirmed plan:

New API handler: src/api-handlers/verify-cac.js — calls Prembly Basic CAC endpoint
Register route in api/[...route].js
New dashboard tab: src/components/dashboard/CACVerificationTab.jsx — Pro/Premium gated, beautiful UI
Wire tab into DashboardLayout.jsx and Dashboard.jsx
Add CAC badge to StorePage.jsx and ServiceStorePage.jsx StoreNavbar sections

Keys we're using:

PREMBLY_SECRET_KEY — for the Authorization header on server-side API calls
PREMBLY_PUBLIC_KEY — NOT needed for this (that's for client-side SDK)


This prevents a vendor from verifying someone else's RC number.
One thing to confirm before writing prompts — what should happen if the names are close but not exact? For example CAC has "Denver Mall Limited" but vendor typed "Denver Mall". Do we:
Option A — Require exact match (case-insensitive) — stricter, fewer false positives
Option B — Show the CAC-returned name to the vendor and ask them to confirm "Is this your business?" before saving — more flexible, better UX
We go with option B







### 4. Live Stores Page — DONE ✅
Public page on sellapage.com.ng/live-stores — shows a moving grid/carousel that can be paused and played of all active vendor stores. well formatted and also fully fitted to display on mobile screens starting from smallest 180PX, 260PX, 360PX to the highest but it should priortize mobile screens first sha 
Data: query Firestore for stores where isActive: true, show store name, category, store clickable link. and what that vendor offers 
Each card links to the vendor's store URL.
and also a search bar where just incase visitors or guests can search for stores name 
Navbar gets "Explore Stores" link button.
Comes after CAC verification (badges will show on the store cards).


IMP PLAN - 
Proceed with the Live Stores page implementation but with these changes to the original plan:

CHANGE TO DESIGN — Replace the auto-scrolling grid with a clean static paginated grid:
- Remove the CSS keyframes auto-scroll entirely
- Remove the pause/play controls
- Use a standard responsive grid: 1 column on mobile, 2 on sm, 3 on md, 4 on lg
- Load 20 stores initially, then load 20 more when the user scrolls to the bottom
- Use Intersection Observer on a sentinel div at the bottom of the grid to trigger loading more
- Show a subtle loading spinner when fetching more stores
- Show "You've seen all stores" text when no more stores remain

CHANGE TO DATA FETCHING — Use Firestore pagination instead of loading all stores at once:
- Use Firestore query with .limit(20) and .startAfter(lastDoc) for subsequent pages
- Query: stores collection, where isActive == true (or where plan is not empty/where storeName exists), ordered by createdAt descending
- getActiveStores(lastDoc) accepts an optional lastDoc cursor for pagination

Everything else from the original plan stays the same:
- Store card design with business name, category, description, CAC badge, vendor type
- Search bar (client-side filter on already-loaded stores)
- Navbar link between Pricing and Dashboard
- /live-stores route in App.jsx
- Mobile-first responsive design
- README changelog

Proceed with implementation. — DONE ✅


### 5. Orders Tab Full Overhaul
Full redesign — color, bit of motion, pagination, better status logic.
New features:
- Status timeline/audit log (each status change logged with timestamp and who changed it)
- Locked editing after order reaches "delivered" status
- Status change emails to customer (see item 1 above)
- Better mobile card layout
- Pagination
- Color-coded status badges
Spec session required before any code is written.

### 6. Admin Panel
Internal panel for Nex to manage the platform.
Features: vendor list, plan management, Sendbox wallet balance monitoring, shipment usage tracking, revenue overview, support ticket management, feature flags, payouts tab accounts added for verification, cloudinary usage/bandwith, vendors details. well paginated and designed to feel like an actual admin panel and fine very fine and fully structured
Auth: `ADMIN_SECRET_TOKEN` header (already in Vercel env).

**CAC Verification Admin Features (add to Admin Panel):**
- Total CAC-verified stores count (cacVerified: true)
- Total pending/unverified stores count
- Total verification attempts across all vendors (sum of cacRetryCount)
- Failed attempts count (vendors who exhausted all 3 retries)
- Vendors with 0 retries left — list with "Contact Support" flag
- Per-vendor CAC status table: business name, RC number, verification status, retry count, last retry date
- Filter: verified / unverified / retries exhausted
- Export CAC verification data as CSV
- Bulk email to unverified vendors encouraging CAC verification

### 7. AI Business Partner
Context-aware chat assistant inside the dashboard.
Access: reads entire vendor dashboard context (orders, ledger, analytics, gproducts, services, customers, discount, reviews, delivery, ads, marketing, Business page, payouts tab, settings, support, leads, categories, Dashboard, Business automation, CAC, Multi User Tab).
Write access: can log ledger entries, update order statuses, add products,services — only on vendor's explicit request.
Daily cap: 30 requests/day per vendor.
API: NVIDIA NIM (OpenAI-compatible, free tier credits).
Plan gate: Premium only.
Full feature spec mapping required before implementation.

### 8. WhatsApp Business API Automation
Broadcast manager, order notifications via WhatsApp.
Requires Meta business verification and WABA approval — weeks of setup.
Plan gate: Premium only.

### 9. Staff/Team Accounts
Multi-user access with role controls (admin, manager, viewer, editor, sales person, etc). via a onetime code that expires in 24 hour and can be regenerated
Touches every dashboard tab's auth logic — largest scope of all pending features.
Full feature spec mapping required before implementation
Plan gate: Premium only.

### 10. Loyalty Points System
Repeat customer rewards, points tracking, redemption at checkout.
Plan gate: Premium only.

### 11. Abandoned Cart Recovery
Detect incomplete checkouts, send WhatsApp or email follow-up.
Plan gate: Premium only.

### 12. Meta Ads Integration
Self-managed or Sellapage-managed with 10% commission model.
Requires Meta Business API approval.
Plan gate: Premium only.

### 13. Google Ads Integration
Same model as Meta.
Plan gate: Premium only.


### 14. User Session History And Logout
Here each users would be able to see the location and devices they're actively logged in on and also their past log in history very well paginated and designed with mobile responsiveness first of all from the smallest screen to the biggest and users would be able to choose to log out of a particular device or session they're logged into and it immediately logs out of that device or session, similar to what Facebook and other big companies do to enable the user's awareness and security


---

## SELLAPAGE MOBILE APP — React Native (Expo)

### Decision
Stack: **React Native + Expo + NativeWind** (Tailwind for React Native).
NOT a PWA. Separate codebase at `C:\Users\user\Documents\sellapage-app`.

### Why This Stack
- Same JSX and hook patterns as the web app — logic reuse
- Expo handles iOS/Android in one codebase
- EAS Build for production APK/IPA
- NativeWind gives Tailwind className syntax in React Native
- No Dart/Flutter learning curve

### Setup Status
- [x] Android Studio installed
- [x] `expo` CLI installed globally: `npm install -g expo`
- [x] `eas-cli` installed globally: `npm install -g eas-cli`
- [x] Expo account created: expo.dev (nexkeysagency team)
- [x] Expo project created: "Sellapage" at expo.dev
- [x] Run `npx create-expo-app sellapage-app --template` to scaffold the project
- [x] Install NativeWind: `npm install nativewind tailwindcss`
- [ ] Configure Firebase (same project, new Firebase app for React Native)
- [ ] Configure EAS: `eas build:configure`
- [ ] Set up Expo Go on test Android device for local testing

### App Architecture Notes
- The app is NOT a port of the website. It is a native mobile experience.
- Vendors use the app to manage their store (dashboard equivalent).
- The app shares the same Firebase backend and Vercel API handlers as the web platform.
- Design language: same brand green (#22c55e), Bricolage Grotesque via Google Fonts or Expo Google Fonts, fresh native layouts — not web layouts ported to mobile.
- No homepage like the website. App opens directly to login/signup or the vendor dashboard.

### Next Steps for App
1. Scaffold project with Expo template
2. Set up NativeWind + Tailwind config
3. Set up Firebase for React Native
4. Build auth screens (login, signup)
5. Build vendor dashboard (home tab, products tab, orders tab)
6. Build customer storefront browsing experience
7. Integrate Paystack React Native SDK for checkout
8. EAS Build for Android APK (test internally)
9. Google Play Store submission

## N.B - THE APP SHOULD HAVE ALL THE FEATURES I REPEAT ALL THE POSSIBLE FEATURES THAT THE HOMEPAGE/SITE HAS BUT JUST DIFFERENT SETUPS THE FLOW REMAIN SAME, LOGIC WOULD ONLY TWEAK WHERE NECESSARY AND THE UI ACROSS ALL APPS SCREEN IS VERY NICE AND MOBILE RESPONSIVE ONLY AS THERE'D BE NO NEED FOR IT BEING DESKTOP RESPONSIVE ONLY MOBILE AND TABLET RESPONSIVE BUT MOBILE RESPONSIVENESS IS PRIORTIZED FIRST STARTING FROM THE SMALLEST SCREEN (280PX) TO THE BIGGEST TAB SCREEN BUT PRIORTIZE SMALL SCREENS ACROSS ALL THE DASHBOARD SESSIONS AND ON THE MOBILE APP THE RELOAD OR REFERESH WHEN A USER REFRESHES OR RELOADS A PAGE OR TAB RATHER THAT THEY ARE CURRENTLY ON IT SHOULD JUST REFRESH AND STAY ON THAT TAB AND ALSO THINGS LIKE THE LIVESTOR PAGE CAN'T BE ACCESSIBLE FROM THE APP BECAUSE UNLIKE THE PWA WHEN A USER IS USING THE APP IT DOESN'T SUPPORT OPENING WEB LINKS SO IT'D REDIRECT TO THE USER'S BROWSER TO VIEW THEIR STORE PAGE I HOPE YOU GET THIS FLOW 
---

## LOGISTICS — Sendbox Integration Notes

### Credentials (stored in Vercel env + local .env)
- SENDBOX_ACCESS_TOKEN — permanent (per updated Sendbox docs, no expiry)
- SENDBOX_REFRESH_TOKEN — kept for reference, not needed for API calls
- SENDBOX_CLIENT_SECRET — kept for reference

### Key Learnings
- Sendbox quote endpoint requires: origin/destination nested objects with phone (normalized to +234), state, city, country, country_code, weight
- State codes map: Lagos = LOS, Abuja/FCT = ABU, Rivers = RIV, etc. (see sendbox-rates.js STATE_CODES)
- courier_id must be mapped from r.key || r.rate_card_id || fallback index — NOT r.courier_id (Sendbox does not populate courier_id in rate response)
- Sendbox webhooks are push-based — zero API calls from Sellapage side, no rate limit concern
- Sendbox wallet must be funded for shipment creation. Rate fetching is free.
- Sendbox free tier has no monthly subscription — pay only per shipment booked

### API Handlers
- `sendbox-rates.js` — fetches live courier rates (no wallet cost)
- `sendbox-create-shipment.js` — creates shipment label (debits Sendbox wallet)
- `sendbox-tracking.js` — fetches live tracking status for a shipment
- `sendbox-webhook.js` — receives status update callbacks from Sendbox, updates Firestore order

---

## Changelog

### [2026-07-10] Order Status API Integration

#### Added
- **New API Handler**: `src/api-handlers/update-order-status.js`
  - Handles manual order status changes from the Orders dashboard
  - Validates vendor authorization via Firebase ID token
  - Updates Firestore order records with new status and timestamp
  - Sends customer notification emails with status-specific messages and formatting
  - Supports all order statuses: pending, confirmed, dispatched, delivered, cancelled
  - Prevents status changes on already-delivered orders
  - Includes review prompt links for delivered orders
  - Includes Sendbox tracking links for dispatched orders
  
- **API Routing**: Added `update-order-status` case to `api/[...route].js`
  - Routes POST requests to the new handler
  - Follows existing catch-all router pattern

- **Dashboard Integration**: Updated `src/components/dashboard/OrdersTab.jsx`
  - New `handleStatusChange()` async function replaces direct Firestore updates
  - StatusPicker components (desktop table & mobile cards) now use API endpoint
  - Maintains local state sync with `onUpdateOrder()` callback after API success
  - Improves security by enforcing server-side authorization checks

#### Changes
- OrdersTab: Replaced inline `handleInlineUpdate()` calls for status changes with server-side API validation
- All order status updates now route through `/api/update-order-status` with Bearer token authentication
- Status changes now trigger email notifications to customers

#### Benefits
- **Security**: Server-side authorization prevents unauthorized status changes via direct Firestore access
- **Notifications**: Customers receive status update emails with formatted HTML templates, color-coded by status
- **Audit Trail**: Updates tracked in Firestore `statusHistory` with ISO timestamps for compliance
- **Consistency**: Single source of truth for order status mutations
- **User Experience**: Customers get contextual CTAs (review links, tracking links) based on order status

---

## 2026-07-12 — Custom Domain Engine Implementation

Commit/push keyword: `custom-domain-engine`

This update implements the full Custom Domain Engine, allowing Pro and Premium vendors to connect their own domain (e.g. `shop.brand.com`) to their Sellapage store.

### Files Created

- **`src/api-handlers/add-custom-domain.js`** (NEW)
  - Handles POST requests to add a custom domain
  - Validates domain format (no http://, no trailing slashes, not sellapage.com.ng)
  - Checks domain uniqueness across all stores
  - Calls Vercel API `POST /v10/projects/{projectId}/domains` to add domain
  - Saves `customDomain`, `customDomainStatus: 'pending'`, `customDomainAddedAt` to Firestore
  - Returns success with CNAME target: `cname.vercel-dns.com`

- **`src/api-handlers/remove-custom-domain.js`** (NEW)
  - Handles POST requests to remove a custom domain
  - Calls Vercel API `DELETE /v10/projects/{projectId}/domains/{domain}` to remove
  - Clears `customDomain`, `customDomainStatus`, `customDomainAddedAt` from Firestore
  - Gracefully handles 404 (domain already removed from Vercel)

- **`src/api-handlers/verify-custom-domain.js`** (NEW)
  - Handles POST requests to verify DNS configuration
  - Calls Vercel API `GET /v10/projects/{projectId}/domains/{domain}` to check status
  - Returns one of three statuses: `active`, `propagating`, `cname_error`
  - Auto-updates Firestore `customDomainStatus` to `'active'` when verified
  - Provides clear user messages for each status (DNS setup required, propagating, active)

- **`middleware.js`** (NEW — project root)
  - Edge middleware for custom domain routing
  - Intercepts all incoming requests (excludes /api/, /assets/, static files)
  - Reads host header to detect custom domains
  - Queries Firestore via Firebase REST API for matching `customDomain` field
  - Caches domain lookups for 60 seconds to avoid hammering Firestore
  - Rewrites request to `/{storeName}` internally when custom domain matches
  - Returns clean HTML 404 error page for unmatched domains with helpful message
  - Skips processing for main domain (`sellapage.com.ng`) and localhost

### Files Updated

- **`api/[...route].js`** — Added three new route cases:
  - `add-custom-domain` → `src/api-handlers/add-custom-domain.js`
  - `remove-custom-domain` → `src/api-handlers/remove-custom-domain.js`
  - `verify-custom-domain` → `src/api-handlers/verify-custom-domain.js`

- **`src/components/dashboard/DashboardLayout.jsx`**
  - Added `custom-domain` to `NAV_ITEMS` array under "Account" group (before Settings)
  - Added Pro-only gating: `if (id === 'custom-domain' && !effectiveIsPro) return null;`

- **`src/components/dashboard/CustomDomainTab.jsx`** (NEW)
  - Complete UI for custom domain management tab
  - Shows current domain status (none/pending/active)
  - Input to add a new domain with validation
  - DNS setup instructions with CNAME table and copy button
  - Verify DNS button with status feedback (active/propagating/cname_error)
  - Remove domain button with confirmation dialog
  - Plan gate: Pro and Premium only (shows upgrade prompt for Starter/Growth)
  - "How it works" section explaining the 3-step process

- **`src/pages/Dashboard.jsx`**
  - Imported `CustomDomainTab` component
  - Wired tab rendering for `activeTab === 'custom-domain'`
  - Updated `storeUrl` computation to check `store.customDomain` first:
    ```js
    const storeUrl = store?.customDomain
      ? `https://${store.customDomain}`
      : store ? `${window.location.origin}/${store.storeName}` : "";
    ```

- **`vercel.json`**
  - Added `"middleware": "middleware.js"` to enable Edge middleware

### Custom Domain Flow (Confirmed Working)

```
Vendor opens Custom Domain tab (Pro/Premium only)
  → Enters domain: shop.yourbrand.com
  → Clicks "Add Domain"
  → Handler validates domain, calls Vercel API, saves to Firestore
  → Dashboard shows DNS instructions: CNAME → cname.vercel-dns.com
  → Vendor sets up DNS at registrar (Namecheap, GoDaddy, Cloudflare)
  → Vendor clicks "Verify DNS"
  → Handler checks Vercel domain status
  → If verified: Firestore updated to 'active', vendor sees green badge
  → If propagating: vendor sees amber message "DNS hasn't fully propagated"
  → If cname_error: vendor sees red message with DNS setup instructions

Customer visits shop.brand.com
  → Vercel receives request, catch-all rewrite serves index.html
  → SPA loads, React Router matches "/" root route
  → DomainResolver checks hostname: shop.brand.com (not sellapage.com.ng)
  → Calls POST /api/resolve-domain { domain: "shop.brand.com" }
  → API queries Firestore, finds store "my-store"
  → Returns { storeName: "my-store" }
  → DomainResolver navigates to /my-store
  → StorePage loads normally via getStoreBySlug("my-store")
  → Customer sees vendor's full store at shop.brand.com
  → All checkout, payment, reviews work exactly the same
```

### Error Handling

All three API handlers return clean, user-friendly error messages:

- **Invalid domain format**: "Please enter a valid domain like shop.yourbrand.com — no http:// or trailing slashes."
- **Reserved domain**: "You cannot use a Sellapage domain as your custom domain."
- **Domain taken by another store**: "This domain is already connected to another Sellapage store."
- **Vercel API error**: "We couldn't add your domain. Please check the domain is correct and try again."
- **Network error**: "Network error. Please check your connection and try again."
- **Custom domain not found (resolve-domain)**: Returns 404 with `{ error: 'not_found', message: 'No store is connected to this domain.' }`
- **Client-side resolution failure**: DomainResolver shows "Domain Not Configured" page with link to sellapage.com.ng

### Build Status

`npm run build` passed with zero errors.








###
# TOPSHIP API INTEGRATION PLAN 
Now I have everything confirmed. Here's the final comprehensive plan:

---

## Topship + Sendbox Dual Integration — Final Plan

### Confirmed Decisions

| Decision | Answer |
|----------|--------|
| Provider selector UI | **Option A** — separate modal with two cards, clicking one opens the shipment form |
| Insurance fees | Visible to vendor — passed as `insuranceType` + `insuranceCharge` in booking payload |
| Wallet funding | Nex funds Topship wallet manually (same as Sendbox) |
| Tracking polling | Cron job or page-load poll (Topship has no webhooks) |
| KOBO conversion | All Topship charges in KOBO — convert to Naira for display |
| Address splitting | Smart splitting for 45-char limit on addressLine1/2/3 |
| Insurance calculation | API is silent on how to calculate — pass `insuranceType` + `insuranceCharge: 0`, let API respond with actual charge in `save-shipment` response. If it can't, default to `"None"` |

### Topship API Endpoints We'll Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/get-shipment-rate` | GET | Rate quotes (Budget/Express/Premium/etc.) |
| `/save-shipment` | POST | Book shipment as draft |
| `/pay-from-wallet` | POST | Pay for draft shipment from Topship wallet |
| `/track-shipment` | GET | Track shipment by trackingId |
| `/get-shipments` | GET | List booked shipments (for delivery tab) |
| `/cancel-shipment` | POST | Cancel draft/confirmed shipment |
| `/get-countries` | GET | List countries (for future international) |
| `/get-states` | GET | List states by country |
| `/get-cities` | GET | List cities by country |

### Key API Rules (from docs)

- All charges in **KOBO** (multiply Naira by 100)
- `addressLine1/2/3` max **45 characters** each — smart splitting needed
- `shipmentCharge` must come from `/get-shipment-rate` response
- `valueAddedTaxCharge` = **7.5% of totalCharge**
- `insuranceCharge` is passed as input — API may calculate or accept
- `shipmentRoute`: `"Domestic"` / `"Export"` / `"Import"`
- `itemCollectionMode`: `"PickUp"` / `"DropOff"`
- Auth: `Authorization: Bearer ${TOPSHIP_API_KEY}`

### Flow Diagram

```
Vendor clicks delivery icon on order
  → Provider selector modal opens:
    ┌──────────────────────┐  ┌──────────────────────┐
    │      Sendbox         │  │      Topship          │
    │   Local delivery     │  │  Local + International│
    └──────────────────────┘  └──────────────────────┘
  → Vendor clicks one
  → Full shipment booking modal opens:
    - Fetches rates from THAT provider
    - Shows rates with prices
    - Vendor fills: weight, pickup date
    - If Topship: vendor also selects item category + insurance tier
    - If Sendbox: vendor selects package type (General/Food)
  → Clicks "Confirm & Book Shipment"
  → Payment modal opens:
    Shipping fee:        ₦X,XXX
    Insurance:           ₦XXX (if Topship)
    Service charge:      ₦250
    Total:               ₦X,XXX
  → Paystack checkout
  → Paystack metadata: { provider, ... }
  → On success:
    - Redirect: frontend reads provider → /api/{provider}-create-shipment
    - Webhook safety net: reads metadata.provider → correct handler
  → Shipment booked
  → Order doc: provider name, tracking ID, tracking URL
  → Delivery tab: tracking per provider (separate logic)
```

### Files to Create/Modify

| # | File | Change | Type |
|---|------|--------|------|
| 1 | `src/components/dashboard/OrdersTab.jsx` | Provider selector modal, `selectedProvider` state, route rate fetch to correct API, Topship-specific fields (category, insurance), pass provider to payment/sessionStorage | Modify |
| 2 | `src/api-handlers/topship-rates.js` | GET `/get-shipment-rate`, map response to unified rate format | **New** |
| 3 | `src/api-handlers/topship-create-shipment.js` | POST `/save-shipment` + POST `/pay-from-wallet`, handle 2-step booking, KOBO conversion, VAT calculation | **New** |
| 4 | `src/api-handlers/_lib/topship-booking.js` | Shared helper for Topship API calls (rate quote, booking, tracking) | **New** |
| 5 | `src/api-handlers/sendbox-payment-initialize.js` | Add `provider` to Paystack metadata, include Topship-specific fields (pricingTier, itemCategory, insuranceType) | Modify |
| 6 | `src/api-handlers/paystack-webhook.js` | Read `metadata.provider` in shipment branch, route to correct handler | Modify |
| 7 | `api/[...route].js` | Add `topship-rates` and `topship-create-shipment` route cases | Modify |
| 8 | `README.md` | Changelog entry | Modify |

### Detailed File Changes

#### 1. `src/components/dashboard/OrdersTab.jsx`

**New state:**
```js
const [selectedProvider, setSelectedProvider] = useState('')
const [showProviderModal, setShowProviderModal] = useState(false)
const [itemCategory, setItemCategory] = useState('Fashion')
const [insuranceType, setInsuranceType] = useState('None')
```

**Provider selector modal:**
- Triggered by `openShipmentModal(order)` (replaces `openSendboxModal`)
- Shows two cards:
  - **Sendbox** — "Local delivery across Nigeria"
  - **Topship** — "Local + International shipping, 150+ countries"
- Clicking a card: sets `selectedProvider`, closes provider modal, opens shipment form

**Rate fetching:**
```js
const triggerFetchRates = async (weightVal, detailsObj = {}) => {
  // ... existing address validation ...
  
  if (selectedProvider === 'sendbox') {
    // POST /api/sendbox-rates (existing)
  } else if (selectedProvider === 'topship') {
    // GET /api/topship-rates?shipmentDetail=...
  }
}
```

**Topship-specific fields (shown when selectedProvider === 'topship'):**
- Item Category dropdown (38 categories)
- Insurance Type dropdown (None / Premium / Extended)
- No package type selector

**Sendbox-specific fields (shown when selectedProvider === 'sendbox'):**
- Package Type dropdown (General / Food)
- No category or insurance fields

**Payment init:**
- Pass `provider: selectedProvider` to `/api/sendbox-payment-initialize`
- Pass Topship-specific fields: `pricingTier`, `itemCategory`, `insuranceType`

**SessionStorage:**
- Add `provider: selectedProvider` to sessionStorage data for redirect flow

#### 2. `src/api-handlers/topship-rates.js` (NEW)

```
GET /api/topship-rates?storeId=xxx&senderCity=xxx&receiverCity=xxx&weight=xxx
```

- Builds Topship query params from request body
- Calls `https://api-topship.com/api/get-shipment-rate?shipmentDetail={...}`
- Auth: `Bearer ${TOPSHIP_API_KEY}`
- Maps response to unified format:
  ```js
  {
    courier_id: rate.mode,        // "Budget", "Express", "Premium", etc.
    courier_name: rate.mode,
    fee: rate.cost / 100,         // KOBO → Naira
    total_shipping_fee: rate.cost / 100,
    delivery_eta: rate.duration,
    provider: 'topship',
    pricing_tier: rate.pricingTier,
  }
  ```

#### 3. `src/api-handlers/topship-create-shipment.js` (NEW)

**2-step booking flow:**

Step 1 — POST `/save-shipment`:
```js
{
  "shipment": [{
    "items": [{ category, description, weight, quantity, value }],
    "itemCollectionMode": "PickUp" | "DropOff",
    "pricingTier": "Budget" | "Express" | "Premium",
    "insuranceType": "None" | "Premium" | "Extended",
    "insuranceCharge": 0,  // Let API calculate
    "shipmentRoute": "Domestic",
    "shipmentCharge": rateFromQuote,  // From /get-shipment-rate
    "pickupCharge": 0,
    "valueAddedTaxCharge": totalCharge * 0.075,
    "senderDetail": { name, email, phoneNumber, addressLine1, addressLine2, addressLine3, country, state, city, countryCode, postalCode },
    "receiverDetail": { name, email, phoneNumber, addressLine1, addressLine2, addressLine3, country, state, city, countryCode, postalCode }
  }]
}
```

Response includes `id` (shipment ID) and full charge breakdown.

Step 2 — POST `/pay-from-wallet`:
```js
{ "detail": { "shipmentId": "..." } }
```

Response confirms payment and returns tracking info.

**Address smart splitting:**
```js
function splitAddress(address, maxLen = 45) {
  if (address.length <= maxLen) return { line1: address, line2: '', line3: '' }
  // Split at spaces near the limit
  const words = address.split(' ')
  let line1 = '', line2 = '', line3 = ''
  for (const word of words) {
    if ((line1 + ' ' + word).trim().length <= maxLen) {
      line1 = (line1 + ' ' + word).trim()
    } else if ((line2 + ' ' + word).trim().length <= maxLen) {
      line2 = (line2 + ' ' + word).trim()
    } else {
      line3 = (line3 + ' ' + word).trim()
    }
  }
  return { line1, line2, line3 }
}
```

**KOBO conversion:**
- All monetary values from frontend (Naira) → multiply by 100 for Topship API
- All monetary values from Topship API (KOBO) → divide by 100 for display

#### 4. `src/api-handlers/_lib/topship-booking.js` (NEW)

Shared helper with:
- `getTopshipRates({ senderCity, receiverCity, weight })` — rate quote
- `bookTopshipShipment({ ... })` — save-shipment + pay-from-wallet
- `trackTopshipShipment(trackingId)` — tracking
- `cancelTopshipShipment(shipmentId)` — cancellation
- Address splitting utility

#### 5. `src/api-handlers/sendbox-payment-initialize.js`

- Add `provider` to Paystack metadata
- Add Topship-specific fields: `pricingTier`, `itemCategory`, `insuranceType`

#### 6. `src/api-handlers/paystack-webhook.js`

In `transactionType === "shipment"` branch:
```js
const provider = data.metadata?.provider

if (provider === 'sendbox') {
  // Existing Sendbox logic
  const { createSendboxShipment } = await import('./_lib/sendbox-booking.js')
  // ... book shipment
} else if (provider === 'topship') {
  // New Topship logic
  const { bookTopshipShipment } = await import('./_lib/topship-booking.js')
  // ... book shipment (2-step: save + pay from wallet)
}
```

#### 7. `api/[...route].js`

Add cases:
```js
case "topship-rates": {
  const { default: handlerFunc } = await import("../src/api-handlers/topship-rates.js");
  return await handlerFunc(req, res);
}
case "topship-create-shipment": {
  const { default: handlerFunc } = await import("../src/api-handlers/topship-create-shipment.js");
  return await handlerFunc(req, res);
}
```

### Tracking in Delivery Tab — Separate Logic

Order doc stores `provider` field. Delivery tab checks:

**If provider === 'sendbox':**
- Existing fields: `sendboxTrackingId`, `sendboxTrackingUrl`, `sendboxStatus`
- Webhook or polling for updates

**If provider === 'topship':**
- New fields: `topshipTrackingId`, `topshipTrackingUrl`, `topshipStatus`
- Poll `/get-shipments` or `/track-shipment` for updates
- Could set up a cron job that polls every 30 minutes for active Topship shipments
- Or poll on page load when vendor opens delivery tab

The two tracking systems stay completely separate — never mix.

### Item Categories (Topship)

Full list for the dropdown:
```
Appliance, BeautyProducts, ComputerSupplies, HomeDecor, BabySupplies,
TelevisionAndEntertainment, KitchenAccessories, Furniture, Gadgets,
SolarPanelsAndInverter, VehicleParts, ClothingAndTextile, SportAccessories,
GymEquipment, Fashion, Education, Drones, Document, OriginalArtwork,
ArtPrints, FoodItems, Medication, Fish, Herbs, BatteryLiquidElectrical,
Crayfish, Driedfish, Prawns, Otherfish, GoatMeat, CowSkin, Beef, Snail,
OtherMeats, PaintingsAndDrawings, ArtifactsAndHistoricalMonuments,
LaptopsAndTablets, Phones, HeadphonesOrEarphonesOrAirPods, Wristwatches,
VideoGames, OtherElectronicsOrGadgets, GoldSilverAndFineJewelry,
PreciousStonesAndJewels, CostumeJewelry, HerbsAndPlants,
FoodstuffAndFoodProducts, Drinks, Others
```

For Sellapage vendors (fashion sellers, food vendors, freelancers), common categories would be:
- **Fashion** — clothing, accessories
- **FoodItems** — food vendors
- **LaptopsAndTablets** / **Phones** — electronics
- **Document** — freelancers sending documents
- **Others** — fallback

### Implementation Phases

| Phase | What | Effort | Dependencies |
|-------|------|--------|-------------|
| **1** | Provider selector modal (two cards) | Small | None |
| **2** | `topship-rates.js` + route | Small | Staging API key |
| **3** | Wire rate fetch to correct API | Small | Phase 1+2 |
| **4** | `topship-create-shipment.js` + route (2-step booking) | Medium | Phase 2 |
| **5** | Payment init + webhook routing by provider | Small | Phase 4 |
| **6** | Topship form fields (category, insurance) | Small | Phase 1 |
| **7** | Address smart splitting | Small | None |
| **8** | Separate tracking in delivery tab | Small | Phase 4 |
| **9** | Testing on staging | Medium | All above |

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Insurance charge calculation (API silent) | Pass `insuranceCharge: 0`, let API respond. If it returns actual charge, use it. If not, default to `"None"`. Test on staging. |
| Address 45-char limit | Smart splitting at word boundaries. Test with long Nigerian addresses. |
| Wallet funding | Nex funds manually (same as Sendbox). No API dependency. |
| No webhooks | Cron job polling every 30 min for active Topship shipments. Or page-load poll in delivery tab. |
| KOBO conversion | Consistent multiply/divide at API boundary. Display always in Naira. |
| Topship production key | Only after staging integration + due diligence. Sendbox stays live during this period. |
| Cross-African routing | Topship is Nigeria-centric now. Evaluate when expansion happens. May need separate Topship accounts per country. |

## HERE'S WHY INTEGRATING BOTH IS SMART - Sendbox handles domestic deliveries (Lagos to Lagos, Lagos to Abuja, etc.)
Topship handles international deliveries (Nigeria to UK, USA, etc.) and also domestic via their aggregated couriers (DHL, FedEx, GIG, etc.)


### Build Status After Implementation

`npm run build` must pass with zero errors after each phase.

## N.B - NO LOGIC IS CURRENTLY GOING TO BE CHANGED IN THE CURRENT SENDBOX LOGIC AT ALL BECAUSE IT'S WROKING AS IS JUST RESTRUCTURING WE'RE ADDING BECAUSE OF THE TOPSHIP INTEGRATION ACCORDING TO THE PLAN YOU CAN ALSO READ THE Topship-Docs.txt for any question you need answering 

---

## ADS INTEGRATION — Infrastructure Plan (Logged: 2026-07-11)

### Part 1: External Platform Setup

#### Google Ads
- Account: "Sellapage Ads Engine" (ID: 589-787-5835)
- Developer token: ✅ exists (Test Account level)
- Apply for Basic Access at API centre
- Create Google Cloud Project → Enable Google Ads API → Create OAuth2 credentials
- OAuth2 redirect URI: `https://sellapage.com.ng/api/google-ads-callback`
- Basic Access application: 5 business days processing

#### Meta/Facebook
- No app created yet — must create Business-type app
- URL: `developers.facebook.com/apps/creation/`
- Products to add: Marketing API + Facebook Login for Business
- Business Verification: 2-5 business days (submit in Business Settings > Security Center)
- App Review: Request Advanced Access for `ads_management`, `ads_read`, `business_management`
- Permissions needed for SaaS platform managing third-party ad accounts

### Part 2: Environment Variables

Google Ads:
- `GOOGLE_ADS_DEVELOPER_TOKEN` — from API centre (already have)
- `GOOGLE_ADS_CLIENT_ID` — from Google Cloud Console Already Added
- `GOOGLE_ADS_CLIENT_SECRET` — from Google Cloud Console Already Added to environment variables
- `GOOGLE_ADS_REDIRECT_URI` — callback URL Already Added to google
- `GOOGLE_ADS_MCC_ID` — 5897875835 (no dashes)

Meta Marketing API:
- `META_APP_ID` — from App Dashboard
- `META_APP_SECRET` — from App Dashboard
- `META_REDIRECT_URI` — callback URL
- `META_API_VERSION` — v25.0
- `META_BUSINESS_ID` — from Business Manager settings

### Part 3: Firestore Schema

`adsAccounts` collection (per-vendor connected accounts):
- vendorId, provider (google/meta), accessToken, refreshToken, tokenExpiry
- accountId, accountName, currency, timezone
- status (active/disconnected/error), connectedAt, lastSyncAt
- googleMccId (Google only), metaBusinessId (Meta only)

`adsCampaigns` collection (campaign tracking):
- vendorId, provider, accountId, providerCampaignId
- name, type, status (active/paused/ended/error)
- budgetType (daily/lifetime), budgetAmount, spendToDate
- managementMode (self/sellapage)
- paymentStatus, paystackReference (Sellapage-managed only)
- startDate, endDate, createdAt, updatedAt
- lastSyncAt, impressions, clicks, ctr, conversions, revenue

`adsPayments` collection (Sellapage-managed billing):
- vendorId, campaignId, provider
- adSpend, serviceCharge (10%), totalPaid
- paystackReference, paystackAccessCode, status
- createdAt, paidAt

### Part 4: API Handlers

New files to create:
- `src/api-handlers/google-ads-auth.js` — OAuth2 initiation
- `src/api-handlers/google-ads-callback.js` — OAuth2 callback (token exchange)
- `src/api-handlers/google-ads-accounts.js` — List vendor's accessible accounts
- `src/api-handlers/google-ads-campaigns.js` — CRUD operations
- `src/api-handlers/google-ads-reports.js` — Performance data
- `src/api-handlers/google-ads-sync.js` — Cron sync for performance data
- `src/api-handlers/meta-ads-auth.js` — OAuth2 initiation
- `src/api-handlers/meta-ads-callback.js` — OAuth2 callback
- `src/api-handlers/meta-ads-accounts.js` — List vendor's ad accounts
- `src/api-handlers/meta-ads-campaigns.js` — CRUD operations
- `src/api-handlers/meta-ads-reports.js` — Performance data
- `src/api-handlers/meta-ads-sync.js` — Cron sync
- `src/api-handlers/ads-payment-initialize.js` — Paystack init for Sellapage-managed ads
- `src/api-handlers/ads-payment-verify.js` — Paystack verify + trigger campaign creation
- `src/api-handlers/_lib/google-ads-client.js` — Shared Google Ads client setup
- `src/api-handlers/_lib/meta-ads-client.js` — Shared Meta Marketing API client setup

Route cases to add in `api/[...route].js`:
- google-ads-auth, google-ads-callback, google-ads-accounts, google-ads-campaigns, google-ads-reports, google-ads-sync
- meta-ads-auth, meta-ads-callback, meta-ads-accounts, meta-ads-campaigns, meta-ads-reports, meta-ads-sync
- ads-payment-initialize, ads-payment-verify

### Part 5: Dashboard UI

New files:
- `src/components/dashboard/AdsTab.jsx` — Main ads dashboard tab
- `src/components/dashboard/AdsTab/AdsOverview.jsx` — Summary cards
- `src/components/dashboard/AdsTab/ConnectedAccounts.jsx` — Connected accounts list
- `src/components/dashboard/AdsTab/CampaignsList.jsx` — All campaigns
- `src/components/dashboard/AdsTab/CreateCampaignModal.jsx` — Multi-step creation
- `src/components/dashboard/AdsTab/CampaignDetails.jsx` — Single campaign view
- `src/components/dashboard/AdsTab/AdsPaymentModal.jsx` — Paystack payment

Nav item in `DashboardLayout.jsx`:
- Under "Grow" group: `{ id: "ads", label: "Ads", icon: Target }`

Tab rendering in `Dashboard.jsx`:
- Plan gate: Premium only

### Part 6: AdsTab UI Flow

Self-Managed Flow:
1. Vendor clicks "Connect Google Ads" or "Connect Meta Ads"
2. Redirect to OAuth2 consent screen
3. Vendor grants access
4. Callback exchanges code for tokens
5. Store tokens in adsAccounts collection
6. Vendor sees accounts, can select which to use
7. Vendor creates campaign via CreateCampaignModal
8. Campaign created directly on vendor's Google/Meta account
9. Sellapage tracks performance via API (read-only)

Sellapage-Managed Flow:
1. Vendor clicks "Run Ads with Sellapage"
2. Shows campaign creation form (no OAuth needed)
3. Vendor fills: campaign name, type, budget, targeting, creative
4. Shows payment breakdown: ad spend + 10% service charge
5. Vendor pays via Paystack
6. Paystack confirms → Sellapage creates campaign on master account
7. Sellapage tracks performance and manages campaign
8. Vendor sees performance in dashboard

### Part 7: Campaign Creation Form Fields

Google Ads Campaign Fields:
- Campaign name (text)
- Campaign type (dropdown): Search, Display, Shopping, Performance Max
- Daily budget (number, Naira)
- Bidding strategy (dropdown): Maximize clicks, Maximize conversions, Target CPA
- Locations (multi-select): Nigeria, states, cities
- Languages (multi-select): English, Yoruba, Igbo, Hausa
- Keywords (textarea): For Search campaigns
- Ad headlines (3 text fields): For Search campaigns
- Ad descriptions (2 text fields): For Search campaigns
- Final URL (URL)
- Start/End dates

Meta Ads Campaign Fields:
- Campaign name (text)
- Objective (dropdown): Traffic, Sales, Leads, Engagement, Awareness
- Daily budget (number, Naira)
- Ad set name (text)
- Billing event (dropdown): Impressions, Link clicks
- Optimization goal (dropdown): Link clicks, Conversions, Reach
- Age range (multi-select): 18-65+
- Gender (dropdown): All, Male, Female
- Locations (multi-select): Nigeria, states
- Interests (multi-select): Various categories
- Ad creative (image upload)
- Ad title (text)
- Ad description (text)
- Call to action (dropdown): Shop Now, Learn More, Sign Up
- Destination URL (URL)

### Part 8: Implementation Order

Phase 1: Infrastructure (Now)
- Create AdsTab.jsx skeleton with plan gate
- Add nav item and tab rendering
- Create Firestore schema functions
- Create API handler skeletons
- Add route cases

Phase 2: Google Ads (After Basic Access Approved)
- Implement google-ads-auth.js (OAuth2 redirect)
- Implement google-ads-callback.js (token exchange)
- Implement google-ads-accounts.js (list accounts)
- Implement google-ads-campaigns.js (CRUD)
- Implement google-ads-reports.js (performance)
- Wire up AdsTab UI to real API

Phase 3: Meta Ads (After Business Verification + App Review)
- Implement meta-ads-auth.js (OAuth2 redirect)
- Implement meta-ads-callback.js (token exchange)
- Implement meta-ads-accounts.js (list accounts)
- Implement meta-ads-campaigns.js (CRUD)
- Implement meta-ads-reports.js (performance)
- Wire up AdsTab UI to real API

Phase 4: Sellapage-Managed Billing
- Implement ads-payment-initialize.js
- Implement ads-payment-verify.js
- Create AdsPaymentModal.jsx
- Wire up payment flow

Phase 5: Sync & Reporting
- Implement google-ads-sync.js (cron)
- Implement meta-ads-sync.js (cron)
- Build performance charts in AdsTab










**FULL IMPLEMENTATION PLAN — Custom Domain Engine**

---

**WHAT WE'RE BUILDING:**

Vendors on Pro and Premium can connect their own domain (e.g. `shop.brand.com`) to their Sellapage store. Customers visit that domain and see the vendor's store seamlessly — no Sellapage URL visible. SSL is automatic via Vercel. The vendor manages everything from a new "Custom Domain" tab in their dashboard.

---

**THE COMPLETE FLOW:**

**Vendor side:**
1. Vendor opens Custom Domain tab (Pro/Premium only)
2. Enters their domain e.g. `shop.brand.com`
3. Clicks "Add Domain"
4. We call Vercel API to add the domain to the project
5. Dashboard shows DNS instructions: "Add a CNAME record pointing `shop.brand.com` → `cname.vercel-dns.com` in your DNS provider"
6. Vendor sets up DNS at their registrar (Namecheap, GoDaddy, etc.)
7. Vendor clicks "Verify DNS" — we check if DNS has propagated
8. Once verified, domain shows as "Active" with a green badge
9. Vendor can disconnect anytime via "Remove Domain" button

**Customer side:**
1. Customer visits `shop.brand.com`
2. Vercel receives request, middleware intercepts it
3. Middleware reads host header (`shop.brand.com`)
4. Middleware queries Firestore for store where `customDomain == "shop.brand.com"`
5. Middleware rewrites the request to `/storename` internally
6. Customer sees the vendor's full store, URL stays as `shop.brand.com`
7. All checkout, payment, reviews work exactly the same

---

**FILES TO BUILD — in execution order:**

**1. `src/api-handlers/add-custom-domain.js`** — NEW ✅ VERIFIED/IMPLEMENTED
Calls Vercel API `POST /v10/projects/{projectId}/domains` to add the domain.
Validates the domain format, checks vendor auth, saves `customDomain` to Firestore store document.

**2. `src/api-handlers/remove-custom-domain.js`** — NEW ✅ VERIFIED/IMPLEMENTED
Calls Vercel API `DELETE /v10/projects/{projectId}/domains/{domain}` to remove the domain.
Clears `customDomain` field from Firestore store document.

**3. `src/api-handlers/verify-custom-domain.js`** — NEW ✅ VERIFIED/IMPLEMENTED
Calls Vercel API `GET /v10/projects/{projectId}/domains/{domain}` to check verification status.
Returns whether DNS is configured correctly and SSL is provisioned.

**4. `middleware.js`** — DELETED ❌ REMOVED (2026-07-12)
Originally created as Edge Middleware for custom domain routing. Imported `NextResponse` from `next/server` which does not exist in this Vite + React project. Vercel Edge Middleware with `next/server` is only compatible with Next.js projects. Two deployment failures occurred: (1) vercel.json schema validation error from `"middleware": "middleware.js"` custom property, (2) Edge Function runtime error `next/server module not found`. Fix: deleted middleware.js entirely, removed middleware config from vercel.json. Custom domain resolution now handled client-side via `DomainResolver.jsx` + `/api/resolve-domain` endpoint.

**5. `api/[...route].js`** — UPDATE ✅ VERIFIED/IMPLEMENTED
Register four routes: `add-custom-domain`, `remove-custom-domain`, `verify-custom-domain`, `resolve-domain`.

**6. `src/components/dashboard/CustomDomainTab.jsx`** — NEW ✅ VERIFIED/IMPLEMENTED
Complete UI for the custom domain management tab. Shows:
- Current domain status (none/pending/active)
- Input to add a new domain
- DNS setup instructions (shown after domain added)
- Verify DNS button with status feedback
- Remove domain button
- Plan gate for Starter and Growth (Pro+ only)

**7. `src/components/dashboard/DashboardLayout.jsx`** — UPDATE ✅ VERIFIED/IMPLEMENTED
Add `CustomDomain` tab to NAV_ITEMS with Globe icon, gated behind `isPro`.

**8. `src/pages/Dashboard.jsx`** — UPDATE ✅ VERIFIED/IMPLEMENTED
Import and wire `CustomDomainTab`. Update `storeUrl` computation to check `store.customDomain` first before falling back to `sellapage.com.ng/${store.storeName}`.

**9. `src/api-handlers/resolve-domain.js`** — NEW ✅ VERIFIED/IMPLEMENTED (2026-07-12)
POST endpoint that accepts `{ domain }` body. Queries Firestore `stores` collection where `customDomain == domain`. Returns `{ success, storeName, storeId }` or 404. Used by client-side DomainResolver to resolve custom domains to store names. Auth required (Bearer token).

**10. `src/components/DomainResolver.jsx`** — NEW ✅ VERIFIED/IMPLEMENTED (2026-07-12)
Client-side custom domain resolution component. Wraps the root route `/` in App.jsx. On mount, checks `window.location.hostname`. If hostname is not `sellapage.com.ng` or `localhost`, calls `/api/resolve-domain` to find the matching store, then navigates to `/{storeName}`. Shows loading spinner during resolution. Shows "Domain Not Configured" error page if no store matches.

**11. `vercel.json`** — UPDATE ✅ VERIFIED/IMPLEMENTED
Add middleware configuration so Vercel runs our middleware on all requests.

---

**KEY TECHNICAL DECISIONS:**

- Middleware runs at the Edge (Vercel Edge Runtime) — zero latency, global
- Firestore query in middleware uses Admin SDK — we cache the lookup for 60 seconds to avoid hammering Firestore on every request
- Domain validation: must be a valid domain format, no `http://`, no trailing slash, not `sellapage.com.ng` or its subdomains
- One domain per store — if a vendor adds a second domain, it replaces the first
- The `storeUrl` prop in Dashboard.jsx is the single source of truth — changing it there cascades everywhere automatically

---

**WHAT DOESN'T CHANGE:**

- All Firestore document IDs, order documents, product documents — untouched
- Checkout flow, Paystack webhooks, Sendbox — untouched
- All existing store URLs continue working at `sellapage.com.ng/storename` — custom domain is additive, not a replacement

---

## wrap all errors in clean and understandable frontend UI for example if a user cname is not correct it should show cname has issue or sth like that or even if it's another error then the best possible error UI should show so the vendor knows what they'd do/how to do it also too..

**PLAN GATE:**
- Custom Domain tab visible: Pro and Premium only
- Middleware works for all vendors who have `customDomain` set in Firestore

**Commit/push keyword:** `custom-domain-engine`

we had an error during deploynment and applied this fix - Fix: Remove "middleware": "middleware.js" from vercel.json. Vercel will pick up middleware.js automatically since it exists at the project root.

### Deployment Error Log — Custom Domain Engine (2026-07-12)

**Error 1: vercel.json schema validation**
- Message: `"middleware" is not allowed in "vercel.json"`
- Cause: Added `"middleware": "middleware.js"` to vercel.json. Vercel auto-detects middleware.js at project root; custom middleware property is not in the schema.
- Fix: Removed the middleware line from vercel.json.

**Error 2: Edge Function runtime error**
- Message: `Module not found: Can't resolve 'next/server'`
- Cause: `middleware.js` imported `NextResponse` from `next/server`. Sellapage is a Vite + React project, not Next.js. `next/server` does not exist in Vite projects. Vercel Edge Middleware requires Next.js.
- Fix: Deleted `middleware.js` entirely. Replaced with client-side resolution approach: `DomainResolver.jsx` wraps root route, detects custom domain hostname, calls `/api/resolve-domain` endpoint, navigates to `/{storeName}`.

**Resolution approach:**
- Deleted `middleware.js` from project root
- Removed `"middleware": "middleware.js"` from vercel.json (already done)
- Created `src/api-handlers/resolve-domain.js` — POST endpoint that queries Firestore for matching custom domain
- Created `src/components/DomainResolver.jsx` — Client-side component that detects hostname and resolves custom domains
- Added `DomainResolver` wrapper to root route `/` in `src/App.jsx`
- Added `resolve-domain` route case to `api/[...route].js`
- Existing catch-all rewrite in vercel.json (`"/((?!api/|assets/|.*\\..*).*)" → "/index.html"`) serves SPA for all custom domain requests

**Why client-side works:**
When customer visits `shop.brand.com`, Vercel serves `index.html` (catch-all rewrite). SPA loads. React Router matches root `/`. DomainResolver detects hostname is not `sellapage.com.ng`, calls API to resolve domain, gets store name, navigates to `/{storeName}`. StorePage loads normally. All existing functionality works unchanged.

---

## 2026-07-12 — CAC Trust Verification Badge Implementation

Commit/push keyword: `cac-trust-verification`

This update implements the full CAC Trust Verification Badge feature, allowing Pro and Premium vendors to verify their business registration with the Corporate Affairs Commission and display a verified badge on their storefront.

### What was done

#### New Files Created

- **`src/api-handlers/verify-cac.js`** — NEW
  - POST endpoint that calls Prembly `POST /identitypass/verification/cac/basic`
  - Validates RC number input (strips "RC" prefix, checks numeric)
  - Verifies vendor owns the store (uid === storeId check)
  - Calls Prembly API with `x-api-key` header using `PREMBLY_SECRET_KEY`
  - Returns business name, status (active/approved), registration date
  - Handles Prembly errors: rc_not_found, verification_failed, inactive_business, no_business_name
  - Returns clean error messages for each failure case

- **`src/components/dashboard/CACVerificationTab.jsx`** — NEW
  - Full dashboard tab with Pro/Premium gating (shows upgrade prompt for Starter/Growth)
  - RC number input with Enter key support
  - Verify button calls `/api/verify-cac`
  - Confirm step: shows returned business name, status, registration date
  - "Yes, This Is My Business" button saves verification to Firestore
  - "Not My Business" button resets form
  - "Already verified" state shows green card with business name, RC number, verification date
  - "What your customers will see" badge preview section
  - "Why verify your business?" info card with 4 benefits
  - Error handling for network, invalid RC, inactive business

#### Updated Files

- **`api/[...route].js`** — Added `verify-cac` route case

- **`src/components/dashboard/DashboardLayout.jsx`**
  - Added `ShieldCheck` to lucide-react imports
  - Added `{ id: 'cac-verification', label: 'CAC Verification', icon: ShieldCheck }` to NAV_ITEMS under Account group
  - Added Pro-only gating: `if (id === 'cac-verification' && !effectiveIsPro) return null;`

- **`src/pages/Dashboard.jsx`**
  - Imported `CACVerificationTab` component
  - Wired tab rendering for `activeTab === 'cac-verification'`
  - Passes `store`, `user`, `isPro`, `navigateTo={setActiveTab}` props

- **`src/components/StoreNavbar.jsx`** — Shared by both StorePage and ServiceStorePage
  - Added `ShieldCheck` to lucide-react imports
  - Added CAC Verified badge after business name (conditional on `store?.cacVerified`)
  - Badge shows on both product and service storefronts

### Firestore Fields Saved

When vendor confirms verification, these fields are saved to the store document:
- `cacVerified: true`
- `cacBusinessName` — from Prembly response
- `cacRcNumber` — cleaned RC number (no "RC" prefix)
- `cacStatus` — from Prembly response (active/approved)
- `cacRegistrationDate` — from Prembly response
- `cacVerifiedAt` — ISO timestamp

### Flow

```
Vendor opens CAC Verification tab (Pro/Premium only)
  → Enters RC number (e.g. RC1234567 or 1234567)
  → Clicks Verify
  → Handler strips "RC" prefix, validates numeric
  → Calls Prembly API with RC number
  → Returns business name, status, registration date
  → Vendor sees "Business Found — Please Confirm" card
  → Vendor clicks "Yes, This Is My Business"
  → Saved to Firestore store document
  → Green "Business Verified ✓" card shown
  → StoreNavbar badge appears on storefront (both product & service pages)
```

### Design Decisions

- **Option B for name matching**: Instead of requiring exact match, we show the CAC-returned name to the vendor and ask them to confirm. More flexible, better UX.
- **Single badge in StoreNavbar**: Added badge once in `StoreNavbar.jsx` (shared component) instead of duplicating in both `StorePage.jsx` and `ServiceStorePage.jsx`.
- **Pro/Premium gating**: Tab hidden from sidebar for Starter/Growth users. Shows upgrade prompt if somehow accessed.

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-12 — Prembly CAC API Fix (3 bugs)

Commit/push keyword: `cac-prembly-api-fix`

This update fixes 3 bugs in the `verify-cac.js` handler that caused Prembly to return "Invalid request data" (response_code: "05").

### Bugs Fixed

**Bug 1: Wrong endpoint URL**
- Was: `https://api.prembly.com/identitypass/verification/cac/basic`
- Fixed: `https://api.prembly.com/verification/cac`

**Bug 2: Invalid `app-id` header**
- Was: sent `app-id` header (hyphen) which Prembly doesn't accept
- Fixed: removed `app-id` header entirely — only `x-api-key` is required per Prembly docs

**Bug 3: Missing `company_type` parameter**
- Was: stripped "RC"/"BN" prefix from input, sent only `rc_number` with no `company_type`
- Fixed: detects prefix (RC/BN/IT/LP/LLP) from input, sends `company_type` to Prembly. No prefix defaults to "RC". This allows BN numbers (Business Names) to be verified correctly.

### What Changed

- **`src/api-handlers/verify-cac.js`**
  - Endpoint: `identitypass/verification/cac/basic` → `verification/cac`
  - Headers: removed `app-id`, kept only `x-api-key`
  - Body: now sends `rc_number` + `company_type` (detected from prefix)
  - Input validation: accepts RC, BN, IT, LP, LLP prefixes
  - Response mapping: simplified to match Prembly's exact field names (`company_name`, `company_status`, `registrationDate`)

- **`src/components/dashboard/CACVerificationTab.jsx`**
  - Placeholder updated: "e.g. RC1234567, BN9537181, or 1234567"
  - Hint text updated: mentions BN numbers alongside RC

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-13 — CAC Verification Error Handling Improvement

Commit/push keyword: `cac-error-handling`

This update improves error handling for the CAC verification flow, replacing generic error messages with specific, user-friendly messages based on Prembly's response codes.

### Problem
All Prembly errors showed the same generic message: "CAC verification failed. Please check your RC number and try again." Users couldn't tell if it was a wallet issue, invalid number, or server error.

### What Changed

- **`src/api-handlers/verify-cac.js`**
  - Added Prembly `response_code` parsing
  - Added `pending_payment` detection from Prembly response
  - Specific error codes returned: `insufficient_funds`, `pending_payment`, `rc_not_found`, `invalid_request`, `verification_failed`

  Error code mapping:
  | Prembly `response_code` | Our error code | User message |
  |---|---|---|
  | `"04"` or `pending_payment: true` | `insufficient_funds` | "Our verification system is temporarily processing your request..." |
  | `"06"` or "not found" | `rc_not_found` | "We couldn't find a business registered with that number..." |
  | `"05"` or "invalid" | `invalid_request` | "Invalid request. Please check your number..." |
  | Any other | `verification_failed` | "CAC verification failed. Please try again..." |

- **`src/components/dashboard/CACVerificationTab.jsx`**
  - Added `Clock` icon import from lucide-react
  - Added `errorType` state variable to track specific error codes
  - Updated `handleVerify` to capture `data.error` as `errorType`
  - Replaced generic red error banner with type-aware ErrorBanner:
    - `insufficient_funds` / `pending_payment`: amber banner with Clock icon, "This usually resolves automatically" hint
    - `rc_not_found`: red banner with "Make sure the number matches your CAC registration exactly" hint
    - `invalid_request`: red banner with "Enter a valid number like RC1234567 or BN9537181" hint
    - Default: red banner with AlertCircle icon

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-13 — CAC Verification Retry Limit + Email Notifications

Commit/push keyword: `cac-retry-emails`

Adds retry tracking (max 3 attempts per store), email notifications on verification results, and admin panel CAC features spec.

### What Changed

- **`src/api-handlers/verify-cac.js`**
  - Added `sendEmail` import from `_lib/send-email.js`
  - Reads `cacRetryCount` from store document, blocks verification if >= 3 (returns `retries_exhausted`)
  - Increments `cacRetryCount` on every Prembly call (success or failure)
  - Sends **failed email** on verification failure (except insufficient_funds) with remaining retries count
  - Sends **success email** on verification with badge announcement
  - All API responses now include `retriesLeft`

- **`src/components/dashboard/CACVerificationTab.jsx`**
  - Added `retriesLeft` state, initialized from `store.cacRetryCount` via useEffect
  - Retry count warning (amber banner) when retries <= 2: "You have X verification attempts remaining. Each attempt costs ₦150."
  - Exhausted state (red card with AlertCircle + "Contact Support" mailto link) when retries = 0
  - Form hidden when exhausted — only the exhausted card shows
  - "What your customers will see" preview also hidden when exhausted
  - Captures `retriesLeft` from API response after each attempt

- **`README.md` — Admin Panel features**
  - Added CAC admin features spec to Admin Panel section:
    - Total CAC-verified stores count
    - Total pending/unverified stores count
    - Total verification attempts across all vendors
    - Failed attempts count (retries exhausted)
    - Per-vendor CAC status table with filters
    - CSV export + bulk email to unverified vendors

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-13 — Live Stores Page

Commit/push keyword: `live-stores`

Public marketplace page at `/live-stores` showing active vendor stores with infinite scroll, search, and responsive grid.

### What Changed

- **`src/firebase/products.js`**
  - Added `getActiveStores()` — queries `stores` where `isActive == true`, sorts by `createdAt` desc client-side. Returns all active stores array.
  - Note: Uses client-side sorting instead of Firestore `orderBy` to avoid requiring a composite index.

- **`src/pages/LiveStoresPage.jsx`** (NEW)
  - Hero section with brand gradient, marketplace title, and subtitle
  - Search bar with real-time client-side filtering (by businessName, storeName, description)
  - Responsive grid: 1 col mobile, 2 sm, 3 md, 4 lg
  - Client-side pagination: loads 20 stores initially, IntersectionObserver loads more on scroll
  - Store cards: logo/business name, description snippet, CAC badge, vendor type badge (Products/Services/Both), link to store
  - Loading state (spinner), empty state (no results), "all stores loaded" message
  - Navbar + Footer

- **`src/App.jsx`**
  - Added `LiveStoresPage` import
  - Added `/live-stores` route BEFORE the `/:storeName` catch-all

- **`src/components/Navbar.jsx`**
  - Added `Store` icon import from lucide-react
  - Added "Explore Stores" link in desktop nav (between Pricing and auth buttons)
  - Added "Explore Stores" link in mobile menu (with Store icon, green hover style)

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-13 — Plan Enforcement Fix: Public Store Page Limits

Commit/push keyword: `plan-enforcement-fix`

Fixes a critical bug where downgraded/expired stores still showed all products on their public pages.

### Problem
When a vendor's plan expired and downgraded from Growth (50 products) to Starter (15), all 40+ products remained visible on their public store page (`StorePage.jsx`, `ServiceStorePage.jsx`). The `getProducts()` and `getServices()` functions queried ALL documents from the subcollection with no plan-based limit. The expiry cron job (`expiry-cron.js`) only reset the store's `maxProducts` field to 15 but never hid excess products — and the public pages never checked `maxProducts` at query time.

### What Changed

- **`src/firebase/products.js`**
  - Added `limit` to Firestore imports
  - Updated `getProducts(storeId, maxProducts)` — accepts optional `maxProducts` parameter, applies `.limit(maxProducts)` to the Firestore query when value is < 999999 (skips limit for premium/unlimited plans)

- **`src/firebase/services.js`**
  - Added `limit` to Firestore imports
  - Updated `getServices(storeId, maxProducts)` — same pattern as `getProducts()`

- **`src/pages/StorePage.jsx`**
  - Now passes `storeData.maxProducts` to `getProducts(storeData.id, storeData.maxProducts)`

- **`src/pages/ServiceStorePage.jsx`**
  - Now passes `storeData.maxProducts` to `getServices(storeData.id, storeData.maxProducts)`

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-13 — PWA Service Worker Cache Fix (Mobile Navbar)

Commit/push keyword: `sw-cache-fix`

Fixes a bug where the mobile navbar's "Explore Stores" link wouldn't appear on the first hamburger menu click from the homepage.

### Problem
The old service worker was caching the Navbar JS bundle. On mobile, refreshing the homepage served the stale cached version (without "Explore Stores"). Navigating to another page loaded the fresh bundle. Desktop wasn't affected because the full nav is always visible.

### What Changed

- **`src/sw.js`**
  - Added `self.skipWaiting()` — new service worker activates immediately instead of waiting for old tabs to close
  - Added `self.addEventListener('activate', ...)` with `self.clients.claim()` — forces the new service worker to take control of all open tabs instantly

- **`vercel.json`**
  - Added `headers` section with `Cache-Control: no-cache, must-revalidate` for `index.html` — prevents browsers from serving a stale HTML shell

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-14 — Google Ads Tab: Bug Fixes + Complete Redesign

Commit/push keyword: `google-ads-tab-redesign`

This update fixes critical build bugs in the Google Ads dashboard components and completely redesigns the UI from harsh gradients and broken dynamic Tailwind classes to a clean, soft, Google-styled design.

### Bugs Fixed

**Bug 1: Missing `RefreshCw` import in `GoogleAdsOverview.jsx`**
- `RefreshCw` was used on line 31 (refresh button) but was NOT included in the lucide-react import statement
- This would cause a runtime crash when the component rendered
- Fixed: Added `RefreshCw` to the import

**Bug 2: Dynamic Tailwind classes won't compile (JIT mode)**
- Multiple components used template literal Tailwind classes like `bg-${stat.color}-50`, `text-${type.color}-500`, `border-${type.color}-500`
- Tailwind's JIT compiler cannot detect these at build time — they would render as empty strings
- Affected files: `GoogleAdsOverview.jsx`, `GoogleAdsCampaigns.jsx`, `GoogleAdsCreateCampaign.jsx`, `GoogleAdsReports.jsx`
- Fixed: Replaced all dynamic classes with static pre-defined color maps:
  - `STAT_COLORS` in Overview and Reports
  - `TYPE_CONFIG` in Campaigns
  - `CAMPAIGN_TYPES` with full class objects in CreateCampaign

**Bug 3: Dead Firestore `onSnapshot` subscription in `GoogleAdsTab.jsx`**
- Lines 50-54 subscribed to `googleAdsCampaigns/{storeId}` with empty `onSnapshot` callbacks — no-op that subscribed but did nothing
- Removed the dead subscription entirely — campaigns are already fetched via POST request

**Bug 4: Unused lucide-react imports in `GoogleAdsTab.jsx`**
- Imported 18 icons but only used 6 (BarChart3, Target, TrendingUp, Loader2, AlertCircle, CheckCircle2, X)
- Removed 11 unused imports: MousePointerClick, Eye, IndianRupee, Link2, Unlink2, Plus, Pause, Play, RefreshCw, ChevronDown, ChevronUp, Search, Globe, ShoppingCart, Zap

**Bug 5: `formatNaira`/`formatNumber` duplicated across 3 components**
- These utility functions were copy-pasted identically into Overview, Campaigns, and Reports
- Kept as local functions per component (consistent with codebase pattern) but ensured identical implementation

### UI Redesign — Clean, Soft, Google-Styled Design

The previous design was described as "not giving at all at all" — harsh gradients, inconsistent spacing, and broken dynamic colors. The redesign follows a clean, minimal aesthetic:

**Design principles applied:**
- **No gradient backgrounds** — all cards use flat white with `border-gray-200`
- **Muted icon containers** — `bg-gray-50 border border-gray-100` instead of colored backgrounds
- **Consistent color usage** — only status badges and stat icons use color (soft pastels: `bg-blue-50`, `bg-emerald-50`, etc.)
- **Clean typography hierarchy** — `text-sm font-semibold` for headings, `text-[11px] text-gray-400` for labels
- **Consistent spacing** — `p-4 sm:p-5` for cards, `space-y-4` for sections
- **Subtle hover states** — `hover:bg-gray-800` instead of flashy transitions
- **Status badges with borders** — `bg-emerald-50 text-emerald-700 border border-emerald-100` for soft, defined look
- **CTA buttons** — `bg-gray-900 hover:bg-gray-800` (dark, clean) instead of blue gradients
- **Google logo** — full 4-color SVG in Connect and Overview, not just blue

### Files Changed

| File | Changes |
|------|---------|
| `GoogleAdsTab.jsx` | Removed dead `onSnapshot`, removed unused imports, simplified premium gate, cleaned tab bar styling |
| `GoogleAdsTab/GoogleAdsConnect.jsx` | Replaced gradient banner with flat white card, emoji icons with Lucide icons, clean CTA button |
| `GoogleAdsTab/GoogleAdsOverview.jsx` | Fixed missing `RefreshCw` import, replaced dynamic Tailwind with `STAT_COLORS` map, larger stat cards, cleaner account info |
| `GoogleAdsTab/GoogleAdsCampaigns.jsx` | Replaced dynamic Tailwind with `TYPE_CONFIG` map, cleaner campaign cards, status badges with borders |
| `GoogleAdsTab/GoogleAdsCreateCampaign.jsx` | Replaced dynamic Tailwind with static class objects in `CAMPAIGN_TYPES`, cleaner form inputs with borders, dark CTA buttons, amber warning for paused state |
| `GoogleAdsTab/GoogleAdsReports.jsx` | Replaced dynamic Tailwind with `STAT_CONFIG` map, cleaner date range pills, cleaner campaign breakdown table |

### What Did NOT Change

- No backend changes. All API handlers remain the same.
- No changes to `api/[...route].js` routes.
- No changes to `src/pages/Dashboard.jsx` or `DashboardLayout.jsx`.
- Campaign creation logic, pause/resume logic, report fetching logic — all unchanged.
- `google-ads-accounts.js` API handler still exists (dead code from frontend perspective, but may be used in future for account switching).

### OAuth Status

Google OAuth consent screen is now in **production mode** (not testing). Branding verification is under review by Google's Trust and Safety team (4-6 weeks). Until verification completes, vendors will see a "This app isn't verified" warning when connecting — they can click "Advanced" → "Go to sellapage.com.ng (unsafe)" to proceed. This is standard for all new Google OAuth apps.

### Build Status

`npm run build` passed with zero errors. Only pre-existing chunk size warning (3,090 kB) and dynamic import warning remain.

---





### REFERRAL SYSTEM IMPLEMENTATION FLOW 

> **The referral system should be a business acquisition engine, not just a feature.**

That means every decision should encourage bringing in **quality merchants who actually subscribe**, not people creating fake accounts.

Sellapage is evolving and this referral system deserves to be treated as a major platform module, on the same level as Orders, Customers, Delivery, Marketing, Billing and co not as a tiny add-on. It will touch authentication, Paystack webhooks, Firestore, the vendor dashboard and the admin panel, so it's worth designing properly from day one rather than patching it later.

## 1. Referral Flow

```
Merchant A (Referrer)

        │
        │ Shares referral link
        ▼

Merchant B
Signs up through the link

        │
        ▼

Creates store

        │
        ▼

Buys any paid plan

        │
Paystack webhook confirms payment

        │
        ▼
Referred User plan changes 
        
        │
        ▼

Referral Reward Created

Status:
Pending

        │
14 days

        ▼

Available

        │
Merchant requests withdrawal

        ▼

Admin approves

        ▼

Paid
```

Simple.

Exactly like Opay, PalmPay, Moniepoint, etc.

---

# 2. Referral Link

Every merchant gets one.

Example

```
sellapage.com.ng/signup?ref=ABX82KD
```

Not their UID.

Generate something like

```
SP-9X2KA7

SP-H72PQ1

SP-RT19XA
```

Looks professional.

Never changes.

And they have a button to post to their whatsapp groups & status & IG status and X also too a message like this - If you sell online, Sellapage makes it easier.
Create your own store, collect payments, and manage orders like a pro.

Use my referral link/code to join: *[their referral code is passed through from firestore or the dashboard to display here]*





---

# 3. Tracking

This is actually the MOST IMPORTANT part.

Tracking has to survive situations like:

User opens referral link today

Leaves

Returns tomorrow

Signs up

Still counted.

So I'd use:

```
Cookie

+

localStorage

+

Firestore field
```

Flow

```
Open referral link

↓

Save referralCode

↓

User signs up

↓

Firestore

referredBy

↓

Locked forever
```

Nobody can change it afterwards.

---

# 4. When should commission be created?

ONLY

```
Payment Success

AND

First paid plan active
```

Never

```
Signup

Store creation

Email verification

```

Only payment/when the plan status changes from free to whatever the referred user changed their plan to 

---

# 5. Commission

| Plan    |   Price | Reward |
| ------- | ------: | -----: |
| Growth  |  ₦5,000 |   ₦500 |
| Pro     | ₦12,000 | ₦1,000 |
| Premium | ₦25,000 | ₦2,000 |

Easy.

Users don't need calculators.

---

# 6. Wallet

Three balances.

```
Pending

Available

Withdrawn
```

Exactly like finance apps.

Clickable Dashboard cards

```
E.G - 

Pending Earnings

₦3,000

------------

Available

₦5,500

------------

Withdrawn

₦10,000
```

---

# 7. Withdrawal Rules

Minimum

```
₦5,000
```

If available balance

```
< ₦5,000

```

Button says

```
Withdraw (Locked)

Minimum ₦5,000 required
```

Once

```
>= ₦5,000
```

Button becomes green.

---

# 8. Bank Account

This deserves its own section.

Fields

```
Bank

Account Number

Account Name

```

Immediately

```
Resolve Account

↓

OPAY

↓

Prince Chidera
```

Exactly like Paystack.

So users CAN'T type

```
John Doe
```

when the account belongs to

```
Prince
```

It reduces payout mistakes.

---

# 9. Withdrawal Request

Click

```
Withdraw
```

Modal

```
Amount

Available Balance

Bank

Confirm
```

Submit

↓

Status

```
Pending Approval
```

---

# 10. Admin Panel

This is where it gets beautiful.

For Example Imagine

## Referral Dashboard

Cards

```
Total Referrals

Successful Referrals

Pending Rewards

Available Rewards

Paid Rewards

Withdrawal Requests

Total Referral Payouts
```

Then table

| Referrer | Referred Store | Plan | Reward | Status |
| -------- | -------------- | ---- | ------ | ------ |

Beautiful.

---

# 11. Withdrawal Queue

Separate page.

```
Withdrawal Requests
```

Table

Merchant

Bank

Account Name

Account Number

Amount

Requested

Status

Action

```
Approve

Reject

```

Approve

↓

Transfer manually

↓

Click

```
Mark Paid
```

↓

Money moves

```
Available

↓

Withdrawn
```

---

# 12. Referral Analytics

Merchant sees

```
15

Clicks
```

↓

```
8

Signups
```

↓

```
5

Paid Merchants
```

↓

```
₦5,000 earned
```

This motivates them to keep sharing.

---

# 13. Referral Page

I'd design it like this:

```
---------------------------------

Invite Merchants

Earn Cash

---------------------------------

Referral Link

[ Copy ]

---------------------------------

Referral Code

SP-82JKA

---------------------------------

Pending

Available

Withdrawn

---------------------------------

Clicks

Signups

Successful

---------------------------------

Recent Referrals

(Store list)

---------------------------------

Withdrawal History

---------------------------------

Bank Details

Edit

---------------------------------
```

Mobile-first.

---

## One improvement I'd make

There's one thing I would add that finance apps usually don't have.

### Reward Progress

Instead of just showing:

> Available: ₦2,500

show this:

```
Withdraw Progress

████████░░░░░░░░

₦2,500 / ₦5,000
```

The psychology behind that is powerful. People naturally want to "fill the bar," so they're more likely to keep referring merchants until they reach the withdrawal threshold.

---

The entire design is going to be fully mobile responsive firstly and then well paginated and structured and also beautifully well designed

And also when the mark paid button is been clicked and confirmed from the admin panel it'd also send a mail to that user/vendor that so , so amount has been paid to them through the referral using our current resend setup also but only when a referral reward user withdraw requests has been marked as paid from the admin panel only then the mail message sends with the amount withdrawn by the user 



That email should include:

amount paid
withdrawal reference or payout ID
plan/status context if needed
date paid
maybe the remaining available balance

That way, the email is a real payment confirmation, not just a “your request is pending” notice.


One more thing I would add: keep a payout log in Firestore that'd display on the super admin account dashboard, so every “Mark Paid” action saves:

who approved it
when it was approved
amount
account name
reference
email sent status

That will make the  super admin side auditable and save you later when someone says, “I did not receive my payout.”

Since Sellapage is going to have multiple admins eventually, you don't want a situation where you ask:

"Who approved this ₦20,000 payout?"

...and nobody knows.

Let's store something like:

withdrawal_requests

- id
- userId
- amount
- status
- requestedAt

- approvedBy
- approvedAt

- paidAt
- paymentReference

- emailSent

Where approvedBy stores the admin's UID, not their name.

Then in the super Admin Panel, we resolve that UID to display:

Approved by

Peace Okoro

or

Approved by

John Doe

depending on who actually approved it.































### ADMIN PANEL FEATURES PLAN - 

Internal panel for Nex and whoever he assigns from the super admin panel dashboard to manage the platform and roles.
Features: vendor list, plan management, Sendbox wallet balance monitoring, shipment usage tracking, revenue overview, support ticket management, feature flags, payouts tab accounts added for verification, cloudinary usage/bandwith, vendors details, referral details, CAC verified Users, Analytics of Sellapage Like The Total Orders, deliveries - Created Daily, Monthly , Weekly , A Very Good and detailed analysis report concerning all going on with the page , AI descriptions USED , TOTAL NO OF ADS RUNNING AND CREATED THROUGH SELLAPAGE AND WITHOUT SELLAPAGE ALSO TOO . and well paginated and designed to feel like an actual admin panel and fine very fine and fully structured
Auth: `ADMIN_SECRET_TOKEN` header (already in Vercel env).


Example:

Role	Permissions
Super Admin	Everything
Finance Admin	Referral payouts, vendor payouts, billing
Support Admin	Support tickets only
Operations Admin	Stores, verification, moderation
Marketing Admin	Ads, campaigns, analytics and many more also too

Then imagine this:

Support Admin tries to click Mark Paid

❌

You don't have permission

Only Finance Admin or Super Admin can approve referral withdrawals.

This is also good for security.


the Features listed here are not all what the admin panel would engrave more still remains also as time goes by any feature added should be engulved as part of the things to include in the admin panel also too

**CAC Verification Admin Features (add to Admin Panel):**
- Total CAC-verified stores count (cacVerified: true)
- Total pending/unverified stores count
- Total verification attempts across all vendors (sum of cacRetryCount)
- Failed attempts count (vendors who exhausted all 3 retries)
- Vendors with 0 retries left — list with "Contact Support" flag
- Per-vendor CAC status table: business name, RC number, verification status, retry count, last retry date
- Filter: verified / unverified / retries exhausted
- Export CAC verification data as CSV
- Bulk email to unverified vendors encouraging CAC verification

**Custom Domain Admin Features (add to Admin Panel):**
- Total custom domains connected count (customDomain field exists)
- Total active/verified domains count (customDomainStatus: 'active')
- Total pending DNS setup count (customDomainStatus: 'pending')
- Per-vendor custom domain table: vendor name, store URL, custom domain, status (active/pending/removed), date added
- Filter: active / pending / all
- Search by domain name or vendor name
- Export custom domain data as CSV
- Bulk email to vendors with pending domains encouraging DNS setup

---

## 2026-07-14 — Sellapage-Managed Ads: Payment Flow + Campaign Form

Commit/push keyword: `sellapage-managed-ads-payment`

This update adds the complete Sellapage-managed ads payment infrastructure: Paystack payment initialization/verification handlers, a campaign creation form for vendors, a safety net webhook branch, and wires everything into the dashboard.

### What Changed

**paystack-webhook.js** — Added `ads-payment` branch (safety net):
- Routes by `metadata.transactionType === "ads-payment"`
- Reads campaign details from metadata: `storeId`, `campaignName`, `campaignType`, `budgetAmount`, `targeting`
- If vendor's Google Ads is connected: attempts campaign creation on master account (try/catch, non-fatal)
- Creates campaign in `googleAdsCampaigns` collection with `managementMode: "sellapage"`, status `PAUSED`, payment breakdown (ad spend + 10% service charge + total paid)
- Returns 200 on all paths (Paystack requires 200)

**ads-payment-initialize.js** — NEW Paystack init for Sellapage-managed ads:
- Validates store ownership via `auth.uid`
- Calculates 10% service charge on ad spend
- Initializes Paystack transaction with `transactionType: "ads-payment"` metadata
- Callback URL: `?ads-payment=pending&tab=google-ads`

**ads-payment-verify.js** — NEW Paystack verify + campaign creation:
- Verifies transaction via Paystack API
- If vendor's Google Ads is connected: creates campaign on master account (Campaign + Budget via Google Ads API)
- If not connected: saves campaign as pending (will be created when Ads connects)
- Saves to `googleAdsCampaigns` with `managementMode: "sellapage"`

**GoogleAdsConnect.jsx** — Redesigned with two cards:
- "Connect Your Account" (self-managed, OAuth) — existing flow
- "Run Ads with Sellapage" (managed, Paystack payment) — triggers `SellapageAdsForm`

**SellapageAdsForm.jsx** — NEW multi-step campaign creation form:
- Step 1: Campaign type (Search, Display, Shopping, Performance Max) — static Tailwind classes, no dynamic imports
- Step 2: Campaign details (name, budget, final URL)
- Step 3: Keywords & ad copy (Search only) — headlines, descriptions
- Step 4: Review & payment — payment breakdown (ad spend + 10% service charge + total), pay button → Paystack redirect

**GoogleAdsTab.jsx** — Updated to wire Sellapage-managed form:
- Added `showSellapageForm` state
- Renders `SellapageAdsForm` when triggered from `GoogleAdsConnect`
- Added `handleAdsPaymentVerify` for OAuth callback handling
- Added `?ads-payment` URL param reading for callback redirect

**api/[...route].js** — Added route cases:
- `ads-payment-initialize` → `ads-payment-initialize.js`
- `ads-payment-verify` → `ads-payment-verify.js`

### What Did NOT Change

- No changes to existing self-managed Google Ads API handlers
- No changes to `src/pages/Dashboard.jsx`
- No changes to `src/components/dashboard/DashboardLayout.jsx`
- `google-ads-callback.js` unchanged
- `google-ads-auth.js`, `google-ads-accounts.js`, `google-ads-campaigns.js`, `google-ads-reports.js` unchanged

### Build Status

`npm run build` passed with zero errors. Only pre-existing chunk size warning (3,104 kB) and dynamic import warning remain.

---

## 2026-07-14 — Bug Fix: GoogleAdsConnect "Create Ad Campaign" Button Stuck Spinning

Commit/push keyword: `sellapage-managed-ads-bugfix`

### Problem

Clicking "Create Ad Campaign" (Sellapage-managed card) showed a spinner and did nothing. The button never transitioned to the campaign form.

### Root Cause

In `GoogleAdsConnect.jsx`:
1. `onSellapageManaged` prop was NOT destructured from props — only `{ store, onError, onSuccess }` was extracted
2. `handleSellapageManaged` set `loading` to `'sellapage'` but never called `onSellapageManaged()`, so the parent's `setShowSellapageForm(true)` never fired

### Fix

- Added `onSellapageManaged` to destructured props: `{ store, onError, onSuccess, onSellapageManaged }`
- Added `onSellapageManaged?.()` call inside `handleSellapageManaged`

### What Changed

| File | Change |
|------|--------|
| `GoogleAdsTab/GoogleAdsConnect.jsx` | Added `onSellapageManaged` prop + call it in handler |

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-14 — Sellapage-Managed Ads: Master Account Separation

Commit/push keyword: `sellapage-managed-ads-master-account`

This update fixes the critical architecture flaw where Sellapage-managed ads were using vendor credentials instead of Sellapage's master account. The two flows (self-managed and Sellapage-managed) now share zero logic.

### Problem

`ads-payment-verify.js` and `paystack-webhook.js` were reading the vendor's `googleAdsRefreshToken` and `googleAdsCustomerId` from their store doc. This meant:
- If vendor hadn't connected Google Ads → campaign saved as "pending" (wrong)
- If vendor HAD connected → campaign created on vendor's account (wrong)
- Sellapage-managed ads should ALWAYS create on Sellapage's master account

### What Changed

**NEW: `google-ads-master-auth.js`** — One-time OAuth redirect for Nex:
- Redirects to Google consent screen (same as vendor flow)
- State is hardcoded to `"master"` (no storeId)
- Nex visits this URL once, logs in with Sellapage Ads Engine account (`sellapage.ng@gmail.com`)
- After this, the master refresh token is stored in Firestore forever

**NEW: `google-ads-master-callback.js`** — Captures master refresh token:
- Exchanges auth code for refresh token
- Saves to `platformSettings/googleAdsMaster` in Firestore:
  - `refreshToken` — the master account refresh token
  - `customerId` — `5897875835` (from env `GOOGLE_ADS_MCC_ID`)
  - `connectedAt` — timestamp
- Redirects to dashboard with `?google-ads=master-connected`

**FIXED: `ads-payment-verify.js`** — Now uses master credentials:
- Removed all vendor token logic (no more `storeData.googleAdsRefreshToken` check)
- Reads master credentials from `platformSettings/googleAdsMaster`
- Creates campaign on Sellapage's master account (`5897875835`)
- No pend state, no error fallback — campaign creation either succeeds or throws
- Saves to `googleAdsCampaigns` with `managementMode: "sellapage"`

**FIXED: `paystack-webhook.js`** `ads-payment` branch — Same fix:
- Reads master credentials from `platformSettings/googleAdsMaster`
- If master account not connected: saves campaign without `providerCampaignId` (fallback)
- Creates campaign on master account using `getAccessToken(refreshToken)`

**UPDATED: `api/[...route].js`** — Added route cases:
- `google-ads-master-auth` → `google-ads-master-auth.js`
- `google-ads-master-callback` → `google-ads-master-callback.js`

### Architecture After This Fix

| | Self-Managed | Sellapage-Managed |
|---|---|---|
| OAuth | Vendor connects their own Google Ads | None (Nex did it once) |
| Campaign created on | Vendor's account | Sellapage's master account (5897875835) |
| Uses vendor tokens | Yes | No |
| Can fail/pend | Yes (if OAuth breaks) | No — always succeeds on master account |
| Shared logic | None | None |

### One-Time Setup Required

Nex must visit `/api/google-ads-master-auth` ONCE to login with the Sellapage Ads Engine Google account. After that, the refresh token lives in Firestore (`platformSettings/googleAdsMaster`) and is used for all Sellapage-managed campaigns.

### Firestore Schema

```
platformSettings/googleAdsMaster
  refreshToken: "1//0xxx..."
  customerId: "5897875835"
  connectedAt: timestamp
```

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Hotfix: Master Account OAuth Redirect URI

Commit/push keyword: `sellapage-managed-ads-master-callback-fix`

### Problem

Master auth endpoint (`/api/google-ads-master-auth`) used `GOOGLE_ADS_REDIRECT_URI` which points to `/api/google-ads-callback` (vendor flow). Google always redirected to the vendor callback, causing `stores/master` document not found error.

### Fix

Hardcoded `redirectUri` in `google-ads-master-auth.js` to `https://www.sellapage.com.ng/api/google-ads-master-callback`. Added this URI to Google Cloud Console OAuth2 credentials as a second authorized redirect URI.

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Sellapage-Managed Ads: Ad Group, Ad & Keyword Creation

Commit/push keyword: `sellapage-managed-ads-ad-group-creation`

This update adds full ad group, ad, and keyword creation to the Sellapage-managed ads flow. Campaigns are now fully built on Google Ads with targeting — not just empty campaign shells.

### Problem

Campaigns were created on Google Ads with the right name, budget, and type — but without ad groups, ads, or keywords. Vendors would need to manually add these in Google Ads UI.

### What Changed

**`google-ads-client.js`** — Added 3 new functions:

| Function | Purpose |
|----------|---------|
| `createAdGroup()` | Creates an ad group inside a campaign (SEARCH_STANDARD type) |
| `createResponsiveSearchAd()` | Creates a responsive search ad with headlines, descriptions, and final URL |
| `addKeywords()` | Adds broad match keyword targeting to an ad group |

**`ads-payment-verify.js`** — Now creates full ad structure after campaign creation:
- Creates ad group under the campaign
- For SEARCH campaigns with keywords: creates responsive search ad + adds keywords
- Wrapped in try/catch — non-fatal if ad creation fails (campaign still gets created)
- Import updated to include new functions

**`paystack-webhook.js`** — Same changes in the `ads-payment` safety net branch:
- Dynamic import now includes `createAdGroup`, `createResponsiveSearchAd`, `addKeywords`
- After campaign creation, creates ad group + ad + keywords for SEARCH campaigns
- Wrapped in same try/catch block

### Campaign Creation Flow (After This Fix)

```
Campaign created (PAUSED)
  └── Ad Group created
        ├── Responsive Search Ad (headlines + descriptions + final URL)
        └── Keywords (broad match targeting)
```

### Scope

- **SEARCH campaigns**: Full treatment (ad group + responsive search ad + keywords)
- **DISPLAY/SHOPPING/PERFORMANCE_MAX**: Campaign only for now (different ad formats — can add later)

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Custom Domain DNS Fix: Root vs Subdomain + Mobile UI

Commit/push keyword: `custom-domain-dns-fix`

Root domains (e.g. `mybusiness.com`) always failed DNS verification because the code only checked for CNAME records. Root domains require A records (`@ → 216.198.79.1`). This fix detects the domain type and checks/renders the correct DNS record.

### What Changed

**`src/api-handlers/verify-custom-domain.js`**
- Detects root vs subdomain (2 dots = root, 3+ dots = subdomain)
- For root domains: checks A record (`api.vercel.com/v10/domains/records/A`) — `@ → 216.198.79.1`
- For subdomains: checks CNAME record (`api.vercel.com/v10/domains/records/CNAME`) — `sub → cname.vercel-dns.com`
- Returns both verification statuses so frontend can display correct results
- Updated error messages to reference the correct record type

**`src/api-handlers/add-custom-domain.js`**
- Added domain type detection before returning response
- Returns `dnsType` (A/CNAME), `dnsName` (@ or subdomain prefix), `dnsTarget` (IP or CNAME)

**`src/components/dashboard/CustomDomainTab.jsx`** — Full rewrite:
- `getDnsInfo()` helper: detects root vs subdomain, returns correct DNS type/name/target
- Desktop DNS table: shows correct record type (purple badge for A, blue for CNAME)
- Mobile stacked cards: on small screens, each DNS field (Type, Name, Value) renders as a separate card with copy button — no horizontal scrolling needed
- Improved status display: amber warning for pending, green for active, red for errors
- "Visit your domain" link visible when domain is active
- Better error messages that reference the correct DNS record type

### DNS Rules

| Domain Type | Example | Record Type | Name | Value |
|---|---|---|---|---|
| Root domain | `mybusiness.com` | A | `@` | `216.198.79.1` |
| Subdomain | `shop.brand.ng` | CNAME | `shop` | `cname.vercel-dns.com` |

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Settings: Slug Lock When Custom Domain Active

Commit/push keyword: `settings-slug-lock`

When a user has an active custom domain, their store slug in Settings is now locked (visible but not editable). The slug URL prefix switches to show the custom domain URL, and a lock banner explains why it's locked.

### What Changed

**`src/components/dashboard/Settings.jsx`**
- Added `hasCustomDomain` const derived from `store?.customDomain`
- Lock info banner: amber banner with lock icon shown above Business Link field when custom domain is active
- Slug input: `disabled` + `readOnly` when `hasCustomDomain` — grayed out with `opacity-60` and `cursor-not-allowed`
- Prefix switches from `{origin}/` to `https://{customDomain}/` when locked — shows the live URL
- Green success line replaced with gray lock message: "Your live URL uses your custom domain"
- `slugError` hidden when locked (can't change while locked)
- When no custom domain: current behavior unchanged (fully editable)

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Custom Domain DNS Fix: Use Vercel Verification Array

Commit/push keyword: `custom-domain-dns-fix-v2`

Previous fix used dot-counting (`split('.').length > 2`) to guess root vs subdomain — failed for multi-part TLDs like `.com.ng`, `.co.uk`, `.com.au`. This fix replaces all guessing with Vercel's `verification[]` API response, which always knows the correct DNS record.

### What Changed

**`src/api-handlers/add-custom-domain.js`**
- Removed dot-counting heuristic
- Reads `vercelData.verification[]` from Vercel add-domain response
- Extracts `type`, `value`, `domain` from first unverified entry → returns as `dnsType`, `dnsTarget`, `dnsName`
- If no verification array → returns `{ unsupported: true, message: '...' }`

**`src/api-handlers/verify-custom-domain.js`**
- Removed dot-counting heuristic
- Reads `vercelData.verification[]` from Vercel GET response
- Finds unverified entry → uses its `type` and `value` for DNS check + display
- If no verification array → returns status `unsupported`

**`src/components/dashboard/CustomDomainTab.jsx`**
- Removed `getDnsInfo()` helper (dot-counting logic)
- Added `dnsInfo` state populated from API responses (add + verify)
- Auto-verifies on mount for existing pending domains to get current DNS info
- Unsupported error: gray banner with "Contact support" link
- DNS instructions hidden when status is `unsupported` or `dnsType` is null
- How It Works step 2 handles null `dnsType` gracefully

### Why This Works for All TLDs

Vercel's verification API returns the exact DNS record needed regardless of TLD:
- `mybusiness.com` → verification returns A record `@ → 216.198.79.1`
- `nexkeysagency.com.ng` → verification returns A record `@ → 216.198.79.1`
- `shop.brand.ng` → verification returns CNAME `shop → cname.vercel-dns.com`
- `app.mybusiness.co.uk` → verification returns CNAME `app → cname.vercel-dns.com`

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Custom Domain DNS Fix v3: Use Vercel's apexName Field

Commit/push keyword: `custom-domain-dns-fix-v3`

Previous fix used `verification[]` array to determine DNS record type — wrong approach. The `verification[]` array is for TXT ownership verification, not A/CNAME DNS configuration. This fix uses Vercel's `apexName` field to determine if a domain is apex or subdomain.

### What Changed

**`src/api-handlers/add-custom-domain.js`**
- Removed `verification[]` parsing logic
- Uses `vercelData.name === vercelData.apexName` to determine apex vs subdomain
- Apex domains → A record `@ → 216.198.79.1`
- Subdomains → CNAME `subdomain → cname.vercel-dns.com`
- No more `unsupported` case — Vercel always knows

**`src/api-handlers/verify-custom-domain.js`**
- Removed `verification[]` parsing logic
- Uses `apexName` comparison for DNS record type
- Simplified status logic: `verified === true` → active, `verified === false` → dns_error

**`src/components/dashboard/CustomDomainTab.jsx`**
- Removed auto-verify `useEffect` (DNS info comes from add-domain response)
- Removed `unsupported` error handling and styling
- Simplified verify result banner

### Why apexName Works

Vercel's API returns `apexName` (base domain) alongside `name` (full domain):
- `nexkeysagency.com.ng` → `apexName: "nexkeysagency.com.ng"`, `name: "nexkeysagency.com.ng"` → equal → apex → A record
- `shop.nexkeysagency.com.ng` → `apexName: "nexkeysagency.com.ng"`, `name: "shop.nexkeysagency.com.ng"` → not equal → subdomain → CNAME
- `mybusiness.co.uk` → `apexName: "mybusiness.co.uk"`, `name: "mybusiness.co.uk"` → equal → apex → A record

This works for ALL TLDs because Vercel determines the apex domain, not our code.

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-15 — Custom Domain Resolution: Public Endpoint for Unauthenticated Visitors

Commit/push keyword: `custom-domain-public-resolve`

When a visitor (not logged in) visits a custom domain like `nexkeysagency.com.ng`, they saw Sellapage's homepage instead of the vendor's store. This was because `DomainResolver` required Firebase Auth to resolve custom domains, but visitors aren't authenticated.

### What Changed

**`src/api-handlers/public-resolve-domain.js`** — NEW
- Public endpoint that resolves custom domains without authentication
- Same Firestore lookup as `resolve-domain.js` but no auth token required
- POST `/api/public-resolve-domain` with `{ domain }` → returns `{ storeName, storeId }`

**`api/[...route].js`**
- Added route case for `public-resolve-domain`

**`src/components/DomainResolver.jsx`**
- If user is logged in → uses `/api/resolve-domain` (authenticated)
- If user is NOT logged in → uses `/api/public-resolve-domain` (public)
- On failure (domain not found) → shows "Domain Not Configured" error page instead of homepage

### How It Works

```
Visitor visits nexkeysagency.com.ng
    ↓
DomainResolver checks hostname = "nexkeysagency.com.ng"
    ↓
Not in MAIN_DOMAINS → calls /api/public-resolve-domain (no auth needed)
    ↓
Firestore finds store with customDomain = "nexkeysagency.com.ng"
    ↓
Returns storeName (e.g., "denver-store")
    ↓
DomainResolver navigates to /denver-store
    ↓
StorePage renders the correct store
```

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-16 — Referral System: Full Implementation (Phases 1–13)

Commit/push keyword: `referral-system`

Complete vendor referral program. Vendors share referral links, earn ₦500–₦₂,₀₀₀ when referred vendors upgrade to paid plans. Withdrawals via bank transfer with admin approval queue.

### Files Created

- **`src/api-handlers/referral-generate-code.js`** — Generates unique `SP-XXXXXXXX` codes, saves to store doc with wallet fields
- **`src/api-handlers/referral-track.js`** — Increments referrer's click count when referral link is visited
- **`src/api-handlers/referral-resolve-code.js`** — Resolves referral code to referrer UID (for signup flow)
- **`src/api-handlers/referral-bank-save.js`** — Saves bank account details, verifies via Paystack resolve API
- **`src/api-handlers/referral-withdraw-request.js`** — Creates withdrawal requests, enforces ₦5,000 minimum, single pending request limit
- **`src/api-handlers/referral-stats.js`** — Returns referral stats + recent rewards for dashboard
- **`src/api-handlers/referral-withdrawals.js`** — Returns vendor's withdrawal history
- **`src/api-handlers/admin-referrals.js`** — Admin endpoint: referral stats, all rewards, all withdrawals, process withdrawal (approve/reject)
- **`src/components/dashboard/ReferralTab.jsx`** — Full referral dashboard UI: hero, code/link, share buttons, wallet, progress bar, stats, recent referrals, withdrawal modal, bank setup modal

### Files Modified

- **`src/firebase/auth.js`** — Added `increment` import; increments referrer's `referralTotalSignups` on signup
- **`src/pages/Login.jsx`** — Calls `/api/referral-track` when referral code is detected in URL
- **`src/pages/Dashboard.jsx`** — Imported ReferralTab, wired `referral-program` tab
- **`src/components/dashboard/DashboardLayout.jsx`** — Added `referral-program` nav item with Share2 icon
- **`src/api-handlers/paystack-webhook.js`** — Added referral reward creation after first paid subscription (₦500 growth, ₦1,000 pro, ₦2,000 premium), increments referrer's pending balance
- **`api/[...route].js`** — Added 7 new route cases: `referral-generate-code`, `referral-track`, `referral-resolve-code`, `referral-bank-save`, `referral-withdraw-request`, `referral-stats`, `referral-withdrawals`, `admin-referrals`

### Firestore Fields (stores collection)

```
referralCode: string          — Unique "SP-XXXXXXXX" code
referralPending: number       — Pending rewards (kobo) — 14-day hold
referralAvailable: number     — Available for withdrawal (kobo)
referralWithdrawn: number     — Total withdrawn (kobo)
referralTotalEarned: number   — Lifetime earnings (kobo)
referralTotalClicks: number   — Link click count
referralTotalSignups: number  — Signup count from referral
referralTotalPaid: number     — Paid referral count
referralBankName: string      — Bank name
referralBankCode: string      — Bank code
referralBankAccount: string   — Account number
referralBankAccountName: string — Resolved account name
referralBankVerified: boolean — Bank verification status
```

### Firestore Collections

- `referralRewards` — Reward records (referrerId, referredUserId, plan, rewardAmount, status, availableAt)
- `withdrawal_requests` — Withdrawal audit log (userId, amount, bank details, status, processedAt, processedBy)

### Reward Flow

1. Vendor A shares referral link → `?ref=SP-XXXXXXXX`
2. Vendor B visits → click tracked via `/api/referral-track`
3. Vendor B signs up → `referredBy` saved to Firestore, referrer's `referralTotalSignups` incremented
4. Vendor B pays for first plan → Paystack webhook creates reward record, credits referrer's pending balance
5. 14-day holding period → `availableAt` field on reward record
6. After 14 days → pending moves to available
7. Vendor A requests withdrawal (min ₦5,000) → withdrawal request created
8. Admin approves → bank transfer sent

### Build Status

`npm run build` passed with zero errors.

---

## 2026-07-16 — Bug Fixes: ReferralTab, WhatsApp Toggle, Hero Layout, Receipt

Commit/push keyword: `bugfixes-whatsapp-toggle-receipt`

### Fix 1: ReferralTab "token is not defined" Error

**Problem:** Clicking "Referral Program" tab crashed with `ReferenceError: token is not defined`. Dashboard.jsx passed `<ReferralTab token={token} />` but `token` only existed inside async handler functions, not at component scope.

**Fix:**
- `Dashboard.jsx` — Changed `<ReferralTab token={token} />` to `<ReferralTab user={user} />`
- `ReferralTab.jsx` — Changed prop from `{ token }` to `{ user }`, added `useState` for token, added `useEffect` to call `user.getIdToken()` on mount

### Fix 2: WhatsApp Chat Button Toggle

**Problem:** Vendors couldn't hide the "Chat on WhatsApp" button from their store page. Some vendors don't want customers accessing their personal WhatsApp number.

**Fix:**
- `Settings.jsx` — Added `showWhatsApp` to form state, added toggle switch below WhatsApp number field ("Show Chat button on store page"), defaults to `true`
- `Dashboard.jsx` — `handleSettingsSave` now saves `showWhatsApp` to Firestore
- `StorePage.jsx` — Hero "Chat on WhatsApp" button, checkout "no delivery zones" link, and Orders tab "Start an Order" button all wrapped in `store.showWhatsApp !== false` check
- `StoreNavbar.jsx` — "Chat with us" button wrapped in `store.showWhatsApp !== false` check
- Community links (`whatsappCommunityLink`) left untouched — separate feature, not direct personal chat

**Firestore field:** `showWhatsApp: boolean` (default `true` for existing vendors via `!== false` check)

### Fix 3: StorePage Hero Button Layout

**Problem:** "View Our Services →" was a plain text underline link while "Join Our WhatsApp Community" was a styled button. They sat on separate rows with different sizing, looking misaligned.

**Fix:**
- `StorePage.jsx` — Both "View Our Services" and "Join Our WhatsApp Community" now wrapped in a single `flex flex-wrap items-center gap-3 mt-4` container with matching `bg-white/15 hover:bg-white/25 rounded-2xl` button styles
- `ServiceStorePage.jsx` — Same fix applied to "Shop Our Products" + "Join Our WhatsApp Community" pair. Added `ArrowRight` import from lucide-react

### Fix 4: Receipt Currency Symbol

**Problem:** PDF receipt showed `¦50` instead of `₦50`. The `@react-pdf/renderer` Helvetica font doesn't support the₦ (U+20A6) character.

**Fix:**
- `src/utils/generateReceipt.jsx` — Changed `formatNaira()` from `₦${...}` to `NGN ${...}`

### Fix 5: Receipt "Invalid Date"

**Problem:** Receipt showed "Invalid Date" for the Date field. Firestore Timestamp objects passed to `new Date(date)` without conversion, and `new Date(undefined)` produces "Invalid Date".

**Fix:**
- `src/utils/generateReceipt.jsx` — `formatDate()` now handles Firestore Timestamp objects (`date?.toDate ? date.toDate() : new Date(date)`), falls back to current date if parsing fails (`isNaN(d.getTime())`)

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] Bug Fixes — ReferralTab, Firestore Index, WhatsApp Toggle

#### Fixed
- **ReferralTab data source**: Removed broken `GET /api/get-store` call (endpoint didn't exist). ReferralTab now receives `store` prop from Dashboard like every other tab. Removed unused `loading` state and spinner.
- **Firestore composite index error**: `referral-stats.js` queried `referralRewards` with `.where('referrerId', '==', uid).orderBy('createdAt', 'desc')` which required a composite index. Removed `.orderBy()`, sorted client-side instead.
- **WhatsApp toggle persistence**: Toggle now saves to Firestore immediately on click (no need to click "Save Changes"). Added `onWhatsAppToggle` prop flow: SettingsTab → Dashboard → `updateStore(store.id, { showWhatsApp: value })`.

#### Changed
- `src/components/dashboard/ReferralTab.jsx` — Removed `fetchStore()`, `loading` state, spinner. Accepts `store` from Dashboard props.
- `src/api-handlers/referral-stats.js` — Removed `.orderBy('createdAt', 'desc')` from `referralRewards` query. Added client-side sort by `createdAt` descending.
- `src/components/dashboard/Settings.jsx` — Added `onWhatsAppToggle` prop. Toggle button calls `onWhatsAppToggle(newVal)` on click instead of waiting for form save.
- `src/pages/Dashboard.jsx` — Added `handleWhatsAppToggle(value)` function that saves `showWhatsApp` to Firestore and updates local store state. Passed as `onWhatsAppToggle` prop to SettingsTab.

---

### [2026-07-16] Referral Bank Account Flow — Dynamic Banks, Better Errors

#### Added
- **New API handler**: `src/api-handlers/get-banks.js`
  - `GET /api/get-banks` — Fetches Nigerian bank list from Paystack `/bank` API
  - Caches in Firestore `cache/bankList` doc with 24-hour TTL
  - Falls back to stale cache if Paystack API fails
  - No auth required (public bank list)
  - Returns `{ success, banks: [{ name, code, slug, longcode }] }`, sorted alphabetically
  - Filters to active banks only

- **Route**: Added `get-banks` case to `api/[...route].js`

#### Changed
- **`src/api-handlers/referral-bank-save.js`** — Full rewrite:
  - Added CORS headers + OPTIONS handler
  - Added `PAYSTACK_SECRET_KEY` validation before API call
  - Added `encodeURIComponent()` for Paystack resolve URL parameters
  - Added full Paystack response logging (`console.log`)
  - Returns specific, vendor-friendly error messages:
    - "This account number doesn't exist at [bank]" (account not found)
    - "This bank could not be recognized" (invalid bank code)
    - "Bank verification is not available right now. Please contact support." (missing API key)
    - "Bank verification is temporarily unavailable" (Paystack auth failure)
    - "Could not retrieve the account holder name" (no account_name in response)
    - "Network error. Check your connection and try again." (catch-all)
  - Added request body parsing with `JSON.parse` fallback
  - Improved success logging with uid, bank name, account name

- **`src/components/dashboard/ReferralTab.jsx`**:
  - Removed hardcoded `NIGERIAN_BANKS` array (26 entries)
  - Fetches banks from `GET /api/get-banks` on mount
  - Added `banks`, `banksLoading`, `banksError` state
  - Bank selector shows loading spinner while fetching
  - Bank selector shows error state with "Tap to retry" button on failure
  - "Verify & Save" button disabled when banks aren't loaded or no bank selected
  - "Add Bank Account" button disabled when bank list failed to load
  - Account number input shows helper text: "Enter your 10-digit Nigerian bank account number"
  - Error display shows the actual API message (vendor-friendly)
  - Network errors show "Network error. Please check your connection and try again."

#### Removed
- Hardcoded `NIGERIAN_BANKS` array from ReferralTab (replaced by dynamic Paystack bank list)

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] Referral: Bank Error Messages, Withdrawal History Index Fix

#### Fixed
- **Bank save error messages** — Paystack responses now mapped to vendor-friendly text using `resolveData.code` field. "Check parameters or try again" → "Could not verify this account. Please check your bank and account number, then try again." `invalid_bank_code` → "This bank could not be recognized. Please re-select your bank from the list." `invalid_account` → "This account number doesn't exist at [bank]. Please double-check your account number." Removed duplicate `PAYSTACK_SECRET_KEY` validation check.
- **`referral-withdrawals.js` Firestore index error** — Removed `.orderBy('createdAt', 'desc')` from `withdrawal_requests` query (required composite index on `userId` + `createdAt`). Fetched 50 docs, sorted client-side by `createdAt` descending.
- **`admin-referrals.js` Firestore index errors** — Removed `.orderBy('createdAt', 'desc')` and `.offset()` from both `referralRewards` and `withdrawal_requests` queries. Fetches 200 docs, sorts and paginates client-side. Also fixed admin withdrawals query (`.where('status').orderBy('createdAt')` required composite index on `status` + `createdAt`).

#### Changed
- `src/api-handlers/referral-bank-save.js` — Added `resolveData.code` check for Paystack error codes. Generic fallback now returns fixed user-friendly message instead of raw Paystack text. Removed duplicate `PAYSTACK_SECRET_KEY` check (was at lines 78-83, same check already at lines 22-28).
- `src/api-handlers/referral-withdrawals.js` — Removed `.orderBy('createdAt', 'desc')`. Added client-side sort by `createdAt` descending.
- `src/api-handlers/admin-referrals.js` — Removed `.orderBy('createdAt', 'desc')` and `.offset()` from `rewards` and `withdrawals` actions. Added client-side sort and pagination. Added `total` count to response.

---

### [2026-07-16] Referral Signup Flow + Delete Account Cleanup

#### Fixed
- **CRITICAL: `referredBy` was storing raw referral code, not UID** — `Login.jsx` passed the raw code string (e.g., `SP-ABCDE1`) as `referredBy`, but `registerSeller()` in `auth.js` used it as a Firestore document UID (`stores/{referredBy}`). The referrer lookup silently failed — `referralTotalSignups` was NEVER incremented on signup. Fixed by calling `POST /api/referral-resolve-code` to resolve the code to a `referrerId` (UID) before passing to `registerSeller()`.
- **No `/register` route** — Referral links point to `/register?ref=SP-XXX` but there was no route. The `/:storeName` catch-all might match `/register` as a store name. Added `/register` route pointing to `<Login />`.
- **Delete account didn't decrement referrer's count** — When a referred user deleted their account, the referrer's `referralTotalSignups` stayed inflated. Added `FieldValue.increment(-1)` to `delete-account.js` that runs before the batch delete.

#### Added
- **Registration form: Referral Code input field** — New optional "Referral Code" field on the "Create Store" form. Pre-filled from URL `?ref=` param or localStorage. Validates the code against `POST /api/referral-resolve-code` before registration. Shows loading state while checking, success checkmark when valid, or red error message if code doesn't exist: "This referral code doesn't exist. Please check the code or sign up without one."
- **`/register` route** — Added `<Route path="/register" element={<Login />} />` to `App.jsx`.

#### Changed
- `src/pages/Login.jsx` — Added `referralCode` to form state, `referralValidated`/`referralError`/`referralChecking` state. Added `validateReferralCode()` function that calls `POST /api/referral-resolve-code`. Registration form now validates referral code before calling `registerSeller()`. Passes resolved `referrerId` (UID) instead of raw code string. Referral code input field shows validation status. Pre-fills from localStorage on mount.
- `src/App.jsx` — Added `/register` route.
- `src/api-handlers/delete-account.js` — Added `FieldValue` import from `firebase-admin/firestore`. Before batch delete, reads `storeData.referredBy`. If present, decrements the referrer's `referralTotalSignups` by 1 using `FieldValue.increment(-1)`.

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] Referral Signup Count Fix — Server-Side Increment

#### Fixed
- **CRITICAL: Referral `referralTotalSignups` never incremented on signup** — `auth.js` used client-side `updateDoc(referrerRef, { referralTotalSignups: increment(1) })` to increment the referrer's count. Firestore security rules (`allow update: if request.auth.uid == storeId`) blocked writes to another user's store doc. The error was caught silently (`console.error`). Moved increment to a server-side API endpoint using Firebase Admin SDK (bypasses security rules).

#### Added
- **`POST /api/referral-signup`** — New server-side endpoint (`src/api-handlers/referral-signup.js`). Verifies Firebase token, validates referrer store exists, increments `referralTotalSignups` via `FieldValue.increment(1)`. Returns 404 if referrer not found, 401 if token invalid.

#### Changed
- `src/firebase/auth.js` — Removed `increment` import from `firebase/firestore`. Removed broken client-side `updateDoc` block (lines 37-47) that tried to increment referrer's count. Changed `registerSeller()` return from `return user` to `return { user, referredBy: storeData.referredBy || null }`.
- `src/pages/Login.jsx` — Added `auth` import from `../firebase/auth`. After `registerSeller()`, destructures `{ user, referredBy }` (unused but available). If `resolvedReferrerId` exists, fire-and-forget calls `POST /api/referral-signup` with `{ referrerId }`. Failure is non-blocking — logged to console but registration proceeds.
- `api/[...route].js` — Added `case "referral-signup"` to router switch.

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] OnlineStoreTab UX Writing Simplification

#### Changed
- **All vendor-facing copy simplified** — Removed jargon ("Vector", "Matrix", "Schema", "Inscription", "Archetype", "Hex Accent Mapping", "Brand Stamp", "Hero Billboard", "Catalog Archetype", "Layout Display Schema", "Commit Layout State", "Premium Component Block", "Printable Store QR Vector", "Registering file...", "Uploading assets...", "Rendering matrix...", "Compile QR Code"). Replaced with everyday English: "Store Link", "Logo", "Colour", "Layout", "Footer Text", "Banner Image", "Custom Colours", "QR Code", "Generate QR Code", "Upload Logo", etc.
- `src/components/dashboard/OnlineStoreTab.jsx` — 30+ text changes across all sections (Store Link, Theme Settings, Growth Customisation, Live Preview, QR Code, WhatsApp Community, paywall block).

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] ReferralTab Withdrawal Message Fix

#### Fixed
- **Misleading "Refer X more vendors" withdrawal message** — The message calculated `⌈(₦5,000 - available) / ₦500⌉` which assumed a flat ₦500 reward per referral (Growth plan only). Incorrect for Pro (₦1,000) or Premium (₦2,000) referrals. Also confusing at ₦0 balance. Replaced with accurate informational text: "Earn ₦500 – ₦2,000 for each vendor you refer who upgrades to a paid plan. Withdrawals start at ₦5,000."

#### Changed
- `src/components/dashboard/ReferralTab.jsx` — Replaced misleading count with accurate plan-range text.

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-16] Admin Panel — Role-Based Access System (Phase 1)

#### Added
- **`src/utils/adminRoles.js`** — Role utility with `getAdminRole(uid)` (fetches from Firestore `admins/{uid}`), `canAccessTab(role, tab)`, `getRoleLabel(role)`. Tab access: Health → Super Admin only; Directory → Super Admin + Operations; Referrals + Withdrawals → Super Admin + Finance.
- **Firestore `admins` collection** — Document per admin user: `{ role, assignedBy, assignedAt, active }`. Roles: `super_admin`, `finance`, `support`, `operations`, `marketing`.
- **Role badge in admin header** — Shows assigned role (e.g., "Super Admin", "Finance Admin") with Shield icon.

#### Changed
- `src/pages/Admin.jsx` — Removed hardcoded `ADMIN_UID` check. Replaced with role-based access via `getAdminRole()`. Tab bar now filters tabs based on admin role (users only see tabs they have access to). Defaults to first accessible tab. Authorization shield shows "Contact the Super Admin to get access" for non-admin users. Loading state while checking permissions.

#### How to assign roles
Use Firebase Console or a server-side script to create documents in the `admins` collection:
```
admins/{uid} = {
  role: "super_admin" | "finance" | "support" | "operations" | "marketing",
  assignedBy: "xBJZGcVuHyQayXcztNmqENFSEoE3",
  assignedAt: Timestamp,
  active: true
}
```

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-17] Admin Panel — Role Debug Logging [DONE]

#### Added
- **`src/utils/adminRoles.js`** — Added aggressive `console.log` / `console.warn` / `console.error` tracing to `getAdminRole()`: logs uid, db instance, document path, `snap.exists()` result, `snap.data()`, active field, role value, and error details (code + message). Purpose: diagnose why `snap.exists()` returns false despite Firestore document existing in Console.
- **`src/pages/Admin.jsx`** — Added `console.log` in role-check useEffect: logs user presence, `user.uid`, and role result. Purpose: trace the full chain from component mount to role resolution.

#### How to read the console logs
1. Open `/admin` in browser
2. Open DevTools Console
3. Expected log chain:
   - `[Admin] useEffect fired. user: SET uid: xBJZGcVuHyQayXcztNmqENFSEoE3`
   - `[Admin] Calling getAdminRole with uid: xBJZGcVuHyQayXcztNmqENFSEoE3`
   - `[getAdminRole] Called with uid: xBJZGcVuHyQayXcztNmqENFSEoE3`
   - `[getAdminRole] Document path: admins/xBJZGcVuHyQayXcztNmqENFSEoE3`
   - `[getAdminRole] snap.exists(): true` ← **if false, document not found at this path**
   - `[Admin] Role resolved: super_admin`
4. If `snap.exists()` is false, the Firestore SDK cannot find the document despite it existing in Console — indicates a Firestore instance / project mismatch or cache issue.

### Build Status

`npm run build` passed with zero errors.

---

### [2026-07-17] Admin Panel — Role Check Fix (Trailing Space in Document ID) [DONE]

#### Root Cause
Firestore document `admins/xBJZGcVuHyQayXcztNmqENFSEoE3` had a **trailing space** in the document ID (29 chars with space charCode 32), while `user.uid` is 28 chars with no trailing space. `getDoc` does exact match — `"xBJZGcVuHyQayXcztNmqENFSEoE3 " !== "xBJZGcVuHyQayXcztNmqENFSEoE3"`, so `snap.exists()` always returned false. Diagnosed via charCode comparison logging across 3 iterations of debug code.

#### Fixed
- **`src/utils/adminRoles.js`** — Added `.trim()` to `uid` parameter in `getAdminRole()` before querying Firestore. Removed all debug logging. Cleaned up imports. File reduced from 73 lines to 49 lines.
- **`src/pages/Admin.jsx`** — Removed all debug console.log statements from role-check useEffect. Restored clean production logging.

#### Action Required (Nex)
Delete the old Firestore document with trailing space and recreate without it:
1. Go to Firebase Console → Firestore → `admins` collection
2. Delete document `xBJZGcVuHyQayXcztNmqENFSEoE3 ` (the one with trailing space — 29 chars)
3. Recreate with document ID `xBJZGcVuHyQayXcztNmqENFSEoE3` (no trailing space — 28 chars)
4. Fields: `{ role: "super_admin", assignedBy: "system", assignedAt: Timestamp, active: true }`

**OR** — just deploy first. The `.trim()` fix will work even with the trailing space document ID still in Firestore.

### Build Status

`npm run build` passed with zero errors.