

##any changes or edits made to this codebase no matter how minimal be it logically , structurally , UI , Backend , Folder Structure must be updated in this README.md below so as to keep better and full organizing and understading of each changes and uses of each files and the current state also ⬇️⬇️⬇️


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




