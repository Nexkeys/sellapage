import { useState, useEffect } from 'react'
import {
  Globe,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ArrowRight,
  CreditCard,
} from 'lucide-react'

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'

export default function CustomDomainTab({ store, user, isPro, navigateTo }) {
  const [domain, setDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [addError, setAddError] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [copied, setCopied] = useState(null)
  const [currentDomain, setCurrentDomain] = useState(store?.customDomain || '')
  const [domainStatus, setDomainStatus] = useState(store?.customDomainStatus || '')
  const [dnsInfo, setDnsInfo] = useState({ dnsType: null, dnsName: null, dnsTarget: null })

  useEffect(() => {
    setCurrentDomain(store?.customDomain || '')
    setDomainStatus(store?.customDomainStatus || '')
  }, [store?.customDomain, store?.customDomainStatus])

  const { dnsType, dnsName, dnsTarget } = dnsInfo

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleAddDomain = async () => {
    const trimmed = domain.trim()
    if (!trimmed) { setAddError('Please enter a domain.'); return }
    setAddError(''); setAdding(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/add-custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: store.id, domain: trimmed }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCurrentDomain(data.domain)
        setDomainStatus('pending')
        setDomain('')
        setVerifyResult(null)
        if (data.unsupported) {
          setVerifyResult({ status: 'unsupported', message: data.message })
        } else {
          setDnsInfo({ dnsType: data.dnsType, dnsName: data.dnsName, dnsTarget: data.dnsTarget })
        }
      } else {
        setAddError(data.message || "Couldn't add your domain. Please try again.")
      }
    } catch { setAddError('Network error. Please check your connection and try again.') }
    finally { setAdding(false) }
  }

  const handleRemoveDomain = async () => {
    if (!window.confirm(`Remove ${currentDomain} from your store? Your store will go back to your Sellapage URL.`)) return
    setRemoving(true)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/remove-custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: store.id, domain: currentDomain }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCurrentDomain(''); setDomainStatus(''); setVerifyResult(null)
      } else {
        setAddError(data.message || "Couldn't remove your domain. Please try again.")
      }
    } catch { setAddError('Network error.') }
    finally { setRemoving(false) }
  }

  const handleVerify = async () => {
    setVerifying(true); setVerifyResult(null)
    try {
      const token = await user?.getIdToken()
      const res = await fetch('/api/verify-custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storeId: store.id, domain: currentDomain }),
      })
      const data = await res.json()
      if (res.ok) {
        setVerifyResult(data)
        if (data.status === 'active') { setDomainStatus('active') }
        if (data.dnsType) {
          setDnsInfo({ dnsType: data.dnsType, dnsName: data.dnsName, dnsTarget: data.dnsTarget })
        }
      } else {
        setVerifyResult({ status: 'error', message: data.message || 'Verification failed.' })
      }
    } catch {
      setVerifyResult({ status: 'error', message: 'Network error.' })
    } finally { setVerifying(false) }
  }

  useEffect(() => {
    if (currentDomain && domainStatus !== 'active' && !verifyResult) {
      handleVerify()
    }
  }, [currentDomain])

  if (!isPro) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-5">
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 border border-green-100">
              <Lock size={22} className="text-green-600" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Pro & Premium Only</p>
            <h1 className="mb-3 text-xl font-bold tracking-tight text-gray-900">Custom Domain</h1>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-gray-500">
              Connect your own domain like <span className="font-semibold text-gray-700">shop.yourbrand.com</span> to your Sellapage store. Upgrade to Pro to unlock this feature.
            </p>
            <button
              type="button"
              onClick={() => navigateTo?.('billing')}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <CreditCard size={13} />
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-5">

      {/* Header */}
      <div>
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Store Settings</p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Custom Domain</h1>
        <p className="mt-0.5 text-xs text-gray-400">Connect your own domain so customers reach your store at your brand URL.</p>
      </div>

      {/* Error banner */}
      {addError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
          <p className="text-xs font-semibold text-red-600">{addError}</p>
        </div>
      )}

      {/* Current domain card */}
      {currentDomain ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                <Globe size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{currentDomain}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {domainStatus === 'active' ? (
                    <>
                      <CheckCircle size={11} className="text-green-600" />
                      <span className="text-[11px] font-semibold text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <Clock size={11} className="text-amber-500" />
                      <span className="text-[11px] font-semibold text-amber-600">Pending DNS Setup</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveDomain}
              disabled={removing}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Remove
            </button>
          </div>

          {/* DNS Instructions — only show when not active and DNS info is available */}
          {domainStatus !== 'active' && verifyResult?.status !== 'unsupported' && dnsType && (
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
                <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  DNS Setup Required
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  In your domain provider's DNS settings (Namecheap, GoDaddy, Cloudflare, etc.), add the following {dnsType} record:
                </p>

                {/* Desktop table */}
                <div className="hidden sm:block rounded-lg bg-white border border-blue-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-100/60">
                        <th className="px-3 py-2 text-left font-bold text-blue-800">Type</th>
                        <th className="px-3 py-2 text-left font-bold text-blue-800">Name / Host</th>
                        <th className="px-3 py-2 text-left font-bold text-blue-800">Value / Points to</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black ${
                            dnsType === 'A' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>{dnsType}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-700">{dnsName}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-700 break-all">{dnsTarget}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(dnsTarget, 'target')}
                              className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-green-600 transition-colors"
                            >
                              {copied === 'target' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="sm:hidden space-y-2">
                  <DnsCard label="Type" value={dnsType} badge={dnsType === 'A' ? 'purple' : 'blue'} />
                  <DnsCard label="Name / Host" value={dnsName} onCopy={() => handleCopy(dnsName, 'name')} copied={copied === 'name'} />
                  <DnsCard label="Value / Points to" value={dnsTarget} onCopy={() => handleCopy(dnsTarget, 'target')} copied={copied === 'target'} mono />
                </div>

                <p className="text-[11px] text-blue-600 leading-relaxed">
                  DNS changes can take up to 48 hours to propagate. Once done, click Verify DNS below.
                </p>
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-green-500 bg-green-50 px-4 py-2.5 text-xs font-bold text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"
              >
                {verifying ? (
                  <><Loader2 size={13} className="animate-spin" /> Checking DNS...</>
                ) : (
                  <><RefreshCw size={13} /> Verify DNS</>
                )}
              </button>

              {/* Verify result */}
              {verifyResult && (
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                  verifyResult.status === 'active'
                    ? 'border-green-100 bg-green-50'
                    : verifyResult.status === 'propagating'
                    ? 'border-amber-100 bg-amber-50'
                    : verifyResult.status === 'unsupported'
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-red-100 bg-red-50'
                }`}>
                  {verifyResult.status === 'active' ? (
                    <CheckCircle size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
                  ) : verifyResult.status === 'propagating' ? (
                    <Clock size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  ) : verifyResult.status === 'unsupported' ? (
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  ) : (
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
                  )}
                  <p className={`text-xs leading-relaxed font-medium ${
                    verifyResult.status === 'active'
                      ? 'text-green-700'
                      : verifyResult.status === 'propagating'
                      ? 'text-amber-700'
                      : verifyResult.status === 'unsupported'
                      ? 'text-gray-600'
                      : 'text-red-600'
                  }`}>
                    {verifyResult.message}
                    {verifyResult.status === 'unsupported' && (
                      <span className="block mt-1.5">
                        <a href="mailto:support@sellapage.com" className="underline hover:text-gray-900">Contact support</a> for help connecting this domain.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Active domain — visit link */}
          {domainStatus === 'active' && (
            <div className="flex items-center gap-2">
              <a
                href={`https://${currentDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:underline"
              >
                <ExternalLink size={12} />
                Visit {currentDomain}
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Add domain card */
        <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
              <Globe size={16} className="text-gray-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Connect a Domain</h2>
              <p className="text-gray-400 text-[11px] mt-0.5">Enter the domain you want to use for your store.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">Your Domain</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => { setDomain(e.target.value); setAddError('') }}
                placeholder="e.g. mybusiness.com or shop.mybrand.ng"
                className={INPUT_CLASS}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
              <button
                type="button"
                onClick={handleAddDomain}
                disabled={adding || !domain.trim()}
                className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {adding ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : <><Plus size={13} /> Add Domain</>}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Enter without http:// — works with any domain or subdomain you own, e.g. <span className="font-mono">mybusiness.com</span> or <span className="font-mono">shop.brand.ng</span>
            </p>
          </div>
        </div>
      )}

      {/* How it works card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-3">How it works</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Add your domain', desc: 'Enter your custom domain above and click Add Domain.' },
            { step: '2', title: 'Set up DNS', desc: currentDomain && dnsType
                ? `Add the ${dnsType} record shown above in your domain provider.`
                : 'Add the DNS record shown after adding your domain in your domain provider.' },
            { step: '3', title: 'Verify & go live', desc: 'Click Verify DNS once you\'ve set up the record. SSL is automatic.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-black">{item.step}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{item.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}


function DnsCard({ label, value, onCopy, copied, mono, badge }) {
  return (
    <div className="rounded-lg bg-white border border-blue-200 px-3 py-2.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{label}</p>
        {badge ? (
          <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-black ${
            badge === 'purple' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
          }`}>{value}</span>
        ) : (
          <p className={`text-xs mt-0.5 break-all ${mono ? 'font-mono text-gray-700' : 'text-gray-700'}`}>{value}</p>
        )}
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-green-600 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  )
}
