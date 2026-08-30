import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  FolderPlus,
  FilePlus,
  FolderTree,
  File,
  Code2,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

function getFileIcon(extension = '') {
  const ext = extension.toLowerCase();
  switch (ext) {
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
      return <FileCode className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
    case '.json':
      return <FileJson className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
    case '.html':
    case '.htm':
      return <Code2 className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />;
    case '.css':
      return <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />;
    case '.md':
    case '.txt':
      return <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />;
    case '.py':
      return <FileCode className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
    case '.pdf':
      return <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
    case '.ico':
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    default:
      return <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  }
}

function TreeNode({ node, depth = 0 }) {
  const { openFileInEditor, previewFileInSandbox, viewMode, activeFileId } = useWorkspace();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(depth === 0);

  const isSelected = activeFileId === node.path;
  const ext = (node.extension || '').toLowerCase();
  const isPdf = ext === '.pdf';
  const isImage = /\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i.test(ext || node.name);
  const isHtml = ext === '.html' || ext === '.htm';

  if (node.isDirectory) {
    return (
      <div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs transition-colors group ${
            isDark ? 'hover:bg-[#1a1a27] text-slate-300' : 'hover:bg-purple-50 text-slate-700'
          }`}
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-slate-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-400" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-purple-500/80 flex-shrink-0" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </div>

        {isOpen && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <TreeNode key={child.id || child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleClick = () => {
    if (isPdf || isImage) {
      previewFileInSandbox(node.path);
    } else {
      openFileInEditor(node.path, node.name);
      if (viewMode === 'sandbox') {
        previewFileInSandbox(node.path);
      }
    }
  };

  const handleQuickPreview = (e) => {
    e.stopPropagation();
    previewFileInSandbox(node.path);
  };

  return (
    <div
      onClick={handleClick}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
      className={`group flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer text-xs transition-all ${
        isSelected
          ? isDark
            ? 'bg-[#1b1b28] text-purple-300 font-semibold border border-purple-500/40'
            : 'bg-purple-100 text-purple-800 font-semibold border border-purple-300'
          : isPdf
          ? isDark
            ? 'text-red-300/90 hover:text-red-200 hover:bg-red-950/30'
            : 'text-red-700 hover:text-red-800 hover:bg-red-50'
          : isImage
          ? isDark
            ? 'text-emerald-300/90 hover:text-emerald-200 hover:bg-emerald-950/30'
            : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
          : isDark
          ? 'text-slate-400 hover:text-slate-200 hover:bg-[#151522]'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
      title={node.relativePath || node.path}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {getFileIcon(node.extension)}
        <span className="truncate font-mono text-[11px]">{node.name}</span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Quick Preview Button */}
        <button
          onClick={handleQuickPreview}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-purple-400 transition-opacity"
          title="Previsualizar en Sandbox"
        >
          <Eye className="w-3 h-3" />
        </button>

        {isPdf && (
          <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
            isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
          }`}>
            PDF
          </span>
        )}
        {isImage && (
          <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
            isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            IMG
          </span>
        )}
      </div>
    </div>
  );
}

export default function FileExplorer() {
  const {
    workspacePath,
    workspaceName,
    fileTree,
    isLoadingTree,
    openWorkspaceFolder,
    refreshTree,
    createOrApplyFile,
  } = useWorkspace();

  const { isDark } = useTheme();
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFileSubmit = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    await createOrApplyFile(newFileName.trim(), '// Nuevo archivo creado\n');
    setNewFileName('');
    setIsCreatingFile(false);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden font-sans select-none ${
      isDark ? 'bg-[#12121c] text-slate-200' : 'bg-[#ffffff] text-slate-800'
    }`}>
      {/* Header with Title and Actions */}
      <div className={`h-11 px-3 border-b flex items-center justify-between flex-shrink-0 ${
        isDark ? 'border-[#242436] bg-[#12121c]' : 'border-[#e2e8f0] bg-[#ffffff]'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <FolderTree className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span className="font-bold text-xs truncate">
            {workspaceName ? workspaceName.toUpperCase() : 'EXPLORADOR'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsCreatingFile(true)}
            className={`p-1 rounded-lg border transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27] border-[#242436]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
            title="Crear nuevo archivo"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => refreshTree()}
            className={`p-1 rounded-lg border transition-colors ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1a1a27] border-[#242436]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
            title="Refrescar árbol de archivos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* New File Inline Input */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 border-b border-[#242436] bg-purple-950/20 flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="nombre_archivo.html"
            className="flex-1 px-2 py-1 text-xs rounded-lg bg-black/40 border border-purple-500/50 text-slate-200 font-mono focus:outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
          >
            Crear
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFile(false)}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {fileTree && fileTree.length > 0 ? (
          fileTree.map((node) => <TreeNode key={node.id || node.path} node={node} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <FolderOpen className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <p className="text-xs text-slate-400 mb-3">No hay carpeta de proyecto abierta</p>
            <button
              onClick={openWorkspaceFolder}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
            >
              Abrir Carpeta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
