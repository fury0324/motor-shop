// Drop-in replacement for firebase-functions/v2/https's HttpsError so every
// ported function's `throw new HttpsError(code, message)` call works
// completely unchanged from the original functions/src/*.ts.
const STATUS_BY_CODE = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'already-exists': 409,
  'failed-precondition': 412,
  internal: 500,
}

export class HttpsError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
    this.httpStatus = STATUS_BY_CODE[code] || 500
  }
}

export function assertSignedIn(auth) {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.')
  }
}

export function assertStaffOrAbove(auth) {
  assertSignedIn(auth)
  const role = auth.token.role
  if (!role || !['admin', 'cashier', 'staff'].includes(role)) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action.')
  }
}

export function assertAdmin(auth) {
  assertSignedIn(auth)
  if (auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can perform this action.')
  }
}

export function pad(n, width) {
  return String(n).padStart(width, '0')
}

// Wraps an Express handler so it can `throw new HttpsError(...)` or return a
// plain object to send as JSON, exactly like the original onCall functions
// did with `request`/`return` — keeps every ported function body unchanged.
export function callable(handler) {
  return async (req, res) => {
    try {
      const request = { auth: req.auth, data: req.body ?? {} }
      const result = await handler(request)
      res.json(result ?? {})
    } catch (err) {
      if (err instanceof HttpsError) {
        res.status(err.httpStatus).json({ error: { code: err.code, message: err.message } })
      } else {
        console.error('Unhandled error:', err)
        res.status(500).json({ error: { code: 'internal', message: 'Internal server error.' } })
      }
    }
  }
}
