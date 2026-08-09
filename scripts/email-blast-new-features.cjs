/**
 * Sellapage — "What's New" email blast
 * ------------------------------------------------------------------
 * Run OUTSIDE the main repo (or anywhere), with firebase-key.json beside it:
 *
 *   npm i firebase-admin resend
 *   RESEND_API_KEY=re_xxx node email-blast-new-features.cjs --test=you@gmail.com
 *   RESEND_API_KEY=re_xxx node email-blast-new-features.cjs --dry
 *   RESEND_API_KEY=re_xxx node email-blast-new-features.cjs --live
 *
 * Named .cjs deliberately: it uses require(), so a plain .js file would break
 * inside any folder whose package.json has "type": "module".
 *
 * Safety: it will NOT send to everyone unless you pass --live.
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { Resend } = require('resend');

const serviceAccount = require('./firebase-key.json');

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

// Prefer the env var. Never commit a real key to a file.
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'PASTE_KEY_HERE_IF_NOT_USING_ENV';
const resend = new Resend(RESEND_API_KEY);

const FROM = 'Sellapage <noreply@sellapage.com.ng>';
const SUPPORT = 'sellapage.ng@gmail.com';
const DASHBOARD_URL = 'https://www.sellapage.com.ng/dashboard';

// Resend's default rate limit is ~2 requests/second. 600ms keeps us under it.
// The old 200ms (5/sec) would start getting throttled partway through a blast.
const DELAY_MS = 600;

const args = process.argv.slice(2);
const isLive = args.includes('--live');
const isDry = args.includes('--dry');
const testArg = args.find((a) => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1] : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBJECT = 'New on Sellapage: Receipts, Jobs, Reviews — and a way to earn 💰';

/* ------------------------------------------------------------------ */
/*  EMAIL TEMPLATE                                                     */
/*  Built for the Gmail mobile app: single column, tables only, inline  */
/*  styles only, no <style> block, no media queries (Gmail app strips   */
/*  them), no background images, 16px+ body text, 48px+ tap targets.    */
/* ------------------------------------------------------------------ */

