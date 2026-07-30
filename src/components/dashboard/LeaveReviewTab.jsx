// src/components/dashboard/LeaveReviewTab.jsx
// Reached only via ReviewPromptModal's "Leave a Review" button (not a nav
// tab) — Dashboard.jsx renders this when activeTab === 'leave-review'.
import { useState } from 'react'
import { Star, Loader2, UploadCloud, X, CheckCircle2, AlertCircle, Film, ArrowLeft } from 'lucide-react'
import { uploadSingleImage, uploadVideo, MAX_VIDEO_UPLOAD_BYTES } from '../../firebase/products'

const MAX_IMAGES = 6
const MAX_VIDEOS = 2

export default function LeaveReviewTab({ store, user, navigateTo }) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [authorName, setAuthorName] = useState(store?.businessName || '')
  const [reviewText, setReviewText] = useState('')
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [imageUploading, setImageUploading] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleImageUpload = async (files) => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setImageUploading(true)
    setError('')
    try {
      const urls = await Promise.all(toUpload.map((f) => uploadSingleImage(f, 'sellapage/reviews/images')))
      setImages((prev) => [...prev, ...urls])
    } catch (err) {
      setError(err.message || 'Image upload failed.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleVideoUpload = async (files) => {
    const remaining = MAX_VIDEOS - videos.length
    if (remaining <= 0) return
    const file = files[0]
    if (!file) return
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      setError('Each video must be 10MB or smaller.')
      return
    }
    setVideoUploading(true)
    setError('')
    try {
      const url = await uploadVideo(file, 'sellapage/reviews/videos')
      setVideos((prev) => [...prev, url])
    } catch (err) {
      setError(err.message || 'Video upload failed.')
    } finally {
      setVideoUploading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!reviewText.trim()) {
      setError('Please write a few words about your experience.')
      return
    }
    setSubmitting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/platform-review-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeId: store.id,
          rating,
          reviewText,
          authorName,
          images,
          videos,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not submit your review. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Could not submit your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-lg font-black text-gray-900">Thank you!</h1>
        <p className="mt-2 text-sm text-gray-500">
          Your review has been submitted and is awaiting a quick review from our team before it appears on our Success Stories page.
        </p>
        <button
          type="button"
          onClick={() => navigateTo?.('overview')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigateTo?.('overview')}
          className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-green-600">Share Your Experience</p>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Leave a Review</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
        <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-500">Your Rating</label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${i} star${i > 1 ? 's' : ''}`}
            >
              <Star
                size={32}
                className={(hoverRating || rating) >= i ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}
              />
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">Your Name / Business Name</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Ada's Boutique"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">Your Review</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="What's it been like selling on Sellapage?"
            rows={5}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {/* Images */}
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">Photos <span className="font-normal text-gray-400">(optional, up to {MAX_IMAGES})</span></label>
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-xl border border-gray-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600">
                {imageUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files.length && handleImageUpload(e.target.files)} disabled={imageUploading} />
              </label>
            )}
          </div>
        </div>

        {/* Videos */}
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">Videos <span className="font-normal text-gray-400">(optional, up to {MAX_VIDEOS}, 10MB max each)</span></label>
          <div className="flex flex-wrap gap-2">
            {videos.map((url, idx) => (
              <div key={idx} className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <Film size={20} className="text-gray-400" />
                <button
                  type="button"
                  onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {videos.length < MAX_VIDEOS && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600">
                {videoUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files.length && handleVideoUpload(e.target.files)} disabled={videoUploading} />
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            <AlertCircle size={13} className="flex-shrink-0" /> {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || imageUploading || videoUploading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
        >
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}
