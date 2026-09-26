// src/components/dashboard/AgreementAccept.jsx
// Click-to-accept for a Marketplace agreement. A real clickwrap, never "by
// using this you agree": the summary is on screen, the full text opens in
// place, and there are two unticked boxes, one of them only for the bold
// clauses (FCCPA 2018 s.128). The server records the version, time, account,
// IP and both acknowledgements (supplier-application, accept-agreement).
//
// Only the supplier agreement is accepted here today; the dropshipper one uses
// the same component when imports ship in Phase 3.
import { useState } from 'react'
import { Loader2, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { AGREEMENTS } from '../../utils/marketplaceAgreements'
import { callMarketplace } from '../../utils/marketplaceApi'
import AgreementText, { AgreementSummary } from '../legal/AgreementText'

export default function AgreementAccept({ kind = 'supplier', onAccepted, updated = false }) {
  const agreement = AGREEMENTS[kind]
  const [open, setOpen] = useState(false)
  const [readSummary, setReadSummary] = useState(false)
  const [acceptBold, setAcceptBold] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    setSaving(true)
    setError('')
    try {
      const data = await callMarketplace('supplier-application', 'accept-agreement', {
        method: 'POST',
        body: { kind, version: agreement.version, readSummary, acceptBoldClauses: acceptBold },
      })
      onAccepted?.(data.agreement)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <FileText size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{agreement.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {updated
              ? 'Please read and accept the current version of this agreement to keep listing products and switching them on.'
              : 'Read this before you apply. It sets out what you are paid, what you must do, and what happens if an order goes wrong.'}
          </p>
        </div>
      </div>

      <AgreementSummary agreement={agreement} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
      >
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? 'Hide the full agreement' : 'Read the full agreement'}
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-200 p-4">
          <AgreementText agreement={agreement} showSummary={false} headingLevel="h4" />
        </div>
      )}

      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={readSummary}
          onChange={(e) => setReadSummary(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-green-600"
        />
        <span>I have read the {agreement.title} (version {agreement.version}) and agree to it.</span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={acceptBold}
          onChange={(e) => setAcceptBold(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-green-600"
        />
        <span>
          I understand the clauses in <strong>bold</strong>: refunds I cause are taken from my later payments, Sellapage does not
          guarantee recovering money, and Sellapage&apos;s liability is capped.
        </span>
      </label>

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-red-600">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={!readSummary || !acceptBold || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Accept the agreement
      </button>
    </div>
  )
}
