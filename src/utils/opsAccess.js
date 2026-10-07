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

// THE ONE LIST. Add a tab here and it appears, by itself, in the sidebar, in
// the Team & Access picker (assignable straight away) and in Sella's guide.
// The server checks access against these ids too (cleanTabs, opsCanOpen).
//   group  the sidebar section     icon  a lucide icon name (drawn by the console)
//   about  one line for the guide  can   what someone with this tab can do
//   risky  a confirmation shown before giving the tab to someone, and why
export const OPS_TABS = [
  { id: 'health', label: 'Platform Pulse', group: 'platform', icon: 'Activity',
    about: 'The heartbeat of Sellapage: health, alerts and what needs a person.',
    can: ['See if Firebase, Vercel, Cloudinary and the AI engine are up', 'Watch the Termii SMS wallet and the Firestore quota', 'Jump straight to anything waiting for attention'] },
  { id: 'growth', label: 'Growth & Activation', group: 'platform', icon: 'Rocket',
    about: 'Where merchants come from, where they get stuck, and who keeps selling.',
    can: ['Follow the funnel from sign-up to first order and returning merchants', 'See the six merchant segments and export any of them', 'Compare acquisition channels by quality, not just sign-ups', 'Track activation, retention and revenue per active merchant'] },
  { id: 'outreach', label: 'Outreach Tracker', group: 'platform', icon: 'PhoneCall',
    about: 'Reach out to merchants and prospects, and see who comes back.',
    can: ['Work through a segment list one merchant at a time', 'Log each contact, the message angle and the reply', 'Add prospects who have not signed up yet', 'See automatically who returned, finished their store or got an order'] },
  { id: 'analytics', label: 'Analytics', group: 'platform', icon: 'BarChart3',
    about: 'Sign-ups over time and the stores doing the most.',
    can: ['See sign-ups over 30 days, 90 days or 12 months', 'See the plan mix and the most visited stores', 'Check leads and open support tickets'] },
  { id: 'revenue', label: 'Revenue', group: 'platform', icon: 'Wallet', risky: 'Shows every naira the platform has earned.',
    about: 'Money in: subscriptions and what stores take through Sellapage.',
    can: ['See what Sellapage earned: subscriptions by plan and delivery charges', 'See how much each store sells', 'See every payment through Paystack'] },

  { id: 'directory', label: 'Merchants', group: 'commerce', icon: 'Store',
    about: 'Every store on Sellapage, searchable.',
    can: ['Search any store by name, link, email or phone', 'See plans, listings, leads and where each store came from', 'Approve a store’s payout account'] },
  { id: 'referrals', label: 'Referrals', group: 'commerce', icon: 'TrendingUp',
    about: 'The referral programme: who brings whom.',
    can: ['See total referrals, rewards and payouts', 'See the top referrers and the stores each one brought'] },
  { id: 'withdrawals', label: 'Payouts', group: 'commerce', icon: 'Banknote', risky: 'Can approve money leaving Sellapage.',
    about: 'Referral earnings that vendors asked to withdraw.',
    can: ['Approve or reject payout requests', 'See paid and pending payouts'] },
  { id: 'trials', label: 'Free Trials', group: 'commerce', icon: 'Gift', risky: 'Can give paid plans away and overwrite a plan someone paid for.',
    about: 'Free time on paid plans.',
    can: ['Give a store a free trial', 'Pause, resume or end a trial'] },
  { id: 'marketplace', label: 'Dropshipping', group: 'commerce', icon: 'Boxes',
    about: 'The dropshipping marketplace: waitlist and suppliers.',
    can: ['Review supplier applications with their video and terms', 'Approve, reject or suspend suppliers', 'Lift new-supplier limits', 'See the waitlist and give early access'] },
  { id: 'cac', label: 'CAC Verification', group: 'commerce', icon: 'FileCheck',
    about: 'Business registration checks that earn the green tick.',
    can: ['Verify a business by hand when its automatic tries ran out', 'Give 3 more tries, reject, or remove a badge', 'Contact vendors who asked for help registering'] },
  { id: 'reports', label: 'Store Reports', group: 'commerce', icon: 'Flag',
    about: 'Stores that customers reported.',
    can: ['Read reports and look at the evidence', 'Keep notes and mark them reviewed, resolved or dismissed'] },
  { id: 'reviews', label: 'Reviews', group: 'commerce', icon: 'Star',
    about: 'Reviews of Sellapage itself.',
    can: ['Approve, hide or feature platform reviews', 'Switch the review prompt on or off'] },
  { id: 'jobs', label: 'Job Listings', group: 'commerce', icon: 'Briefcase',
    about: 'Jobs that stores post on the jobs board.',
    can: ['Approve job listings or reject them with a reason'] },

  { id: 'domains', label: 'Custom Domains', group: 'infrastructure', icon: 'Link2',
    about: 'Stores using their own web address.',
    can: ['See which domains work, are waiting for DNS or are failing', 'Open any store’s domain to check it'] },
  { id: 'usage', label: 'Firestore Usage', group: 'infrastructure', icon: 'Database',
    about: 'The free database quota, which resets daily.',
    can: ['See when the free quota resets and what Ops costs in reads', 'Open the live numbers in the Firebase console', 'See reads, writes and deletes here once billing is on'] },
  { id: 'sella-ai', label: 'Sella AI Usage', group: 'infrastructure', icon: 'Bot',
    about: 'How vendors use Sella and what it costs.',
    can: ['See Sella requests per vendor, today and all time', 'See this month’s credits and what Sella really cost'] },
  { id: 'ai-describe', label: 'AI Description Engine', group: 'infrastructure', icon: 'Sparkles',
    about: 'The engine that writes product descriptions.',
    can: ['Check the engine is answering and how fast', 'See each API key and model', 'Search every description request and its errors'] },

  { id: 'blog', label: 'Blog', group: 'growth', icon: 'BookOpen',
    about: 'The Sellapage blog.',
    can: ['Write, edit, schedule and publish posts', 'Manage categories', 'Moderate comments'] },
  { id: 'newsletter', label: 'Newsletter', group: 'growth', icon: 'Mail',
    about: 'People who subscribed to updates.',
    can: ['See and search subscribers', 'Copy or download the whole list', 'Remove someone who asks'] },
  { id: 'partners', label: 'Investors & Partners', group: 'growth', icon: 'Rocket', risky: 'Holds investors’ names, emails and phone numbers.',
    about: 'Investor and partnership enquiries.',
    can: ['Read enquiries and follow up', 'Edit the traction numbers on the Partners page'] },

  { id: 'announcements', label: 'Announcements', group: 'messaging', icon: 'Megaphone', risky: 'Posts a message every vendor sees.',
    about: 'Banners and pop-ups inside every vendor dashboard.',
    can: ['Post, switch off or delete announcements'] },
  { id: 'push', label: 'Push Broadcast', group: 'messaging', icon: 'Bell', risky: 'Wakes every vendor’s phone and cannot be recalled.',
    about: 'Phone notifications to vendors.',
    can: ['Send a push notification to all or some vendors'] },
  { id: 'sms', label: 'SMS Campaigns', group: 'messaging', icon: 'MessageSquare', risky: 'Spends Termii credit and texts every vendor.',
    about: 'Text messages to vendors through Termii.',
    can: ['Write and send SMS campaigns', 'See delivery and opt-outs'] },
  { id: 'email', label: 'Email Broadcast', group: 'messaging', icon: 'Send', risky: 'Emails every vendor and cannot be recalled.',
    about: 'Designed emails to vendors.',
    can: ['Design, test, schedule and send emails'] },
  { id: 'tickets', label: 'Support Tickets', group: 'messaging', icon: 'LifeBuoy',
    about: 'Messages vendors send from their Support tab.',
    can: ['Read tickets and reply by email from Ops', 'Reach the vendor on WhatsApp in one tap', 'Mark them in progress or resolved'] },

  { id: 'admins', label: 'Team & Access', group: 'governance', icon: 'Shield', risky: 'Can invite, pause and remove staff.',
    about: 'Who can open Ops and what they can open.',
    can: ['Invite staff and pick their tabs', 'Revoke tabs, pause or remove someone', 'See and end anyone’s sessions'] },
  { id: 'activity', label: 'Activity Log', group: 'governance', icon: 'ScrollText',
    about: 'Every sign-in and every change, with who, when and from where.',
    can: ['Filter by person, kind of action or date', 'Export the log'] },
  { id: 'recovery', label: 'Account Recovery', group: 'governance', icon: 'KeyRound', risky: 'Can change any vendor’s login email and password.',
    about: 'Vendors locked out of their email.',
    can: ['Verify and approve recovery requests', 'Just unlock a locked account'] },
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
  { id: 'growth', label: 'Growth', tabs: ['growth', 'outreach', 'directory', 'analytics', 'referrals'] },
]

// How someone is welcomed the very first time they open Ops (chosen at
// invite). Later sign-ins are always "Welcome back".
export const WELCOME_STYLES = [
  { id: 'team', label: 'Team', about: 'A warm welcome and a tour of their tabs.' },
  { id: 'leadership', label: 'Leadership', about: 'A grand welcome for CTO, COO, heads and directors.' },
  { id: 'ceo', label: 'CEO', about: 'The special one: the ship, the door and the party.' },
]
export const cleanWelcomeStyle = (v) => (WELCOME_STYLES.some((w) => w.id === v) ? v : 'team')

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
  'ops.recovery_codes_new': 'Made new recovery codes',
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
  'ops.profile_updated': 'Updated their profile',
  'ops.welcomed': 'Finished their welcome',
  'ops.activity_export': 'Exported the Activity Log',
  'outreach.contact': 'Logged an outreach contact',
  'outreach.prospect': 'Added a prospect',
  'outreach.update': 'Updated an outreach contact',
}

// Who staff can "holla" from Sella's guide when they need a person.
export const OPS_FOUNDER = { name: 'Ernest Uwaoma', title: 'Founder', email: 'sellapage.ng@gmail.com' }
