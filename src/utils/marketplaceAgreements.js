// src/utils/marketplaceAgreements.js
// The Dropshipping Marketplace agreements, as data, versioned.
//
// ONE SOURCE. The Terms page shows these, the accept box shows the summary and
// links to them, and the server records which VERSION each store accepted. So
// the exact wording anyone agreed to can always be shown again.
//
// CHANGING A CLAUSE = A NEW VERSION. Bump `version`, keep the old object in
// PAST_VERSIONS (never delete what someone accepted), and every store must
// accept again before it can list or import. Fixing a typo that changes no
// meaning may keep the version, but say so in the changelog.
//
// Drafting notes, sources and the reasoning behind each clause:
// Docs/Dropshipping-Marketplace-Legal.md. The clauses that limit liability,
// shift risk or impose an indemnity are marked **bold** because FCCPA 2018
// s.128 requires them to be drawn to the person's attention before they agree;
// the accept box asks for a separate tick for them.
//
// Text in **double asterisks** is rendered bold (see AgreementText.jsx).
import { NEW_SUPPLIER_LIMITS } from './supplierLimits.js'

const naira = (n) => `₦${Number(n).toLocaleString('en-NG')}`
const L = NEW_SUPPLIER_LIMITS

const WHO = 'In these agreements, "Sellapage", "we" and "us" mean the business that runs sellapage.com.ng, and any company it transfers them to under the "Transfer" clause.'

