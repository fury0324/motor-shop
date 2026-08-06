import { useState } from 'react'
import Swal from '../../lib/swal'

// Small relative-time formatter — no date library is used elsewhere in this
// app (see src/lib/), so this stays a plain helper rather than pulling one
// in for a single label.
function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(isoString).toLocaleDateString()
}

function AISessionSidebar({ sessions, activeSessionId, isLoading, onSelectSession, onNewChat, onRenameSession, onDeleteSession }) {
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  const startRename = (session) => {
    setEditingId(session.id)
    setEditingTitle(session.title)
  }

  const commitRename = async () => {
    const title = editingTitle.trim()
    if (title && editingId) {
      await onRenameSession(editingId, title)
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const handleDelete = async (session) => {
    const result = await Swal.fire({
      title: 'Delete this chat?',
      text: `"${session.title}" and its full history will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#0b1c30',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    })
    if (result.isConfirmed) {
      await onDeleteSession(session.id)
    }
  }

  return (
    <div className="w-72 shrink-0 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-brand-red text-white text-sm font-medium py-2.5 hover:bg-brand-red-dark transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-gray-400">Loading chats…</div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-400">No chats yet — start one above.</div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((session) => (
              <li key={session.id} className="group">
                {editingId === session.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-brand-navy/30 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex flex-col gap-0.5 transition-colors border-l-2 ${
                      session.id === activeSessionId
                        ? 'bg-red-50 border-brand-red'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm text-gray-800 font-medium truncate">{session.title}</span>
                      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            startRename(session)
                          }}
                          className="material-symbols-outlined text-sm text-gray-400 hover:text-brand-navy p-0.5"
                        >
                          edit
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(session)
                          }}
                          className="material-symbols-outlined text-sm text-gray-400 hover:text-brand-red p-0.5"
                        >
                          delete
                        </span>
                      </span>
                    </div>
                    {session.lastMessagePreview && (
                      <span className="text-xs text-gray-400 truncate">{session.lastMessagePreview}</span>
                    )}
                    <span className="text-[10px] text-gray-300">{formatRelativeTime(session.updatedAt)}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AISessionSidebar
