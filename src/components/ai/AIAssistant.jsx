import { useState, useRef, useEffect, useCallback } from 'react'
import { read, utils } from 'xlsx'
import { listAiSessions, createAiSession, getAiSessionMessages, renameAiSession, deleteAiSession, sendAiChat } from '../../lib/aiApi'
import AISessionSidebar from './AISessionSidebar'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_FILE_CSV_CHARS = 12000 // keeps the request within the server's per-message cap

const GREETING = {
  id: 'greeting',
  type: 'assistant',
  content: "Hi! I'm your Euro Motor AI Assistant. Ask me about inventory, payments, customers, or sales trends — I can look up live data and I'll remember context from our past chats.",
  timestamp: '',
}

function formatTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date()
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Parses the first sheet of an uploaded workbook into CSV text the model can
// read directly — cheaper and simpler than sending the binary file itself,
// and works for .xlsx/.xls/.csv alike since SheetJS normalizes all three.
async function parseSpreadsheet(file) {
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  let csv = utils.sheet_to_csv(sheet)
  let truncated = false
  if (csv.length > MAX_FILE_CSV_CHARS) {
    csv = csv.slice(0, MAX_FILE_CSV_CHARS)
    truncated = true
  }
  return { csv, truncated }
}

function AIAssistant() {
  const [sessions, setSessions] = useState([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [messages, setMessages] = useState([GREETING])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null) // { name, csv, truncated }
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [fileError, setFileError] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  const refreshSessions = useCallback(async () => {
    const result = await listAiSessions()
    setSessions(result.sessions || [])
    return result.sessions || []
  }, [])

  const openSession = useCallback(async (sessionId) => {
    setActiveSessionId(sessionId)
    setIsLoadingMessages(true)
    try {
      const result = await getAiSessionMessages(sessionId)
      const loaded = (result.messages || []).map((m) => ({
        id: m.id,
        type: m.role,
        content: m.content,
        timestamp: formatTime(m.createdAt),
      }))
      setMessages(loaded.length > 0 ? loaded : [GREETING])
    } catch (error) {
      console.error('Failed to load chat messages:', error)
      setMessages([GREETING])
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // On mount: load the session list and open the most recently active one,
  // if any — this is what makes chat history survive a refresh/new visit.
  useEffect(() => {
    (async () => {
      setIsLoadingSessions(true)
      try {
        const loaded = await refreshSessions()
        if (loaded.length > 0) {
          await openSession(loaded[0].id)
        }
      } catch (error) {
        console.error('Failed to load chat sessions:', error)
      } finally {
        setIsLoadingSessions(false)
      }
    })()
  }, [refreshSessions, openSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  const handleNewChat = () => {
    setActiveSessionId(null)
    setMessages([GREETING])
    setInputMessage('')
    setAttachedFile(null)
  }

  const handleRenameSession = async (sessionId, title) => {
    try {
      await renameAiSession(sessionId, title)
      await refreshSessions()
    } catch (error) {
      console.error('Failed to rename chat:', error)
    }
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteAiSession(sessionId)
      if (sessionId === activeSessionId) {
        handleNewChat()
      }
      await refreshSessions()
    } catch (error) {
      console.error('Failed to delete chat:', error)
    }
  }

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return

    const userMessage = inputMessage.trim()
    const file = attachedFile

    const displayContent = file
      ? `📎 ${file.name}${userMessage ? `\n${userMessage}` : ''}`
      : userMessage

    // The model only sees the CSV as plain text in the message body — there's
    // no separate file-upload concept on the OpenRouter chat-completions API.
    const apiContent = file
      ? `Uploaded file "${file.name}"${file.truncated ? ' (truncated to first rows)' : ''}:\n\`\`\`csv\n${file.csv}\n\`\`\`\n\n${userMessage || 'Please analyze this data.'}`
      : userMessage

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== 'greeting'),
      { id: Date.now(), type: 'user', content: displayContent, timestamp: formatTime() },
    ])
    setInputMessage('')
    setAttachedFile(null)
    setIsLoading(true)

    try {
      let sessionId = activeSessionId
      if (!sessionId) {
        const created = await createAiSession()
        sessionId = created.sessionId
        setActiveSessionId(sessionId)
      }

      const result = await sendAiChat({ sessionId, message: apiContent })

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'assistant', content: result.reply || "I didn't understand that.", timestamp: formatTime() },
      ])
      await refreshSessions()
    } catch (error) {
      console.error('Error:', error)
      const detail = error?.message ? ` (${error.message})` : ''
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'assistant', content: `Error connecting to the AI service${detail}. Please try again.`, timestamp: formatTime() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setFileError('')

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setFileError('Only .xlsx, .xls, or .csv files are supported.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File is too large (max 5MB).')
      return
    }

    setIsParsingFile(true)
    try {
      const { csv, truncated } = await parseSpreadsheet(file)
      setAttachedFile({ name: file.name, csv, truncated })
    } catch (error) {
      console.error('Failed to parse spreadsheet:', error)
      setFileError('Could not read that file — is it a valid spreadsheet?')
    } finally {
      setIsParsingFile(false)
    }
  }

  const activeTitle = sessions.find((s) => s.id === activeSessionId)?.title || 'New chat'

  return (
    <div className="ai-assistant-page flex h-screen bg-[#fafafa]">
      <AISessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isLoading={isLoadingSessions}
        onSelectSession={openSession}
        onNewChat={handleNewChat}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="px-6 py-4 flex items-center gap-2.5 shrink-0">
          <span className="material-symbols-outlined text-brand-red text-xl">auto_awesome</span>
          <span className="text-sm font-medium text-gray-700 truncate">{activeTitle}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">
            {isLoadingMessages ? (
              <div className="text-center text-sm text-gray-400 py-12">Loading conversation…</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={message.type === 'user' ? 'flex justify-end' : ''}>
                  {message.type === 'user' ? (
                    <div className="max-w-[75%] bg-brand-navy text-white rounded-2xl px-4 py-2.5">
                      <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : (
                    <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="material-symbols-outlined text-base animate-pulse-slow text-brand-red">auto_awesome</span>
                Thinking…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-6 pt-2 shrink-0">
          <div className="max-w-2xl mx-auto">
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs text-gray-700 w-fit">
                <span className="material-symbols-outlined text-sm">description</span>
                <span className="font-medium">{attachedFile.name}</span>
                {attachedFile.truncated && <span className="text-gray-400">(truncated)</span>}
                <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-gray-700">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
            {fileError && <p className="text-xs text-red-500 mb-2">{fileError}</p>}

            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm focus-within:border-brand-navy/40 focus-within:ring-1 focus-within:ring-brand-navy/20 transition-colors">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Write a message..."
                rows="1"
                className="w-full bg-transparent text-gray-800 px-5 pt-4 pb-2 resize-none focus:outline-none text-[15px]"
                style={{ minHeight: '28px', maxHeight: '160px' }}
              />
              <div className="flex items-center justify-between px-3 pb-3 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                  title="Attach spreadsheet (.xlsx, .xls, .csv)"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  <span className={`material-symbols-outlined text-xl ${isParsingFile ? 'animate-spin' : ''}`}>
                    {isParsingFile ? 'progress_activity' : 'add'}
                  </span>
                </button>
                <button
                  onClick={sendMessage}
                  disabled={isLoading || isParsingFile || (!inputMessage.trim() && !attachedFile)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-navy text-white disabled:bg-gray-200 disabled:text-gray-400 hover:bg-brand-navy-deep transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              AI can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 1.4s ease-in-out infinite;
        }
        .ai-assistant-page .material-symbols-outlined {
          font-size: 18px;
        }
      `}</style>
    </div>
  )
}

export default AIAssistant
