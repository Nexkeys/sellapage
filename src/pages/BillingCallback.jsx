//src/pages/BillingCallback.jsx/
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import BrandLoader from '../components/BrandLoader'

/**
 * Where to send the customer after a successful checkout.
 *
 * Product orders live on the storefront (`/:storeName`, StorePage.jsx) and
 * service bookings on `/:storeName/services` (ServiceStorePage.jsx) - each page
 * reads its own sessionStorage snapshot and renders its own success modal with
 * the downloadable receipt.
 *
 * This used to always return the product page. A service booking therefore
 * landed on StorePage, which looked for an *order* with that reference, found a
 * *booking* instead, and rendered an empty "Order complete" modal with no
 * receipt - while the equivalent product flow worked fine.
 *
 * The snapshot shape is the discriminator: ServiceStorePage stores `booking`,
 * StorePage stores `order`.
 */
function checkoutReturnPath(parsed) {
  const base = `/${parsed.storeName}`
  return parsed.booking ? `${base}/services` : base
}

export default function BillingCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference')
  const [checkoutData, setCheckoutData] = useState(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    // Paystack's cancel_action (set in billing-initialize.js) lands here with
    // no reference when the vendor closes the payment page.
    if (!reference && searchParams.get('status') === 'cancelled') {
      const q = new URLSearchParams({ tab: 'billing', payment: 'cancelled' })
      if (searchParams.get('plan')) q.set('plan', searchParams.get('plan'))
      if (searchParams.get('period')) q.set('period', searchParams.get('period'))
      navigate(`/dashboard?${q}`, { replace: true })
      return
    }
    if (!reference) {
      navigate('/dashboard', { replace: true })
      return
    }

    const stored = sessionStorage.getItem(`sellapage_checkout_${reference}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.transactionType === 'checkout') {
          setCheckoutData(parsed)
          setResolved(true)
          const timer = setTimeout(() => {
            navigate(
              `${checkoutReturnPath(parsed)}?checkout=success&reference=${encodeURIComponent(reference)}`,
              { replace: true },
            )
          }, 3000)
          return () => clearTimeout(timer)
        }
      } catch {
        // fall through to subscription flow
      }
    }

    // Subscription / plan-upgrade path. The plan stashed at billing-initialize
    // time is only a fallback now: in-app browsers (WhatsApp, Instagram) often
    // lose sessionStorage across the Paystack round trip.
    let stashedPlan = null
    try {
      const billing = sessionStorage.getItem(`sellapage_billing_${reference}`)
      if (billing) {
        stashedPlan = JSON.parse(billing).plan || null
        sessionStorage.removeItem(`sellapage_billing_${reference}`)
      }
    } catch { /* ignore */ }

    // Ask Paystack (through billing-verify.js) whether it really went through,
    // so a declined card gets "try again" and not "welcome". This page never
    // changes the plan; the webhook does that on its own.
    let cancelled = false
    ;(async () => {
      let outcome = { status: 'unknown' }
      try {
        const r = await fetch(`/api/billing-verify?reference=${encodeURIComponent(reference)}`)
        if (r.ok) outcome = await r.json()
      } catch { /* treated as unknown */ }
      if (cancelled) return
      const plan = outcome.plan || stashedPlan
      const period = outcome.billingPeriod || ''
      let target
      if (outcome.status === 'failed') {
        const q = new URLSearchParams({ tab: 'billing', payment: 'failed' })
        if (plan) q.set('plan', plan)
        if (period) q.set('period', period)
        if (outcome.reason) q.set('reason', outcome.reason)
        target = `/dashboard?${q}`
      } else if (outcome.status === 'pending') {
        const q = new URLSearchParams({ tab: 'billing', payment: 'pending' })
        if (plan) q.set('plan', plan)
        target = `/dashboard?${q}`
      } else {
        // success, or Paystack could not be asked: Paystack only sends people
        // to this page after a completed payment, so welcome them as before.
        target = plan ? `/dashboard?upgraded=${plan}${period ? `&period=${period}` : ''}` : '/dashboard'
      }
      setResolved(true)
      setTimeout(() => { if (!cancelled) navigate(target, { replace: true }) }, 900)
    })()

    return () => { cancelled = true }
  }, [reference, navigate, searchParams])

  if (!resolved) {
    return <BrandLoader title="Confirming your payment" lines={['Talking to Paystack...', 'Checking your payment...', 'Please don’t close this tab...']} />
  }

  if (checkoutData) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Sellapage
          </span>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold text-gray-900">
              Your order has been placed successfully
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Preparing your receipt. This will only take a moment.
            </p>
          </div>

          {/* Replaces a "View store" link that used to sit here. It read as an
              invitation to go browsing, when the only thing waiting on the other
              side is this customer's own receipt (and their loyalty code, on a
              first order). The page already redirects itself, so a manual escape
              hatch only invited people to leave before it landed. */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg
              className="animate-spin w-4 h-4 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"
              />
            </svg>
            Taking you to your receipt
          </div>
        </div>
      </div>
    )
  }

  return <BrandLoader title="Payment checked" lines={['Taking you back to your dashboard...']} />
}
