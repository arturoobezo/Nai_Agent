import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWorkspace } from './WorkspaceContext';

const ChatSessionsContext = createContext(null);

const DEFAULT_WELCOME_MESSAGE = {
  id: 'msg-welcome',
  role: 'assistant',
  content: '¡Hola! Soy **Nai Agent**. Tu entorno de desarrollo con herramientas reales de archivos y múltiples modelos está listo.\n\n¿En qué archivo o tarea te gustaría trabajar hoy?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export function ChatSessionsProvider({ children }) {
  const { workspacePath, workspaceName, switchWorkspace } = useWorkspace();

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('nai_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error loading chat sessions', e);
      }
    }
    return [
      {
        id: 'session-default',
        title: 'Nueva Sesión de Desarrollo',
        workspacePath: localStorage.getItem('nai_workspace_path') || '',
        workspaceName: localStorage.getItem('nai_workspace_name') || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [DEFAULT_WELCOME_MESSAGE],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('nai_active_session_id') || 'session-default';
  });

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Load from Electron IPC storage on mount
  useEffect(() => {
    if (window.electronAPI?.getChatHistory) {
      window.electronAPI.getChatHistory().then((res) => {
        if (res.success && Array.isArray(res.chats) && res.chats.length > 0) {
          setSessions(res.chats);
        }
      }).catch(console.error);
    }
  }, []);

  // Save to localStorage & Electron on change
  useEffect(() => {
    localStorage.setItem('nai_chat_sessions', JSON.stringify(sessions));
    localStorage.setItem('nai_active_session_id', activeSessionId);

    if (window.electronAPI?.saveChatHistory) {
      window.electronAPI.saveChatHistory(sessions).catch(console.error);
    }
  }, [sessions, activeSessionId]);

  const currentSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] || {
      id: 'session-default',
      title: 'Sesión Activa',
      workspacePath: workspacePath || '',
      workspaceName: workspaceName || '',
      messages: [DEFAULT_WELCOME_MESSAGE],
    };

  // Create a new fresh chat session with workspace binding
  const createNewSession = (params = {}) => {
    const customTitle = typeof params === 'string' ? params : params.title;
    const targetWorkspacePath = params.workspacePath !== undefined ? params.workspacePath : workspacePath;
    const targetWorkspaceName = params.workspaceName !== undefined ? params.workspaceName : workspaceName;

    // Switch active workspace if specified
    if (targetWorkspacePath && targetWorkspacePath !== workspacePath) {
      switchWorkspace(targetWorkspacePath, targetWorkspaceName);
    }

    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: customTitle || `Chat ${sessions.length + 1}`,
      workspacePath: targetWorkspacePath || '',
      workspaceName: targetWorkspaceName || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: targetWorkspaceName
            ? `Nueva sesión iniciada en la carpeta **${targetWorkspaceName}**.\n\n¿En qué podemos trabajar hoy?`
            : 'Nueva sesión iniciada. Describe lo que deseas construir o pide análisis de tus archivos.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    return newSession;
  };

  // Switch active session and automatically switch workspace folder
  const switchSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    const target = sessions.find((s) => s.id === sessionId);
    if (target && target.workspacePath && target.workspacePath !== workspacePath) {
      await switchWorkspace(target.workspacePath, target.workspaceName);
    }
  };

  // Update messages in the current session (supports array or functional updater: (prev) => next)
  const updateCurrentSessionMessages = (updater) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const currentMessages = Array.isArray(s.messages) ? s.messages : [];
          const resolvedMessages = typeof updater === 'function' ? updater(currentMessages) : updater;
          const finalMessages = Array.isArray(resolvedMessages) ? resolvedMessages : currentMessages;

          let newTitle = s.title;
          if (s.title.startsWith('Nueva Sesión') || s.title.startsWith('Chat ')) {
            const firstUserMsg = finalMessages.find((m) => m.role === 'user');
            if (firstUserMsg && typeof firstUserMsg.content === 'string') {
              newTitle = firstUserMsg.content.slice(0, 32).trim() + (firstUserMsg.content.length > 32 ? '...' : '');
            }
          }

          return {
            ...s,
            title: newTitle,
            workspacePath: s.workspacePath || workspacePath || '',
            workspaceName: s.workspaceName || workspaceName || '',
            updatedAt: new Date().toISOString(),
            messages: finalMessages,
          };
        }
        return s;
      })
    );
  };

  // Rename session
  const renameSession = (sessionId, newTitle) => {
    if (!newTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s))
    );
  };

  // Delete session
  const deleteSession = (sessionId) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = {
          id: `session-${Date.now()}`,
          title: 'Nueva Sesión',
          workspacePath: workspacePath || '',
          workspaceName: workspaceName || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [DEFAULT_WELCOME_MESSAGE],
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        if (remaining[0].workspacePath && remaining[0].workspacePath !== workspacePath) {
          switchWorkspace(remaining[0].workspacePath, remaining[0].workspaceName);
        }
      }
      return remaining;
    });
  };

  return (
    <ChatSessionsContext.Provider
      value={{
        sessions,
        activeSessionId,
        currentSession,
        createNewSession,
        switchSession,
        updateCurrentSessionMessages,
        renameSession,
        deleteSession,
        isNewChatModalOpen,
        setIsNewChatModalOpen,
        openNewChatModal: () => setIsNewChatModalOpen(true),
        closeNewChatModal: () => setIsNewChatModalOpen(false),
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions() {
  const context = useContext(ChatSessionsContext);
  if (!context) {
    throw new Error('useChatSessions must be used within a ChatSessionsProvider');
  }
  return context;
}