function featureRow(emoji, title, body, isLast) {
  return `
  <tr>
    <td style="padding:0 0 ${isLast ? '0' : '14px'} 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;background:#ffffff;border:1px solid #e8ebef;border-radius:14px;">
        <tr>
          <td style="padding:16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
              <tr>
                <td width="46" style="vertical-align:top;">
                  <div style="width:38px;height:38px;background:#f0fdf4;border-radius:10px;text-align:center;line-height:38px;font-size:19px;">${emoji}</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 3px 0;font-size:16px;font-weight:700;color:#111827;line-height:1.35;">${title}</p>
                  <p style="margin:0;font-size:14px;color:#5b6472;line-height:1.6;">${body}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildHtml(firstName) {
  const greeting = firstName ? `Hey ${firstName},` : 'Hey there,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>What's new on Sellapage</title>
</head>
<body style="margin:0;padding:0;width:100%;background:#f4f6f8;">

<!-- Preheader: the grey preview line in the Gmail inbox list -->
<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  Receipts, Job Listings, Store Reviews and Reports are live — plus you can now earn cash for every vendor you refer.
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center" style="padding:20px 12px 32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;border-collapse:collapse;">

        <!-- Wordmark -->
        <tr>
          <td style="padding:6px 4px 16px 4px;">
            <span style="color:#16a34a;font-size:23px;font-weight:800;letter-spacing:-0.03em;">sellapage</span>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:#0f1720;border-radius:18px;padding:28px 22px;">
            <span style="display:inline-block;background:rgba(34,197,94,0.16);color:#4ade80;font-size:11px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;padding:6px 11px;border-radius:999px;">
              What's new
            </span>
            <p style="margin:16px 0 0 0;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">
              Your dashboard just got<br>5 serious upgrades
            </p>
            <p style="margin:12px 0 0 0;font-size:15px;line-height:1.65;color:#a8b3c1;">
              ${greeting} we've shipped a lot lately — and one of them lets you
              <span style="color:#4ade80;font-weight:600;">earn real cash</span> without selling a single extra item.
            </p>
          </td>
        </tr>

        <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>

        <!-- Features -->
        <tr>
          <td>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
              ${featureRow('🧾', 'Receipts', 'Send customers clean, professional receipts in seconds. Six templates, download as PDF or image, share straight to WhatsApp.')}
              ${featureRow('💼', 'Job Listings', 'Hiring a sales rep, tailor or delivery help? Post the role from your dashboard and it goes live on the public Sellapage jobs board — free on every plan.')}
              ${featureRow('⭐', 'Store Reviews', 'Real customer reviews now show on your store page. Nothing converts a first-time buyer faster than seeing other people already bought.')}
              ${featureRow('🛡️', 'Store Reports', 'A proper trust & safety channel. Shoppers can flag anything suspicious, so genuine vendors like you stay protected from bad actors.')}
              ${featureRow('📊', 'Sharper Analytics', 'See what people actually click, which products pull attention, and where your buyers drop off — so you stop guessing.', true)}
            </table>
          </td>
        </tr>

        <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>

        <!-- Referral spotlight -->
        <tr>
          <td style="background:#052e16;border-radius:18px;padding:26px 22px;">
            <span style="display:inline-block;background:#22c55e;color:#052e16;font-size:11px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;padding:6px 11px;border-radius:999px;">
              Earn while you sell
            </span>

            <p style="margin:15px 0 0 0;font-size:22px;line-height:1.3;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
              Get paid for every vendor you bring in
            </p>

            <p style="margin:11px 0 18px 0;font-size:15px;line-height:1.65;color:#a7f3c4;">
              Share your referral link. When someone signs up and pays for a plan, the cash lands in your Sellapage balance — even if it's just one person.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;background:rgba(255,255,255,0.06);border-radius:12px;">
              <tr>
                <td style="padding:14px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;">
                    <tr>
                      <td style="font-size:14px;color:#d1fae5;padding:4px 0;">They join <strong style="color:#ffffff;">Growth</strong></td>
                      <td align="right" style="font-size:16px;font-weight:800;color:#4ade80;padding:4px 0;">₦500</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#d1fae5;padding:4px 0;">They join <strong style="color:#ffffff;">Pro</strong></td>
                      <td align="right" style="font-size:16px;font-weight:800;color:#4ade80;padding:4px 0;">₦1,000</td>
                    </tr>
                    <tr>
                      <td style="font-size:14px;color:#d1fae5;padding:4px 0;">They join <strong style="color:#ffffff;">Premium</strong></td>
                      <td align="right" style="font-size:16px;font-weight:800;color:#4ade80;padding:4px 0;">₦2,000</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:#86efac;">
              No minimum withdrawal — take out any amount, any time, straight to your bank. Grab your link from the <strong style="color:#ffffff;">Referral Program</strong> tab.
            </p>
          </td>
        </tr>

        <tr><td style="height:22px;line-height:22px;font-size:0;">&nbsp;</td></tr>

        <!-- CTA -->
        <tr>
          <td align="center">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;max-width:340px;">
              <tr>
                <td align="center" bgcolor="#16a34a" style="border-radius:12px;">
                  <a href="${DASHBOARD_URL}" style="display:block;padding:17px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">
                    Open my dashboard →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:13px 0 0 0;font-size:13px;color:#8b95a3;line-height:1.6;">
              Everything above is already waiting in your account.
            </p>
          </td>
        </tr>

        <tr><td style="height:24px;line-height:24px;font-size:0;">&nbsp;</td></tr>

        <!-- Reply nudge -->
        <tr>
          <td style="background:#ffffff;border:1px solid #e8ebef;border-radius:14px;padding:18px;">
            <p style="margin:0 0 5px 0;font-size:15px;font-weight:700;color:#111827;">Something missing?</p>
            <p style="margin:0;font-size:14px;color:#5b6472;line-height:1.65;">
              Just reply to this email and tell us what you need next — a real person reads every single one, and a lot of what's above came from vendors who did exactly that.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 6px 0 6px;">
            <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#4b5563;">— The Sellapage Team</p>
            <p style="margin:0 0 10px 0;font-size:12px;color:#9aa3af;line-height:1.6;">
              You're getting this because you have a Sellapage account.<br>
              <a href="mailto:${SUPPORT}?subject=Unsubscribe%20from%20Sellapage%20updates" style="color:#6b7280;text-decoration:underline;">Unsubscribe from product updates</a>
            </p>
            <p style="margin:0;font-size:12px;color:#b6bdc7;">© 2026 Sellapage · sellapage.com.ng</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  SEND                                                               */
/* ------------------------------------------------------------------ */

// The original stopped at 1000 users. This pages through every batch so a
// growing user base doesn't silently get cut off mid-list.
async function fetchAllUsers() {
  const users = [];
  let pageToken;
  do {
    const result = await getAuth().listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

function firstNameOf(user) {
  const name = (user.displayName || '').trim();
  if (!name) return null;
  const first = name.split(/\s+/)[0];
  // Skip anything that looks like a handle/business name rather than a person.
  if (first.length < 2 || first.length > 18 || /[^a-zA-Z'’-]/.test(first)) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

async function main() {
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('PASTE_KEY')) {
    console.error('❌ No Resend API key. Run with:  RESEND_API_KEY=re_xxx node email-blast-new-features.cjs --test=you@gmail.com');
    process.exit(1);
  }

  // --- test mode: one email to yourself, check it on your phone first ---
  if (testEmail) {
    console.log(`🧪 Sending ONE test email to ${testEmail}...`);
    const { error } = await resend.emails.send({
      from: FROM,
      to: testEmail,
      subject: SUBJECT,
      html: buildHtml('Nex'),
    });
    if (error) { console.error('❌ Failed:', error); process.exit(1); }
    console.log('✅ Sent. Open it in the Gmail app on your phone before going live.');
    process.exit(0);
  }

  console.log('🔄 Fetching users from Firebase Auth...');
  const users = await fetchAllUsers();

  // Dedupe (a user can appear across providers) and drop unverified junk.
  const seen = new Set();
  const recipients = [];
  for (const u of users) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, firstName: firstNameOf(u) });
  }

  console.log(`✅ ${users.length} accounts → ${recipients.length} unique emails.`);

  if (!isLive) {
    console.log('\n🔍 DRY RUN — nothing sent. First 10 recipients:');
    recipients.slice(0, 10).forEach((r, i) => console.log(`   ${i + 1}. ${r.email}${r.firstName ? `  (${r.firstName})` : ''}`));
    console.log(`\n   Subject: ${SUBJECT}`);
    console.log(`   Est. runtime: ~${Math.ceil((recipients.length * DELAY_MS) / 60000)} min`);
    console.log('\n   Send a test first:  --test=you@gmail.com');
    console.log('   Then go live with:  --live\n');
    process.exit(0);
  }

  console.log(`\n🚀 LIVE BLAST to ${recipients.length} vendors. Do not close this terminal.\n`);

  let sent = 0;
  const failed = [];

  for (let i = 0; i < recipients.length; i++) {
    const { email, firstName } = recipients[i];
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECT,
        html: buildHtml(firstName),
      });
      if (error) throw new Error(error.message || JSON.stringify(error));
      sent++;
      process.stdout.write(`\r   ${i + 1}/${recipients.length} sent (${failed.length} failed)   `);
    } catch (err) {
      failed.push({ email, reason: err.message });
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n\n🏁 Done. Sent: ${sent} · Failed: ${failed.length}`);
  if (failed.length) {
    console.log('\nFailed addresses (safe to retry just these):');
    failed.forEach((f) => console.log(`   ${f.email} — ${f.reason}`));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err);
  process.exit(1);
});
