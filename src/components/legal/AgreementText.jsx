// src/components/legal/AgreementText.jsx
// Renders a Marketplace agreement (src/utils/marketplaceAgreements.js): the
// "in short" box, then the numbered clauses. Used on the Terms page and inside
// the accept box, so both always show the same words.
//
// **double asterisks** in the text are rendered bold: those are the clauses
// that limit liability, shift risk or impose an indemnity, which FCCPA 2018
// s.128 requires to be drawn to the reader's attention.

export function RichText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  )
}

export function AgreementSummary({ agreement }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">In short (please read)</p>
      <ul className="mt-2 space-y-1.5">
        {agreement.summary.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-amber-950">
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            <span><RichText text={line} /></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AgreementText({ agreement, showSummary = true, headingLevel = 'h3' }) {
  const Heading = headingLevel
  return (
    <div>
      <p className="text-xs text-gray-400">
        Version {agreement.version} · in effect from {agreement.effective}
      </p>
      {showSummary && <div className="mt-3"><AgreementSummary agreement={agreement} /></div>}
      <ol className="mt-4 space-y-4">
        {agreement.clauses.map(([title, text], i) => (
          <li key={title}>
            <Heading className="text-sm font-bold text-gray-900">
              {i + 1}. {title}
            </Heading>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              <RichText text={text} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
