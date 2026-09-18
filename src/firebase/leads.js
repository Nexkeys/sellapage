/**
 * Send a lead/enquiry from a storefront.
 *
 * Goes through /api/lead-submit rather than writing Firestore directly, so the
 * server sees every lead arrive and can notify the vendor the moment it does.
 * The server writes the same /leads/{autoId} document shape as before.
 *
 * `storeName` is still accepted for call-site compatibility but is ignored:
 * the server reads the real name from the store document.
 *
 * `hp` and `elapsedMs` feed the server's bot traps. A real person leaves `hp`
 * empty and takes longer than a second and a half to fill the form.
 */
export const saveLead = async (storeId, storeName, { hp = '', elapsedMs = 0, ...leadData } = {}) => {
  const res = await fetch('/api/lead-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...leadData, storeId, hp, elapsedMs }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Could not send your message.')
  }
}

