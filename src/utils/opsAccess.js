// src/utils/opsAccess.js
//
// Who can open what in the Sellapage Ops console. Shared by the browser (to
// draw the menu and the Team & Access picker) and the server (to decide what
// is allowed); the server copy is the one that counts.
//
// Every staff member is a name, a job title and a list of tabs. A super admin
// has every tab. The four role templates are only starting points for the
// picker: tick "Finance" and its usual tabs are ticked, then add or remove any.
// The templates mirror the old role table (utils/adminRoles.js), so nobody
// gains or loses access when they move to the new accounts.

// `group` follows the console's sidebar. `risky` tabs ask for a confirmation
// before they are given to someone, and say why.
export const OPS_TABS = [
  { id: 'health', label: 'Platform Pulse', group: 'platform' },
  { id: 'analytics', label: 'Analytics', group: 'platform' },
  { id: 'revenue', label: 'Revenue', group: 'platform', risky: 'Shows every naira the platform has earned.' },

  { id: 'directory', label: 'Merchants', group: 'commerce' },
  { id: 'referrals', label: 'Referrals', group: 'commerce' },
  { id: 'withdrawals', label: 'Payouts', group: 'commerce', risky: 'Can approve money leaving Sellapage.' },
  { id: 'trials', label: 'Free Trials', group: 'commerce', risky: 'Can give paid plans away and overwrite a plan someone paid for.' },
  { id: 'marketplace', label: 'Dropshipping', group: 'commerce' },
  { id: 'cac', label: 'CAC Verification', group: 'commerce' },
  { id: 'reports', label: 'Store Reports', group: 'commerce' },
  { id: 'reviews', label: 'Reviews', group: 'commerce' },
  { id: 'jobs', label: 'Job Listings', group: 'commerce' },

  { id: 'domains', label: 'Custom Domains', group: 'infrastructure' },
  { id: 'usage', label: 'Firestore Usage', group: 'infrastructure' },
  { id: 'sella-ai', label: 'Sella AI Usage', group: 'infrastructure' },
  { id: 'ai-describe', label: 'AI Description Engine', group: 'infrastructure' },

  { id: 'blog', label: 'Blog', group: 'growth' },
  { id: 'newsletter', label: 'Newsletter', group: 'growth' },
  { id: 'partners', label: 'Investors & Partners', group: 'growth', risky: 'Holds investors’ names, emails and phone numbers.' },

  { id: 'announcements', label: 'Announcements', group: 'messaging', risky: 'Posts a message every vendor sees.' },
  { id: 'push', label: 'Push Broadcast', group: 'messaging', risky: 'Wakes every vendor’s phone and cannot be recalled.' },
  { id: 'sms', label: 'SMS Campaigns', group: 'messaging', risky: 'Spends Termii credit and texts every vendor.' },
  { id: 'email', label: 'Email Broadcast', group: 'messaging', risky: 'Emails every vendor and cannot be recalled.' },
  { id: 'tickets', label: 'Support Tickets', group: 'messaging' },

  { id: 'admins', label: 'Team & Access', group: 'governance', risky: 'Can invite, pause and remove staff.' },
  { id: 'activity', label: 'Activity Log', group: 'governance' },
  { id: 'recovery', label: 'Account Recovery', group: 'governance', risky: 'Can change any vendor’s login email and password.' },
]

export const OPS_GROUPS = [
  { id: 'platform', label: 'Platform' },
  { id: 'commerce', label: 'Commerce Network' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'growth', label: 'Growth Ops' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'governance', label: 'Governance' },
]

export const OPS_TAB_IDS = OPS_TABS.map((t) => t.id)
export const opsTab = (id) => OPS_TABS.find((t) => t.id === id) || null

// Starting points only (see the top of this file).
export const ROLE_TEMPLATES = [
  { id: 'finance', label: 'Finance', tabs: ['referrals', 'withdrawals', 'revenue'] },
  { id: 'support', label: 'Support', tabs: ['tickets', 'reports'] },
  { id: 'operations', label: 'Operations', tabs: ['directory', 'cac', 'domains', 'jobs', 'marketplace'] },
  { id: 'marketing', label: 'Marketing', tabs: ['directory', 'push', 'analytics', 'sms', 'blog', 'reviews', 'newsletter', 'email'] },
]

/** Only real tab ids, no repeats, in menu order. */
export function cleanTabs(tabs) {
  const want = new Set(Array.isArray(tabs) ? tabs.map(String) : [])
  return OPS_TAB_IDS.filter((id) => want.has(id))
}

export function opsCanOpen(staff, tabId) {
  if (!staff || staff.status !== 'active') return false
  if (staff.isSuper) return true
  return Array.isArray(staff.tabs) && staff.tabs.includes(tabId)
}

// POST actions that need "sudo mode": the authenticator code entered again in
// the last 15 minutes, even inside a live session (the GitHub pattern). Keyed
// by tab, then by the ?action= of the request.
export const STEP_UP_ACTIONS = {
  admins: ['invite', 'resend-invite', 'cancel-invite', 'update', 'pause', 'resume', 'delete', 'end-session', 'approve-reset', 'reject-reset'],
  recovery: ['approve', 'unlock', 'reject'],
  withdrawals: ['process-withdrawal'],
  trials: ['grant', 'revoke'],
  push: ['send'],
  sms: ['send'],
  email: ['send', 'schedule'],
}

export const needsStepUp = (tab, action) => (STEP_UP_ACTIONS[tab] || []).includes(String(action || ''))

// Plain-language names for the Activity Log. Anything not listed is shown as
// "<tab>: <action>".
export const ACTIVITY_LABELS = {
  'ops.login': 'Signed in',
  'ops.login_failed': 'Failed sign-in',
  'ops.logout': 'Signed out',
  'ops.session_ended': 'Session ended',
  'ops.step_up': 'Confirmed with authenticator',
  'ops.step_up_failed': 'Wrong authenticator code',
  'ops.enrolled': 'Set up authenticator',
  'ops.recovery_code_used': 'Used a recovery code',
  'ops.invited': 'Invited a staff member',
  'ops.invite_resent': 'Resent an invite',
  'ops.invite_cancelled': 'Cancelled an invite',
  'ops.invite_accepted': 'Accepted invite',
  'ops.updated': 'Changed access',
  'ops.paused': 'Paused access',
  'ops.resumed': 'Restored access',
  'ops.deleted': 'Removed staff member',
  'ops.reset_requested': 'Asked to reset authenticator',
  'ops.reset_approved': 'Approved authenticator reset',
  'ops.reset_rejected': 'Declined authenticator reset',
  'ops.denied': 'Blocked request',
}
