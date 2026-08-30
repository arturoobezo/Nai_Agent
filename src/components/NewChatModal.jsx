import React from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  History,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Compass,
  MessageSquarePlus
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useChatSessions } from '../context/ChatSessionsContext';
import { useTheme } from '../context/ThemeContext';

export default function NewChatModal({ onAfterCreate }) {
  const { workspacePath, workspaceName, recentWorkspaces, openWorkspaceFolder, switchWorkspace } = useWorkspace();
  const { isNewChatModalOpen, closeNewChatModal, createNewSession } = useChatSessions();
  const { isDark } = useTheme();

  if (!isNewChatModalOpen) return null;

  // 1. Current Folder
  const handleUseCurrent = () => {
    createNewSession({
      workspacePath,
      workspaceName,
    });
    closeNewChatModal();
    if (onAfterCreate) onAfterCreate();
  };

  // 2. Select New Folder from OS Dialog
  const handlePickNewFolder = async () => {
    const res = await openWorkspaceFolder();
    if (res && res.folderPath) {
      createNewSession({
        workspacePath: res.folderPath,
        workspaceName: res.folderName,
      });
      closeNewChatModal();
      if (onAfterCreate) onAfterCreate();
    }
  };

  // 3. Pick from Recents
  const handlePickRecent = (recent) => {
    createNewSession({
      workspacePath: recent.path,
      workspaceName: recent.name,
    });
    closeNewChatModal();
    if (onAfterCreate) onAfterCreate();
  };

  // 4. General Chat (No specific folder)
  const handleGeneralChat = () => {
    createNewSession({
      workspacePath: '',
      workspaceName: '',
      title: 'Consultas Generales',
    });
    closeNewChatModal();
    if (onAfterCreate) onAfterCreate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDark
            ? 'bg-[#12121c] border-[#242436] text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-[#242436] bg-[#151522]' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Iniciar Nueva Sesión</h3>
              <p className="text-[11px] text-slate-400">¿En qué carpeta o proyecto deseas trabajar?</p>
            </div>
          </div>

          <button
            onClick={closeNewChatModal}
            className={`p-1.5 rounded-xl border transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1f1f2e] border-[#2d3449]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
            }`}
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Option 1: Current Folder */}
          {workspacePath && (
            <div
              onClick={handleUseCurrent}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99] ${
                isDark
                  ? 'bg-[#181824] hover:bg-[#1f1f30] border-purple-500/40 hover:border-purple-400'
                  : 'bg-purple-50/60 hover:bg-purple-100/70 border-purple-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">{workspaceName}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                      Carpeta Actual
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5" title={workspacePath}>
                    {workspacePath}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform flex-shrink-0 ml-2">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Option 2: Select New Folder from OS */}
          <div
            onClick={handlePickNewFolder}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group active:scale-[0.99] ${
              isDark
                ? 'bg-[#151522] hover:bg-[#1a1a28] border-[#242436] hover:border-indigo-500/40'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold block">Seleccionar Otra Carpeta...</span>
                <p className="text-[11px] text-slate-400">Abre el explorador de Windows para elegir un nuevo proyecto</p>
              </div>
            </div>

            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-2 ${
              isDark ? 'border-[#2d3449] bg-[#1a1a27]' : 'border-slate-200 bg-slate-100'
            }`}>
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>

          {/* Option 3: Recent Folders List */}
          {recentWorkspaces && recentWorkspaces.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Proyectos y Carpetas Recientes:</span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recentWorkspaces.map((recent) => (
                  <div
                    key={recent.path}
                    onClick={() => handlePickRecent(recent)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                      isDark
                        ? 'bg-[#151522] hover:bg-[#1c1c2b] border-[#242436] hover:border-purple-500/30'
                        : 'bg-slate-50 hover:bg-purple-50/50 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FolderOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold block truncate">{recent.name}</span>
                        <span className="text-[10px] text-slate-400 truncate block font-mono">
                          {recent.path}
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Option 4: General Consultation (Without Folder) */}
          <div
            onClick={handleGeneralChat}
            className={`p-3 rounded-xl border border-dashed cursor-pointer transition-all flex items-center justify-between group ${
              isDark
                ? 'border-slate-700/60 hover:bg-[#161623] text-slate-400 hover:text-slate-200'
                : 'border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium">Chat General / Consultas (sin carpeta de proyecto)</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-purple-400 opacity-70 group-hover:opacity-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
