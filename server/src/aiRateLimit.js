// Pragmatic in-memory sliding-window limiter for the AI chat endpoint only —
// this is the one route that triggers persistent Firestore writes plus up to
// several paid OpenRouter calls per request, and the app has no rate
// limiting anywhere else. In-memory (no Redis) is acceptable here: this runs
// as a single Render instance, and losing the window on a rare restart just
// resets everyone's quota rather than causing any correctness issue.
const WINDOW_MS = 5 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 20

const callTimestampsByUid = new Map()

export function aiRateLimiter(req, res, next) {
  const uid = req.auth?.uid
  if (!uid) return next() // unauthenticated requests are rejected downstream by assertStaffOrAbove

  const now = Date.now()
  const recent = (callTimestampsByUid.get(uid) || []).filter((t) => now - t < WINDOW_MS)

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: {
        code: 'resource-exhausted',
        message: 'Too many AI requests — please wait a few minutes and try again.',
      },
    })
    return
  }

  recent.push(now)
  callTimestampsByUid.set(uid, recent)
  next()
}
