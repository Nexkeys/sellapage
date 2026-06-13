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