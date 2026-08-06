// src/lib/aiApi.js
// Thin wrappers over callApi (see src/lib/api.js) for the AI Assistant's
// persisted-session endpoints — same one-call-per-line style the rest of the
// app uses for its API calls.
import { callApi } from './api'

export const listAiSessions = () => callApi('listAiSessions', {})
export const createAiSession = () => callApi('createAiSession', {})
export const getAiSessionMessages = (sessionId) => callApi('getAiSessionMessages', { sessionId })
export const renameAiSession = (sessionId, title) => callApi('renameAiSession', { sessionId, title })
export const deleteAiSession = (sessionId) => callApi('deleteAiSession', { sessionId })
export const sendAiChat = (payload) => callApi('aiChat', payload)
