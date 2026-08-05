import { Router } from 'express'
import { flagOverdueInstallments } from './transactions.js'
import { runDuePaymentReminders } from './notifications.js'

const router = Router()

// GitHub Actions calls these on a schedule instead of Cloud Scheduler —
// protected by a shared secret (not user auth, since there's no signed-in
// user in a cron context) checked against CRON_SECRET.
function requireCronSecret(req, res, next) {
  const provided = req.headers['x-cron-secret']
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: { code: 'unauthenticated', message: 'Invalid or missing cron secret.' } })
  }
  next()
}

router.post('/flag-overdue-installments', requireCronSecret, async (_req, res) => {
  try {
    const result = await flagOverdueInstallments()
    res.json(result)
  } catch (err) {
    console.error('flagOverdueInstallments failed:', err)
    res.status(500).json({ error: { code: 'internal', message: 'Failed to flag overdue installments.' } })
  }
})

router.post('/send-due-payment-reminders', requireCronSecret, async (_req, res) => {
  try {
    const result = await runDuePaymentReminders()
    res.json(result)
  } catch (err) {
    console.error('sendDuePaymentReminders failed:', err)
    res.status(500).json({ error: { code: 'internal', message: 'Failed to send due payment reminders.' } })
  }
})

export default router
