// src/components/dashboard/SellaTermsModal.jsx
// The Sella-AI-specific terms and privacy notice, shown EMBEDDED inside the
// Sella panel rather than linking out to the public /terms and /privacy pages.
//
// WHY EMBEDDED: the public policies cover the whole platform. What a vendor
// actually needs to consent to here is narrower and more specific - that their
// store data leaves Sellapage and is processed by third-party AI providers.
// Sending them to a 4,000-word public page to find that is not meaningful
// consent, and under the Nigeria Data Protection Act 2023 the disclosure has to
// be legible at the point of use.

import { useState } from "react";
import { X, ShieldCheck, FileText } from "lucide-react";

const UPDATED = "25 September 2026";

// Tabs Sella is structurally forbidden from writing to, mirrored from
// AI_NEVER_WRITE in src/api-handlers/_lib/ai-schema.js. Kept in sync by hand
// deliberately: if that list changes, this promise has to change with it.
const NEVER_WRITES =
  "payouts, billing, bank details, team/staff management, security settings and account deletion";

export default function SellaTermsModal({ open, onClose, initialTab = "terms", assistantName = "Sella" }) {
  const [tab, setTab] = useState(initialTab);
  if (!open) return null;

  const TabBtn = ({ id, icon: Icon, children }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
        tab === id
          ? "bg-green-500/15 text-green-300 border border-green-500/30"
          : "text-gray-400 hover:text-gray-200 border border-transparent"
      }`}
    >
      <Icon size={13} /> {children}
    </button>
  );

  const H = ({ children }) => (
    <h4 className="text-[12.5px] font-bold text-gray-100 mt-4 mb-1.5 first:mt-0">{children}</h4>
  );
  const P = ({ children }) => <p className="text-[12px] leading-[1.65] text-gray-400 mb-2">{children}</p>;
  const Li = ({ children }) => <li className="text-[12px] leading-[1.6] text-gray-400 mb-1">{children}</li>;
  const B = ({ children }) => <span className="text-gray-300 font-semibold">{children}</span>;

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm rounded-2xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${assistantName} terms and privacy`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-full flex flex-col rounded-2xl bg-[#0d0f0e] border border-white/12 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 flex-shrink-0">
          <TabBtn id="terms" icon={FileText}>Terms of Service</TabBtn>
          <TabBtn id="privacy" icon={ShieldCheck}>Privacy</TabBtn>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3.5">
          {tab === "terms" ? (
            <>
              <p className="text-[10.5px] uppercase tracking-wider text-gray-600 mb-3">
                {assistantName} AI · Terms · Updated {UPDATED}
              </p>

              <H>What {assistantName} is</H>
              <P>
                {assistantName} is an AI assistant available on the Premium plan. It can read your dashboard and, with your
                confirmation, make changes to it. It is a tool that assists you. It is not an employee, an accountant, a
                lawyer or a business adviser, and its output is not professional advice.
              </P>

              <H>It can make mistakes</H>
              <P>
                {assistantName} is built on large language models, which can be confidently wrong. It may misread a number,
                misunderstand a request or state something inaccurate. <B>You are responsible for checking anything you act
                on</B>, especially prices, stock levels, order statuses and anything shown to customers. Sellapage is not
                liable for losses arising from acting on {assistantName}&apos;s output without verifying it.
              </P>

              <H>Nothing changes without your confirmation</H>
              <P>
                {assistantName} never edits your store silently. Every change is shown to you first as a confirmation card
                naming the exact field and value, and nothing is saved until you approve it. Approving a change makes it
                yours. It is recorded against your account exactly as if you had made it yourself.
              </P>

              <H>What it can never touch</H>
              <P>
                Regardless of what you ask, {assistantName} cannot write to {NEVER_WRITES}. It also cannot alter
                system-managed values such as your plan, verification status or referral balance. These limits are enforced
                on our servers, not in the chat, so they hold even if {assistantName} is asked directly.
              </P>

              <H>Staff access</H>
              <P>
                If you give staff access to {assistantName}, it acts within <B>their</B> permissions, not yours. A staff
                member cannot use {assistantName} to reach a tab their role does not already allow.
              </P>

              <H>Files, imports and exports</H>
              <P>
                You can send {assistantName} files and photos. Only send files you have the right to use. When it adds items
                from a file, it shows you every row to review first, and it writes descriptions only from what the file
                says, but <B>check prices and details before you rely on them</B>. Exports are built from your data at the
                moment you download them, and once downloaded, keeping that file safe is your responsibility, because it can
                contain your customers&apos; personal data.
              </P>

              <H>Credits and fair use</H>
              <P>
                {assistantName} uses a monthly allowance of credits, charged by how much work each request takes. A quick
                question uses little, and reading large files or Deep mode uses more. Unused credits do not carry over to
                the next month. Premium store owners can buy extra credits with Paystack. Prices include 7.5% VAT and the
                Paystack processing fee, which is paid by you. <B>Bought credits are valid for 12 months from the date of
                purchase, are used only after your monthly credits run out, and are non-refundable</B>, including when they
                expire unused or your plan ends. Do not use {assistantName} to generate unlawful content, to impersonate
                others, or to attempt to extract data belonging to other stores.
              </P>
            </>
          ) : (
            <>
              <p className="text-[10.5px] uppercase tracking-wider text-gray-600 mb-3">
                {assistantName} AI · Privacy · Updated {UPDATED}
              </p>

              <H>Your data leaves Sellapage</H>
              <P>
                This is the part that matters most, so it is first. To answer you, {assistantName} sends the relevant parts
                of your conversation and store data to <B>third-party AI providers</B> (including Anthropic, Google, OpenAI,
                DeepSeek and Moonshot) through our AI routing provider, OpenRouter. Your data is processed on their
                infrastructure, outside Nigeria.
              </P>

              <H>What can be sent</H>
              <ul className="list-disc pl-4 mb-2">
                <Li>Your store profile, products, services and pricing</Li>
                <Li>Orders, bookings, receipts and sales figures</Li>
                <Li>Analytics, discounts, loyalty and marketing settings</Li>
                <Li>
                  <B>Customer personal data</B>: names, phone numbers, delivery addresses and order history, where your
                  question requires it
                </Li>
                <Li>
                  <B>Files and photos you send</B> in the chat. The text of documents is kept with that chat so you can ask
                  follow-up questions, and is deleted when you delete the chat.
                </Li>
                <Li>
                  <B>Voice</B>: recordings you speak into the chat are sent to be turned into text and are not kept. Replies you
                  ask to hear may be sent to a speech provider to be read aloud.
                </Li>
              </ul>

              <H>Your customers did not agree to this, you did</H>
              <P>
                You can consent to sharing your own business data. You cannot consent on your customers&apos; behalf. Under
                the Nigeria Data Protection Act 2023 you remain responsible for the personal data you hold about them. Ask{" "}
                {assistantName} about customer records only when you actually need to, and keep in mind that doing so sends
                those details to the providers named above.
              </P>

              <H>Training and retention</H>
              <P>
                We instruct OpenRouter and its providers not to retain or train on your data. Your chats are stored in your
                own Sellapage account so you can return to them, and deleting a chat deletes it from our database. We cannot
                guarantee the retention behaviour of a third party beyond the settings they expose to us.
              </P>

              <H>What is never sent</H>
              <P>
                Bank account and payout details, subaccount codes, verification records, authentication tokens and device
                push tokens are stripped before anything reaches a model. They are not visible to {assistantName} at all.
              </P>

              <H>Turning it off</H>
              <P>
                You can stop using {assistantName} at any time, and delete your chat history from the History tab. Doing so
                does not affect any change you already approved.
              </P>
            </>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[12px] font-semibold text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
