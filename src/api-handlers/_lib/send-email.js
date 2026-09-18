//src/api-handlers/_lib/send-email.js/

/**
 * Escape a value for safe interpolation into an HTML email body.
 *
 * Email templates across the handlers are built with template literals, and
 * several interpolate attacker-influenced values - `customerName` and
 * `reviewText` originate from the public checkout and review forms. Unescaped,
 * an attacker can inject markup into an email the vendor trusts because it
 * genuinely came from Sellapage: a convincing fake "confirm your payout" button
 * pointing at a credential-harvesting page, for example. Mail clients strip
 * <script>, so this is phishing/HTML injection rather than XSS - still worth
 * closing, and free to do.
 *
 * Use for every interpolated value that did not originate server-side.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------- senders
//
// Which address an email comes FROM, by what it is about (Nex, 2026-09-18):
//
//   orders     everything concerning orders and bookings
//   noreply    OTPs, password resets, login alerts, account recovery
//   hello      newsletters and welcoming new signups
//   info       general platform updates (admin broadcasts to users)
//   support    anything else, including goodbye emails. The catch-all, so no
//              email is ever left without a sender.
//
// The whole domain sellapage.com.ng is verified in Resend, which covers every
// address on it, so none of these needs its own setup.
//
// Replaced the single RESEND_FROM_EMAIL (which put support@ on OTPs and order
// mail alike). RESEND_REPLY_TO is optional: set it to a mailbox someone
// actually reads and replies to every email go there. Unset, no reply-to is
// sent and replies go to the sending address.
const SENDER_DOMAIN = 'sellapage.com.ng';

export const SENDERS = {
  orders: `Sellapage <orders@${SENDER_DOMAIN}>`,
  noreply: `Sellapage <no-reply@${SENDER_DOMAIN}>`,
  hello: `Sellapage <hello@${SENDER_DOMAIN}>`,
  info: `Sellapage <info@${SENDER_DOMAIN}>`,
  support: `Sellapage <support@${SENDER_DOMAIN}>`,
};

const fromFor = (sender) => SENDERS[sender] || SENDERS.support;

function resendHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  };
}

/**
 * Sends one email. Never throws; returns true or false.
 *
 * @param options.sender  a key of SENDERS; defaults to 'support'
 * @param options.headers extra headers, e.g. List-Unsubscribe
 */
export async function sendEmail(to, subject, html, { sender = 'support', headers } = {}) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: resendHeaders(),
      body: JSON.stringify({
        from: fromFor(sender),
        to: [to],
        subject,
        html,
        ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
        ...(headers ? { headers } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('[send-email]', error.message);
    return false;
  }
}

/**
 * Up to 100 separate emails in ONE Resend request (the batch API). Each email
 * has its own single recipient, so nobody sees anybody else's address.
 *
 * Returns { ok, ids, error, status }. `ids` is in the same order as `emails`
 * when ok. On failure the whole batch failed and nothing was sent, which is
 * how Resend's batch endpoint behaves, so the caller can retry the same set.
 */
export async function sendEmailBatch(emails, { sender = 'support' } = {}) {
  if (!emails.length) return { ok: true, ids: [] };
  if (emails.length > 100) return { ok: false, error: 'batch larger than 100' };

  try {
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: resendHeaders(),
      body: JSON.stringify(
        emails.map((e) => ({
          from: fromFor(sender),
          to: [e.to],
          subject: e.subject,
          html: e.html,
          ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
          ...(e.headers ? { headers: e.headers } : {}),
        })),
      ),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, status: response.status, error: body?.message || `Resend error ${response.status}` };
    }
    return { ok: true, ids: (body?.data || []).map((d) => d?.id || null) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Resend's created_at looks like "2026-09-18 22:13:42.674981+00". Node's Date
 * parser returns NaN for that twice over: the space, and the "+00" offset,
 * which ISO 8601 requires as "+00:00". Tested, not assumed: an unparsed date
 * would make every email look older than today and the quota look untouched.
 */
export function parseResendTime(value) {
  let s = String(value || '').trim().replace(' ', 'T');
  if (/[+-]\d{2}$/.test(s)) s += ':00';
  else if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) s += 'Z';
  return Date.parse(s);
}

/**
 * How many emails Resend has sent TODAY, counted from Resend itself.
 *
 * The free plan's 100/day covers EVERY email (OTPs and order mail included) and
 * resets at MIDNIGHT UTC, which is 01:00 in Lagos. Resend has no "quota left"
 * endpoint, but it does list sent emails newest first, so this walks back until
 * it passes midnight UTC. On the free plan that is at most two pages.
 *
 * Returns { used } or { error }.
 */
export async function countEmailsSentTodayUtc() {
  const midnightUtc = new Date();
  midnightUtc.setUTCHours(0, 0, 0, 0);
  const cutoff = midnightUtc.getTime();

  let used = 0;
  let after = null;

  try {
    for (let page = 0; page < 30; page++) {
      const url = `https://api.resend.com/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`;
      const response = await fetch(url, { headers: resendHeaders() });
      if (!response.ok) return { error: `Resend list error ${response.status}` };
      const body = await response.json();
      const rows = Array.isArray(body?.data) ? body.data : [];

      for (const row of rows) {
        const at = parseResendTime(row.created_at);
        if (Number.isFinite(at) && at < cutoff) return { used };
        used++;
      }

      if (!body?.has_more || !rows.length) return { used };
      after = rows[rows.length - 1].id;
    }
    return { used };
  } catch (error) {
    return { error: error.message };
  }
}