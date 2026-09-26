// src/media/hasMedia.js
//
// Whether a spot has a photo or video in it, for layouts that change shape
// when it does (a feature card swaps its small icon for a screenshot).
// Kept apart from MediaSlot.jsx so that file exports only a component.
import manifest from './media-manifest.json'

export function hasMedia(name) {
  return Boolean(manifest[name])
}
