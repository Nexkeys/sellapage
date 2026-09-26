// src/media/MediaSlot.jsx
//
// Shows whatever photo or video has been put into media-src/<name>/, or the
// page's existing design (`fallback`) when nothing has.
//
// The whole point is that adding media never needs a code change: the list of
// what exists is src/media/media-manifest.json, written by `npm run media`,
// and this component reads it at build time. See src/media/slots.js.
//
// VIDEOS ARE CHEAP UNTIL SOMEONE LOOKS AT THEM
// A video starts downloading only once it scrolls near the screen
// (preload="none" until then), shows a still frame in the meantime, and never
// plays at all for people who have asked their phone to reduce motion. On a
// connection that is paid for by the megabyte, a clip nobody scrolled to
// should cost nothing.
import { useEffect, useRef, useState } from 'react'
import manifest from './media-manifest.json'

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function LazyVideo({ entry, alt, className, priority }) {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  const [still] = useState(prefersReducedMotion)

  // A video at the top of the page is still not fetched straight away. The
  // still frame shows at once, and the clip starts downloading only after the
  // page itself has finished loading, so the headline, the buttons and the
  // text never wait behind a megabyte of video on a slow connection.
  useEffect(() => {
    if (!priority || near || still) return undefined
    let timer
    const go = () => { timer = setTimeout(() => setNear(true), 300) }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('load', go)
    }
  }, [priority, near, still])

  useEffect(() => {
    if (priority || near || still) return undefined
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      // Start a little before it arrives, so it is playing by the time it is seen.
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [priority, near, still])

  if (still) {
    return (
      <img
        src={entry.poster}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
      />
    )
  }

  return (
    <video
      ref={ref}
      className={className}
      poster={entry.poster}
      width={entry.width}
      height={entry.height}
      muted
      loop
      playsInline
      autoPlay={near}
      preload={near ? 'auto' : 'none'}
      aria-label={alt}
    >
      {near && <source src={entry.src} type="video/mp4" />}
    </video>
  )
}

/**
 * @param {string}  name      a slot name from src/media/slots.js
 * @param {string}  alt       what the picture shows, for screen readers
 * @param {string}  className applied to the <img> or <video>
 * @param {node}    fallback  what to show when the slot is empty (today's design)
 * @param {boolean} priority  true for anything visible without scrolling
 */
export default function MediaSlot({ name, alt = '', className = '', fallback = null, priority = false }) {
  const entry = manifest[name]
  if (!entry) return fallback

  if (entry.type === 'video') {
    return <LazyVideo entry={entry} alt={alt} className={className} priority={priority} />
  }

  return (
    <picture>
      {entry.srcSmall && <source media="(max-width: 640px)" srcSet={entry.srcSmall} type="image/webp" />}
      <img
        src={entry.src}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={priority ? 'high' : undefined}
        className={className}
      />
    </picture>
  )
}
