// src/components/dashboard/ReviewPromptModal.jsx
// A full-screen overlay (deliberately not a small banner, per Nex's request)
// asking the vendor to leave a Sellapage review. Deliberately reappears on
// every fresh dashboard load (reload, sign in, sign up) rather than being
// dismissed-for-session — the only things that permanently stop it are the
// admin turning the prompt off platform-wide, or the vendor having already
// submitted a review. "Maybe Later" only hides it for the current page view.
import { useEffect, useState } from 'react'
import { Star, X, MessageSquarePlus } from 'lucide-react'

export default function ReviewPromptModal({ store, navigateTo }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!store?.id) return
    if (store.hasSubmittedPlatformReview) return

    let cancelled = false
    fetch('/api/platform-reviews-public?action=prompt-status')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((data) => {
        if (!cancelled && data.enabled) setVisible(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [store?.id, store?.hasSubmittedPlatformReview])

  const dismiss = () => {
    setVisible(false)
  }

  const goLeaveReview = () => {
    setVisible(false)
    navigateTo?.('leave-review')
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:text-gray-400 sm:hover:bg-gray-100 sm:hover:text-gray-700"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-green-500 to-green-700 px-6 pb-10 pt-12 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <MessageSquarePlus size={28} />
          </div>
          <div className="mb-2 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={18} className="fill-amber-300 text-amber-300" />
            ))}
          </div>
          <h2 className="text-xl font-black">Enjoying Sellapage?</h2>
          <p className="mt-2 text-sm leading-relaxed text-green-50">
            Tell other vendors about your experience — your story could be featured on our Success Stories page.
          </p>
        </div>

        <div className="space-y-2.5 p-6">
          <button
            type="button"
            onClick={goLeaveReview}
            className="w-full rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-[0.99]"
          >
            Leave a Review
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
