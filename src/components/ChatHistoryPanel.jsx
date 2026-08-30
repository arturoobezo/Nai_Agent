import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  History,
  Calendar,
  Layers,
  Sparkles,
  Folder
} from 'lucide-react';
import { useChatSessions } from '../context/ChatSessionsContext';
import { useTheme } from '../context/ThemeContext';

export default function ChatHistoryPanel({ onSwitchToChat }) {
  const {
    sessions,
    activeSessionId,
    openNewChatModal,
    switchSession,
    renameSession,
    deleteSession,
  } = useChatSessions();

  const { isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter((s) =>
    (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.workspaceName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (e, sessionId) => {
    e.stopPropagation();
    renameSession(sessionId, editTitle);
    setEditingId(null);
  };

  const handleSelectSession = async (sessionId) => {
    await switchSession(sessionId);
    if (onSwitchToChat) onSwitchToChat();
  };

  const handleNewChat = () => {
    openNewChatModal();
    if (onSwitchToChat) onSwitchToChat();
  };

  return (
    <div className={`h-full flex flex-col p-3 space-y-3 overflow-hidden font-sans transition-colors ${
      isDark ? 'text-slate-200' : 'text-slate-800'
    }`}>
      {/* Top Header */}
      <div className={`flex items-center justify-between pb-2 border-b flex-shrink-0 ${
        isDark ? 'border-[#242436]' : 'border-[#e2e8f0]'
      }`}>
        <div>
          <h2 className={`text-xs font-bold flex items-center gap-1.5 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <History className="w-4 h-4 text-purple-500" />
            Historial de Sesiones
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {sessions.length} {sessions.length === 1 ? 'conversación guardada' : 'conversaciones guardadas'}
          </p>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por título o carpeta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors ${
            isDark
              ? 'bg-[#0c0c14] border-[#242436] text-slate-100'
              : 'bg-white border-[#cbd5e1] text-slate-900 shadow-sm'
          }`}
        />
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;
            const dateStr = session.updatedAt
              ? new Date(session.updatedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Reciente';

            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-[#1b1b28] border-purple-500/60 shadow-md shadow-purple-950/40 text-purple-300'
                      : 'bg-purple-100/70 border-purple-300 shadow-sm text-purple-900'
                    : isDark
                    ? 'bg-[#12121c] border-[#242436] hover:border-purple-500/40 hover:bg-[#181824]'
                    : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1.5 flex-1 mr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        className="bg-black/30 border border-purple-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                      />
                      <button
                        onClick={(e) => handleSaveRename(e, session.id)}
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-semibold truncate flex-1 mr-2 ${
                        isActive
                          ? isDark ? 'text-purple-300' : 'text-purple-900'
                          : isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                      title={session.title}
                    >
                      {session.title || 'Chat sin título'}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                      <button
                        onClick={(e) => handleStartRename(e, session)}
                        className="p-1 text-slate-400 hover:text-purple-400 rounded"
                        title="Renombrar chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                      title="Eliminar chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Workspace Folder Badge */}
                {session.workspaceName ? (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border max-w-full truncate ${
                      isDark
                        ? 'bg-purple-950/40 border-purple-800/40 text-purple-300'
                        : 'bg-purple-50 border-purple-200 text-purple-700'
                    }`}
                    title={session.workspacePath}
                  >
                    <Folder className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{session.workspaceName}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono">Sin carpeta asignada</div>
                )}

                <div className="flex items-center justify-between text-[10px] opacity-60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dateStr}
                  </span>
                  <span>{session.messages?.length || 0} mensajes</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <MessageSquare className="w-7 h-7 opacity-40 mb-2" />
            <p className="text-xs">No se encontraron sesiones.</p>
          </div>
        )}
      </div>
    </div>
  );
}
