import { useState, useRef, useEffect } from 'react'
import { read, utils } from 'xlsx'
import { callApi } from '../../lib/api'

const aiChatFn = (payload) => callApi('aiChat', payload)

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_FILE_CSV_CHARS = 12000 // keeps the request within the server's per-message cap

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
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hi! I'm your Euro Motor AI Assistant. Ask me about inventory, payments, customers, or sales trends.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null) // { name, csv, truncated }
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [fileError, setFileError] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return

    const userMessage = inputMessage.trim()
    const file = attachedFile
    // Chat is stateless server-side, so prior turns are resent as history on
    // every call — captured from state before the new message is appended.
    const history = messages.map((m) => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))

    const displayContent = file
      ? `📎 ${file.name}${userMessage ? `\n${userMessage}` : ''}`
      : userMessage

    // The model only sees the CSV as plain text in the message body — there's
    // no separate file-upload concept on the OpenRouter chat-completions API.
    const apiContent = file
      ? `Uploaded file "${file.name}"${file.truncated ? ' (truncated to first rows)' : ''}:\n\`\`\`csv\n${file.csv}\n\`\`\`\n\n${userMessage || 'Please analyze this data.'}`
      : userMessage

    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: displayContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])

    setInputMessage('')
    setAttachedFile(null)
    setIsLoading(true)

    try {
      const result = await aiChatFn({ message: apiContent, history })

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: result.reply || "I didn't understand that.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: "Error connecting to the AI service. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
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

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h1 className="text-gray-800 font-semibold">Euro Motor AI Assistant</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Ready to help
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>Ask me anything about your business</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                  </div>
                )}
                
                <div className={`flex-1 ${message.type === 'user' ? 'max-w-[70%]' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-2">{message.timestamp}</p>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-gray-600 text-sm">person</span>
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white pb-4 pt-3">
        <div className="max-w-3xl mx-auto px-4">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 w-fit">
              <span className="material-symbols-outlined text-sm">description</span>
              <span className="font-medium">{attachedFile.name}</span>
              {attachedFile.truncated && <span className="text-blue-400">(truncated)</span>}
              <button onClick={() => setAttachedFile(null)} className="text-blue-400 hover:text-blue-700">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
          {fileError && <p className="text-xs text-red-500 mb-2">{fileError}</p>}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything, or attach a spreadsheet..."
              rows="1"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl pl-11 pr-12 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingFile}
              title="Attach spreadsheet (.xlsx, .xls, .csv)"
              className="absolute left-2 bottom-2 p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
            >
              <span className={`material-symbols-outlined text-lg ${isParsingFile ? 'animate-spin' : ''}`}>
                {isParsingFile ? 'progress_activity' : 'attach_file'}
              </span>
            </button>
            <button
              onClick={sendMessage}
              disabled={isLoading || isParsingFile || (!inputMessage.trim() && !attachedFile)}
              className="absolute right-2 bottom-2 p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            AI can make mistakes. Check important information.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        .material-symbols-outlined {
          font-size: 18px;
        }
      `}</style>
    </div>
  )
}

export default AIAssistant