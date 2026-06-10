import { useState } from 'react'

function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'user',
      content: "What's the best-selling motorcycle model predicted for next month?",
      timestamp: '09:41 AM'
    },
    {
      id: 2,
      type: 'ai',
      content: "Based on current market trends and historical performance analyzed via our Random Forest Classifier model, I predict the Honda Click 125 will be the best-selling model for next month.",
      projectedUnits: 482,
      confidenceScore: 94.2,
      trendUp: 12,
      timestamp: '09:41 AM'
    }
  ])
  
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    
    const newUserMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setMessages(prev => [...prev, newUserMessage])
    setInputMessage('')
    setIsTyping(true)
    
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: "Based on my analysis of the current inventory levels and historical sales data, I recommend increasing stock for the Honda Click 125 by 15% to meet the projected demand. Would you like me to generate a purchase order?",
        projectedUnits: 482,
        confidenceScore: 94.2,
        trendUp: 12,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const forecastData = [
    { name: 'Honda Click 125', forecast: 85, trend: '+12%', trendType: 'up', color: 'primary', image: '🏍️' },
    { name: 'Ducati Panigale', forecast: 45, trend: 'Stable', trendType: 'stable', color: 'secondary', image: '🏍️' },
    { name: 'Yamaha Mio', forecast: 78, trend: '+8%', trendType: 'up', color: 'primary', image: '🛵' },
    { name: 'Kawasaki Ninja', forecast: 32, trend: '-3%', trendType: 'down', color: 'secondary', image: '🏍️' }
  ]

  const flaggedRisks = [
    { type: 'Low Stock Alert', description: 'Click 125 Red: < 5 units', severity: 'Critical', icon: '⚠️' },
    { type: 'Low Stock Alert', description: 'Ducati Panigale: < 3 units', severity: 'Critical', icon: '⚠️' },
    { type: 'High Risk Customer', description: 'Application ID #882', severity: 'Manual Review', icon: '👤' }
  ]

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion)
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="flex h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-2xl">smart_toy</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Online · Ready to help
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md mr-3 flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                  </div>
                )}
                
                <div className={`max-w-3xl ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-2xl px-5 py-3 shadow-sm`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  {message.projectedUnits && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Projected Units</p>
                        <p className="text-xl font-bold text-gray-800 mt-1">{message.projectedUnits} Units</p>
                        <p className="text-[11px] text-green-600 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-xs">trending_up</span> +{message.trendUp}% MoM
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence Score</p>
                        <p className="text-xl font-bold text-gray-800 mt-1">{message.confidenceScore}%</p>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${message.confidenceScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-3">{message.timestamp}</p>
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0">
                    <span className="material-symbols-outlined text-gray-600 text-sm">person</span>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md mr-3">
                  <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              <button 
                onClick={() => handleSuggestionClick("What's the forecast for next month?")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">query_stats</span>
                Forecast Demand
              </button>
              <button 
                onClick={() => handleSuggestionClick("What are the current risks in my inventory?")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">report_problem</span>
                Check Risk
              </button>
              <button 
                onClick={() => handleSuggestionClick("How can I optimize my stock levels?")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                Optimize Stock
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all" 
                  placeholder="Ask AI anything about your inventory..." 
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <button 
                onClick={handleSendMessage}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col overflow-y-auto">
          {/* Demand Forecast */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">analytics</span>
                Demand Forecast
              </h3>
              <button className="text-xs text-blue-600 hover:text-blue-700">View All</button>
            </div>
            <div className="space-y-3">
              {forecastData.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.image}</span>
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    </div>
                    <span className={`text-xs font-semibold ${
                      item.trendType === 'up' ? 'text-green-600' : 
                      item.trendType === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {item.trend}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color === 'primary' ? 'bg-blue-600' : 'bg-gray-400'}`} 
                         style={{ width: `${item.forecast}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{item.forecast}% confidence</p>
                </div>
              ))}
            </div>
          </div>

          {/* Flagged Risks */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                Flagged Risks
              </h3>
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {flaggedRisks.length}
              </span>
            </div>
            <div className="space-y-2">
              {flaggedRisks.map((risk, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-2">
                    <span className="text-base">{risk.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-800">{risk.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{risk.description}</p>
                      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 ${
                        risk.severity === 'Critical' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Status */}
          <div className="p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <span className="material-symbols-outlined text-sm">neurology</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Model Status</p>
                  <p className="text-sm font-medium">Random Forest V2.4</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Accuracy</span>
                  <span className="font-semibold">94.2%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-green-400 h-full rounded-full" style={{ width: '94.2%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>Last Retrained: 4h ago</span>
                  <span className="flex items-center gap-1 text-green-400">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    Optimal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom-2 {
          from { transform: translateY(8px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation-duration: 0.3s;
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fade-in;
        }
        .slide-in-from-bottom-2 {
          animation-name: slide-in-from-bottom-2;
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  )
}

export default AIAssistant