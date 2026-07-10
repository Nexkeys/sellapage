

##any changes or edits made to this codebase no matter how minimal be it logically , structurally , UI , Backend , Folder Structure must be updated in this README.md below so as to keep better and full organizing and understading of each changes and uses of each files and the current state also ⬇️⬇️⬇️

### MUST READ BEFORE ANY CHANGES TO THIS README.md 
### IF YOU'RE READING THIS README.md EITHER BY PROMPT OR ORDER ANY CHANGES THAT'S PENDING AND THAT'S BEEN APPLIED OR IMPLEMENTED MAKE SURE TO UPDATE IT IN THIS DOCUMENT 
### FOR EXAMPLE IF WHEN READING THIS DOC A FEATURE OR BUG OR ISSUE IS MARKED AS PENDING AND IT'S BEEN WORKED DON'T REMOVE IT JUST MARK IT AS DONE AS THIS DOC IS THE CHANGELOG OF THIS ENTIRE CODEBASE SO NOTHING'S TO BE REMOVED ONLY ADDED 


1. Who This Is For & The People Involved

Founder & CEO: Ernest Uwaoma, goes by "Nex." Born 22 July 2006, based in Lagos, Nigeria. Runs NexKeys Agency (CAC registered, BN No. 9537181, Software Development/Web Designing; registered address: 17 Babatunde Street Olodi Apapa Lagos; business email: nexkeysagency@gmail.com; personal email: ernestuwaoma3@gmail.com; phone: +2348033004474).
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
Email	Resend	RESEND_FROM_EMAIL unset, pending domain verification
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
1. **Status change emails not sent** — When vendor changes order status via StatusPicker dropdown (confirmed/dispatched/cancelled), no email is sent to the customer. Only `mark-delivered.js` sends an email (delivered status only via separate button). Fix needed: add email send to the `onUpdateOrder` handler for all status changes.


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
- Bug 9: Review page Done button did nothing — FIXED (navigate('/'))
- Bug 10: Submit review storeId lookup — FIXED (orderDoc.ref.parent.parent.id)

---

## PENDING FEATURES — Priority Order

### 1. Status Change Emails (URGENT — affects live users)
Send email to customer when vendor changes order status to: confirmed, dispatched, delivered, cancelled.
Handler: new addition to `paystack-webhook.js` or a new `update-order-status.js` handler.
Template: match existing email style. Include order summary, new status, and (for delivered) review link. - DONE ALREADY

### 2. Custom Domain Engine
Vendors connect their own domain (yourbrand.com) to their Sellapage store.
Tech: Vercel Domains API + Edge middleware for host-header routing.
Plan gate: Pro and Premium only.

### 3. CAC Trust Verification Badge
Vendor enters RC number → Prembly Basic CAC endpoint verifies it → badge saved to store document → fully and well designed badge shown on storefront maintaining the customers storefront structure and design logic the badge needs to be well arranged and displayed well so customers see it.
API: Prembly (`POST /identitypass/verification/cac/basic`).
Keys needed: PREMBLY_SECRET_KEY, PREMBLY_APP_ID (already in Prembly dashboard — Live Mode).
New dashboard tab: separate CAC tab in sidebar (Pro and Premium only).
Plan gate: Pro and Premium.
Api keys already added to .env and vercel environmnet variables as
PREMBLY_SECRET_KEY=
PREMBLY_PUBLIC_KEY=
[x]Already successfully ran - npm install --save prembly-react-kyc

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


### 4. Live Stores Page
Public page on sellapage.com.ng/stores — shows a moving grid/carousel of all active vendor stores.
Data: query Firestore for stores where isActive: true, show store name, category, store clickable link.
Each card links to the vendor's store URL.
Navbar gets "Explore Stores" link button.
Comes after CAC verification (badges will show on the store cards).

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
