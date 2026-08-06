import { FieldValue } from 'firebase-admin/firestore'
import { chatCompletion } from './openrouter.js'

// Only actually calls the LLM every EXTRACT_EVERY_N_MESSAGES messages in a
// session (user+assistant turns combined) — bounds the extra cost to a
// fraction of normal chat turns rather than one extra call per message.
const EXTRACT_EVERY_N_MESSAGES = 8
const MAX_FACTS_CHARS = 2000

const MEMORY_SYSTEM_PROMPT =
  'You maintain a short-term memory profile for one user of a motorcycle ' +
  'dealership AI assistant. Given their prior notes plus a recent slice of ' +
  'conversation, output an updated, deduplicated bullet list (max 15 bullets) ' +
  'of durable facts worth remembering across sessions: their role/focus area, ' +
  'preferred terminology, recurring question patterns, stated preferences. ' +
  'Do NOT include specific transient figures (balances, counts, prices, ' +
  'dates) — those go stale. Output only the bullet list, one fact per line ' +
  'starting with "- ", nothing else.'

export function buildMemoryBlock(facts) {
  if (!facts || !String(facts).trim()) return ''
  return (
    'Known context about this user from past conversations (use for tone ' +
    'and relevance, not as a substitute for calling a tool when precise ' +
    `current data is needed):\n${String(facts).trim()}`
  )
}

// Fire-and-forget from routes/ai.js — never awaited before the chat response
// is sent, so it can never add latency to a user-facing reply. Safe because
// this runs on a long-lived Render process, not a Cloud Function that
// freezes execution once the response is returned.
export async function maybeExtractMemory({ db, uid, sessionRef, messageCount }) {
  if (messageCount % EXTRACT_EVERY_N_MESSAGES !== 0) return

  const [recentSnap, memoryDoc] = await Promise.all([
    sessionRef.collection('messages').orderBy('createdAt', 'desc').limit(20).get(),
    db.collection('aiUserMemory').doc(uid).get(),
  ])
  const recent = recentSnap.docs
    .reverse()
    .map((d) => `${d.data().role}: ${d.data().content}`)
    .join('\n')
  if (!recent) return

  const priorFacts = memoryDoc.exists ? memoryDoc.data().facts || '' : ''

  const completion = await chatCompletion({
    model: process.env.OPENROUTER_MEMORY_MODEL || process.env.OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: MEMORY_SYSTEM_PROMPT },
      { role: 'user', content: `Prior notes:\n${priorFacts || '(none yet)'}\n\nRecent conversation:\n${recent}` },
    ],
  })

  const facts = completion?.choices?.[0]?.message?.content?.trim().slice(0, MAX_FACTS_CHARS)
  if (!facts) return

  await db.collection('aiUserMemory').doc(uid).set(
    { facts, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  )
}