export const SUPPLIER_AGREEMENT = {
  kind: 'supplier',
  version: 1,
  effective: '26 September 2026',
  title: 'Marketplace Supplier Agreement',
  anchor: 'supplier-agreement',
  summary: [
    'You sell your products to dropshippers through Sellapage. You ship every order yourself, from your own address, within the time in your supplier terms, under the dropshipper\'s store name.',
    'Paystack pays you your full wholesale price plus delivery when the customer pays.',
    `Until you have ${L.graduateAfterDelivered} delivered orders, each order can pay you at most ${naira(L.maxSupplierShare)} and you can have at most ${L.maxOpenOrders} orders waiting to ship.`,
    '**If an order is refunded because of you, you must repay it, and we can take it from what you are paid on later orders until it is repaid.**',
    '**Sellapage is a platform. We do not buy, hold or guarantee your stock, orders or payments, and our liability to you is capped.**',
    'You keep customers\' details private and use them only to deliver.',
  ],
  clauses: [
    ['What this agreement is', `This agreement is between you (the "Supplier") and Sellapage. It adds to the Sellapage Terms of Service; where the two disagree about the Dropshipping Marketplace, this agreement applies. You accept it by ticking the boxes when you apply or when we ask you to accept a new version, and we record the version, date, time and account when you do. ${WHO}`],
    ['What Sellapage does and does not do', 'Sellapage provides software that lets you list products for other Sellapage stores ("Dropshippers") to sell, and arranges for Paystack to divide each payment. Sellapage is not a party to any sale. **Sellapage does not buy, own, inspect, store, carry or deliver any product, and does not guarantee that any Dropshipper will sell your products or that any customer will pay for, accept or keep an order.**'],
    ['Who can supply', 'You must stay approved by us, on a plan that includes the marketplace, CAC-verified, phone-verified and with a working payout account. We may suspend or end your supplier status at any time if you break this agreement, if we reasonably suspect fraud or a risk to customers, or if the law requires it. Your listings then stop being available at once. Nothing you are owed for orders you have already fulfilled is lost.'],
    ['Limits for new suppliers', `Until you have ${L.graduateAfterDelivered} orders marked delivered, (a) the amount paid to you for any one order, not counting delivery, cannot be more than ${naira(L.maxSupplierShare)}, and (b) you cannot have more than ${L.maxOpenOrders} paid orders that have not yet been delivered, cancelled or refunded. Listings and orders above these limits are not available. We may lift the limits earlier, or apply them again, at our discretion, to protect customers and the platform.`],
    ['Your listings', 'For every listing you promise that: (a) you own the goods or have the right to sell them, and they are genuine, not counterfeit, stolen or replicas; (b) they are lawful to sell in Nigeria, not on any prohibited list and, where the category requires it, registered with NAFDAC under the number you gave; (c) the name, description, photos, options and stock you show are accurate and are kept accurate; and (d) your stock number is real, and you switch a listing off or correct the stock as soon as you cannot fulfil it. We may remove any listing, without notice, that we reasonably believe breaks this clause.'],
    ['Fulfilling orders', 'For every paid order you must: dispatch it within the time in your supplier terms; pack the goods safely; ship under the Dropshipper\'s store name, without your own name, contact details, prices, invoices or marketing material in the parcel; keep the order status truthful and up to date; and not contact the customer except about delivering that order.'],
    ['Returns, refunds and your supplier terms', 'Your supplier terms, as saved in Supplier Hub, including the clause Sellapage adds for damaged, defective or wrong items, are part of every sale of your products, and you must honour them. You may change them; a change applies only to orders placed after the Dropshipper has accepted the new version. **Nothing in your supplier terms can remove a customer\'s rights under the Federal Competition and Consumer Protection Act 2018.**'],
    ['Payments, refunds and set-off', 'For each paid order, Paystack pays you the wholesale price you listed plus the delivery fee, less any amount you owe under this clause. Sellapage\'s commission is not taken from your wholesale price. **If an order is refunded or charged back because you did not dispatch it on time, sent the wrong, a damaged, defective, counterfeit or unlawful item, or broke your supplier terms or this agreement, you owe Sellapage the amount you were paid for that order, plus any charge Paystack makes to Sellapage for that refund or dispute. You agree that Sellapage may recover any amount you owe by reducing what you are paid on your later orders until it is repaid, and may also ask you to pay it directly within 7 days.** We will tell you the amount and the order it relates to before recovering it. If an order fails for a reason that is nobody\'s fault (for example, two customers bought the last item at the same moment), it is refunded and each party returns what it received for that order. You are responsible for your own taxes.'],
    ['Customer information', 'You will receive a customer\'s name, phone number and delivery address only so you can deliver their order. We share it under the Nigeria Data Protection Act 2023, and you agree to: use it only to deliver that order; never use it for marketing, sell it, or share it with anyone except your courier for that delivery; keep it secure; delete it within 90 days after delivery, or after any dispute about the order ends; and tell Sellapage within 24 hours if it is lost, stolen or seen by anyone who should not see it. You are responsible for anyone you share it with.'],
    ['Dealing with Dropshippers', 'You must not ask or encourage a Dropshipper to trade with you outside Sellapage for any product you listed or found through the marketplace. Messages through Sellapage hide phone numbers, emails and links for this reason.'],
    ['Indemnity', '**You will repay Sellapage for any loss, cost (including reasonable legal costs), fine, refund or chargeback it suffers because of: your products; your listings being inaccurate or unlawful; your failure to fulfil an order or honour your supplier terms; your breach of the "Customer information" clause; or any claim that your products are counterfeit or infringe someone else\'s rights.**'],
    ['Sellapage\'s liability', '**Sellapage does not guarantee that the marketplace will always be available or free of errors, or that it can recover money owed to you by anyone else. Sellapage is not liable to you for lost profit, lost sales, lost data or any indirect loss. Sellapage\'s total liability to you under this agreement is limited to the commission and fees Sellapage earned from your products in the 3 months before the claim.** None of this limits liability for fraud, for Sellapage\'s own gross negligence, or for anything the law does not allow to be limited.'],
    ['Ending this agreement', 'You can stop supplying at any time by removing your listings; you must still fulfil or refund every order already paid. The clauses on returns, payments and set-off, customer information, indemnity and liability continue after this agreement ends for any order placed before it ended.'],
    ['Changes', 'Sellapage may change this agreement. We will tell you at least 14 days before a change applies, unless the law or a risk to customers requires a faster change. You will be asked to accept the new version before you can list or change listings again.'],
    ['Transfer', 'Sellapage may transfer this agreement, and all its rights and duties under it, to a company that runs Sellapage, including a company formed to take over the business. You agree to that transfer now, and it does not change your rights under this agreement. You may not transfer this agreement without our written consent.'],
    ['Disputes and law', 'This agreement is governed by the laws of the Federal Republic of Nigeria. If a dispute arises, both sides will first try to resolve it by discussion for 14 days, then by mediation, before going to court.'],
  ],
}

