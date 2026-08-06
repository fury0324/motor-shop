const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Thin wrapper around OpenRouter's chat-completions endpoint, shared by the
// live chat loop (routes/ai.js) and the background memory-extraction call
// (aiMemory.js) so both share one place for auth headers/error handling
// instead of duplicating the fetch() call.
export async function chatCompletion({ messages, tools, toolChoice, model }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.')
  }

  const body = {
    model: model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    messages,
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = toolChoice || 'auto'
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://euro-motor-shop.onrender.com',
      'X-Title': 'Euro Motor Shop AI Assistant',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`OpenRouter error ${response.status}: ${detail}`)
  }

  return response.json()
}
