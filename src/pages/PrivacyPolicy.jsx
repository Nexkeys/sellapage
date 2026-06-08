import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'


const LAST_UPDATED = 'April 2026'

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
    title: 'Where Your Data Is Stored',
    content: [
      'All data is stored securely on Google Firebase — a trusted cloud platform used by millions of apps worldwide.',
      'Firebase complies with GDPR and international data protection standards.',
      'Product images are stored on Cloudinary, a secure media cloud service.',
    ],
  },
  {
    title: 'Your Customer Data',
    content: [
      'When a customer submits an enquiry through your store, their details are stored in your dashboard.',
      'You are responsible for how you use that customer data.',
      'Do not spam or misuse customer contact details.',
    ],
  },
  {
    title: 'Cookies',
    content: [
      'We use basic cookies to keep you logged in to your dashboard.',
      'We do not use advertising or tracking cookies.',
      'You can clear cookies at any time through your browser settings.',
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
      <Navbar />

      {/* Header */}
      <section className="bg-gray-50 pt-28 pb-12 px-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <p className="section-tag mb-3">LEGAL</p>
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
            <div key={i}>
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
            </div>
          ))}

          {/* Contact */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
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
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
