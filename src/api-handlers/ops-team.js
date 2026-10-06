// src/api-handlers/ops-team.js
//
// Team & Access and the Activity Log for the Sellapage Ops console.
//
//   GET  ?action=list                                  (Team & Access)
//   POST ?action=invite        { name, title, email, isSuper, template, tabs }
//   POST ?action=resend-invite { inviteId }   ?action=cancel-invite { inviteId }
//   POST ?action=update        { uid, name?, title?, tabs?, isSuper?, template? }
//   POST ?action=pause         { uid, reason }   ?action=resume { uid }
//   POST ?action=delete        { uid, reason }
//   GET  ?action=sessions&uid=                     POST ?action=end-session { sessionId }
//   POST ?action=approve-reset { requestId }       ?action=reject-reset { requestId }
//   GET  ?action=activity&uid=&kind=&from=&to=&cursor=&limit=   (Activity Log)
//   GET  ?action=activity-export&...                             (CSV, up to 2,000 rows)
//
// Pause, revoke and remove (Nex's words, 2026-10-06):
//   pause  = no access at all for now, every session ends, can be resumed;
//   revoke = tabs taken away (update with fewer tabs), effective on the very
//            next request even mid-session;
//   remove = access gone for good: the login is disabled and every session
//            ends. The record stays so the Activity Log keeps their name.
//
// Containment: someone with Team & Access who is NOT a super admin cannot
// make anyone a super admin, cannot change or remove a super admin, and can
// only hand out tabs they hold themselves. Nobody can pause, remove or change
// their own access, and the last active super admin cannot be removed.
// Every write here needs "sudo mode" (enforced in verifyOpsRequest).
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { parseJsonBody } from './_lib/http.js'
import {
  COL, INVITE_MS, sha256, randomToken, loadStaff, forgetStaff, publicStaff, endAllSessions, endSession,
  verifyOpsRequest, writeAudit, auditIdBound, IDLE_MS,
} from './_lib/ops.js'
import { cleanTabs, ROLE_TEMPLATES, opsTab } from '../utils/opsAccess.js'
import { sendInviteEmail, sendAccessChangedEmail, sendResetApprovedEmail } from './_lib/ops-mail.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const fail = (res, status, error, message) => res.status(status).json({ success: false, error, message })
const tabNames = (ids) => ids.map((id) => opsTab(id)?.label || id).join(', ')

