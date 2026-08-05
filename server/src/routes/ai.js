import { Router } from 'express'
import { HttpsError, assertStaffOrAbove, callable } from '../shared.js'

const router = Router()

// Stub for ai-chat.php's Ollama/gemma3 integration. Returns a friendly
// placeholder so the UI keeps working; swap in a hosted LLM call here when
// one is chosen.
router.post('/aiChat', callable(async (request) => {
  assertStaffOrAbove(request.auth)
  const { message } = request.data ?? {}

  if (!message || !String(message).trim()) {
    throw new HttpsError('invalid-argument', 'message is required.')
  }

  return {
    reply:
      "Hi! 👋 The AI Assistant is coming soon. It'll be able to analyze your " +
      'inventory, payments, and sales trends once it\'s connected. For now, check ' +
      'the Dashboard and Predictive Analytics pages for insights.',
  }
}))

export default router
