// src/media/howto.js
//
// The walkthrough video behind the "Watch how Sellapage works" card on the
// dashboard home. Paste a YouTube (or any) link here and the card appears,
// using the picture in media-src/dashboard-howto/ as its still.
//
// It is a link, not a file in media-src/, because `npm run media` strips sound
// and cuts clips to 20 seconds, which suits silent loops on the homepage but
// not a narrated walkthrough.
//
// Empty means no card: a play button that plays nothing would be a broken
// promise on the first screen a vendor sees.
export const HOWTO_VIDEO_URL = ''
export const HOWTO_VIDEO_LENGTH = '2 min'
