// src/api-handlers/_lib/ops-mail.js
//
// Emails for the Ops console's staff accounts. Plain, branded, and never a
// secret beyond what the message is for (a one-time code or a one-time link).
import { sendEmail, escapeHtml } from './send-email.js'

export const opsUrl = () => String(process.env.OPS_URL || 'https://ops.sellapage.com.ng').replace(/\/+$/, '')

function frame(heading, body) {
  return `<div style="background:#f2f9f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e3efe8">
    <p style="margin:0 0 18px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#0b6b35">Sellapage Ops</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#0f172a">${heading}</h1>
    ${body}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7c8a99">This is an automatic security message for Sellapage staff. Sellapage will never ask for your password, codes or recovery codes by phone, chat or email.</p>
  </div>
</div>`
}

const p = (t) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155">${t}</p>`
const button = (href, label) => `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#0b6b35;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:12px">${label}</a></p>`

export function sendInviteEmail({ to, name, title, invitedBy, token, isSuper }) {
  const link = `${opsUrl()}/join?token=${encodeURIComponent(token)}`
  return sendEmail(to, 'You have been invited to Sellapage Ops', frame(
    `Welcome to the team, ${escapeHtml(name.split(' ')[0] || name)}`,
    p(`${escapeHtml(invitedBy)} has invited you to the Sellapage Ops console${title ? ` as <strong>${escapeHtml(title)}</strong>` : ''}${isSuper ? ' with <strong>super admin</strong> access' : ''}.`)
      + p('Open the link below to choose your password and set up an authenticator app (Google Authenticator or Microsoft Authenticator). It works once and expires in 48 hours.')
      + button(link, 'Accept invite')
      + p(`<span style="font-size:13px;color:#64748b">If the button does not work, copy this link:<br>${escapeHtml(link)}</span>`),
  ), { sender: 'noreply' })
}

export function sendLoginCodeEmail({ to, name, code }) {
  return sendEmail(to, `${code} is your Sellapage Ops code`, frame(
    'Your sign-in code',
    p(`Hi ${escapeHtml(name || 'there')}, use this code to continue signing in to Sellapage Ops. It expires in 10 minutes.`)
      + `<p style="margin:18px 0;font-size:34px;letter-spacing:10px;font-weight:bold;color:#0f172a">${code}</p>`
      + p('If this was not you, someone knows your password. Tell a super admin straight away.'),
  ), { sender: 'noreply' })
}

export function sendNewDeviceEmail({ to, name, device, ip, when }) {
  return sendEmail(to, 'New sign-in to Sellapage Ops', frame(
    'New sign-in to your Ops account',
    p(`Hi ${escapeHtml(name || 'there')}, your account was just signed in from a device we have not seen before.`)
      + p(`<strong>Device:</strong> ${escapeHtml(device)}<br><strong>IP address:</strong> ${escapeHtml(ip)}<br><strong>Time:</strong> ${escapeHtml(when)}`)
      + p('If this was you, there is nothing to do. If not, tell a super admin now so they can pause your access and end the session.'),
  ), { sender: 'noreply' })
}

export function sendResetRequestedEmail({ to, staffName, staffEmail }) {
  return sendEmail(to, `${staffName} asked to reset their authenticator`, frame(
    'Authenticator reset request',
    p(`<strong>${escapeHtml(staffName)}</strong> (${escapeHtml(staffEmail)}) says they lost their authenticator and asked for a reset.`)
      + p('Confirm it is really them (call them, do not reply to email) before you approve it in Team &amp; Access.')
      + button(`${opsUrl()}/`, 'Open Team & Access'),
  ), { sender: 'noreply' })
}

export function sendResetApprovedEmail({ to, name }) {
  return sendEmail(to, 'Your Sellapage Ops authenticator was reset', frame(
    'Your authenticator was reset',
    p(`Hi ${escapeHtml(name || 'there')}, a super admin approved your request. Sign in with your email and password; we will email you a code, then you will set up your authenticator again.`)
      + button(`${opsUrl()}/login`, 'Sign in'),
  ), { sender: 'noreply' })
}

export function sendAccessChangedEmail({ to, name, what }) {
  return sendEmail(to, 'Your Sellapage Ops access changed', frame(
    'Your access changed',
    p(`Hi ${escapeHtml(name || 'there')}, ${escapeHtml(what)}`)
      + p('If you think this is a mistake, speak to a super admin.'),
  ), { sender: 'noreply' })
}
