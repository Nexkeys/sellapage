import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'
import { pageSeo } from '../data/seoPages'


const LAST_UPDATED = 'September 2026'

const sections = [
  {
    title: 'What We Collect',
    content: [
      'When you create an account: your name, email address, business name, and business contact number.',
      'Products or services you add to your store: names, prices, descriptions, categories, stock details, and images.',
      'Customer enquiries submitted through your store page: their name, phone number, and interest note.',
      'Basic usage data: which pages you visit and how long you spend on them. This helps us improve the platform.',
    ],
  },
  {
    title: 'How We Use Your Data',
    content: [
      'To run your store, dashboard, customer records, orders, payments, analytics, and support experience.',
      'To send you important updates about your account or the platform.',
      'To connect customers with your business when they place an order or submit an enquiry.',
      'To improve Sellapage based on how it is being used.',
      'We do NOT sell your data to anyone. Ever.',
    ],
  },
  {
    title: 'How We Share Your Data',
    content: [
      'Payment processing: We share transaction details with Paystack (our payment processor) to process payments. Paystack has its own privacy policy governing how they handle your financial data.',
      'Order fulfillment: We share delivery addresses, recipient names, and phone numbers with Sendbox and Topship (our logistics partners) to deliver orders to your customers.',
      'Advertising: When you connect a Google Ads account, we communicate with the Google Ads API to create and manage campaigns on your behalf. Campaign data (names, budgets, performance metrics) is shared with Google for this purpose.',
      'Meta Pixel: A vendor may add their own Meta Pixel ID to their store. When they do, their storefront sends standard Meta events (page views, product views, add to cart, checkout started, and completed purchases including the order value) directly from the visitor’s browser to Meta. Sellapage does not receive or store this data. If that vendor has enabled Automatic Advanced Matching inside their own Meta account, Meta may additionally collect details a visitor types into the checkout form, such as name, email address and phone number, in hashed form.',
      'Business verification: If you use our advertising features, we may share business verification documents (such as CAC registration) with Meta for advertising account verification.',
      'Legal compliance: We may disclose data if required by law, court order, or to protect the rights and safety of Sellapage and its users.',
      'We do NOT sell your personal data to third parties.',
    ],
  },
  {
    title: 'How We Protect Your Data',
    content: [
      'All data is encrypted in transit using TLS/SSL encryption between your device and our servers.',
      'All data at rest is stored in Firebase Firestore with server-side encryption managed by Google Cloud.',
      'API keys, OAuth refresh tokens, and payment credentials are stored server-side only and are never exposed to browsers or client-side code.',
      'Firebase Authentication handles all identity verification - we do not store raw passwords.',
      'Access to your store data is restricted to your authenticated account only. No other vendor or user can access your data.',
      'We perform regular security monitoring and follow industry best practices for web application security.',
    ],
  },
  {
    title: 'Where Your Data Is Stored',
    content: [
      'All data is stored securely on Google Firebase - a trusted cloud platform used by millions of apps worldwide.',
      'Firebase complies with GDPR and international data protection standards.',
      'Product images are stored on Cloudinary, a secure media cloud service.',
    ],
  },
  {
    title: 'Your Customer Data',
    content: [
      'When a customer submits an enquiry through your store, their details are stored in your dashboard.',
      'If you switch on abandoned checkout recovery, we also store the name, email, phone number and basket contents of customers who begin checkout but do not pay. These records are deleted automatically after 30 days, and nothing is stored at all while the setting is off.',
      'If you switch on loyalty points, we store a points balance against a customer’s email address so they can spend it on a future order.',
      'You can send a customer one recovery email per 24 hours from your dashboard. It is sent in your store’s name, so you are responsible for its use.',
      'You are responsible for how you use that customer data.',
      'Do not spam or misuse customer contact details.',
    ],
  },
  {
    title: 'Cookies',
    content: [
      'We use basic cookies to keep you logged in to your dashboard.',
      'Sellapage itself does not set advertising or tracking cookies.',
      'However, a vendor may connect their own Meta (Facebook) Pixel to their store. Where they have done so, visiting that store places Meta advertising cookies (such as _fbp) in your browser, and your activity on that store is reported to Meta. This happens only on stores whose owner has switched it on, and the data goes to that vendor’s Meta account, not to Sellapage.',
      'You can clear cookies at any time through your browser settings, and most browsers allow you to block third-party cookies entirely.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'You can delete your account and all associated data at any time from your dashboard Settings page.',
      'You can update your store information anytime.',
      'To request a full data export or raise a data concern, contact us at the address below.',
    ],
  },
  {
    title: 'Changes to This Policy',
    content: [
      'We may update this privacy policy as the platform grows and adds more commerce tools.',
      'We will notify you of any major changes via email or a notice on your dashboard.',
      'The date at the top of this page shows when it was last updated.',
    ],
  },
]


export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <SEO {...pageSeo("/privacy-policy")} url="/privacy-policy" />
      <Navbar />

      {/* Header */}
      <section className="bg-gray-50 pt-28 pb-12 px-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl font-extrabold text-gray-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-gray-500 text-base mt-4 leading-relaxed max-w-xl">
            We know legal pages can be confusing. 
            <br></br>
            This one is written in plain English so you
            understand exactly what we do with your data and what we don't.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-10">
          {sections.map((section, i) => (
            <Reveal key={i} delay={Math.min(i, 4) * 60}>
              <h2 className="font-display font-bold text-gray-900 text-xl mb-4">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.content.map((point, j) => (
                  <li key={j} className="flex items-start gap-3 text-gray-600 text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full flex-shrink-0 mt-2" />
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}

          {/* Contact */}
          <Reveal className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
            <h2 className="font-display font-bold text-gray-900 text-xl mb-2">
              Questions?
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">
              If you have any questions about this privacy policy or how we handle your data,
              please reach out:
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-brand-600 font-semibold text-sm hover:underline"
            >
              Contact Us →
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
