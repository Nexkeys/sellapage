// src/data/seoPages.js
//
// Single source of truth for public-page SEO.
//
// Used in two places, deliberately:
//   1. The React pages, via <SEO />, for browsers and for Google (which does
//      execute JavaScript).
//   2. scripts/prerender-seo.mjs at build time, which bakes the same title,
//      description, canonical, OG tags, JSON-LD and a readable prose summary
//      into a static HTML file per route.
//
// (2) is the one that matters for AI. Sellapage is a client-rendered SPA, so
// the raw HTML a crawler downloads is `<div id="root"></div>` and nothing else.
// Google runs the JS and sees the real page, but GPTBot, ClaudeBot,
// PerplexityBot and CCBot generally do not - they read the HTML as delivered.
// Without the prerendered copy, asking an AI "what is Sellapage" gets nothing,
// no matter how good the in-app meta tags are.
//
// Keeping both readers on one object is what stops the two descriptions
// drifting apart, which would be worse than having none.

export const SITE = {
  name: 'Sellapage',
  legalName: 'Sellapage',
  url: 'https://sellapage.com.ng',
  logo: 'https://sellapage.com.ng/pwa-512x512.png',
  image: 'https://sellapage.com.ng/og-image.png',
  email: 'sellapage.ng@gmail.com',
  whatsapp: '+2348120525256',
  country: 'NG',
  // sameAs is what lets Google and AI assistants tie these profiles to one
  // entity called "Sellapage" rather than four unrelated pages.
  sameAs: [
    'https://web.facebook.com/profile.php?id=61590336756804',
    'https://www.instagram.com/sellapageng/',
    'https://www.tiktok.com/@sellapage',
    'https://ng.linkedin.com/company/sellapage',
  ],
  description:
    'Sellapage is an all-in-one commerce platform built for Nigerian businesses. Vendors create an online store page for products, services or bookings, take payments through Paystack, arrange delivery with Sendbox and Topship, and manage orders, customers, reviews, discounts and analytics from a single dashboard. The Starter plan is free forever.',
}

/** Organization + WebSite. Emitted on the home page; the entity every other page hangs off. */
export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      legalName: SITE.legalName,
      url: SITE.url,
      logo: { '@type': 'ImageObject', url: SITE.logo },
      description: SITE.description,
      email: SITE.email,
      sameAs: SITE.sameAs,
      areaServed: { '@type': 'Country', name: 'Nigeria' },
      knowsAbout: [
        'ecommerce in Nigeria',
        'online store builder',
        'WhatsApp commerce',
        'Paystack payments',
        'small business software',
        'service booking',
        'order management',
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: SITE.email,
          telephone: SITE.whatsapp,
          areaServed: 'NG',
          availableLanguage: ['en'],
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      publisher: { '@id': `${SITE.url}/#organization` },
      inLanguage: 'en-NG',
    },
  ],
}

/** Builds a BreadcrumbList so search results show the section, not a bare URL. */
export function breadcrumb(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  }
}

/** Builds an FAQPage. These are the questions an AI is most likely to be asked. */
export function faq(questions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a },
    })),
  }
}

const HOME_FAQ = [
  {
    q: 'What is Sellapage?',
    a: 'Sellapage is an all-in-one commerce platform for Nigerian businesses. It gives a vendor a shareable online store page for products, services or bookings, with Paystack checkout, Sendbox and Topship delivery, customer records, verified reviews, discount codes, receipts and analytics in one dashboard.',
  },
  {
    q: 'How much does Sellapage cost?',
    a: 'The Starter plan is free forever. Paid Growth, Pro and Premium plans add higher listing limits, analytics, AI product descriptions, custom domains, premium themes, team accounts and payout tools.',
  },
  {
    q: 'Who is Sellapage for?',
    a: 'Nigerian small and medium businesses, service providers, freelancers and creators who sell on Instagram, WhatsApp or TikTok and need a proper store page with checkout instead of a link list or a DM thread.',
  },
  {
    q: 'How do customers pay on Sellapage?',
    a: 'Payments are processed through Paystack, so customers can pay by card, bank transfer or USSD directly on the store page. Orders are created automatically when a payment succeeds.',
  },
  {
    q: 'Do I need a developer to use Sellapage?',
    a: 'No. A store is set up from a form in the dashboard, with no code, no hosting and no installation. Most vendors have a live store page in under two minutes.',
  },
  {
    q: 'Does Sellapage handle delivery?',
    a: 'Yes. Sellapage integrates with Sendbox and Topship for local and international shipping, and supports custom delivery zones and rates set by the vendor.',
  },
  {
    q: 'Can I sell services or take bookings, not just products?',
    a: 'Yes. Sellapage supports product stores, service stores and bookings, including appointment scheduling, so service providers and product sellers both have a native setup.',
  },
  {
    q: 'Is Sellapage a marketplace?',
    a: 'No. Each vendor gets their own independent store page and their own customers. Sellapage is the software behind the store, not a marketplace that owns the buyer relationship.',
  },
]

