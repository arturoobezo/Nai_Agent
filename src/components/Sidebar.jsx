import React from 'react';
import {
  MessageSquareCode,
  Sliders,
  RefreshCw,
  PanelRightClose,
  X,
  FolderTree,
  History,
  FolderOpen,
  Sun,
  Moon,
  Radio,
  Sparkles,
  Bot
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import FileExplorer from './FileExplorer';
import ChatHistoryPanel from './ChatHistoryPanel';
import ProviderSettings from './ProviderSettings';
import IntegrationsPanel from './IntegrationsPanel';
import SkillsPanel from './SkillsPanel';
import Logo from './Logo';
import { useAI } from '../context/AIContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { useSkills } from '../context/SkillsContext';

const TAB_METADATA = {
  chat: { title: 'Chat con el Agente', icon: MessageSquareCode },
  files: { title: 'Explorador de Archivos', icon: FolderTree },
  history: { title: 'Historial de Sesiones', icon: History },
  skills: { title: 'Habilidades Especializadas (Skills)', icon: Sparkles },
  providers: { title: 'Modelos & Proveedores IA', icon: Sliders },
  integrations: { title: 'Conexiones & Nube', icon: Radio },
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  onToggleOpen,
  onSelectTab,
}) {
  const { activeProvider, providers } = useAI();
  const { workspaceName, workspacePath, openWorkspaceFolder } = useWorkspace();
  const { theme, toggleTheme, isDark } = useTheme();
  const { activeSkillIds } = useSkills();
  const currentConfig = providers[activeProvider] || {};

  const handleTabClick = (tabKey) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    } else {
      if (isOpen && activeTab === tabKey) {
        onToggleOpen();
      } else {
        setActiveTab(tabKey);
        if (!isOpen) onToggleOpen();
      }
    }
  };

  const ActiveIcon = TAB_METADATA[activeTab]?.icon || MessageSquareCode;

  return (
    <div className="flex h-full w-full overflow-hidden select-none">
      {/* ========================================================= */}
      {/* 1. SLIDING CONTENT DRAWER (Left of the Icon Dock) */}
      {/* ========================================================= */}
      {isOpen && (
        <aside className={`flex-1 h-full flex flex-col border-r transition-colors overflow-hidden ${
          isDark ? 'bg-[#12121c] text-slate-200 border-[#242436]' : 'bg-[#ffffff] text-slate-800 border-[#e2e8f0]'
        }`}>
          {/* Drawer Header: Title & Close Button */}
          <div className={`h-12 px-3 flex items-center justify-between border-b transition-colors flex-shrink-0 ${
            isDark ? 'border-[#242436] bg-[#151522]/80' : 'border-[#e2e8f0] bg-slate-50'
          }`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ActiveIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <h3 className="font-bold text-xs sm:text-sm truncate">
                {TAB_METADATA[activeTab]?.title || 'Panel'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Provider Badge */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border max-w-[110px] truncate ${
                  currentConfig.status === 'connected'
                    ? isDark
                      ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : currentConfig.status === 'checking'
                    ? isDark
                      ? 'bg-amber-950/40 border-amber-800/40 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                    : isDark
                    ? 'bg-rose-950/40 border-rose-800/40 text-rose-400'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
                title={currentConfig.name || 'Sin conexión'}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  currentConfig.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
                }`}></span>
                <span className="truncate">{currentConfig.name || 'Offline'}</span>
              </div>

              {/* Close Drawer Button */}
              <button
                onClick={onToggleOpen}
                className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27] border-[#242436]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
                }`}
                title="Cerrar panel (Abatir)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'files' && <FileExplorer />}
            {activeTab === 'history' && (
              <ChatHistoryPanel onSwitchToChat={() => setActiveTab('chat')} />
            )}
            {activeTab === 'skills' && (
              <SkillsPanel onApplyQuickPrompt={() => setActiveTab('chat')} />
            )}
            {activeTab === 'providers' && <ProviderSettings />}
            {activeTab === 'integrations' && <IntegrationsPanel />}
          </div>

          {/* Workspace Footer Bar */}
          <div className={`h-9 px-2.5 border-t flex items-center justify-between text-xs transition-colors flex-shrink-0 ${
            isDark ? 'border-[#242436] bg-[#12121c] text-slate-400' : 'border-[#e2e8f0] bg-[#ffffff] text-slate-600'
          }`}>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <FolderOpen className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span className="truncate text-[11px]" title={workspacePath || 'Sin carpeta abierta'}>
                {workspaceName || 'Sin carpeta abierta'}
              </span>
            </div>

            <button
              onClick={openWorkspaceFolder}
              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-semibold flex-shrink-0 ml-1.5"
            >
              {workspacePath ? 'Cambiar' : 'Abrir'}
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================= */}
      {/* 2. VERTICAL ACTIVITY DOCK (Far Right Vertical Icon Strip) */}
      {/* ========================================================= */}
      <nav className={`w-12 h-full flex-shrink-0 flex flex-col items-center justify-between py-3 transition-colors border-l z-20 ${
        isDark ? 'bg-[#0f0f18] border-[#242436]' : 'bg-[#ffffff] border-[#e2e8f0]'
      }`}>
        {/* Top: Logo */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => handleTabClick('chat')}
            className="p-1 rounded-xl hover:scale-105 transition-transform"
            title="Nai Agent"
          >
            <Logo className="w-7 h-7" />
          </button>
        </div>

        {/* Middle: Icon Tabs */}
        <div className="flex flex-col items-center gap-2">
          {/* Chat */}
          <button
            onClick={() => handleTabClick('chat')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'chat'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="💬 Chat con el Agente"
          >
            <MessageSquareCode className="w-4 h-4" />
            {isOpen && activeTab === 'chat' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Files */}
          <button
            onClick={() => handleTabClick('files')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'files'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="📁 Explorador de Archivos"
          >
            <FolderTree className="w-4 h-4" />
            {isOpen && activeTab === 'files' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>

          {/* History */}
          <button
            onClick={() => handleTabClick('history')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="🕒 Historial de Conversaciones"
          >
            <History className="w-4 h-4" />
            {isOpen && activeTab === 'history' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Skills (Habilidades Especializadas) */}
          <button
            onClick={() => handleTabClick('skills')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'skills'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title={`✨ Habilidades (Skills) - ${activeSkillIds.length} activas`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            {activeSkillIds.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
            {isOpen && activeTab === 'skills' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Models */}
          <button
            onClick={() => handleTabClick('providers')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'providers'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="🧠 Modelos & Proveedores IA"
          >
            <Sliders className="w-4 h-4" />
            {isOpen && activeTab === 'providers' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>

          {/* Integrations */}
          <button
            onClick={() => handleTabClick('integrations')}
            className={`relative p-2.5 rounded-xl transition-all active:scale-95 group ${
              isOpen && activeTab === 'integrations'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-500/40'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-purple-50'
            }`}
            title="🔗 Conexiones & Nube (Drive, Dropbox, WhatsApp, etc.)"
          >
            <Radio className="w-4 h-4" />
            {isOpen && activeTab === 'integrations' && (
              <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-3.5 bg-white rounded-r-full" />
            )}
          </button>
        </div>

        {/* Bottom: Status dot & Theme Toggle */}
        <div className="flex flex-col items-center gap-2">
          {/* Theme Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              isDark
                ? 'bg-[#1a1a27] hover:bg-[#242436] border-[#2d3449] text-amber-300'
                : 'bg-[#ede9fe] hover:bg-[#ddd6fe] border-[#c4b5fd] text-purple-700'
            }`}
            title={isDark ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </nav>
    </div>
  );
}
