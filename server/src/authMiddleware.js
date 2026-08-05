import { getAuth } from 'firebase-admin/auth'

// Verifies the Firebase ID token sent by the client (Authorization: Bearer
// <token>) and attaches { uid, token } to req.auth, mirroring the shape
// onCall's `request.auth` had in Cloud Functions — this is what lets
// shared.js's assertStaffOrAbove/assertAdmin work unchanged.
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const match = /^Bearer (.+)$/.exec(header)
  if (!match) {
    req.auth = undefined
    return next()
  }
  try {
    const decoded = await getAuth().verifyIdToken(match[1])
    req.auth = { uid: decoded.uid, token: decoded }
  } catch (err) {
    console.error('ID token verification failed:', err.message)
    req.auth = undefined
  }
  next()
}
