import { Router } from 'express'
import { HttpsError, assertStaffOrAbove, callable } from '../shared.js'

const router = Router()

const SYSTEM_PROMPT =
  'You are the Euro Motor AI Assistant, embedded in a motorcycle dealership\'s ' +
  'inventory/sales management system (Euro Motor Shop). Staff use you to ask ' +
  'about inventory, payments, customers, and sales trends. You do not have ' +
  'live access to their database in this conversation, so never invent ' +
  'specific numbers, names, or figures — if asked for real current data, tell ' +
  'them to check the Dashboard or Predictive Analytics pages, and offer to ' +
  'help interpret data they paste in or explain general concepts instead. ' +
  'Keep replies concise and practical.'

// Chat is otherwise stateless per-request (no server-side session), so the
// client resends prior turns as `history` on every call — this trims it to a
// sane window/size before it's forwarded, since it's client-controlled input.
const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 4000

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
}

// Replaces ai-chat.php's Ollama/gemma3 integration. Calls OpenRouter's
// chat-completions API server-side (key never reaches the browser), mirroring
// the same auth + error-handling pattern as every other route here.
router.post('/aiChat', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const { message, history } = request.data ?? {}

  if (!message || !String(message).trim()) {
    throw new HttpsError('invalid-argument', 'message is required.')
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'AI Assistant is not configured yet.')
  }

  let response
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://euro-motor-shop.onrender.com',
        'X-Title': 'Euro Motor Shop AI Assistant',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...sanitizeHistory(history),
          { role: 'user', content: String(message).trim().slice(0, MAX_MESSAGE_CHARS) },
        ],
      }),
    })
  } catch (err) {
    console.error('OpenRouter request failed:', err)
    throw new HttpsError('internal', 'Could not reach the AI service.')
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('OpenRouter error:', response.status, detail)
    throw new HttpsError('internal', 'The AI service returned an error.')
  }

  const data = await response.json()
  const reply = data?.choices?.[0]?.message?.content?.trim()

  return { reply: reply || "I didn't quite catch that — could you rephrase?" }
}))

export default router