export const DROPSHIPPER_AGREEMENT = {
  kind: 'dropshipper',
  version: 1,
  effective: '26 September 2026',
  title: 'Marketplace Dropshipper Agreement',
  anchor: 'dropshipper-agreement',
  summary: [
    'You are the seller to your customer. An approved supplier ships the order for you, under your store name.',
    'You set your price. You keep what is left after the supplier\'s price, Sellapage\'s 5% of that price, and the Paystack fee.',
    'Before you can sell a supplier\'s products you must accept their supplier terms, and accept them again whenever they change.',
    '**If an order is refunded, you return your share of it. If a supplier caused it and cannot be made to repay within 30 days, you cover the supplier\'s share. We can take what you owe from your later sales.**',
    '**Sellapage is a platform. We do not guarantee suppliers, stock, delivery, or that we can recover money from anyone.**',
  ],
  clauses: [
    ['What this agreement is', `This agreement is between you (the "Dropshipper") and Sellapage. It adds to the Sellapage Terms of Service; where the two disagree about the Dropshipping Marketplace, this agreement applies. You accept it by ticking the boxes the first time you add a marketplace product, or when we ask you to accept a new version, and we record the version, date, time and account when you do. ${WHO}`],
    ['What Sellapage does and does not do', 'Sellapage provides software that lets you sell products supplied by other Sellapage stores ("Suppliers"), and arranges for Paystack to divide each payment. Sellapage is not a party to any sale. **Sellapage does not buy, own, inspect, store, carry or deliver any product. Sellapage checks Suppliers when they apply, but approval is not a guarantee of any Supplier\'s goods, stock, honesty or delivery.**'],
    ['You are the seller', 'Products you add appear in your store and are sold by you to your customers. You are responsible to your customers for the sale, including their rights under the Federal Competition and Consumer Protection Act 2018. You must not describe a product in a way the Supplier\'s listing does not support, and must not promise faster delivery or more generous returns than the Supplier\'s terms allow.'],
    ['Supplier terms', 'Before adding any product from a Supplier you must read and accept that Supplier\'s terms. When a Supplier changes their terms, their products in your store become unavailable, and you cannot add more of them, until you accept the new version. We record which version you accepted and when.'],
    ['Prices', 'You choose your selling price. It cannot be below the Supplier\'s minimum price (if any), or so low that it does not cover the Supplier\'s price, Sellapage\'s commission and the payment fee. If a Supplier raises their price above what you charge, the product becomes unavailable in your store until you update it.'],
    ['Payments, refunds and set-off', 'For each paid order, Paystack pays you your selling price, less the Supplier\'s wholesale price, less Sellapage\'s commission of 5% of the wholesale price, less Paystack\'s fee. **If an order is refunded or charged back for any reason, you must return what you were paid for that order. If the refund was caused by the Supplier and Sellapage cannot recover the Supplier\'s share from them within 30 days, you must repay that share to Sellapage, up to the amount the Supplier received for that order, and Sellapage will pass on to you anything it recovers from the Supplier afterwards. You agree that Sellapage may recover any amount you owe by reducing what you are paid on your later orders until it is repaid, and may also ask you to pay it directly within 7 days.** We will tell you the amount and the order it relates to before recovering it.'],
    ['Customer information and contact', 'Your customer\'s delivery details are shared with the Supplier only so they can deliver, under the Supplier\'s duties in their agreement with us. You must not ask a Supplier to trade with you outside Sellapage for marketplace products.'],
    ['Indemnity', '**You will repay Sellapage for any loss, cost (including reasonable legal costs), fine, refund or chargeback it suffers because of your store, your product descriptions, your prices, your dealings with your customers, or your breach of this agreement.**'],
    ['Sellapage\'s liability', '**Sellapage does not guarantee that the marketplace will always be available or free of errors, that any Supplier will perform, or that it can recover money owed to you by anyone else. Sellapage is not liable to you for lost profit, lost sales, lost data or any indirect loss. Sellapage\'s total liability to you under this agreement is limited to the commission and fees Sellapage earned from your sales in the 3 months before the claim.** None of this limits liability for fraud, for Sellapage\'s own gross negligence, or for anything the law does not allow to be limited.'],
    ['Ending this agreement', 'You can stop at any time by removing the marketplace products from your store; every order already paid must still be completed or refunded. The clauses on payments and set-off, indemnity and liability continue after this agreement ends for any order placed before it ended.'],
    ['Changes', 'Sellapage may change this agreement. We will tell you at least 14 days before a change applies, unless the law or a risk to customers requires a faster change. You will be asked to accept the new version before you can add or sell marketplace products again.'],
    ['Transfer', 'Sellapage may transfer this agreement, and all its rights and duties under it, to a company that runs Sellapage, including a company formed to take over the business. You agree to that transfer now, and it does not change your rights under this agreement. You may not transfer this agreement without our written consent.'],
    ['Disputes and law', 'This agreement is governed by the laws of the Federal Republic of Nigeria. If a dispute arises, both sides will first try to resolve it by discussion for 14 days, then by mediation, before going to court.'],
  ],
}

/** Every version anyone may have accepted, newest last. Never remove one. */
export const PAST_VERSIONS = {
  supplier: [SUPPLIER_AGREEMENT],
  dropshipper: [DROPSHIPPER_AGREEMENT],
}

export const AGREEMENTS = { supplier: SUPPLIER_AGREEMENT, dropshipper: DROPSHIPPER_AGREEMENT }

export const currentAgreementVersion = (kind) => AGREEMENTS[kind]?.version || 0

/** The store field that holds the version a store accepted. Server-only, locked in rules. */
export const AGREEMENT_FIELD = { supplier: 'supplierAgreementVersion', dropshipper: 'dropshipperAgreementVersion' }

/** True when this store has accepted the CURRENT version of that agreement. */
export function hasAcceptedAgreement(store, kind) {
  const v = store?.[AGREEMENT_FIELD[kind]]
  return Number.isInteger(v) && v === currentAgreementVersion(kind)
}
