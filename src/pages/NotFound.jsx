import { Link } from 'react-router-dom'
import { Home, Store } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Store size={36} className="text-brand-300" />
        </div>
        <h1 className="font-display text-5xl font-extrabold text-gray-900 mb-2">404</h1>
        <h2 className="font-display text-xl font-bold text-gray-700 mb-3">Page or store not found</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The Sellapage page you're looking for doesn't exist, has moved, or the store link is incorrect.
          Double-check the URL and try again.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
        >
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