async function activeSuperCount(db) {
  const snap = await db.collection(COL.staff).where('isSuper', '==', true).where('status', '==', 'active').get()
  return snap.size
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  const action = String(req.query?.action || 'list')
  const isLog = action === 'activity' || action === 'activity-export' || action === 'activity-people'
  const v = await verifyOpsRequest(req, isLog ? 'activity' : 'admins')
  if (!v.ok) {
    // The router turns this into a precise error for the console.
    req.__opsDenied = { reason: v.reason, uid: v.uid || null, staff: v.staff || null }
    // 401 only when the session itself is gone (the console then signs out);
    // a missing tab or a needed code is 403.
    const sessionGone = /^(session_|staff_|no_|bad_token)/.test(v.reason)
    return fail(res, sessionGone ? 401 : 403, v.reason, 'Not allowed.')
  }
  const me = v.staff
  req.__ops = { uid: me.uid, name: me.name, title: me.title, isSuper: me.isSuper === true, sessionId: v.sessionId }
  const db = getAdminDb()
  const auth = getAdminAuth()
  let body = {}
  if (req.method === 'POST') {
    try { body = parseJsonBody(req) || {} } catch { return fail(res, 400, 'invalid_json', 'Invalid request.') }
  }
  const log = (entry) => writeAudit(db, { uid: me.uid, name: me.name, title: me.title, sessionId: v.sessionId, req, tab: 'admins', ...entry })
  // Rule out the things nobody may do to this person.
  const guardTarget = async (uid, { allowSelf = false } = {}) => {
    if (!uid) return { error: [400, 'missing_uid', 'Who is this for?'] }
    if (!allowSelf && uid === me.uid) return { error: [400, 'self', 'You cannot change your own access. Ask another super admin.'] }
    const target = await loadStaff(db, uid, { fresh: true })
    if (!target) return { error: [404, 'not_found', 'That staff member does not exist.'] }
    if (target.isSuper && !me.isSuper) return { error: [403, 'super_only', 'Only a super admin can change a super admin.'] }
    return { target }
  }

  try {
    // ── Team & Access: read ───────────────────────────────────────────────
    if (action === 'list' && req.method === 'GET') {
      const [staffSnap, invSnap, resetSnap] = await Promise.all([
        db.collection(COL.staff).get(),
        db.collection(COL.invites).where('usedAt', '==', null).limit(50).get(),
        db.collection(COL.resets).where('status', '==', 'pending').limit(50).get(),
      ])
      const now = Date.now()
      return res.status(200).json({
        success: true,
        me: publicStaff(me),
        staff: staffSnap.docs.map((d) => publicStaff({ uid: d.id, ...d.data() })),
        invites: invSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((i) => !i.cancelledAt)
          .map((i) => ({ id: i.id, email: i.email, name: i.name, title: i.title, isSuper: i.isSuper === true, tabs: i.tabs || [], createdAt: i.createdAt, createdByName: i.createdByName, expiresAt: i.expiresAt, expired: now > i.expiresAt })),
        resets: resetSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        templates: ROLE_TEMPLATES,
      })
    }

    if (action === 'sessions' && req.method === 'GET') {
      const uid = String(req.query?.uid || '')
      if (!uid) return fail(res, 400, 'missing_uid', 'Who is this for?')
      const snap = await db.collection(COL.sessions).where('uid', '==', uid).limit(40).get()
      const now = Date.now()
      const sessions = snap.docs.map((d) => {
        const s = d.data()
        const live = !s.endedAt && now < s.expiresAt && now - s.lastSeenAt < IDLE_MS
        return { id: d.id, device: s.device, ip: s.ip, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, endedAt: s.endedAt, endReason: s.endReason, live, current: d.id === v.sessionId }
      }).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20)
      return res.status(200).json({ success: true, sessions })
    }

    // ── Activity Log ──────────────────────────────────────────────────────
    if (action === 'activity-people' && req.method === 'GET') {
      const snap = await db.collection(COL.staff).get()
      return res.status(200).json({ success: true, people: snap.docs.map((d) => ({ uid: d.id, name: d.get('name') || '', title: d.get('title') || '', status: d.get('status') || 'active' })) })
    }

    if (isLog && req.method === 'GET') {
      const q = req.query || {}
      const exporting = action === 'activity-export'
      const limit = exporting ? 2000 : Math.min(Math.max(Number(q.limit) || 25, 5), 100)
      let ref = db.collection(COL.audit)
      if (q.uid) ref = ref.where('uid', '==', String(q.uid))
      if (q.kind) ref = ref.where('action', '==', String(q.kind))
      ref = ref.orderBy('__name__')
      // Ids sort newest first, so "to" (newest) is the lower bound.
      if (q.to) ref = ref.startAt(auditIdBound(Number(q.to)))
      if (q.cursor) ref = ref.startAfter(String(q.cursor))
      if (q.from) ref = ref.endAt(`${auditIdBound(Number(q.from))}~`)
      const snap = await ref.limit(limit + (exporting ? 0 : 1)).get()
      const rows = snap.docs.slice(0, limit).map((d) => ({ id: d.id, ...d.data() }))
      if (exporting) {
        const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`
        const csv = ['Time (Lagos),Staff,Job title,Action,Tab,Target,Summary,Result,IP,Device']
          .concat(rows.map((r) => [
            new Date(r.at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }), r.name, r.title, r.action, r.tab || '',
            r.target?.label || r.target?.id || '', r.summary, r.result, r.ip || '', r.device || '',
          ].map(esc).join(','))).join('\n')
        await writeAudit(db, { uid: me.uid, name: me.name, title: me.title, sessionId: v.sessionId, req, tab: 'activity', action: 'ops.activity_export', summary: `Exported ${rows.length} log rows` })
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="sellapage-ops-activity-${new Date().toISOString().slice(0, 10)}.csv"`)
        return res.status(200).send(csv)
      }
      return res.status(200).json({ success: true, rows, nextCursor: snap.size > limit ? rows[rows.length - 1].id : null })
    }

    if (req.method !== 'POST') return fail(res, 405, 'method', 'Method not allowed.')

    // ── Invites ───────────────────────────────────────────────────────────
    if (action === 'invite') {
      const name = clean(body.name, 80)
      const title = clean(body.title, 80)
      const email = clean(body.email, 200).toLowerCase()
      const isSuper = body.isSuper === true
      const tabs = isSuper ? [] : cleanTabs(body.tabs)
      if (name.length < 2) return fail(res, 400, 'name', 'Enter their full name.')
      if (!EMAIL_RE.test(email)) return fail(res, 400, 'email', 'Enter a valid email address.')
      if (!isSuper && tabs.length === 0) return fail(res, 400, 'tabs', 'Tick at least one tab, or make them a super admin.')
      if (isSuper && !me.isSuper) return fail(res, 403, 'super_only', 'Only a super admin can invite a super admin.')
      if (!me.isSuper) {
        const extra = tabs.filter((t) => !me.tabs?.includes(t))
        if (extra.length) return fail(res, 403, 'beyond_own', `You can only give tabs you have yourself. Not yours: ${tabNames(extra)}.`)
      }
      try {
        const existing = await auth.getUserByEmail(email)
        const prior = await loadStaff(db, existing.uid, { fresh: true })
        if (!(existing.customClaims?.ops && prior?.status === 'deleted')) {
          return fail(res, 409, 'email_in_use', prior ? 'This person is already on the team.' : 'This email already has a Sellapage store login. Staff need their own email (for example a work address).')
        }
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err
      }
      // One live invite per email: a new one replaces the old.
      const old = await db.collection(COL.invites).where('email', '==', email).where('usedAt', '==', null).get()
      await Promise.all(old.docs.map((d) => d.ref.update({ cancelledAt: Date.now(), cancelledBy: me.uid })))

      const token = randomToken(32)
      const now = Date.now()
      const template = ROLE_TEMPLATES.some((t) => t.id === body.template) ? body.template : ''
      await db.collection(COL.invites).doc(sha256(token)).set({
        email, name, title, isSuper, tabs, template, createdAt: now, expiresAt: now + INVITE_MS,
        createdBy: me.uid, createdByName: me.name, usedAt: null, cancelledAt: null,
      })
      const sent = await sendInviteEmail({ to: email, name, title, invitedBy: me.name || 'A super admin', token, isSuper })
      await log({ action: 'ops.invited', target: { type: 'invite', id: email, label: name }, summary: `Invited ${name}${title ? ` (${title})` : ''}${isSuper ? ' as super admin' : ` with ${tabs.length} tab${tabs.length === 1 ? '' : 's'}`}`, changes: { after: { name, title, email, isSuper, tabs } } })
      return res.status(200).json({ success: true, emailed: sent })
    }

    if (action === 'resend-invite' || action === 'cancel-invite') {
      const ref = db.collection(COL.invites).doc(String(body.inviteId || ''))
      const snap = await ref.get()
      if (!snap.exists || snap.get('usedAt') || snap.get('cancelledAt')) return fail(res, 404, 'not_found', 'That invite is no longer open.')
      const inv = snap.data()
      if (inv.isSuper && !me.isSuper) return fail(res, 403, 'super_only', 'Only a super admin can change a super admin invite.')
      if (action === 'cancel-invite') {
        await ref.update({ cancelledAt: Date.now(), cancelledBy: me.uid })
        await log({ action: 'ops.invite_cancelled', target: { type: 'invite', id: inv.email, label: inv.name }, summary: `Cancelled the invite for ${inv.name}` })
        return res.status(200).json({ success: true })
      }
      // A resend is a NEW link (the old token cannot be recovered from its hash).
      await ref.update({ cancelledAt: Date.now(), cancelledBy: me.uid })
      const token = randomToken(32)
      const now = Date.now()
      await db.collection(COL.invites).doc(sha256(token)).set({ ...inv, createdAt: now, expiresAt: now + INVITE_MS, usedAt: null, cancelledAt: null, resentBy: me.uid })
      const sent = await sendInviteEmail({ to: inv.email, name: inv.name, title: inv.title, invitedBy: me.name || 'A super admin', token, isSuper: inv.isSuper })
      await log({ action: 'ops.invite_resent', target: { type: 'invite', id: inv.email, label: inv.name }, summary: `Sent a fresh invite link to ${inv.name}` })
      return res.status(200).json({ success: true, emailed: sent })
    }

    // ── Change access ─────────────────────────────────────────────────────
    if (action === 'update') {
      const { target, error } = await guardTarget(String(body.uid || ''))
      if (error) return fail(res, ...error)
      if (target.status === 'deleted') return fail(res, 400, 'deleted', 'This person was removed. Invite them again instead.')
      const before = { name: target.name, title: target.title || '', isSuper: target.isSuper === true, tabs: target.tabs || [] }
      const after = { ...before }
      if (body.name !== undefined) after.name = clean(body.name, 80)
      if (body.title !== undefined) after.title = clean(body.title, 80)
      if (body.isSuper !== undefined) {
        if (!me.isSuper) return fail(res, 403, 'super_only', 'Only a super admin can make someone a super admin.')
        after.isSuper = body.isSuper === true
        if (before.isSuper && !after.isSuper && (await activeSuperCount(db)) <= 1) return fail(res, 400, 'last_super', 'There must always be at least one super admin.')
      }
      if (body.tabs !== undefined) after.tabs = cleanTabs(body.tabs)
      if (after.isSuper) after.tabs = []
      if (after.name.length < 2) return fail(res, 400, 'name', 'Enter their full name.')
      if (!after.isSuper && after.tabs.length === 0) return fail(res, 400, 'tabs', 'Leave at least one tab, or pause them instead.')
      if (!me.isSuper) {
        const extra = after.tabs.filter((t) => !before.tabs.includes(t) && !me.tabs?.includes(t))
        if (extra.length) return fail(res, 403, 'beyond_own', `You can only give tabs you have yourself. Not yours: ${tabNames(extra)}.`)
      }
      const update = { ...after, updatedAt: Date.now(), updatedBy: me.uid }
      if (body.template !== undefined) update.template = ROLE_TEMPLATES.some((t) => t.id === body.template) ? body.template : ''
      await db.collection(COL.staff).doc(target.uid).update(update)
      forgetStaff(target.uid)

      const added = after.tabs.filter((t) => !before.tabs.includes(t))
      const removed = before.tabs.filter((t) => !after.tabs.includes(t))
      const bits = []
      if (before.isSuper !== after.isSuper) bits.push(after.isSuper ? 'made super admin' : 'no longer super admin')
      if (added.length) bits.push(`gave ${tabNames(added)}`)
      if (removed.length) bits.push(`revoked ${tabNames(removed)}`)
      if (before.name !== after.name || before.title !== after.title) bits.push('updated name or job title')
      await log({ action: 'ops.updated', target: { type: 'staff', id: target.uid, label: after.name }, summary: `${after.name}: ${bits.join('; ') || 'no change'}`, changes: { before, after } })
      if (added.length || removed.length || before.isSuper !== after.isSuper) {
        await sendAccessChangedEmail({ to: target.email, name: target.name, what: `your Ops access was updated by ${me.name}: ${bits.filter((b) => !b.startsWith('updated')).join('; ')}.` })
      }
      return res.status(200).json({ success: true, staff: publicStaff({ ...target, ...update }) })
    }

    if (action === 'pause' || action === 'resume' || action === 'delete') {
      const { target, error } = await guardTarget(String(body.uid || ''))
      if (error) return fail(res, ...error)
      if (target.status === 'deleted') return fail(res, 400, 'deleted', 'This person was already removed.')
      if (action !== 'resume' && target.isSuper && (await activeSuperCount(db)) <= 1) return fail(res, 400, 'last_super', 'There must always be at least one active super admin.')
      const reason = clean(body.reason, 300)
      const now = Date.now()
      if (action === 'resume') {
        if (target.status !== 'paused') return fail(res, 400, 'not_paused', 'This person is not paused.')
        await db.collection(COL.staff).doc(target.uid).update({ status: 'active', pausedReason: '', statusChangedAt: now, statusChangedBy: me.uid })
        forgetStaff(target.uid)
        await log({ action: 'ops.resumed', target: { type: 'staff', id: target.uid, label: target.name }, summary: `Restored ${target.name}'s access`, changes: { before: { status: 'paused' }, after: { status: 'active' } } })
        await sendAccessChangedEmail({ to: target.email, name: target.name, what: `your Ops access was restored by ${me.name}. You can sign in again.` })
        return res.status(200).json({ success: true })
      }
      const status = action === 'pause' ? 'paused' : 'deleted'
      await db.collection(COL.staff).doc(target.uid).update({
        status, pausedReason: action === 'pause' ? reason : '', statusChangedAt: now, statusChangedBy: me.uid,
        ...(status === 'deleted' ? { deletedAt: now, deletedBy: me.uid, deletedReason: reason, totpSecretEnc: null, totpEnabled: false, recoveryHashes: [] } : {}),
      })
      forgetStaff(target.uid)
      const ended = await endAllSessions(db, target.uid, status, me.uid)
      if (status === 'deleted') await auth.updateUser(target.uid, { disabled: true }).catch((e) => console.error('[ops-team] disable', e.message))
      await auth.revokeRefreshTokens(target.uid).catch(() => {})
      await log({
        action: status === 'paused' ? 'ops.paused' : 'ops.deleted',
        target: { type: 'staff', id: target.uid, label: target.name },
        summary: `${status === 'paused' ? 'Paused' : 'Removed'} ${target.name}${reason ? `: ${reason}` : ''} (${ended} session${ended === 1 ? '' : 's'} ended)`,
        changes: { before: { status: target.status }, after: { status } },
      })
      await sendAccessChangedEmail({
        to: target.email, name: target.name,
        what: status === 'paused' ? `your Ops access was paused by ${me.name}${reason ? ` (${reason})` : ''}. You have been signed out.` : `your Ops access was removed by ${me.name}. You have been signed out and this login no longer works.`,
      })
      return res.status(200).json({ success: true, endedSessions: ended })
    }

    if (action === 'end-session') {
      const ref = db.collection(COL.sessions).doc(String(body.sessionId || ''))
      const snap = await ref.get()
      if (!snap.exists) return fail(res, 404, 'not_found', 'That session no longer exists.')
      const s = snap.data()
      const owner = await loadStaff(db, s.uid, { fresh: true })
      if (owner?.isSuper && !me.isSuper && s.uid !== me.uid) return fail(res, 403, 'super_only', 'Only a super admin can end a super admin’s session.')
      if (!s.endedAt) await endSession(db, ref.id, 'ended_by_admin', me.uid)
      await log({ action: 'ops.session_ended', target: { type: 'staff', id: s.uid, label: s.name || owner?.name || '' }, summary: `Ended a session on ${s.device || 'a device'} for ${s.name || owner?.name || 'a staff member'}` })
      return res.status(200).json({ success: true })
    }

    // ── Lost authenticator ────────────────────────────────────────────────
    if (action === 'approve-reset' || action === 'reject-reset') {
      const ref = db.collection(COL.resets).doc(String(body.requestId || ''))
      const snap = await ref.get()
      if (!snap.exists || snap.get('status') !== 'pending') return fail(res, 404, 'not_found', 'That request is no longer open.')
      const r = snap.data()
      const { target, error } = await guardTarget(r.uid)
      if (error) return fail(res, ...error)
      const now = Date.now()
      if (action === 'reject-reset') {
        await ref.update({ status: 'rejected', decidedAt: now, decidedBy: me.uid })
        await log({ action: 'ops.reset_rejected', target: { type: 'staff', id: target.uid, label: target.name }, summary: `Declined ${target.name}'s authenticator reset` })
        return res.status(200).json({ success: true })
      }
      await db.collection(COL.staff).doc(target.uid).update({ totpSecretEnc: null, totpEnabled: false, recoveryHashes: [], totpLastStep: 0 })
      forgetStaff(target.uid)
      await endAllSessions(db, target.uid, 'authenticator_reset', me.uid)
      await ref.update({ status: 'approved', decidedAt: now, decidedBy: me.uid })
      await sendResetApprovedEmail({ to: target.email, name: target.name })
      await log({ action: 'ops.reset_approved', target: { type: 'staff', id: target.uid, label: target.name }, summary: `Approved ${target.name}'s authenticator reset (they confirm their email on next sign-in)` })
      return res.status(200).json({ success: true })
    }

    return fail(res, 400, 'invalid_action', 'Invalid request.')
  } catch (err) {
    console.error('[ops-team]', err.message)
    return fail(res, 500, 'server_error', 'Something went wrong. Please try again.')
  }
}
