import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Maximize2,
  Code2,
  AlertCircle,
  Eye,
  Check,
  FileDown,
  Printer,
  FileText,
  Globe,
  FolderOpen,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  FileCode2,
  Layers,
  Link2,
  Lock,
  Search,
  Video,
  Music,
  Film,
  Scissors,
  Languages,
  Subtitles as SubtitlesIcon,
  Play
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

const PRESETS = {
  phone: {
    id: 'phone',
    name: 'Teléfono',
    width: 375,
    height: 812,
    icon: Smartphone,
    frameClass: 'rounded-[40px] border-[10px] border-slate-800 shadow-2xl shadow-black/80',
  },
  tablet: {
    id: 'tablet',
    name: 'Tableta',
    width: 768,
    height: 1024,
    icon: Tablet,
    frameClass: 'rounded-[28px] border-[12px] border-slate-800 shadow-2xl shadow-black/80',
  },
  desktop: {
    id: 'desktop',
    name: 'Monitor (100%)',
    width: '100%',
    height: '100%',
    icon: Monitor,
    frameClass: 'w-full h-full rounded-none border-none shadow-none',
  },
};

const isImageFile = (filename = '') => {
  return /\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i.test(filename);
};

const isPdfFile = (filename = '') => {
  return /\.pdf$/i.test(filename);
};

const isHtmlFile = (filename = '') => {
  return /\.(html|htm)$/i.test(filename);
};

const isMarkdownFile = (filename = '') => {
  return /\.(md|markdown)$/i.test(filename);
};

const isVideoFile = (filename = '') => {
  return /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename);
};

const isAudioFile = (filename = '') => {
  return /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(filename);
};

const isSubtitleFile = (filename = '') => {
  return /\.(srt|vtt)$/i.test(filename);
};

// Flatten tree to get all project files for selection
function flattenTreeFiles(nodes, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    if (node.isDirectory && node.children) {
      flattenTreeFiles(node.children, acc);
    } else if (!node.isDirectory) {
      acc.push(node);
    }
  }
  return acc;
}

