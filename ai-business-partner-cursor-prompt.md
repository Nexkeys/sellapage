# Implementation Prompt: AI Business Partner (Premium dashboard chat assistant)

Commit/push keyword to use: `ai-business-partner-v1`

## Goal
Build a Premium-only, context-aware chat assistant tab in the vendor dashboard, powered by NVIDIA NIM, with a live web-search tool (Tavily) and a fixed, confirmation-gated set of write actions. This implements README section "### 7. AI Business Partner".

## 1. New file: `src/api-handlers/_lib/ai-business-partner-tools.js`
Shared tool implementations used by the main handler:
- `getStoreContextSummary(db, storeId)` — queries Firestore for the vendor's `stores/{storeId}` doc plus subcollections `products`, `services`, `orders`, `customers`, `discounts`, `reviews`, `ledger`, `leads`. Returns a compact JSON object: counts, totals (e.g. `ordersThisWeek`, `revenueThisMonth` from ledger, `topProducts` by count/rating), and the 10 most recent orders (id, customerName, itemName, grandTotal, status) — NOT full raw documents. Keep this cheap: use `.limit()` and aggregate in code, don't pull entire collections.
- `webSearch(query)` — calls Tavily's search API using `process.env.TAVILY_API_KEY` (POST to Tavily's search endpoint per their docs, basic search depth, ~5 results), returns `{ title, url, snippet }[]`.
- `executeWriteAction(db, storeId, action)` — a switch on `action.type`:
  - `add_ledger_entry`: writes to `stores/{storeId}/ledger/{Date.now().toString()}` with the exact same field shape `LedgerTab.jsx` uses (`customerName, itemName, amount, date, notes, status, createdAt`).
  - `update_order_status`: reuses the same status-transition validation as `src/api-handlers/update-order-status.js` (import and call its internal logic if it's exported as a function, or replicate its exact allowed-status-transition rules and email-sending — do not diverge from that handler's rules) for `stores/{storeId}/orders/{orderId}`.
  - `add_product` / `add_service`: writes a new doc following whatever field shape `Products.jsx` / `ServicesTab.jsx` already use when creating one (check their existing add-product/add-service Firestore write calls and mirror the shape exactly — name, price, category, images, description, stock/duration fields etc).
  - Returns `{ success, message }` for each.

## 2. New file: `src/api-handlers/ai-business-partner.js`
Default-exported handler, POST only. Behavior:

1. Read `Authorization: Bearer <idToken>` header (401 if missing). Verify via `getAdminAuth()` from `src/api-handlers/_lib/firebase-admin.js`. Get `getAdminDb()` too.
2. Body: `{ storeId, message, sessionId, confirmAction }` (confirmAction optional — see step 7).
3. `decodedToken.uid !== storeId` → 403.
4. Fetch `stores/{storeId}` doc. If `plan !== 'premium'` → 403 with `{ error: 'Premium plan required' }`.
5. Daily cap check — mirror the exact pattern in `src/api-handlers/ai-describe.js` (its `DAILY_LIMITS`/transaction/`getTodayKey()` with `Africa/Lagos` timezone), but simplified to a flat limit:
   - Firestore doc `stores/{storeId}/aiPartnerUsage/{todayKey}`.
   - In a transaction: read `count`, if `count >= 30` return 429 `{ error: 'Daily AI Business Partner limit reached (30/day). Resets at midnight WAT.' }`. Otherwise increment `count`, set `lastRequestAt`.
6. Load existing chat history from `stores/{storeId}/aiPartnerChats/{sessionId}` doc field `messages` (array). If absent, start empty.
   - If `confirmAction` is present in the request body (vendor confirmed a pending write from a previous turn): call `executeWriteAction()`, append a system/assistant message noting the result, save, and return `{ result }` immediately — skip the NIM call for this request.
7. Otherwise, this is a normal chat turn:
   - Append the new user message to history.
   - Call NVIDIA NIM: `POST https://integrate.api.nvidia.com/v1/chat/completions`, `Authorization: Bearer ${process.env.NVIDIA_AI_PARTNER_API_KEY}`, `model: 'meta/llama-3.1-8b-instruct'`.
   - `messages`: system prompt (see below) + last up-to-49 history messages + the new user message.
   - Use NVIDIA NIM's OpenAI-compatible `tools` param (function-calling) with tool definitions for: `get_store_context` (no args), `web_search` (arg: `query`), and the 4 write actions (`add_ledger_entry`, `update_order_status`, `add_product`, `add_service` — each with their relevant args per the shapes above). If the model's tool-calling support is unreliable on this model, fall back to instructing the model via the system prompt to respond with a strict JSON block like `{"tool": "web_search", "args": {...}}` when it needs a tool, and parse that from the text response.
   - If the model calls `get_store_context` or `web_search`: execute it server-side, feed the result back to the model as a follow-up message in the same request (multi-turn tool loop, same pattern as any OpenAI-compatible tool-use flow), then get the final natural-language answer.
   - If the model requests one of the 4 write actions: DO NOT execute it. Instead return to the frontend: `{ pendingAction: { type, args, summary }, reply: "<model's confirmation question>" }`. The frontend will show a confirm/cancel card; on confirm, it calls this same endpoint again with `confirmAction` set (step 6 above).
   - Otherwise return `{ reply: "<plain text answer>", sources: [...] }` (sources populated if web_search was used).
   - Append the assistant's final reply to chat history, trim `messages` array to the last 50 entries, save to `stores/{storeId}/aiPartnerChats/{sessionId}`.

