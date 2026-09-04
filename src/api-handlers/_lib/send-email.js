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

export async function sendEmail(to, subject, html) {
  try {
    const from = process.env.RESEND_FROM_EMAIL || 'Sellapage <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
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