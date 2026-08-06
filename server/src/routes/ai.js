import { Router } from 'express'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, assertStaffOrAbove, callable } from '../shared.js'
import { chatCompletion } from '../openrouter.js'
import { toolsForRole, executeTool } from '../aiTools.js'
import { maybeExtractMemory, buildMemoryBlock } from '../aiMemory.js'
import { aiRateLimiter } from '../aiRateLimit.js'

const router = Router()

const BASE_SYSTEM_PROMPT =
  'You are the Euro Motor AI Assistant, embedded in a motorcycle dealership\'s ' +
  'inventory/sales management system (Euro Motor Shop). Staff use you to ask ' +
  'about inventory, payments, customers, and sales trends. You have tool ' +
  'access to live data — customers, inventory, transactions, parts sales, and ' +
  'dashboard metrics (and, for admins, staff accounts). Call the relevant ' +
  'tool before stating any real name, figure, or count; never guess or ' +
  'invent one. If a tool returns no match or an error, say so plainly ' +
  'instead of making something up. Keep replies concise and practical.'

// History now lives in Firestore (aiChatSessions/{id}/messages), not a
// client-supplied array — trusting client-echoed history would let a user
// inject fabricated "assistant" turns that later get summarized into their
// own permanent memory (aiMemory.js). These caps now bound what's read back
// out of Firestore and sent to OpenRouter, same purpose as before.
const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 4000
const MAX_CURRENT_MESSAGE_CHARS = 16000
const MAX_TOOL_ROUNDS = 3
const MAX_TOOL_RESULT_CHARS = 6000
const MAX_SESSIONS_RETURNED = 50
const MAX_MESSAGES_RETURNED = 200
const MAX_TITLE_CHARS = 80

function clampText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function toIso(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  return null
}

function titleFromMessage(message) {
  const trimmed = message.trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'New chat'
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed
}

// Every session-scoped endpoint below relies on this to keep each user's
// chat history isolated: a session can only ever be read/renamed/deleted/
// chatted-in by the uid that owns it. Returns `not-found` rather than
// `permission-denied` so probing a foreign sessionId can't even confirm it
// exists.
async function assertOwnsSession(db, sessionId, uid) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new HttpsError('invalid-argument', 'sessionId is required.')
  }
  const doc = await db.collection('aiChatSessions').doc(sessionId).get()
  if (!doc.exists || doc.data().uid !== uid) {
    throw new HttpsError('not-found', 'Chat session not found.')
  }
  return doc
}

router.post('/listAiSessions', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const snap = await db.collection('aiChatSessions')
    .where('uid', '==', request.auth.uid)
    .orderBy('updatedAt', 'desc')
    .limit(MAX_SESSIONS_RETURNED)
    .get()

  return {
    sessions: snap.docs.map((d) => {
      const s = d.data()
      return {
        id: d.id,
        title: s.title || 'New chat',
        lastMessagePreview: s.lastMessagePreview || '',
        updatedAt: toIso(s.updatedAt),
      }
    }),
  }
}))

router.post('/createAiSession', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const ref = await db.collection('aiChatSessions').add({
    uid: request.auth.uid,
    title: 'New chat',
    messageCount: 0,
    lastMessagePreview: '',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { sessionId: ref.id }
}))

router.post('/getAiSessionMessages', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const { sessionId } = request.data ?? {}
  const sessionDoc = await assertOwnsSession(db, sessionId, request.auth.uid)

  const snap = await sessionDoc.ref
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(MAX_MESSAGES_RETURNED)
    .get()

  return {
    messages: snap.docs.map((d) => {
      const m = d.data()
      return { id: d.id, role: m.role, content: m.content, createdAt: toIso(m.createdAt) }
    }),
  }
}))

router.post('/renameAiSession', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const { sessionId, title } = request.data ?? {}
  const sessionDoc = await assertOwnsSession(db, sessionId, request.auth.uid)

  const clean = clampText(title, MAX_TITLE_CHARS)
  if (!clean) throw new HttpsError('invalid-argument', 'title is required.')

  await sessionDoc.ref.update({ title: clean, updatedAt: FieldValue.serverTimestamp() })
  return { success: true }
}))

router.post('/deleteAiSession', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const db = getFirestore()
  const { sessionId } = request.data ?? {}
  const sessionDoc = await assertOwnsSession(db, sessionId, request.auth.uid)

  // Same manual-cascade pattern as deleteInventoryItem's `units` subcollection
  // (server/src/routes/inventory.js) — Firestore doesn't auto-cascade deletes.
  const messagesSnap = await sessionDoc.ref.collection('messages').limit(500).get()
  const batch = db.batch()
  for (const doc of messagesSnap.docs) batch.delete(doc.ref)
  batch.delete(sessionDoc.ref)
  await batch.commit()

  return { success: true }
}))

