import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import SEO from '../components/SEO'


const LAST_UPDATED = 'April 2026'

const sections = [
  {
    title: 'Who Can Use Sellapage',
    content: [
      'You must provide accurate information when creating your account.',
      'One store per person. You cannot create multiple stores to abuse the free plan.',
    ],
  },
  {
    title: 'What You Can and Cannot Sell',
    content: [
      'You can sell any legal product or service.',
      'You cannot list fake, counterfeit, or stolen products.',
      'You cannot sell illegal items - drugs, weapons, or anything prohibited by Nigerian law.',
      'You cannot use Sellapage to scam customers. Any fraudulent store will be removed immediately.',
      'You are fully responsible for the accuracy of your product listings and pricing.',
    ],
  },
  {
    title: 'Your Store Content',
    content: [
      'You own everything you upload - your product photos, descriptions, and store information.',
      'By uploading content, you give Sellapage permission to display it on your store page.',
      'Do not upload content you do not own or have the right to use.',
      'We reserve the right to remove any content that violates these terms.',
    ],
  },
  {
    title: 'Transactions and Payments',
    content: [
      'Sellapage helps you manage store pages, orders, customers, payments, delivery details, and related commerce workflows.',
      'You are responsible for fulfilling orders accurately, communicating with customers clearly, and resolving customer issues fairly.',
      'Where payment tools are used, payment processing is handled through supported licensed payment partners.',
      'Always be honest with your customers about prices, availability, and delivery.',
    ],
  },
  {
    title: 'The Free Plan',
    content: [
      'The Starter plan is free forever and available to all eligible users.',
      'Paid plans unlock more tools for analytics, carts, customers, reviews, payments, themes, and growth.',
      'Your free store remains accessible within the Starter plan limits.',
      'We reserve the right to change free plan limits with reasonable notice.',
    ],
  },
  {
    title: 'Account Suspension and Removal',
    content: [
      'We can suspend or remove any store that violates these terms.',
      'Stores that scam customers, list illegal items, or abuse the platform will be removed without warning.',
      'If your store is removed for a genuine reason and you disagree, contact us to appeal.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'Sellapage is a tool to help you sell. We are not responsible for your business results.',
      'We do our best to keep the platform running, but we cannot guarantee 100% uptime.',
      'We are not liable for any losses you suffer from using or not being able to use Sellapage.',
    ],
  },
  {
    title: 'Changes to These Terms',
    content: [
      'We may update these terms as the platform grows.',
      'We will notify you of major changes via email or your dashboard.',
      'Continuing to use Sellapage after changes means you accept the updated terms.',
    ],
  },
]


export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Terms of Service"
        description="Sellapage terms of service. Read the rules and guidelines for using our platform."
        url="/terms"
        noIndex
      />
      <Navbar />

      {/* Header */}
      <section className="bg-gray-50 pt-28 pb-12 px-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <p className="section-tag mb-3">LEGAL</p>
          <h1 className="font-display text-4xl font-extrabold text-gray-900 mb-3">
            Terms of Service
          </h1>
          <p className="text-gray-400 text-sm">Last updated: {LAST_UPDATED}</p>
          <p className="text-gray-500 text-base mt-4 leading-relaxed max-w-xl">
            These are the rules for using Sellapage. They are written in plain English
            so there is no confusion. Please read them - they are short.
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

          {/* Governing law */}
          <Reveal className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
            <h2 className="font-display font-bold text-gray-900 text-xl mb-2">
              Governing Law
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              These terms are governed by the laws of the Federal Republic of Nigeria.
              Any disputes will be resolved under Nigerian jurisdiction.
            </p>
          </Reveal>

          {/* Questions */}
          <Reveal className="bg-brand-50 rounded-2xl border border-brand-100 p-6">
            <h2 className="font-display font-bold text-gray-900 text-xl mb-2">
              Questions about these terms?
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">
              If anything here is unclear or you want to raise a concern, we're happy to help.
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