export default function SandboxViewer({ customContent, onSwitchToEditor }) {
  const {
    openFiles,
    activeFileId,
    fileTree,
    workspacePath,
    previewTarget,
    setPreviewTarget,
    previewFileInSandbox,
    viewMode,
    setViewMode,
    openSystemPath,
    revealInExplorer,
    extractAudioFromVideo,
    autoTranscribeVideo,
  } = useWorkspace();

  const { isDark } = useTheme();
  const [device, setDevice] = useState('desktop');
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfSaved, setPdfSaved] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [isSyncWithEditor, setIsSyncWithEditor] = useState(!previewTarget);
  const [audioExtractStatus, setAudioExtractStatus] = useState('');
  const webviewRef = useRef(null);

  const activeFile = openFiles.find((f) => f.id === activeFileId);

  // In split mode or when previewTarget is set, prioritize previewTarget
  const currentItem = (!isSyncWithEditor && previewTarget) ? previewTarget : (activeFile ? {
    filePath: activeFile.filePath,
    name: activeFile.name,
    content: activeFile.content,
    isPdf: isPdfFile(activeFile.name),
    isImage: isImageFile(activeFile.name),
    isHtml: isHtmlFile(activeFile.name),
    isMarkdown: isMarkdownFile(activeFile.name),
    isVideo: isVideoFile(activeFile.name),
    isAudio: isAudioFile(activeFile.name),
    isSubtitle: isSubtitleFile(activeFile.name),
  } : previewTarget);

  const fileName = currentItem?.name || 'Documento';
  const filePath = currentItem?.filePath || '';
  const isImage = currentItem?.isImage || isImageFile(fileName);
  const isPdf = currentItem?.isPdf || isPdfFile(fileName);
  const isHtml = currentItem?.isHtml || isHtmlFile(fileName);
  const isMarkdown = currentItem?.isMarkdown || isMarkdownFile(fileName);
  const isVideo = currentItem?.isVideo || isVideoFile(fileName);
  const isAudio = currentItem?.isAudio || isAudioFile(fileName);
  const isSubtitle = currentItem?.isSubtitle || isSubtitleFile(fileName);

  // Load Image Data URL via native IPC whenever filePath or isImage changes
  useEffect(() => {
    let isMounted = true;
    if (isImage && filePath) {
      if (window.electronAPI?.readImageDataUrl) {
        window.electronAPI.readImageDataUrl({ filePath }).then((res) => {
          if (isMounted && res && res.success && res.dataUrl) {
            setImageDataUrl(res.dataUrl);
          }
        }).catch((err) => console.error('Error loading image data url:', err));
      } else {
        const clean = filePath.replace(/\\/g, '/');
        setImageDataUrl(`media-local:///${encodeURI(clean)}`);
      }
    } else {
      setImageDataUrl('');
    }
    return () => { isMounted = false; };
  }, [filePath, isImage]);

  // Compute HTML content for preview
  const getContentToPreview = () => {
    if (customContent) return customContent;
    if (currentItem?.content && typeof currentItem.content === 'string') {
      if (isHtml || currentItem.content.includes('<html') || currentItem.content.includes('<!DOCTYPE')) {
        return currentItem.content;
      }
    }

    if (activeFile && !isPdf && !isImage && !isVideo && !isAudio) {
      if (isHtml) return activeFile.content;

      const escapedContent = (activeFile.content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${activeFile.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#090d16] text-slate-100 p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-4">
    <div class="flex items-center justify-between pb-3 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold">${activeFile.name}</span>
        <span class="text-xs text-slate-500">Vista previa estructurada</span>
      </div>
    </div>
    <div class="p-4 bg-[#070b13] rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
      <pre class="font-mono text-xs text-slate-200 leading-relaxed"><code>${escapedContent}</code></pre>
    </div>
  </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nai Agent Sandbox</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 antialiased">
  <div class="max-w-md w-full p-8 rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-2xl shadow-purple-950/50 text-center space-y-4 backdrop-blur-md">
    <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
      <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
    <h1 class="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-300 bg-clip-text text-transparent">
      Nai Agent Sandbox
    </h1>
    <p class="text-xs text-slate-400 leading-relaxed">
      Previsualizador en tiempo real para páginas Web HTML, documentos PDF, imágenes, video, audio y subtítulos interactivos.
    </p>
  </div>
</body>
</html>`;
  };

  const updatePreview = async () => {
    if (isImage || isVideo || isAudio) return; // Handled directly by native players
    setIsUpdating(true);
    const content = getContentToPreview();
    const targetFilePath = currentItem?.filePath || activeFile?.filePath || '';

    let basePath = workspacePath || '';
    if (targetFilePath) {
      const lastSlash = Math.max(targetFilePath.lastIndexOf('/'), targetFilePath.lastIndexOf('\\'));
      if (lastSlash !== -1) {
        basePath = targetFilePath.substring(0, lastSlash);
      }
    }

    if (window.electronAPI?.updateSandbox) {
      try {
        const res = await window.electronAPI.updateSandbox({
          name: fileName || 'index.html',
          fullContent: isPdf ? '' : content,
          html: isPdf ? '' : content,
          basePath,
          filePath: targetFilePath,
        });
        if (res.success && res.url) {
          setSandboxUrl(res.url);
          if (webviewRef.current && webviewRef.current.reload) {
            webviewRef.current.reload();
          }
        }
      } catch (err) {
        console.error('Error updating sandbox:', err);
      }
    }
    setIsUpdating(false);
  };

  useEffect(() => {
    updatePreview();
  }, [currentItem, activeFileId, customContent, isSyncWithEditor]);

  // Open with System App
  const handleOpenInBrowser = async () => {
    const targetPath = filePath || currentItem?.filePath || activeFile?.filePath;
    if (targetPath) {
      await openSystemPath(targetPath);
    } else if (sandboxUrl) {
      await window.electronAPI?.openExternal?.(sandboxUrl);
    }
  };

  // Quick Audio Extraction
  const handleQuickExtractAudio = async () => {
    if (!filePath) return;
    setAudioExtractStatus('🎵 Extrayendo audio MP3 con FFmpeg...');
    const res = await extractAudioFromVideo(filePath);
    if (res.success) {
      setAudioExtractStatus(`¡Audio guardado: ${res.filename}!`);
      setTimeout(() => setAudioExtractStatus(''), 3000);
    } else {
      setAudioExtractStatus(`Error: ${res.error}`);
      setTimeout(() => setAudioExtractStatus(''), 4000);
    }
  };

  const currentPreset = PRESETS[device] || PRESETS.desktop;
  const allWorkspaceFiles = flattenTreeFiles(fileTree);
  const filteredWorkspaceFiles = allWorkspaceFiles.filter((f) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSelectPreviewFile = (file) => {
    setIsSyncWithEditor(false);
    previewFileInSandbox(file.path, file.name);
    setShowFilePicker(false);
  };

  const handleToggleSync = () => {
    const nextSync = !isSyncWithEditor;
    setIsSyncWithEditor(nextSync);
    if (nextSync && activeFile) {
      previewFileInSandbox(activeFile.filePath, activeFile.name);
    }
  };

  return (
    <div className={`h-full flex flex-col font-sans transition-colors select-none ${
      isDark ? 'bg-[#090d16] text-slate-100' : 'bg-[#f4f4f8] text-slate-800'
    }`}>
      {/* ========================================================= */}
      {/* Top Universal Toolbar & File Switcher */}
      {/* ========================================================= */}
      <div className={`h-11 px-3 border-b flex items-center justify-between gap-2 flex-shrink-0 transition-colors z-30 ${
        isDark ? 'bg-[#0e1322] border-[#242436]' : 'bg-[#ffffff] border-[#e2e8f0]'
      }`}>
        {/* Left Side: Independent Project File Dropdown & Sync Toggle */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* File Selector Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilePicker((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all max-w-[200px] sm:max-w-[280px] truncate ${
                showFilePicker
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : isDark
                  ? 'bg-[#151522] hover:bg-[#1b1b28] text-purple-300 border-[#2d3449]'
                  : 'bg-white hover:bg-purple-50 text-purple-900 border-slate-200'
              }`}
              title="Seleccionar qué archivo ver en el Sandbox"
            >
              {isPdf ? (
                <FileText className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              ) : isImage ? (
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isVideo ? (
                <Video className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              ) : isAudio ? (
                <Music className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              )}
              <span className="truncate font-mono text-[11px]">{fileName}</span>
              <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${showFilePicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu for Workspace Files */}
            {showFilePicker && (
              <div className={`absolute top-full left-0 mt-1.5 w-72 rounded-2xl border shadow-2xl p-2 z-50 animate-fadeIn ${
                isDark ? 'bg-[#12121c] border-[#242436] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {/* Header & Sync Toggle */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/30 px-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Archivos del Proyecto
                  </span>
                  <button
                    onClick={handleToggleSync}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold flex items-center gap-1 transition-all ${
                      isSyncWithEditor
                        ? 'bg-purple-600 text-white border-purple-500'
                        : isDark
                        ? 'bg-[#1b1b28] text-slate-400 border-slate-700'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Link2 className="w-2.5 h-2.5" />
                    <span>{isSyncWithEditor ? 'Sincronizado' : 'Independiente'}</span>
                  </button>
                </div>

                {/* Search in Files */}
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar archivos..."
                    className={`w-full pl-7 pr-2 py-1 text-xs rounded-xl border focus:outline-none focus:border-purple-500 ${
                      isDark ? 'bg-[#0c0c14] border-[#242436] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Files List */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {filteredWorkspaceFiles.length > 0 ? (
                    filteredWorkspaceFiles.map((file) => {
                      const isSel = (currentItem?.filePath === file.path);
                      const isPd = isPdfFile(file.name);
                      const isImg = isImageFile(file.name);
                      const isVid = isVideoFile(file.name);
                      const isAud = isAudioFile(file.name);
                      const isHt = isHtmlFile(file.name);

                      return (
                        <button
                          key={file.id || file.path}
                          onClick={() => handleSelectPreviewFile(file)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left truncate transition-colors ${
                            isSel
                              ? isDark ? 'bg-purple-950/60 text-purple-300 font-semibold' : 'bg-purple-100 text-purple-900 font-semibold'
                              : isDark ? 'hover:bg-[#1b1b28] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isPd ? 'bg-red-400' : isImg ? 'bg-emerald-400' : isVid ? 'bg-purple-400' : isAud ? 'bg-amber-400' : isHt ? 'bg-orange-400' : 'bg-blue-400'
                            }`} />
                            <span className="truncate font-mono text-[11px]">{file.name}</span>
                          </div>
                          {isSel && <Check className="w-3 h-3 text-purple-400 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-slate-500 px-2 block py-1">No se encontraron archivos</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Type Badge */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 flex-shrink-0 ${
            isPdf
              ? isDark ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200'
              : isImage
              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : isVideo
              ? isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'
              : isAudio
              ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200'
              : isSubtitle
              ? isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              : isHtml
              ? isDark ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-100 text-orange-700 border border-orange-200'
              : isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200'
          }`}>
            {isPdf ? 'PDF' : isImage ? 'Imagen HD' : isVideo ? 'Video MP4' : isAudio ? 'Audio' : isSubtitle ? 'Subtítulos' : isHtml ? 'HTML' : 'Vista'}
          </span>
        </div>

        {/* Center: Device Mode Selectors (Mobile, Tablet, Desktop) for HTML */}
        {!isImage && !isVideo && !isAudio && !isSubtitle && (
          <div className={`flex items-center gap-0.5 p-0.5 rounded-xl border mr-2 flex-shrink-0 ${
            isDark ? 'bg-[#151522] border-[#242436]' : 'bg-slate-100 border-slate-200'
          }`}>
            {Object.values(PRESETS).map((p) => {
              const Icon = p.icon;
              const isSelected = device === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setDevice(p.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Cambiar vista a ${p.name}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{p.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right Side: Zoom Controls for Images or Standard Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isImage ? (
            /* Image Zoom Bar */
            <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${
              isDark ? 'bg-[#151522] border-[#242436]' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setImageZoom((z) => Math.max(0.25, z - 0.25))}
                className="p-1 rounded-lg hover:bg-black/20"
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setImageZoom(1)}
                className="px-1.5 text-[10px] font-mono font-semibold"
                title="Restablecer zoom a 100%"
              >
                {Math.round(imageZoom * 100)}%
              </button>
              <button
                onClick={() => setImageZoom((z) => Math.min(4, z + 0.25))}
                className="p-1 rounded-lg hover:bg-black/20"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isVideo || isAudio ? (
            <button
              onClick={handleQuickExtractAudio}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                isDark ? 'bg-[#151522] hover:bg-[#1b1b28] text-purple-300 border-[#2d3449]' : 'bg-white hover:bg-purple-50 text-purple-900 border-slate-200'
              }`}
              title="Extraer pista de audio en formato MP3"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Extraer MP3</span>
            </button>
          ) : (
            <button
              onClick={updatePreview}
              disabled={isUpdating}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark ? 'text-slate-400 hover:text-purple-300 hover:bg-[#151522] border-[#242436]' : 'text-slate-600 hover:text-purple-700 hover:bg-slate-100 border-slate-200'
              }`}
              title="Recargar vista previa"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Reveal in Explorer */}
          {filePath && (
            <button
              onClick={() => revealInExplorer(filePath)}
              className={`p-1.5 rounded-lg border transition-all ${
                isDark ? 'bg-[#151522] hover:bg-[#1b1b28] text-slate-400 border-[#242436]' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Mostrar archivo en el Explorador de Windows"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open in External Browser / Viewer Button */}
          <button
            onClick={handleOpenInBrowser}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
              isPdf
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                : isImage
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : isVideo || isAudio
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
            }`}
            title="Abrir este archivo en el Navegador o Reproductor de Windows"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir</span>
          </button>
        </div>
      </div>

      {/* Status toast for quick actions */}
      {audioExtractStatus && (
        <div className="bg-purple-600 text-white text-xs font-semibold text-center py-1 px-3 shadow-md animate-fadeIn">
          {audioExtractStatus}
        </div>
      )}

      {/* ========================================================= */}
      {/* Main Canvas / Media Player Area */}
      {/* ========================================================= */}
      <div className={`flex-1 overflow-auto flex items-center justify-center p-3 relative ${
        isDark ? 'bg-[#060911]' : 'bg-slate-200/70'
      }`}>
        {isImage ? (
          /* ===================================================== */
          /* NATIVE IMAGE VIEWER WITH DATA URL & TRANSPARENCY GRID */
          /* ===================================================== */
          <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-4 select-none relative">
            <div
              style={{
                backgroundImage: `linear-gradient(45deg, #181824 25%, transparent 25%), linear-gradient(-45deg, #181824 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181824 75%), linear-gradient(-45deg, transparent 75%, #181824 75%)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
              className="p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex items-center justify-center max-w-full max-h-full overflow-auto"
            >
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt={fileName}
                  style={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg drop-shadow-2xl"
                />
              ) : (
                <div className="p-8 flex flex-col items-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Cargando imagen...</span>
                </div>
              )}
            </div>

            {/* Bottom info pill */}
            <div className={`mt-3 px-3 py-1 rounded-full border text-[11px] font-mono flex items-center gap-3 ${
              isDark ? 'bg-[#12121c] border-[#242436] text-slate-400' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              <span>📁 {fileName}</span>
              <span>🔍 Zoom: {Math.round(imageZoom * 100)}%</span>
            </div>
          </div>
        ) : isVideo ? (
          /* ===================================================== */
          /* NATIVE HTML5 VIDEO PLAYER WITH SUBTITLES SUPPORT */
          /* ===================================================== */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 max-w-4xl mx-auto space-y-3">
            <div className="w-full rounded-3xl overflow-hidden shadow-2xl bg-black border border-slate-800 flex items-center justify-center relative group">
              <video
                key={`video-${filePath}`}
                controls
                controlsList="nodownload"
                crossOrigin="anonymous"
                src={filePath ? `http://127.0.0.1:54321/media?fullPath=${encodeURIComponent(filePath)}&t=${Date.now()}` : ''}
                className="w-full max-h-[68vh] object-contain rounded-2xl bg-black"
              >
                {/* Companion WebVTT Subtitle Track if available */}
                <track
                  kind="subtitles"
                  src={`http://127.0.0.1:54321/media?fullPath=${encodeURIComponent(filePath.replace(/\.[^.]+$/, '_subtitulos.vtt'))}`}
                  srcLang="es"
                  label="Subtítulos"
                  default
                />
                <track
                  kind="subtitles"
                  src={`http://127.0.0.1:54321/media?fullPath=${encodeURIComponent(filePath.replace(/\.[^.]+$/, '.vtt'))}`}
                  srcLang="es"
                  label="Subtítulos Alt"
                />
                Tu navegador no soporta reproducción directa de video.
              </video>
            </div>

            {/* Video Action Bar */}
            <div className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
              isDark ? 'bg-[#12121c] border-[#242436] text-slate-300' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="font-mono text-xs font-semibold truncate" title={fileName}>{fileName}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleQuickExtractAudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  title="Extraer pista de audio en formato MP3"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Extraer MP3</span>
                </button>
              </div>
            </div>
          </div>
        ) : isAudio ? (
          /* ===================================================== */
          /* NATIVE AUDIO PLAYER */
          /* ===================================================== */
          <div className="w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-5 text-center bg-[#12121c] border-[#242436] text-slate-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <Music className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-bold text-sm truncate" title={fileName}>{fileName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pista de Audio Local</p>
            </div>

            <audio
              key={`audio-${filePath}`}
              controls
              src={filePath ? `http://127.0.0.1:54321/media?fullPath=${encodeURIComponent(filePath)}&t=${Date.now()}` : ''}
              className="w-full"
            />
          </div>
        ) : isSubtitle ? (
          /* ===================================================== */
          /* SUBTITLES INSPECTOR & TIMECODES */
          /* ===================================================== */
          <div className="w-full h-full p-4 overflow-y-auto max-w-3xl mx-auto space-y-3 font-mono text-xs">
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-[#12121c] border-[#242436]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <SubtitlesIcon className="w-4 h-4 text-indigo-400" />
                <span className="font-bold">{fileName}</span>
              </div>
              <span className="text-[10px] text-slate-400">Archivo de Subtítulos Sincronizados</span>
            </div>

            <div className={`p-4 rounded-2xl border overflow-x-auto ${
              isDark ? 'bg-[#0a0d16] border-[#242436] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <pre className="leading-relaxed whitespace-pre-wrap">{currentItem?.content || 'Cargando subtítulos...'}</pre>
            </div>
          </div>
        ) : device === 'desktop' ? (
          /* ===================================================== */
          /* FULL DESKTOP WEB / PDF / HTML VIEW */
          /* ===================================================== */
          <div className={`w-full h-full rounded-xl overflow-hidden shadow-2xl border ${
            isDark ? 'bg-white border-[#242436]' : 'bg-white border-slate-300'
          }`}>
            {sandboxUrl ? (
              // @ts-ignore
              <webview
                ref={webviewRef}
                src={sandboxUrl}
                plugins="true"
                allowpopups="true"
                webpreferences="allowRunningInsecureContent, javascript=yes, webgl=yes, contextIsolation=no"
                className="w-full h-full border-none"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            )}
          </div>
        ) : (
          /* ===================================================== */
          /* DEVICE SIMULATION (PHONE / TABLET FRAME) */
          /* ===================================================== */
          <div
            style={{
              width: `${currentPreset.width}px`,
              height: `${currentPreset.height}px`,
              maxHeight: '92%',
            }}
            className={`relative bg-white overflow-hidden transition-all duration-300 ${currentPreset.frameClass}`}
          >
            {/* Phone Notch */}
            {device === 'phone' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-slate-950 mr-2" />
                <div className="w-8 h-1 rounded-full bg-slate-800" />
              </div>
            )}

            {/* Tablet Speaker */}
            {device === 'tablet' && (
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rounded-full z-20 pointer-events-none" />
            )}

            {/* Webview Content */}
            {sandboxUrl && (
              // @ts-ignore
              <webview
                ref={webviewRef}
                src={sandboxUrl}
                plugins="true"
                allowpopups="true"
                webpreferences="allowRunningInsecureContent, javascript=yes, webgl=yes, contextIsolation=no"
                className="w-full h-full border-none"
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
