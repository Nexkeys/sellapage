// src/utils/marketplaceApi.js
// One way for the marketplace screens to call their endpoints, so every one
// sends the same token and reads errors the same way.
//
// On failure it throws an Error whose message is the server's plain-English
// `message`, with `.code` (the server's `error`) and `.fields` (per-field
// messages from `errors`, for highlighting a form).
import { auth } from '../firebase/auth'

export async function callMarketplace(endpoint, action, { method = 'GET', body } = {}) {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch(`/api/${endpoint}?action=${encodeURIComponent(action)}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Something went wrong. Please try again.')
    err.code = data.error || null
    err.fields = data.errors || {}
    err.status = res.status
    throw err
  }
  return data
}

export const naira = (n) =>
  n === null || n === undefined || n === '' ? '' : `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
