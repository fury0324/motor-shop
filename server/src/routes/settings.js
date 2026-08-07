import { Router } from 'express'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, assertStaffOrAbove, assertAdmin, callable } from '../shared.js'

const router = Router()

const SETTINGS_DOC_ID = 'general'
const MAX_MARKUP_PERCENT = 100

// Single shared settings doc — currently just the installment markup
// default, but kept as one doc (not a per-field collection) so future
// settings can be added without a new route/rule per field.
router.post('/getSettings', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const doc = await db.collection('settings').doc(SETTINGS_DOC_ID).get()
  const data = doc.exists ? doc.data() : {}
  return { installmentMarkupPercent: Number(data.installmentMarkupPercent) || 0 }
}))

router.post('/updateSettings', callable(async (request) => {
  assertAdmin(request.auth)
  const { installmentMarkupPercent } = request.data ?? {}

  const percent = Number(installmentMarkupPercent)
  if (!Number.isFinite(percent) || percent < 0 || percent > MAX_MARKUP_PERCENT) {
    throw new HttpsError('invalid-argument', `installmentMarkupPercent must be a number between 0 and ${MAX_MARKUP_PERCENT}.`)
  }

  const db = getFirestore()
  await db.collection('settings').doc(SETTINGS_DOC_ID).set(
    { installmentMarkupPercent: percent, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  )

  return { success: true }
}))

export default router