### System prompt (persona)
"You are Sellapage's AI Business Partner, a helpful assistant for a Nigerian SME vendor using the Sellapage platform. You have access to this vendor's own store data (orders, products, services, ledger, customers) via tools, and a web_search tool for market research and general business questions. You can also take actions on the vendor's behalf — logging a ledger entry, updating an order's status, adding a product or service — but you must NEVER perform these actions without the vendor's explicit confirmation in this conversation. When a write action seems appropriate, describe exactly what you're about to do and ask the vendor to confirm first. Be concise, practical, and direct — no fluff."

## 3. Router — `api/[...route].js`
Add:
```js
case "ai-business-partner": {
  const { default: handlerFunc } = await import("../src/api-handlers/ai-business-partner.js");
  return await handlerFunc(req, res);
}
```
(Same handler processes both normal turns and `confirmAction` turns — no separate route needed.)

## 4. Firestore
No manual index expected (single-doc reads/writes by ID), but if `get_store_context`'s order query uses `.where()` + `.orderBy()` on the `orders` subcollection, check the Firebase console for a "missing index" error on first real test and create it if Firestore demands one (same as happened historically with reviews — see README Bug 4).

## 5. Frontend — `src/components/dashboard/AIBusinessPartnerTab.jsx` (new file)
- Chat UI: scrollable message list (user messages right-aligned, assistant left-aligned, matches existing dashboard visual style — Bricolage Grotesque headings, DM Sans body, brand green #22c55e), text input + send button, mobile-first from smallest screens up.
- On mount, generate or reuse a `sessionId` (e.g. store one in localStorage per vendor, or just `Date.now()` per dashboard session — keep it simple, one active session at a time).
- Show a "X/30 requests used today" indicator (return remaining count from the backend, or compute client-side from the 429 case).
- When a response includes `pendingAction`, render a distinct confirm/cancel card below the assistant's message: shows `summary` text, a green "Confirm" and a neutral "Cancel" button. Confirm re-calls the endpoint with `confirmAction` set to that action object. Cancel just discards it and lets the vendor keep chatting.
- When a response includes `sources`, render them as small clickable link chips under the assistant's message.
- Loading state while awaiting a response (typing indicator).
- Error state (e.g. 429 daily limit, 403 not premium) shown as a plain message in the chat, not a crash.

## 6. Nav + gating
- `src/components/dashboard/DashboardLayout.jsx`: add a new sidebar nav item (e.g. under a "Grow" or new "AI" group, icon: `Sparkles` or `Bot` from lucide-react) — `{ id: "ai-partner", label: "AI Business Partner", icon: Sparkles }`. Follow the exact same gating convention already used for other Pro/Premium-gated items (`if (id === 'ai-partner' && !isPremium) return null` or show a locked/upsell state — match whichever convention is already used for the strictest existing gate).
- `src/pages/Dashboard.jsx`: wire `case "ai-partner": return <AIBusinessPartnerTab isPremium={isPremium} storeId={user.uid} />` (or equivalent) into the existing tab-rendering switch, alongside how other tabs receive `isPremium`.
- If `!isPremium`, render a locked/upsell card instead of the chat (same pattern the repo already uses elsewhere for Premium-gated content).

## 7. What must NOT change
- `ai-describe.js` and its `NVIDIA_API_KEY` usage/quota — untouched, fully separate feature.
- `update-order-status.js`'s existing status-transition rules and email logic — reused, not duplicated or altered.
- `LedgerTab.jsx`'s manual ledger UI/logic — untouched; the AI's ledger writes just use the same Firestore doc shape.
- No changes to Paystack, Sendbox, or any other existing handler.

## 8. Build & verify
- `npm run build` must pass with zero errors.
- Manually test as a Premium test vendor: ask a store-data question, ask a market-research question (confirm Tavily results appear as sources), ask it to log a ledger entry (confirm the confirm/cancel card appears, confirm writes match `LedgerTab.jsx` shape after confirming), confirm the 31st request in one day is blocked with a clear message, and confirm a non-Premium vendor sees the locked/upsell state instead of the chat.
- Update README.md changelog per the repo's own rule: add a new dated section documenting what was built, and mark README section "### 7. AI Business Partner" as DONE ✅ once verified working.