/**
 * Per-route SEO.
 *
 * `prose` is written to be read aloud by a machine: plain, factual sentences
 * that answer "what is this page and what is Sellapage" without marketing
 * filler. It is what an AI crawler actually ingests.
 */
export const PAGE_SEO = {
  '/': {
    title: null, // uses the site-level title
    description: SITE.description,
    keywords:
      'sellapage, nigerian ecommerce platform, online store nigeria, sell products online nigeria, whatsapp store nigeria, instagram shop nigeria, paystack checkout, online shop builder nigeria, business page nigeria, free online store nigeria, ecommerce for small business nigeria, service booking nigeria, sell on instagram nigeria, link in bio store, storefront builder africa',
    jsonLd: [ORGANIZATION_JSONLD],
    prose: [
      'Sellapage is an all-in-one commerce platform built for Nigerian businesses.',
      'A vendor signs up, creates a store page for products, services or bookings, and shares one link on Instagram, WhatsApp, TikTok or anywhere else. Customers browse the page and pay on it directly.',
      'Payments run through Paystack, supporting card, bank transfer and USSD. Orders are created automatically when payment succeeds. Delivery integrates with Sendbox and Topship, and vendors can set their own delivery zones and rates.',
      'The dashboard covers products and services, orders, bookings, customer records, verified reviews, discount codes, receipts, a ledger, payouts, analytics and AI-written product descriptions.',
      'The Starter plan is free forever. Growth, Pro and Premium add higher limits, custom domains, premium themes, team accounts and advanced payout and marketing tools.',
      'Sellapage is not a marketplace. Each vendor keeps their own store page and their own customers.',
      // The FAQ answers are folded into the prose rather than emitted as a
      // second FAQPage block, because index.html already ships one and two
      // FAQPage entries on a single URL is invalid. Crawlers still read every
      // answer here; only the duplicate schema is avoided.
      ...HOME_FAQ.map((item) => `${item.q} ${item.a}`),
    ],
  },

  '/about': {
    title: 'About',
    description:
      'Sellapage is an all-in-one commerce platform for Nigerian merchants, service providers and freelancers. Learn what it does, who builds it, and why it exists.',
    keywords:
      'about sellapage, sellapage company, nigerian ecommerce platform, who owns sellapage, sellapage story, nigerian startup ecommerce, online business nigeria, sellapage mission',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])],
    prose: [
      'Sellapage exists because selling online in Nigeria usually means stitching together an Instagram page, a WhatsApp thread, a bank transfer and a dispatch rider, with nothing joined up.',
      'Sellapage replaces that with one store page and one dashboard: listings, checkout, delivery, customers, reviews, discounts, receipts and analytics in a single place.',
      'It is built specifically for Nigerian conditions, including Paystack payments in naira, Sendbox and Topship delivery, Lagos Island and Mainland delivery zones, and pricing that suits a small business rather than an enterprise.',
      'The Starter plan is free forever, so a vendor can have a working store without paying anything.',
    ],
  },

  '/pricing': {
    title: 'Pricing',
    description:
      'Sellapage pricing for Nigerian businesses. Starter is free forever. Growth, Pro and Premium add analytics, custom domains, AI descriptions, team accounts and payout tools. No lock-in.',
    keywords:
      'sellapage pricing, sellapage plans, free online store nigeria, ecommerce pricing nigeria, online store cost nigeria, cheap ecommerce platform nigeria, shopify alternative pricing nigeria, sellapage starter growth pro premium',
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing' }]),
      faq([
        { q: 'Is Sellapage free?', a: 'Yes. The Starter plan is free forever and includes a live store page, listings, orders and customer enquiries.' },
        { q: 'What do paid plans add?', a: 'Growth, Pro and Premium add higher listing limits, analytics, AI product descriptions, premium themes, custom domains, verified reviews, team accounts, delivery zones and payout tools.' },
        { q: 'Is there a lock-in contract?', a: 'No. Plans are subscriptions and a vendor can stay on Starter indefinitely.' },
      ]),
    ],
    prose: [
      'Sellapage has four plans: Starter, Growth, Pro and Premium.',
      'Starter is free forever and includes a live store page, product or service listings, order handling and customer enquiries.',
      'Paid plans progressively add higher listing limits, analytics, AI-written descriptions, premium themes, custom domains, verified reviews, customer records, discount codes, delivery zones, team accounts and payout tools.',
      'Prices are in naira and billed through Paystack. There is no lock-in contract and a vendor can remain on the free plan indefinitely.',
    ],
  },

  '/live-stores': {
    title: 'Explore Stores',
    description:
      'Browse live Nigerian businesses selling on Sellapage. Real product stores, service providers and bookings, each with its own store page and checkout.',
    keywords:
      'live stores nigeria, browse nigerian online stores, nigerian small business directory, sellapage stores, online shops nigeria, nigerian vendors online, discover nigerian businesses, shop nigerian brands online, nigerian service providers directory',
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Explore Stores', path: '/live-stores' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Explore Stores on Sellapage',
        description:
          'A directory of live Nigerian businesses using Sellapage for products, services and bookings.',
        url: `${SITE.url}/live-stores`,
        isPartOf: { '@id': `${SITE.url}/#website` },
        about: { '@id': `${SITE.url}/#organization` },
      },
    ],
    prose: [
      'This page lists live Nigerian businesses selling through Sellapage.',
      'Each listing is an independent store page run by its own vendor, covering physical products, services or bookings, with its own checkout and delivery settings.',
      'Stores can be searched by name, category or description. Selecting one opens that vendor store page, where a customer can browse listings and order directly.',
      'Any Nigerian business can appear here by creating a free Sellapage store.',
    ],
  },

  '/success-stories': {
    title: 'Success Stories',
    description:
      'Real Nigerian vendors describing what selling on Sellapage changed for their business, in their own words.',
    keywords:
      'sellapage reviews, sellapage testimonials, nigerian vendor success stories, is sellapage legit, sellapage customer reviews, nigerian ecommerce success stories, sellapage feedback',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Success Stories', path: '/success-stories' }])],
    prose: [
      'This page collects reviews and stories from Nigerian vendors who sell using Sellapage.',
      'Each entry is submitted by a real vendor with a live store, describing how they sell, what changed after moving to a Sellapage store page, and which features they rely on.',
      'The reviews are verified before they are published.',
    ],
  },

  '/contact': {
    title: 'Contact Us',
    description:
      'Contact the Sellapage team by email or WhatsApp for support, questions about plans, or help setting up a store.',
    keywords:
      'contact sellapage, sellapage support, sellapage customer service, sellapage whatsapp, sellapage email, sellapage help, talk to sellapage',
    jsonLd: [
      breadcrumb([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        url: `${SITE.url}/contact`,
        about: { '@id': `${SITE.url}/#organization` },
      },
    ],
    prose: [
      `The Sellapage team can be reached by email at ${SITE.email} or on WhatsApp at ${SITE.whatsapp}.`,
      'Support covers account setup, plans and billing, payouts, delivery configuration and reporting a problem with a store.',
    ],
  },

  '/report-store': {
    title: 'Report a Store',
    description:
      'Report a scam, fraudulent or abusive store on Sellapage. Reports are reviewed and stores that break the rules are removed.',
    keywords:
      'report sellapage store, report scam store nigeria, sellapage fraud report, report fake online store nigeria, sellapage safety, online scam nigeria report',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Report a Store', path: '/report-store' }])],
    prose: [
      'This page is used to report a store on Sellapage that appears to be a scam, is selling prohibited items, or is otherwise breaking the platform rules.',
      'Reports are reviewed by the Sellapage team. Stores that defraud customers, list illegal items or abuse the platform are removed.',
      'Anyone can submit a report, including customers who are not Sellapage vendors.',
    ],
  },

  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'How Sellapage collects, uses, stores and shares data, including payment processing with Paystack, delivery with Sendbox and Topship, and your rights over your data.',
    keywords:
      'sellapage privacy policy, sellapage data protection, how sellapage uses my data, nigerian ecommerce privacy, sellapage gdpr, sellapage data storage, does sellapage sell my data',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Privacy Policy', path: '/privacy-policy' }])],
    prose: [
      'The Sellapage privacy policy explains what data is collected, how it is used, and who it is shared with.',
      'Data is encrypted in transit and stored in Google Firebase with server-side encryption. Product images are stored on Cloudinary.',
      'Transaction details are shared with Paystack for payment processing, and delivery details with Sendbox and Topship for fulfilment. Advertising data is shared with Google and Meta only when a vendor connects those ad accounts.',
      'Sellapage does not sell personal data. Vendors can delete their account and all associated data from the dashboard settings page.',
    ],
  },

  '/terms': {
    title: 'Terms of Service',
    description:
      'The rules for using Sellapage, in plain English: who can sell, what may and may not be listed, payments and fulfilment, the free plan, account removal and governing law.',
    keywords:
      'sellapage terms of service, sellapage rules, sellapage terms and conditions, what can i sell on sellapage, sellapage account suspension, sellapage legal',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Terms of Service', path: '/terms' }])],
    prose: [
      'The Sellapage terms of service set out the rules for using the platform.',
      'Vendors may sell any legal product or service. Counterfeit, stolen and illegal items are prohibited, as is defrauding customers, and stores that break these rules are removed.',
      'Vendors own the content they upload and are responsible for the accuracy of listings, pricing and fulfilment. Payment processing is handled by licensed partners.',
      'The Starter plan is free forever. These terms are governed by the laws of the Federal Republic of Nigeria.',
    ],
  },

  '/jobs': {
    title: 'Jobs and Opportunities',
    description:
      'Job openings posted by Nigerian businesses on Sellapage. Browse roles by category and location and apply directly by WhatsApp or email.',
    keywords:
      'nigeria jobs, job openings nigeria, hiring nigeria, lagos jobs, remote jobs nigeria, small business jobs nigeria, apply for jobs whatsapp nigeria, sellapage jobs board',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Jobs', path: '/jobs' }])],
    prose: [
      'This page lists job openings posted by Nigerian businesses that use Sellapage.',
      'Roles can be filtered by category, job type and search term. Applications are sent directly to the employer by WhatsApp or email, with no account required.',
      'Any Sellapage vendor can post a job opening from their dashboard.',
    ],
  },

  '/blog': {
    title: 'Blog',
    description:
      'Guides and practical advice for Nigerian business owners on selling online, pricing, delivery, customer service and growing a store.',
    keywords:
      'nigerian business tips, how to sell online in nigeria, ecommerce guide nigeria, small business advice nigeria, online selling tips nigeria, sellapage blog, start online business nigeria',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }])],
    prose: [
      'The Sellapage blog publishes practical guides for Nigerian business owners selling online.',
      'Topics include setting up a store, pricing, delivery and logistics, handling customers, writing product descriptions, and growing sales through Instagram, WhatsApp and TikTok.',
    ],
  },

  '/tools/offer-name-lab': {
    title: 'Business Name Generator',
    description:
      'Free business and store name generator for Nigerian sellers. Enter what you sell and who buys from you to get name options, a store description and an Instagram bio.',
    keywords:
      'business name generator nigeria, store name ideas nigeria, shop name generator, brand name generator, instagram bio generator, business name ideas nigeria, free naming tool',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Business Name Generator', path: '/tools/offer-name-lab' }])],
    prose: [
      'A free tool that generates store and brand name options for Nigerian sellers.',
      'It takes what you sell, who buys from you, a style and a preferred name format, and returns several name options plus a one-line store description and an Instagram bio you can paste straight into your profile.',
    ],
  },

  '/tools/policy-generator': {
    title: 'Store Policy Generator',
    description:
      'Free store policy generator for Nigerian businesses. Answer a few questions about payment, delivery and returns to get terms for your store page, Instagram highlight and WhatsApp.',
    keywords:
      'store policy generator, return policy generator nigeria, delivery policy nigeria, online store terms nigeria, whatsapp order terms, instagram store policy, refund policy template nigeria',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Store Policy Generator', path: '/tools/policy-generator' }])],
    prose: [
      'A free tool that writes store policies for Nigerian businesses.',
      'It asks how the store handles payment, delivery timing, logistics and returns, then produces three versions: full terms for a store page, a short version sized for an Instagram highlight, and a message to send on WhatsApp after checkout.',
    ],
  },

  '/compare/vs-shopify': {
    title: 'Sellapage vs Shopify',
    description:
      'Sellapage compared with Shopify for Nigerian businesses: naira pricing, Paystack checkout, local delivery, and no developer or app subscriptions required.',
    keywords:
      'sellapage vs shopify, shopify alternative nigeria, shopify nigeria cost, cheaper than shopify, shopify naira pricing, best ecommerce platform nigeria, shopify vs local platform',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Sellapage vs Shopify', path: '/compare/vs-shopify' }])],
    prose: [
      'A comparison of Sellapage and Shopify for a Nigerian business.',
      'Shopify is built for larger businesses with a technical team and a monthly budget in dollars, plus paid apps and additional transaction fees. Sellapage is priced in naira, includes Paystack checkout and Nigerian delivery partners, and needs no developer.',
      'The comparison covers cost, setup time, payments, delivery, and which platform suits which kind of business.',
    ],
  },

  '/compare/vs-linktree': {
    title: 'Sellapage vs Linktree',
    description:
      'Sellapage compared with Linktree: a full store page with products, checkout, delivery and orders, instead of a list of links.',
    keywords:
      'sellapage vs linktree, linktree alternative nigeria, link in bio with checkout, linktree for selling, sell from instagram bio nigeria, best link in bio nigeria',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Sellapage vs Linktree', path: '/compare/vs-linktree' }])],
    prose: [
      'A comparison of Sellapage and Linktree for a Nigerian business selling online.',
      'Linktree hosts a list of links. Sellapage replaces it with an actual store page where customers browse listings, pay by card, transfer or USSD, and create an order, and where the vendor sees customers, orders and analytics.',
    ],
  },

  '/compare/vs-whatsapp-business': {
    title: 'Sellapage vs WhatsApp Business',
    description:
      'Sellapage compared with WhatsApp Business: a public store page with checkout, delivery and analytics that works alongside WhatsApp instead of replacing it.',
    keywords:
      'sellapage vs whatsapp business, whatsapp business catalogue alternative, sell on whatsapp nigeria, whatsapp store nigeria, whatsapp catalog limits, online store for whatsapp sellers',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Sellapage vs WhatsApp Business', path: '/compare/vs-whatsapp-business' }])],
    prose: [
      'A comparison of Sellapage and WhatsApp Business for a Nigerian business.',
      'WhatsApp Business is a messaging app with a simple catalogue and no checkout, no public storefront and no analytics. Sellapage adds a shareable store page with Paystack checkout, delivery, customer records and reporting, and is designed to run alongside WhatsApp rather than replace it.',
    ],
  },

  '/compare/vs-instagram-bio': {
    title: 'Sellapage vs Instagram Bio Link',
    description:
      'Sellapage compared with selling through an Instagram bio link: a real commerce page with products, checkout and order tracking instead of DMs.',
    keywords:
      'sellapage vs instagram bio, instagram shop alternative nigeria, sell on instagram nigeria, instagram bio link store, instagram dm orders, instagram selling nigeria',
    jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Sellapage vs Instagram Bio', path: '/compare/vs-instagram-bio' }])],
    prose: [
      'A comparison of Sellapage and selling through an Instagram bio link.',
      'An Instagram bio link points somewhere but does not take payment, track an order or record a customer, so sales end up negotiated in DMs. Sellapage gives the same link a real store page behind it with checkout, delivery and order history.',
    ],
  },
}

/** Every route that gets a prerendered static HTML file. */
export const PRERENDER_ROUTES = Object.keys(PAGE_SEO)

/** Convenience for pages: looks up their own entry. */
export function pageSeo(path) {
  return PAGE_SEO[path] || null
}
