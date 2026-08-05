import { useState, useRef, useEffect } from 'react'
import { callApi } from '../../lib/api'

const aiChatFn = (payload) => callApi('aiChat', payload)

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
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    const userMessage = inputMessage.trim()
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    
    setInputMessage('')
    setIsLoading(true)
    
    try {
      const result = await aiChatFn({ message: userMessage })

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

  const handleSuggestion = (text) => {
    setInputMessage(text)
    inputRef.current?.focus()
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
                    
                    {message.projectedUnits && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Projected Units</p>
                          <p className="text-lg font-bold text-gray-800">{message.projectedUnits} Units</p>
                          <p className="text-xs text-green-600">+{message.trendUp}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Confidence</p>
                          <p className="text-lg font-bold text-gray-800">{message.confidenceScore}%</p>
                          <div className="w-full bg-gray-200 h-1 rounded-full mt-1">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${message.confidenceScore}%` }}></div>
                          </div>
                        </div>
                      </div>
                    )}
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

      {/* Suggestions */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleSuggestion("What's the forecast for next month?")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              📊 Forecast
            </button>
            <button
              onClick={() => handleSuggestion("Show me inventory stocks")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              📦 Inventory
            </button>
            <button
              onClick={() => handleSuggestion("What are pending payments?")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              💰 Payments
            </button>
            <button
              onClick={() => handleSuggestion("Who are top customers?")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              👥 Top Customers
            </button>
            <button
              onClick={() => handleSuggestion("Export sales report to excel")}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors whitespace-nowrap"
            >
              📎 Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white pb-4">
        <div className="max-w-3xl mx-auto px-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything..."
              rows="1"
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
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