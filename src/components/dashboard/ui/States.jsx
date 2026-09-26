// src/components/dashboard/ui/States.jsx
//
// The three things a dashboard screen shows when it is not showing data:
// loading, an error, or nothing yet. One look everywhere, so a vendor learns
// them once. Never a blank screen: a loading state always says what it is
// waiting for, an error always offers a way forward.
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

/** A spinner with words. `message` says what is loading, in plain language. */
export function LoadingState({
  title = 'Please hold on',
  message = 'We are getting this ready for you.',
  compact = false,
  className = '',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16 sm:py-20'} ${className}`}
    >
      <span className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-forest-50" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-forest border-r-forest/40" />
        <span className="h-2 w-2 rounded-full bg-forest" />
      </span>
      <p className="mt-4 text-sm font-semibold text-dash-ink">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-dash-muted">{message}</p>
    </div>
  )
}

/** Inline "working on it" line for buttons and small areas. */
export function InlineSpinner({ label = 'Please wait...', className = '' }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-xs font-medium text-dash-muted ${className}`}>
      <Loader2 size={14} className="animate-spin text-forest" />
      {label}
    </span>
  )
}

/** Something failed. Says so plainly, and offers to try again. */
export function ErrorState({
  title = 'We could not load this',
  message = 'Check your internet connection, then try again.',
  onRetry,
  retrying = false,
  compact = false,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle size={20} className="text-red-500" />
      </span>
      <p className="mt-4 text-sm font-semibold text-dash-ink">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-dash-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dash-line bg-white px-4 py-2 text-xs font-semibold text-dash-ink shadow-sm transition hover:border-forest-200 hover:bg-forest-50 disabled:opacity-60"
        >
          <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Trying again...' : 'Try again'}
        </button>
      )}
    </div>
  )
}

/** Nothing here yet. Tells the vendor what will appear and how to get it. */
export function EmptyState({ icon: Icon, title, message, action, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} ${className}`}>
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50">
          <Icon size={20} className="text-forest-600" />
        </span>
      )}
      {title && <p className="mt-4 text-sm font-semibold text-dash-ink">{title}</p>}
      {message && <p className="mt-1 max-w-xs text-xs leading-relaxed text-dash-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
