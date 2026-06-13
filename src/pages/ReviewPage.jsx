import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function ReviewPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setInvalid(true)
      setLoading(false)
      return
    }
    setLoading(false)
  }, [token])

  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  const handleSubmit = async () => {
    setError('')
    if (rating <= 0) { setError('Please select a star rating before submitting'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/.netlify/functions/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, reviewText })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSubmitted(true)
      } else if (res.status === 404) {
        setInvalid(true)
      } else if (res.status === 400 && data.error && data.error.toLowerCase().includes('already')) {
        setAlreadyUsed(true)
      } else {
        setError(data.error || 'Failed to submit review. Please try again.')
      }
    } catch (err) {
      console.error(err)
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-stone-500">Loading…</p>
      </div>
    </div>
  )

  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">This review link is invalid or has expired.</h2>
        <p className="text-gray-500 text-sm">If you believe this is a mistake, please contact the store or support.</p>
      </div>
    </div>
  )

  if (alreadyUsed) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">This review has already been submitted.</h2>
        <p className="text-gray-500 text-sm">Thank you for your feedback!</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 className="font-extrabold text-gray-900 text-lg mb-2">Thank you for your review!</h2>
        <p className="text-gray-500 text-sm">Your feedback has been submitted and will help other customers.</p>
        <div className="mt-4">
          <button className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold" onClick={() => {}}>Done</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md w-full">
        <div className="text-center mb-4">
          <div className="text-3xl font-extrabold text-gray-900">Sellapage</div>
          <p className="text-gray-500 text-sm mt-1">Leave a Review</p>
        </div>

        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2">
            {[1,2,3,4,5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="text-2xl"
                style={{ cursor: 'pointer' }}
                aria-label={`${n} star`}
              >
                <span className={`text-${(n <= (hover || rating)) ? 'amber-400' : 'gray-300'}`}>{(n <= (hover || rating)) ? '★' : '☆'}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{rating > 0 ? ['Poor','Fair','Good','Very Good','Excellent'][rating-1] : 'Select a rating'}</p>
        </div>

        <label className="block text-sm font-semibold text-gray-700 mb-2">Share more about your experience</label>
        <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} maxLength={500} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all mb-3" placeholder="Tell us what you loved, or how we could improve. This helps other shoppers." />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button onClick={handleSubmit} disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold">{submitting ? 'Submitting…' : 'Submit Review'}</button>
      </div>
    </div>
  )
}
