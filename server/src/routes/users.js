import { Router } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, assertAdmin as assertIsAdmin, callable } from '../shared.js'

const VALID_ROLES = ['admin', 'cashier', 'staff']
const router = Router()

// Mirrors create-user.php + send-invite.php: creates the Auth account, sets the
// role as a custom claim (what Security Rules key off of), writes the
// users/{uid} profile doc, and optionally queues a welcome email via the
// Trigger Email extension (mail/ doc).
router.post('/createStaffUser', callable(async (request) => {
  assertIsAdmin(request.auth)
  const { name, email, password, role, sendInvite } = request.data ?? {}

  if (!name || !email || !password || !role) {
    throw new HttpsError('invalid-argument', 'Name, email, password, and role are required.')
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Role must be one of: ${VALID_ROLES.join(', ')}`)
  }
  if (String(password).length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.')
  }

  const auth = getAuth()
  const db = getFirestore()

  let userRecord
  try {
    userRecord = await auth.createUser({ email, password, displayName: name })
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A user with this email already exists.')
    }
    throw new HttpsError('internal', err.message || 'Failed to create user.')
  }

  await auth.setCustomUserClaims(userRecord.uid, { role })

  await db.collection('users').doc(userRecord.uid).set({
    name,
    email,
    role,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  })

  if (sendInvite) {
    await db.collection('mail').add({
      to: [email],
      message: {
        subject: 'Welcome to Euro Motor Shop',
        html: `<p>Hi ${name},</p><p>An account has been created for you on the Euro Motor Shop management portal.</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${password}</p><p>Please log in and change your password as soon as possible.</p>`,
      },
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  return { uid: userRecord.uid }
}))

router.post('/updateStaffUser', callable(async (request) => {
  assertIsAdmin(request.auth)
  const { uid, name, email, role, status } = request.data ?? {}

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.')
  }
  if (role && !VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Role must be one of: ${VALID_ROLES.join(', ')}`)
  }

  const auth = getAuth()
  const db = getFirestore()

  const authUpdate = {}
  if (name) authUpdate.displayName = name
  if (email) authUpdate.email = email
  if (status) authUpdate.disabled = status === 'inactive'
  if (Object.keys(authUpdate).length > 0) {
    try {
      await auth.updateUser(uid, authUpdate)
    } catch (err) {
      throw new HttpsError('internal', err.message || 'Failed to update user.')
    }
  }
  if (role) {
    await auth.setCustomUserClaims(uid, { role })
  }

  const docUpdate = {}
  if (name) docUpdate.name = name
  if (email) docUpdate.email = email
  if (role) docUpdate.role = role
  if (status) docUpdate.status = status
  if (Object.keys(docUpdate).length > 0) {
    // set(..., {merge: true}) instead of update() — an Auth user created
    // outside our own createStaffUser flow (e.g. directly in the Firebase
    // Console) has no users/{uid} Firestore doc yet, and update() throws
    // NOT_FOUND on a missing document. This creates it if needed.
    await db.collection('users').doc(uid).set(docUpdate, { merge: true })
  }

  return { success: true }
}))

router.post('/deleteStaffUser', callable(async (request) => {
  assertIsAdmin(request.auth)
  const { uid } = request.data ?? {}

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.')
  }
  if (uid === request.auth?.uid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account.')
  }

  const auth = getAuth()
  const db = getFirestore()

  await auth.deleteUser(uid)
  await db.collection('users').doc(uid).delete()

  return { success: true }
}))

export default router
