// src/api-handlers/_lib/store-emails.js
//
// Who gets a store's operational emails, and sending to all of them.
//
// WHY: every vendor-facing email went to stores/{id}.email only, so a store
// with staff had one inbox receiving everything and the people actually doing
// the work received nothing. A Sales staff member handling orders never saw an
// order email, even though the dashboard gives them the Orders tab.
//
// THE RULE, deliberately the same one used for push notifications
// (_lib/notification-access.js): a staff member gets an email only when their
// role grants a tab that justifies it, judged with canStaffAccessTab, the same
// function DashboardLayout uses to hide tabs. Owner-only tabs are never
// granted, so billing, payouts and referral emails stay with the owner.
//
// PLUS AN OWNER SWITCH: each staff member has an "email this person" toggle in
// the Team tab (staffMemberships.emailOptIn, on unless set to false). Emails
// count against the same Resend daily quota as login codes, so an owner whose
// staff already get app notifications can turn their copies off without
// changing what the person can see or do.
//
// Addresses are never put in one `to` list: each person gets their own copy, so
// no vendor's staff can see another's address.
import { canStaffAccessTab } from '../../utils/staffRoles.js'
import { sendEmail } from './send-email.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Everyone who should receive an email about `tabIds` for this store.
 *
 * @param tabIds    one tab id, or several when a screen lives in more than one
 *                  place (a shipment shows in Orders and in Delivery)
 * @param store     the store document when the caller already has it
 * @param extraUids staff uids to include whatever their role says, for things
 *                  that belong to a person rather than a tab (their own reminder)
 * @returns {Promise<{owner: string|null, staff: Array<{email,name,uid}>, all: string[]}>}
 */
export async function storeEmailRecipients(db, storeId, tabIds, { store = null, extraUids = [] } = {}) {
  const tabs = (Array.isArray(tabIds) ? tabIds : [tabIds]).filter(Boolean)
  const result = { owner: null, staff: [], all: [] }
  if (!storeId) return result

  try {
    let storeData = store
    if (!storeData) {
      const snap = await db.collection('stores').doc(storeId).get()
      storeData = snap.exists ? snap.data() : null
    }
    const ownerEmail = String(storeData?.email || '').trim()
    if (EMAIL_RE.test(ownerEmail)) result.owner = ownerEmail

    // Team is Premium only, and a downgrade takes the staff accounts with it
    // (the same rule verify-store-access.js applies to every staff API). The
    // owner still gets their own copy. No extra read: the store document is
    // already in hand.
    const hasTeam = (storeData?.hasPremiumFeatures ?? storeData?.plan === 'premium') === true
    if (!hasTeam) {
      result.all = result.owner ? [result.owner] : []
      return result
    }

    // Single-field query, the convention everywhere else in this codebase.
    const memberships = await db.collection('staffMemberships').where('storeId', '==', storeId).get()
    const candidates = memberships.docs
      .map((d) => d.data())
      .filter((m) => m.active === true && m.emailOptIn !== false && EMAIL_RE.test(String(m.email || '').trim()))

    if (candidates.length) {
      // Each distinct role read once, however many staff share it.
      const roleIds = [...new Set(candidates.map((m) => m.roleId).filter(Boolean))]
      const roleSnaps = roleIds.length
        ? await db.getAll(...roleIds.map((id) => db.collection('stores').doc(storeId).collection('staffRoles').doc(String(id))))
        : []
      const roles = new Map(roleSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()]))

      for (const m of candidates) {
        const role = roles.get(String(m.roleId))
        const byTab = !!role && tabs.some((tab) => canStaffAccessTab(role, tab))
        const byUid = extraUids.includes(m.staffUid)
        if (!byTab && !byUid) continue
        const email = String(m.email).trim()
        if (email.toLowerCase() === (result.owner || '').toLowerCase()) continue
        result.staff.push({ email, name: m.name || '', uid: m.staffUid })
      }
    }
  } catch (err) {
    // Never let recipient resolution break the email itself: the owner still
    // gets theirs even if staff cannot be worked out.
    console.error('[store-emails] could not resolve staff recipients:', err?.message || err)
  }

  result.all = [result.owner, ...result.staff.map((s) => s.email)].filter(Boolean)
  return result
}

/**
 * Sends one store email to the owner and every staff member entitled to it.
 * Never throws. Returns { sent, failed, recipients }.
 *
 * Deliberately the same argument shape as sendEmail (subject, html, options)
 * with the store context in front, so converting a call site is a change at
 * the head and tail only and the email body is left exactly as it was.
 *
 * `html` may be a function of the recipient when the copy should differ.
 */
export async function sendStoreEmail(db, storeId, tabIds, subject, html, { sender = 'support', ...options } = {}) {
  const recipients = await storeEmailRecipients(db, storeId, tabIds, options)
  let sent = 0
  let failed = 0

  for (const person of [{ email: recipients.owner, name: '', uid: null, owner: true }, ...recipients.staff]) {
    if (!person.email) continue
    const body = typeof html === 'function' ? html(person) : html
    const ok = await sendEmail(person.email, subject, body, { sender })
    if (ok) sent++
    else failed++
  }

  return { sent, failed, recipients: recipients.all }
}
