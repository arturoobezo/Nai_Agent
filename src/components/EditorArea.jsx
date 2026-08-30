import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Terminal,
  FileJson,
  Plus,
  X,
  Wand2,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  Sparkles,
  FolderOpen,
  Code2,
  FilePlus2,
  MessageSquare,
  Save,
  FileSpreadsheet,
  Globe,
  Columns2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import SandboxViewer from './SandboxViewer';

function getFileIcon(filename = '') {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.json')) return FileJson;
  if (ext.endsWith('.css')) return FileSpreadsheet;
  if (ext.endsWith('.html') || ext.endsWith('.htm')) return Code2;
  if (ext.endsWith('.md') || ext.endsWith('.txt')) return FileText;
  if (ext.endsWith('.pdf')) return FileText;
  if (/\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i.test(ext)) return ImageIcon;
  return FileCode2;
}

export default function EditorArea({
  isCollapsed,
  onToggleCollapse,
  isSidebarVisible,
  onToggleSidebar,
}) {
  const {
    workspacePath,
    workspaceName,
    openFiles,
    activeFileId,
    setActiveFileId,
    openWorkspaceFolder,
    saveFile,
    updateFileContent,
    closeFile,
    createOrApplyFile,
    viewMode,
    setViewMode,
  } = useWorkspace();

  const { isDark } = useTheme();

  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const tabsContainerRef = useRef(null);
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'info', text: '⚡ [Vite] Servidor de desarrollo listo en http://localhost:5173/' },
    { type: 'success', text: '🚀 [Electron] Sandbox WebView y herramientas de previsualización listas.' },
    { type: 'agent', text: '🤖 [Nai Agent] Espacio de trabajo activo. Cambia entre Editor y Previsualización en cualquier momento.' },
  ]);

  const activeFile = openFiles.find((f) => f.id === activeFileId);

  const handleScrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -160, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 160, behavior: 'smooth' });
    }
  };

  // Keyboard shortcut: Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileId) {
          handleSaveCurrentFile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, activeFile]);

  const handleSaveCurrentFile = async () => {
    if (!activeFileId) return;
    const res = await saveFile(activeFileId);
    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      setTerminalLogs((prev) => [
        ...prev,
        {
          type: 'success',
          text: `💾 [Guardado] Archivo ${activeFile?.name || ''} guardado en disco exitosamente.`,
        },
      ]);
    }
  };

  const handleAddNewFile = async () => {
    const defaultName = `nuevo_script_${openFiles.length + 1}.js`;
    await createOrApplyFile(defaultName, '// Nuevo archivo creado en Nai Agent\n');
  };

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunAgentTask = () => {
    if (!activeFile) return;
    setTerminalLogs((prev) => [
      ...prev,
      {
        type: 'agent',
        text: `🔍 [Nai Agent] Analizando archivo ${activeFile.name}... ¡Sintaxis verificada!`,
      },
    ]);
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors ${
      isDark ? 'bg-[#0f0f18] text-slate-100' : 'bg-[#f4f4f8] text-slate-800'
    }`}>
      {/* Top File Tab Bar & Mode Switcher */}
      <div className={`h-11 border-b flex items-center justify-between px-3 flex-shrink-0 transition-colors ${
        isDark ? 'bg-[#12121c] border-[#242436]' : 'bg-[#ffffff] border-[#e2e8f0]'
      }`}>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 mr-2">
          {/* View Mode Segmented Controls (Editor vs Sandbox vs Split) */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border mr-2 flex-shrink-0 ${
            isDark ? 'bg-[#151522] border-[#242436]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'editor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver Editor de Código"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>

            <button
              onClick={() => setViewMode('sandbox')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'sandbox'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver Sandbox de Previsualización en Vivo"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Previsualización</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista Dividida (Editor + Sandbox)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dividido</span>
            </button>
          </div>

          {/* File Tabs Container with Horizontal Wheel & Scroll Buttons */}
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {openFiles.length > 3 && (
              <button
                onClick={handleScrollLeft}
                className={`p-1 rounded-lg border text-xs flex-shrink-0 transition-colors ${
                  isDark ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title="Desplazar pestañas a la izquierda"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}

            <div
              ref={tabsContainerRef}
              onWheel={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5 scroll-smooth"
            >
              {openFiles.map((file) => {
                const Icon = getFileIcon(file.name);
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setActiveFileId(file.id);
                      if (viewMode === 'sandbox') setViewMode('editor');
                    }}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex-shrink-0 select-none ${
                      isActive
                        ? isDark
                          ? 'bg-[#1b1b28] text-purple-300 border border-purple-500/40 shadow-sm'
                          : 'bg-purple-100 text-purple-800 border border-purple-300 shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-[#151522] border border-transparent'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0 text-purple-500" />
                    <span className="truncate max-w-[120px]" title={file.filePath || file.name}>
                      {file.name}
                    </span>

                    {file.isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Cambios no guardados (Ctrl+S)" />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        closeFile(file.id);
                      }}
                      className={`p-0.5 rounded transition-all ml-1 ${
                        isActive
                          ? 'opacity-90 hover:opacity-100 text-slate-300 hover:text-rose-400 hover:bg-rose-500/20'
                          : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20'
                      }`}
                      title="Cerrar pestaña"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* New Tab Button */}
              <button
                type="button"
                onClick={handleAddNewFile}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a27]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Crear nuevo archivo"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {openFiles.length > 3 && (
              <button
                onClick={handleScrollRight}
                className={`p-1 rounded-lg border text-xs flex-shrink-0 transition-colors ${
                  isDark ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title="Desplazar pestañas a la derecha"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {activeFile && viewMode !== 'sandbox' && (
            <>
              <button
                onClick={handleSaveCurrentFile}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeFile.isDirty
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:bg-amber-600/40 animate-pulse'
                    : isDark
                    ? 'bg-[#151522] text-slate-300 border border-[#242436] hover:bg-[#1b1b28]'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
                title="Guardar archivo en disco (Ctrl+S)"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-purple-500" />
                    <span>Guardar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRunAgentTask}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition-all active:scale-95"
                title="Analizar archivo con IA"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">Analizar</span>
              </button>

              <button
                onClick={handleCopy}
                className={`p-1.5 border rounded-lg text-xs transition-all ${
                  isDark ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title="Copiar contenido"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </>
          )}

          {/* Toggle Right Sidebar Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                !isSidebarVisible
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : isDark
                  ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title={isSidebarVisible ? 'Ocultar menú derecho (Abatir)' : 'Mostrar menú derecho (Desplegar)'}
            >
              {isSidebarVisible ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-white" />
              )}
              <span className="hidden sm:inline">
                {isSidebarVisible ? 'Ocultar Menú' : 'Menú Lateral'}
              </span>
            </button>
          )}

          {/* Collapse/Expand Editor Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 border rounded-lg text-xs transition-all ${
                isDark ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-400 hover:text-purple-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-purple-700'
              }`}
              title={isCollapsed ? 'Expandir editor' : 'Contraer editor (Modo solo Chat)'}
            >
              {isCollapsed ? <PanelRightOpen className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Body: Depends on viewMode */}
      {viewMode === 'sandbox' ? (
        /* Full Sandbox Mode */
        <SandboxViewer onSwitchToEditor={() => setViewMode('editor')} />
      ) : viewMode === 'split' ? (
        /* Split Mode (Editor Left + Sandbox Right) */
        <div className="flex-1 flex flex-row overflow-hidden">
          <div className={`w-1/2 h-full flex flex-col border-r overflow-hidden ${
            isDark ? 'border-[#242436]' : 'border-[#e2e8f0]'
          }`}>
            {renderEditorBody()}
          </div>
          <div className="w-1/2 h-full flex flex-col overflow-hidden">
            <SandboxViewer onSwitchToEditor={() => setViewMode('editor')} />
          </div>
        </div>
      ) : (
        /* Editor Mode */
        renderEditorBody()
      )}
    </div>
  );

  function renderEditorBody() {
    return (
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {openFiles.length > 0 && activeFile ? (
          <div className={`flex-1 flex flex-col overflow-hidden ${
            isDark ? 'bg-[#090d16]' : 'bg-[#ffffff]'
          }`}>
            {activeFile.filePath && (
              <div className={`px-4 py-1.5 border-b text-[11px] font-mono flex items-center justify-between ${
                isDark ? 'bg-[#12121c] border-[#242436] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="truncate" title={activeFile.filePath}>
                  {activeFile.filePath}
                </span>
                {activeFile.isDirty && (
                  <span className="text-[10px] text-amber-500 font-semibold">Modificado (no guardado)</span>
                )}
              </div>
            )}

            {activeFile.isImage || activeFile.isPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                <div className={`p-6 rounded-3xl border shadow-xl flex flex-col items-center max-w-sm ${
                  isDark ? 'bg-[#151522] border-[#242436]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {activeFile.isPdf ? (
                    <FileText className="w-12 h-12 text-red-500 mb-3" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-emerald-500 mb-3" />
                  )}
                  <h4 className="font-bold text-sm mb-1">{activeFile.name}</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    {activeFile.isPdf
                      ? 'Este es un documento PDF físico. Ábrelo en la Previsualización o Vista Dividida para leerlo.'
                      : 'Este archivo es una imagen gráfica. Ábrelo en la Previsualización para verla en alta definición.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('split')}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
                    >
                      Vista Dividida
                    </button>
                    <button
                      onClick={() => setViewMode('sandbox')}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        isDark ? 'bg-[#1b1b28] hover:bg-[#242436] border-[#2d3449] text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                      }`}
                    >
                      Previsualizar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                value={activeFile.content}
                onChange={(e) => updateFileContent(activeFile.id, e.target.value)}
                placeholder="Escribe o edita código aquí..."
                className={`flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-transparent resize-none focus:outline-none select-text ${
                  isDark ? 'text-slate-100 selection:bg-purple-600/40' : 'text-slate-900 selection:bg-purple-200'
                }`}
                spellCheck={false}
              />
            )}
          </div>
        ) : (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${
            isDark ? 'bg-[#0c0c14]' : 'bg-[#f8f9fa]'
          }`}>
            <div className="mb-4 shadow-xl">
              <Logo className="w-14 h-14" />
            </div>

            <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Espacio de Trabajo Listo
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              {workspacePath
                ? `Carpeta activa: ${workspaceName}. Selecciona un archivo o abre el Sandbox para previsualizar.`
                : 'Abre la carpeta de tu proyecto local para editar y previsualizar en el Sandbox.'}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={openWorkspaceFolder}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
              >
                <FolderOpen className="w-4 h-4" />
                <span>{workspacePath ? 'Cambiar Proyecto' : 'Abrir Carpeta / Proyecto'}</span>
              </button>

              <button
                onClick={() => setViewMode('sandbox')}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-medium transition-all ${
                  isDark ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-500" />
                <span>Abrir Sandbox</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating AI Helper Bar */}
        <div className={`absolute right-6 bottom-6 flex items-center gap-2 border backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl text-xs ${
          isDark ? 'bg-[#151522]/90 border-purple-500/30 text-slate-300' : 'bg-white/90 border-purple-200 text-slate-700'
        }`}>
          <Wand2 className="w-4 h-4 text-purple-500 animate-pulse" />
          <span className="font-medium">Nai Code Engine</span>
          <span className="opacity-40">|</span>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5" />
            {showTerminal ? 'Ocultar Terminal' : 'Ver Terminal'}
          </button>
        </div>

        {/* Terminal / Console Drawer */}
        {showTerminal && (
          <div className={`h-44 border-t flex flex-col font-mono flex-shrink-0 transition-colors ${
            isDark ? 'bg-[#0c0c14] border-[#242436]' : 'bg-[#1e1e2d] border-slate-700 text-slate-200'
          }`}>
            <div className={`h-8 px-4 border-b flex items-center justify-between text-xs ${
              isDark ? 'bg-[#12121c] border-[#242436] text-slate-400' : 'bg-[#151522] border-slate-700 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-slate-200">Terminal & Logs del Agente</span>
              </div>
              <button
                onClick={() => setTerminalLogs([])}
                className="text-[11px] hover:text-slate-200 text-slate-400 transition-colors"
              >
                Limpiar
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs select-text">
              {terminalLogs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 select-text ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'agent'
                      ? 'text-purple-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 select-none">&gt;</span>
                  <span className="leading-snug select-text">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
