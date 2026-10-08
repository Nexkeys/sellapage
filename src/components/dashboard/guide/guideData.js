// src/components/dashboard/guide/guideData.js
//
// What Sella the guide knows about every dashboard tab: what it is for, what
// a vendor can do there, which plan opens it, and (for a locked tab) the one
// line that says why it is worth upgrading.
//
// `plan` is the lowest plan that opens the tab, matching the gates in
// DashboardLayout.jsx (searchableTabs) and the paywalls inside CustomDomainTab
// and CACVerificationTab. If a gate moves there, move it here too.
// `only` limits a tab to product or service stores, as the sidebar does.

export const PLAN_ORDER = ['starter', 'growth', 'pro', 'premium']
export const PLAN_LABEL = { starter: 'Starter', growth: 'Growth', pro: 'Pro', premium: 'Premium' }

export const GUIDE_GROUPS = [
  { id: 'start', label: 'Start here' },
  { id: 'commerce', label: 'Sell and run orders' },
  { id: 'grow', label: 'Grow' },
  { id: 'business', label: 'Your business' },
  { id: 'account', label: 'Account' },
]

export const GUIDE_TABS = [
  { id: 'overview', group: 'start', plan: 'starter', about: 'Your home screen: today at a glance and what to do next.', can: ['See sales, orders and store views', 'Finish your setup checklist', 'Jump to anything that needs you'] },

  { id: 'products', group: 'commerce', plan: 'starter', only: 'products', about: 'Everything you sell, with photos, prices and stock.', can: ['Add and edit products', 'Set stock so sold-out items sort last', 'Write descriptions with AI on Growth and up'] },
  { id: 'services', group: 'commerce', plan: 'starter', only: 'services', about: 'The services you offer, with durations and where they happen.', can: ['Add and edit services', 'Set duration and location type', 'Let customers book from your store'] },
  { id: 'categories', group: 'commerce', plan: 'starter', about: 'Group what you sell so customers can filter your store.', can: ['Create categories', 'Move items between them'] },
  { id: 'ledger', group: 'commerce', plan: 'starter', about: 'Your sales book, for walk-in, WhatsApp and offline sales.', can: ['Record a sale in seconds', 'Track paid, pending and part-paid', 'Download it as CSV or PDF'] },
  { id: 'receipts', group: 'commerce', plan: 'starter', about: 'Make and send receipts for any sale.', can: ['Create a receipt', 'Brand it with your logo on Growth and up', 'Keep a history of every receipt'] },
  { id: 'orders', group: 'commerce', plan: 'pro', only: 'products', about: 'Every paid order from your store, in one list.', can: ['See orders the moment they are paid', 'Update status so customers get emails', 'Download receipts'], pitch: 'Customers pay on your store and orders create themselves. No more matching bank alerts.' },
  { id: 'bookings', group: 'commerce', plan: 'pro', only: 'services', about: 'Appointments customers book from your store, on a calendar.', can: ['See bookings by day', 'Confirm or reschedule', 'Keep customers updated'], pitch: 'Let customers pick a time and pay to book, and see your week on a calendar.' },
  { id: 'delivery', group: 'commerce', plan: 'pro', about: 'Book delivery with Sendbox and Topship, or use your own zones.', can: ['Get live rates', 'Book and track shipments', 'Set delivery zones and prices'], pitch: 'Live delivery rates at checkout and shipments booked in one tap, with tracking for your customer.' },
  { id: 'customers', group: 'commerce', plan: 'pro', about: 'Everyone who has bought from you, with spend and history.', can: ['Sort by spend, orders or recency', 'Message a customer on WhatsApp', 'Spot your best customers'], pitch: 'Know who your best customers are and bring them back.' },
  { id: 'abandoned', group: 'commerce', plan: 'premium', about: 'Shoppers who started checkout but did not pay.', can: ['See who left and what they wanted', 'Send a reminder with one tap'], pitch: 'Win back sales from people who almost paid.' },
  { id: 'leads', group: 'commerce', plan: 'starter', about: 'Enquiries from the form on your store.', can: ['See who asked and what about', 'Reply on WhatsApp or email'] },
  { id: 'reminders', group: 'commerce', plan: 'starter', about: 'Reminders you set by asking Sella AI.', can: ['Turn a reminder off', 'Delete reminders you no longer need'] },

  { id: 'analytics', group: 'grow', plan: 'growth', about: 'How your store is doing: views, clicks and what sells.', can: ['See store views and top clicks', 'Find your best sellers on Pro and up'], pitch: 'See what customers look at and what they buy, so you stock more of what sells.' },
  { id: 'marketing', group: 'grow', plan: 'starter', about: 'Get found on Google and give buyers a reason to trust you.', can: ['Post kit, Google Maps kit and your guarantee on every plan', 'Google and AI search listing on Growth and up', 'Free Google Shopping listings on Growth and up'] },
  { id: 'discounts', group: 'grow', plan: 'pro', about: 'Promo codes customers use at checkout.', can: ['Percentage or fixed discounts', 'Usage limits and expiry dates'], pitch: 'Run sales and promo codes that apply themselves at checkout.' },
  { id: 'reviews', group: 'grow', plan: 'pro', about: 'Verified reviews from customers who bought.', can: ['See ratings and comments', 'Show stars on your products'], pitch: 'Verified buyer reviews and stars that help strangers trust you.' },
  { id: 'loyalty', group: 'grow', plan: 'premium', about: 'Points customers earn and spend with you.', can: ['Set how points are earned', 'See every customer card'], pitch: 'Reward repeat customers with points so they come back.' },
  { id: 'referral-program', group: 'grow', plan: 'starter', about: 'Earn when businesses you invite pay for a plan.', can: ['Share your referral code', 'Track sign-ups and earnings', 'Request a withdrawal'] },
  { id: 'google-ads', group: 'grow', plan: 'premium', about: 'Run and track Google Ads from your dashboard.', can: ['Create campaigns', 'See spend and results'], pitch: 'Put your store in front of people searching on Google, and track every naira.' },
  { id: 'meta-pixel', group: 'grow', plan: 'premium', about: 'Measure your Facebook and Instagram ads.', can: ['Connect your own Pixel', 'Track visits and purchases'], pitch: 'See which Facebook and Instagram ads actually bring sales.' },
  { id: 'tiktok-pixel', group: 'grow', plan: 'premium', about: 'Your TikTok Pixel and account, connected.', can: ['Connect your Pixel', 'Link your TikTok account'], pitch: 'Measure your TikTok ads and connect your account.' },
  { id: 'job-listings', group: 'grow', plan: 'starter', about: 'Post openings on the public Sellapage jobs board.', can: ['Post a job (5 on Starter, more on paid plans)', 'Get applications by WhatsApp or email'] },
  { id: 'store-design', group: 'grow', plan: 'premium', about: 'Design your own storefront page, section by section.', can: ['Build your home and service pages', 'Add About, Contact and Policies pages'], pitch: 'Design a storefront that looks like your brand, with your own About, Contact and Policies pages.' },

  { id: 'online-store', group: 'business', plan: 'starter', about: 'How your store looks and what it says about you.', can: ['Pick a theme and layout', 'Edit your business details and links'] },
  { id: 'payouts', group: 'business', plan: 'pro', about: 'Where your sales money goes, through Paystack.', can: ['Connect your bank account', 'See every settlement'], pitch: 'Paystack settles your sales straight to your bank. Sellapage takes no cut.' },
  { id: 'mobile-app', group: 'business', plan: 'starter', about: 'Get the Sellapage app on your phone.', can: ['Install from Google Play', 'Add to your home screen on iPhone'] },

  { id: 'billing', group: 'account', plan: 'starter', about: 'Your plan, payments and receipts.', can: ['Upgrade or change plan', 'Download receipts and a statement'] },
  { id: 'custom-domain', group: 'account', plan: 'pro', about: 'Use your own domain, like yourbrand.com.', can: ['Connect a domain', 'Check it is working'], pitch: 'Your store on your own domain, so your brand is what customers remember.' },
  { id: 'cac-verification', group: 'account', plan: 'pro', about: 'Show buyers your business is registered with CAC.', can: ['Submit your CAC details', 'Get a verified badge'], pitch: 'A verified CAC badge on your store, so buyers know you are real.' },
  { id: 'team', group: 'account', plan: 'premium', about: 'Give staff their own sign-in with only the access they need.', can: ['Invite staff', 'Choose which tabs each role can open'], pitch: 'Let your team help without sharing your password.' },
  { id: 'settings', group: 'account', plan: 'starter', about: 'Your account, security, notifications and integrations.', can: ['Turn on order alerts', 'Manage sign-in security'] },
  { id: 'support', group: 'account', plan: 'starter', about: 'Message the Sellapage team. Your store details go with it.', can: ['Ask a question', 'Report a problem'] },
]

export const guideTab = (id) => GUIDE_TABS.find((t) => t.id === id) || null
