// src/utils/staffRoles.js
// Deny-list based staff permission model. New dashboard tabs are automatically
// assignable via the Team tab's Role Builder unless listed here — see
// Docs/Staff-Team-Accounts-Plan.md Part B/G for why this is a deny-list, not
// an allow-list.
export const OWNER_ONLY_TABS = ['billing', 'settings', 'team']

export const MAX_STAFF_ROLES = 20
export const MAX_ACTIVE_STAFF = 10
export const MAX_PENDING_INVITES = 10
export const INVITE_RATE_LIMIT_PER_HOUR = 5
export const INVITE_EXPIRY_MS = 72 * 60 * 60 * 1000 // 72 hours

// Seed data only — the owner can rename/edit/delete these or add new roles
// from scratch via the Role Builder. `access` is 'read' or 'write' per tab.
export const PRESET_ROLES = [
  {
    name: 'Manager',
    isPreset: true,
    tabs: [
      { tabId: 'orders', access: 'write' },
      { tabId: 'bookings', access: 'write' },
      { tabId: 'products', access: 'write' },
      { tabId: 'services', access: 'write' },
      { tabId: 'categories', access: 'write' },
      { tabId: 'ledger', access: 'write' },
      { tabId: 'customers', access: 'write' },
      { tabId: 'leads', access: 'write' },
      { tabId: 'discounts', access: 'write' },
      { tabId: 'delivery', access: 'write' },
      { tabId: 'reviews', access: 'write' },
      { tabId: 'analytics', access: 'read' },
      { tabId: 'overview', access: 'read' },
    ],
  },
  {
    name: 'Sales',
    isPreset: true,
    tabs: [
      { tabId: 'orders', access: 'write' },
      { tabId: 'bookings', access: 'write' },
      { tabId: 'products', access: 'read' },
      { tabId: 'ledger', access: 'write' },
      { tabId: 'customers', access: 'write' },
      { tabId: 'leads', access: 'write' },
      { tabId: 'discounts', access: 'write' },
      { tabId: 'overview', access: 'read' },
    ],
  },
  {
    name: 'Editor',
    isPreset: true,
    tabs: [
      { tabId: 'products', access: 'write' },
      { tabId: 'services', access: 'write' },
      { tabId: 'categories', access: 'write' },
      { tabId: 'orders', access: 'read' },
      { tabId: 'customers', access: 'read' },
      { tabId: 'overview', access: 'read' },
    ],
  },
  {
    name: 'Viewer',
    isPreset: true,
    tabs: [
      { tabId: 'orders', access: 'read' },
      { tabId: 'products', access: 'read' },
      { tabId: 'ledger', access: 'read' },
      { tabId: 'customers', access: 'read' },
      { tabId: 'analytics', access: 'read' },
      { tabId: 'overview', access: 'read' },
    ],
  },
]

export function canStaffAccessTab(role, tabId, needsWrite = false) {
  if (!role || OWNER_ONLY_TABS.includes(tabId)) return false
  const entry = (role.tabs || []).find((t) => t.tabId === tabId)
  if (!entry) return false
  if (needsWrite && entry.access !== 'write') return false
  return true
}
