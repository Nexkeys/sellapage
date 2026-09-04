// src/components/Skeleton.jsx
//
// Shared loading placeholders. The point of these over a centred spinner is that
// the page keeps its shape while data loads, so nothing jumps around when the
// real content lands and the user can already see what kind of thing is coming.
//
// Performance notes, because these render on cheap Android phones:
//  - animation is a plain opacity pulse (`animate-pulse`), which the compositor
//    handles without repainting. A moving gradient shimmer repaints the whole
//    bar every frame and is noticeably worse on a 1GB device.
//  - no JS, no timers, no observers. Pure markup and one CSS animation.
//  - reduced motion is handled globally by the prefers-reduced-motion block in
//    index.css, which flattens every animation-duration, so there is nothing to
//    check per component here. (That block used to live in App.css, which is not
//    imported anywhere and so never shipped.)
//
// Accessibility: the wrapper announces "loading" once via role="status", and the
// bars themselves are aria-hidden so a screen reader does not read out dozens of
// meaningless boxes.

const BASE = 'bg-gray-200/70 rounded-md animate-pulse'

/** A single grey box. Size it with className. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`${BASE} ${className}`} />
}

/**
 * Wrap any group of skeletons so assistive tech announces the load once.
 * Every composed skeleton below already includes this.
 */
export function SkeletonRegion({ label = 'Loading', className = '', children }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Paragraph placeholder. The last line is short so it reads as prose. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/** Product / service card placeholder: image, title, meta, price. */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-3 ${className}`}>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3 mt-1" />
      </div>
    </div>
  )
}

/**
 * Grid of card placeholders.
 *
 * `className` replaces the grid classes outright rather than appending, because
 * appending would put two `grid-cols-*` utilities on one element and leave the
 * winner down to stylesheet order. Callers whose real grid differs should pass
 * that grid's exact classes so the placeholder matches column for column.
 */
export function SkeletonCardGrid({
  count = 8,
  className = 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
}) {
  return (
    <SkeletonRegion label="Loading items" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </SkeletonRegion>
  )
}

/** List / table row placeholders, for orders, customers, receipts and similar. */
export function SkeletonRows({ count = 6, className = '' }) {
  return (
    <SkeletonRegion label="Loading list" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
        >
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 flex-shrink-0 rounded-full" />
        </div>
      ))}
    </SkeletonRegion>
  )
}

/** Stat tile placeholders, for dashboard and analytics headers. */
export function SkeletonStats({ count = 4, className = '' }) {
  return (
    <SkeletonRegion
      label="Loading stats"
      className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="mt-3 h-6 w-1/2" />
        </div>
      ))}
    </SkeletonRegion>
  )
}

/**
 * Storefront placeholder: banner, avatar, name, then the product grid.
 * This is the shape a customer sees, so it matters most that it does not jump.
 */
export function SkeletonStorefront() {
  return (
    <SkeletonRegion label="Loading store" className="min-h-screen bg-white">
      <Skeleton className="h-40 w-full rounded-none sm:h-56" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          <Skeleton className="h-20 w-20 rounded-2xl border-4 border-white sm:h-24 sm:w-24" />
          <div className="mb-2 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2 max-w-[220px]" />
            <Skeleton className="h-3 w-1/3 max-w-[140px]" />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 pb-16 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  )
}

/**
 * Dashboard boot placeholder: header, stat tiles, then a list.
 *
 * Used only once the user is known to be signed in. The auth gate itself keeps a
 * plain spinner on purpose, because at that point we do not yet know whether the
 * visitor is getting a dashboard or a redirect to the login page, and showing a
 * dashboard shape to someone about to be bounced would be a lie.
 */
export function SkeletonDashboard() {
  return (
    <SkeletonRegion label="Loading your dashboard" className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-3 h-6 w-1/2" />
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
            >
              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 flex-shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** Article placeholder, for blog posts and job detail pages. */
export function SkeletonArticle({ className = '' }) {
  return (
    <SkeletonRegion
      label="Loading article"
      className={`mx-auto max-w-3xl px-4 py-10 ${className}`}
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-2 h-8 w-3/4" />
      <div className="mt-5 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="mt-7 aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-7 space-y-6">
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
        <SkeletonText lines={4} />
      </div>
    </SkeletonRegion>
  )
}

export default Skeleton
