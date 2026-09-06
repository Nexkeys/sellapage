// src/utils/fabPosition.js
//
// Keeps a draggable floating button inside the viewport.
//
// THE BUG THIS FIXES
// Both FABs clamped their position while being dragged, but not when restoring
// it from localStorage. So a vendor who dragged the button on a 1920px desktop
// saved something like x: 1500, and on a 390px phone that position was restored
// verbatim: the button rendered ~1100px off the right edge and simply vanished.
// It looked like the widget had been removed on mobile, when it was actually
// sitting off-screen the whole time.
//
// Neither component listened for resize either, so rotating a phone or resizing
// a window could strand the button the same way.

export const FAB_SIZE = 60
const MARGIN = 8

/**
 * Returns a position guaranteed to be on-screen, or null if there is nothing
 * to clamp (in which case the caller keeps its CSS default position).
 *
 * Safe to call before layout: falls back to the stored value when there is no
 * window, so server rendering or an early call cannot throw.
 */
export function clampFabPosition(pos, size = FAB_SIZE) {
  if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return null
  if (typeof window === 'undefined') return pos

  // Math.max on the upper bound matters: on a very small viewport the available
  // range can invert, and without it the button would be pinned off-screen the
  // other way instead.
  const maxX = Math.max(MARGIN, window.innerWidth - size - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - size - MARGIN)

  return {
    x: Math.min(Math.max(MARGIN, pos.x), maxX),
    y: Math.min(Math.max(MARGIN, pos.y), maxY),
  }
}
