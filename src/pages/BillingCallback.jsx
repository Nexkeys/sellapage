//src/pages/BillingCallback.jsx/
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

export default function BillingCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference')
  const [checkoutData, setCheckoutData] = useState(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
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
              `/${parsed.storeName}?checkout=success&reference=${encodeURIComponent(reference)}`,
              { replace: true },
            )
          }, 3000)
          return () => clearTimeout(timer)
        }
      } catch {
        // fall through to subscription flow
      }
    }

    setResolved(true)
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 4000)

    return () => clearTimeout(timer)
  }, [reference, navigate])

  if (!resolved) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Sellapage
          </span>
          <div className="relative flex items-center justify-center w-16 h-16">
            <svg
              className="animate-spin w-16 h-16 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <circle
                className="opacity-20"
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M32 4a28 28 0 0 1 28 28h-6a22 22 0 0 0-22-22V4z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            Confirming your payment…
          </p>
        </div>
      </div>
    )
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
              Thank you for your purchase. You will be redirected shortly.
            </p>
          </div>
          <Link
            to={`/${checkoutData.storeName}?checkout=success&reference=${encodeURIComponent(reference)}`}
            className="text-green-600 font-semibold text-sm hover:underline"
          >
            View store
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <span className="text-2xl font-bold tracking-tight text-gray-900">
          Sellapage
        </span>
        <div className="relative flex items-center justify-center w-16 h-16">
          <svg
            className="animate-spin w-16 h-16 text-green-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <circle
              className="opacity-20"
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M32 4a28 28 0 0 1 28 28h-6a22 22 0 0 0-22-22V4z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-gray-900">
            Confirming your payment…
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            This usually takes just a moment. Please don&apos;t close this tab.
          </p>
        </div>
      </div>
    </div>
  )
}