function roleNote(role) {
  if (role === 'admin') {
    return 'You are assisting an admin — you may also use the staff-account tools (list_users, get_user_summary).'
  }
  return (
    'You are assisting a cashier/staff user — staff-account management tools ' +
    'are not available in this session. If asked about other staff/admin ' +
    'accounts, say that account management is outside what you can access here.'
  )
}

function buildSystemPrompt(role, memoryFacts) {
  let prompt = `${BASE_SYSTEM_PROMPT}\n\n${roleNote(role)}`
  const memoryBlock = buildMemoryBlock(memoryFacts)
  if (memoryBlock) prompt += `\n\n${memoryBlock}`
  return prompt
}

// Replaces ai-chat.php's Ollama/gemma3 integration. Calls OpenRouter's
// chat-completions API server-side (key never reaches the browser), now with
// persisted history, live-database tool access, and cross-session memory.
router.post('/aiChat', aiRateLimiter, callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const { uid, token } = request.auth
  const role = token.role
  const { sessionId, message } = request.data ?? {}

  if (!message || !String(message).trim()) {
    throw new HttpsError('invalid-argument', 'message is required.')
  }
  if (!process.env.OPENROUTER_API_KEY) {
    throw new HttpsError('failed-precondition', 'AI Assistant is not configured yet.')
  }

  const db = getFirestore()
  const sessionDoc = await assertOwnsSession(db, sessionId, uid)
  const sessionRef = sessionDoc.ref
  const priorSession = sessionDoc.data()
  const cleanMessage = clampText(message, MAX_CURRENT_MESSAGE_CHARS)

  const [historySnap, memoryDoc] = await Promise.all([
    sessionRef.collection('messages').orderBy('createdAt', 'desc').limit(MAX_HISTORY_MESSAGES).get(),
    db.collection('aiUserMemory').doc(uid).get(),
  ])
  const history = historySnap.docs
    .reverse()
    .map((d) => ({ role: d.data().role, content: clampText(d.data().content, MAX_MESSAGE_CHARS) }))

  await sessionRef.collection('messages').add({
    role: 'user',
    content: cleanMessage,
    createdAt: FieldValue.serverTimestamp(),
  })

  const systemPrompt = buildSystemPrompt(role, memoryDoc.exists ? memoryDoc.data().facts : '')
  const tools = toolsForRole(role)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: cleanMessage },
  ]

  let reply = ''
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const forceFinal = round === MAX_TOOL_ROUNDS
      const completion = await chatCompletion({
        messages,
        tools: forceFinal ? undefined : tools,
        toolChoice: forceFinal ? undefined : 'auto',
      })

      const choice = completion?.choices?.[0]?.message
      if (!choice) {
        throw new HttpsError('internal', 'The AI service returned an unexpected response.')
      }

      const toolCalls = choice.tool_calls
      if (!forceFinal && Array.isArray(toolCalls) && toolCalls.length > 0) {
        messages.push({ role: 'assistant', content: choice.content || null, tool_calls: toolCalls })
        for (const call of toolCalls) {
          let args = {}
          try {
            args = JSON.parse(call.function.arguments || '{}')
          } catch {
            args = {}
          }
          // Re-checks the role gate again inside executeTool (defense in
          // depth) — never trusts that the model only called tools it was
          // actually offered for this role.
          const result = await executeTool(db, role, call.function.name, args)
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: clampText(JSON.stringify(result), MAX_TOOL_RESULT_CHARS),
          })
        }
        continue
      }

      reply = (choice.content || '').trim()
      break
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('OpenRouter request failed:', err)
    throw new HttpsError('internal', 'Could not reach the AI service.')
  }

  if (!reply) reply = "I didn't quite catch that — could you rephrase?"

  const now = FieldValue.serverTimestamp()
  await sessionRef.collection('messages').add({ role: 'assistant', content: reply, createdAt: now })

  const newMessageCount = (priorSession.messageCount || 0) + 2
  const updates = {
    updatedAt: now,
    messageCount: newMessageCount,
    lastMessagePreview: clampText(reply, 140),
  }
  if (!priorSession.title || priorSession.title === 'New chat') {
    updates.title = titleFromMessage(cleanMessage)
  }
  await sessionRef.update(updates)

  // Fire-and-forget: never awaited, so it can't add latency to this response.
  maybeExtractMemory({ db, uid, sessionRef, messageCount: newMessageCount }).catch((err) => {
    console.error('Memory extraction failed:', err)
  })

  return { reply }
}))

export default router
