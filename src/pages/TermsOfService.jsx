// src/pages/TermsOfService.jsx
// The terms text. Laid out by components/legal/LegalPage.jsx (2026-10-08).
// Edit the wording here. The two marketplace agreements keep their anchors
// (agreement.anchor), which the accept box and emails link to.
import LegalPage from '../components/legal/LegalPage'
import AgreementText from '../components/legal/AgreementText'
import { SUPPLIER_AGREEMENT, DROPSHIPPER_AGREEMENT } from '../utils/marketplaceAgreements'


const LAST_UPDATED = 'September 2026'

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
    title: 'Dropshipping Marketplace',
    content: [
      'The Dropshipping Marketplace lets approved Pro and Premium stores supply products to other stores, and lets stores sell those products without holding stock. Taking part requires accepting the Marketplace Supplier Agreement or the Marketplace Dropshipper Agreement below, which form part of these terms.',
      'Sellapage is a platform. It is not the seller, buyer, owner, carrier or guarantor of any marketplace product, and it is not a party to the sale between a store and its customer.',
      'Payments are processed by Paystack and divided between the supplier, the selling store and Sellapage at the moment of payment. Sellapage does not hold these funds.',
      'A customer who buys a marketplace product keeps every right the law gives them, including returning damaged, defective or not-as-described goods for a full refund.',
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
    title: 'Sella AI',
    content: [
      'Sella AI is an optional assistant on the Premium plan. It can read your dashboard and, once you confirm, make changes to it. It is a tool, not an adviser, and its output is not professional, financial or legal advice.',
      'Sella AI is built on large language models and can be wrong. You are responsible for checking anything you act on, including prices, stock levels, order statuses and anything shown to your customers. We are not liable for losses arising from acting on its output without verifying it.',
      'Sella AI never changes your store without showing you the exact change and getting your confirmation first. A change you approve is treated as your own.',
      'It can never write to payouts, billing, bank details, staff management, security settings or account deletion, and cannot alter system-managed values such as your plan, verification status or referral balance. These limits are enforced on our servers.',
      'If you allow staff to use Sella AI, it acts within their permissions, not yours, and cannot reach a tab their role does not already allow.',
      'Using Sella AI sends your store data, and where relevant your customers’ personal data, to third-party AI providers. See our Privacy Policy for what is shared and with whom. Fair use is 50 messages per store per day.',
    ],
  },
  {
    title: 'Limitation of Liability',
    content: [
      'Sellapage is a tool to help you sell. We are not responsible for your business results.',
      'We do our best to keep the platform running, but we cannot guarantee 100% uptime.',
      'We are not liable for lost profits, lost sales, lost data or any indirect loss.',
      'Our total liability to you in any 12 months is limited to the fees you paid us in that period.',
      'None of this limits liability for fraud, for our gross negligence, or for anything the law does not allow us to limit.',
    ],
  },
  {
    title: 'Changes to These Terms',
    content: [
      'We may update these terms as the platform grows.',
      'We will notify you of major changes via email or your dashboard.',
      'Continuing to use Sellapage after changes means you accept the updated terms.',
      'We may transfer these terms, and our rights and duties under them, to a company that runs Sellapage, including one formed to take over the business. Your rights do not change when we do.',
    ],
  },
]


const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function TermsOfService() {
  const items = [
    ...sections.map((s) => ({ id: slug(s.title), title: s.title, content: s.content })),
    // Dropshipping Marketplace agreements (utils/marketplaceAgreements.js).
    ...[SUPPLIER_AGREEMENT, DROPSHIPPER_AGREEMENT].map((agreement) => ({
      id: agreement.anchor,
      title: agreement.title,
      node: <AgreementText agreement={agreement} />,
    })),
    {
      id: 'governing-law',
      title: 'Governing Law',
      tone: 'green',
      node: <p className="text-[14.5px] leading-relaxed text-gray-700">These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be resolved under Nigerian jurisdiction.</p>,
    },
  ]
  return (
    <LegalPage
      path="/terms"
      kind="terms"
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These are the rules for using Sellapage. They are written in plain English so there is no confusion. Please read them, they are short."
      items={items}
      sibling={{ to: '/privacy-policy', label: 'Privacy Policy' }}
    />
  )
}
