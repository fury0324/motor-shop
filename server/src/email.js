const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

// Shared transactional-email sender (Brevo's free tier: 300/day) used by
// both the due-payment reminder cron job and payment confirmation emails —
// one email pipeline for the whole app, sent directly from this server, no
// Firebase Extensions/Blaze plan needed.
//
// Never throws: email delivery is a best-effort side effect, not something
// that should fail the request (a payment record, a cron run) that
// triggered it. Callers get {sent: false} back and a logged reason instead.
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('BREVO_API_KEY is not configured — email not sent.')
    return { sent: false }
  }

  const fromEmail = process.env.EMAIL_FROM_ADDRESS
  if (!fromEmail) {
    console.error('EMAIL_FROM_ADDRESS is not configured — email not sent.')
    return { sent: false }
  }
  const fromName = process.env.EMAIL_FROM_NAME || 'Euro Motor Shop'

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
        subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`Brevo email send failed (${response.status}):`, detail)
      return { sent: false }
    }
    return { sent: true }
  } catch (err) {
    console.error('Email send request failed:', err)
    return { sent: false }
  }
}
