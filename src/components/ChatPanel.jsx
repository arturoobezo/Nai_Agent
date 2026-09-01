import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Paperclip,
  RefreshCw,
  Plus,
  FileCode2,
  Check,
  Copy,
  FolderOpen,
  ArrowUpRight,
  Code,
  Globe,
  ExternalLink,
  Search,
  BookOpen,
  FileText,
  FolderPlus,
  ArrowRightLeft,
  Eye,
  Download,
  FolderSync,
  Wand2,
  Terminal,
  FileDown,
  MessageSquare,
  Phone,
  Cloud,
  Box,
  Mic,
  MicOff,
  Volume2,
  Square,
  Palette,
  ImageIcon,
  Maximize2,
  Minimize2,
  MoreVertical
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useChatSessions } from '../context/ChatSessionsContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';
import { useIntegrations } from '../context/IntegrationsContext';
import { useSkills } from '../context/SkillsContext';
import Logo from './Logo';

// Helper to convert plain text or markdown to clean styled HTML for PDF generation
function markdownToStyledHtml(text, title = 'Documento') {
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-800 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 mt-6 mb-3 border-b pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-950 mb-4">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-purple-500 pl-3 my-2 text-slate-600 bg-slate-50 p-2 rounded-r">$1</blockquote>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-slate-700 my-0.5">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-slate-700 my-0.5">$1</li>')
    .replace(/\n\n/gim, '</p><p class="my-2 text-slate-700 leading-relaxed">')
    .replace(/\n/gim, '<br/>');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { margin: 15mm; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #ffffff; color: #1e293b; line-height: 1.6; }
    h1, h2, h3 { font-family: 'Geist', -apple-system, sans-serif; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 600; color: #0f172a; }
  </style>
</head>
<body class="p-8 max-w-4xl mx-auto">
  <div class="mb-6 pb-4 border-b border-slate-200 flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
      <span class="text-xs text-slate-400">Generado por Nai Agent • ${new Date().toLocaleDateString()}</span>
    </div>
  </div>
  <div class="prose max-w-none">
    <p class="my-2 text-slate-700 leading-relaxed">${html}</p>
  </div>
</body>
</html>`;
}

function parseAgentMessage(text) {
  const actions = [];
  let cleanedText = text || '';

  // 0. Filter thinking tags and common reasoning preambles from visible text
  cleanedText = cleanedText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^(?:(?:Here'?s\s+(?:a\s+)?thinking\s+process|Thinking\s+Process|Thought\s+Process|Proceso\s+de\s+pensamiento)[\s\S]*?(?:\n\n---\n\n|\n\n(?=[A-Z#*¡¿])|(?:\n\n)?(?=```)|$))/i, '')
    .trim();

  // 1. Parse both paired and self-closing <agent_tool> tags
  const toolTagRegex = /<agent_tool\b([^>]*?)(?:\/>|>([\s\S]*?)<\/agent_tool>)/gi;
  let match;

  while ((match = toolTagRegex.exec(text)) !== null) {
    const rawAttrs = match[1] || '';
    const content = (match[2] || '').trim();

    const getAttr = (name) => {
      const attrRegex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
      const m = rawAttrs.match(attrRegex);
      return m ? m[1].trim() : '';
    };

    const toolName = getAttr('name') || getAttr('tool') || 'action';
    const path = getAttr('path') || getAttr('file') || getAttr('target');
    const title = getAttr('title') || '';
    const oldPath = getAttr('old_path') || getAttr('oldPath') || getAttr('src') || getAttr('source') || getAttr('from') || '';
    const newPath = getAttr('new_path') || getAttr('newPath') || getAttr('dest') || getAttr('destination') || getAttr('to') || '';
    const query = getAttr('query') || '';
    const prompt = getAttr('prompt') || getAttr('text') || getAttr('description') || content;
    const negativePrompt = getAttr('negative_prompt') || getAttr('negativePrompt') || '';
    const image = getAttr('image') || getAttr('init_image') || getAttr('input') || '';
    const width = getAttr('width');
    const height = getAttr('height');
    const steps = getAttr('steps');
    const strength = getAttr('strength');

    actions.push({
      type: 'tool_call',
      tool: toolName.toLowerCase(),
      path,
      title,
      oldPath,
      newPath,
      query,
      prompt,
      negativePrompt,
      image,
      width,
      height,
      steps,
      strength,
      content,
      raw: match[0],
    });
  }

  // 2. Parse standard markdown code blocks, ignoring internal tool xml blocks
  const codeRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const codeBlocks = [];

  while ((match = codeRegex.exec(text)) !== null) {
    const lang = match[1] || 'text';
    let code = match[2] || '';

    // Ignore code blocks that are purely agent_tool xml wrappers
    if (code.includes('<agent_tool') || lang.toLowerCase() === 'xml') {
      const codeWithoutTools = code.replace(/<agent_tool[\s\S]*?(?:<\/agent_tool>|\/>)/gi, '').trim();
      if (!codeWithoutTools) {
        continue;
      }
      code = codeWithoutTools;
    }

    let filename = '';
    const firstLine = code.split('\n')[0].trim();
    if (
      firstLine.startsWith('//') ||
      firstLine.startsWith('#') ||
      firstLine.startsWith('/*') ||
      firstLine.startsWith('<!--')
    ) {
      const matchName = firstLine.match(/(?:filename|file|path):\s*([^\s*-->]+)/i);
      if (matchName) {
        filename = matchName[1].trim();
      }
    }

    if (!filename) {
      const extMap = {
        python: 'main.py',
        py: 'main.py',
        javascript: 'script.js',
        js: 'script.js',
        jsx: 'App.jsx',
        typescript: 'main.ts',
        ts: 'main.ts',
        tsx: 'App.tsx',
        html: 'index.html',
        css: 'styles.css',
        json: 'data.json',
        sql: 'query.sql',
        rust: 'main.rs',
        rs: 'main.rs',
        cpp: 'main.cpp',
        c: 'main.c',
        go: 'main.go',
        shell: 'script.sh',
        sh: 'script.sh',
        powershell: 'script.ps1',
        ps1: 'script.ps1',
        bash: 'script.sh',
        markdown: 'README.md',
        md: 'README.md',
        yaml: 'config.yaml',
        yml: 'config.yml',
      };
      filename = extMap[lang.toLowerCase()] || `archivo.${lang || 'txt'}`;
    }

    codeBlocks.push({
      lang,
      code,
      filename,
    });
  }

  // Strip tool tags from readable text to show clean response
  const displayText = cleanedText
    .replace(/<agent_tool[\s\S]*?(?:<\/agent_tool>|\/>)/gi, '')
    .replace(/```(?:xml)?\s*```/gi, '')
    .trim();

  return {
    displayText,
    actions,
    codeBlocks,
  };
}

// Card for Generated PDF Document - Fully Responsive
function PDFActionCard({ action }) {
  const { previewFileInSandbox, openSystemPath, revealInExplorer, workspacePath } = useWorkspace();
  const { isDark } = useTheme();
  const {
    telegramConfig,
    discordConfig,
    whatsappConfig,
    googleDriveConfig,
    dropboxConfig,
    sendPdfToTelegram,
    sendPdfToDiscord,
    sendToWhatsApp,
    backupToGoogleDrive,
    backupToDropbox
  } = useIntegrations();

  const [opening, setOpening] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [discordSent, setDiscordSent] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  const [backingUpDrive, setBackingUpDrive] = useState(false);
  const [driveBackedUp, setDriveBackedUp] = useState(false);
  const [backingUpDropbox, setBackingUpDropbox] = useState(false);
  const [dropboxBackedUp, setDropboxBackedUp] = useState(false);

  const getFullPath = () => {
    let p = action.path || '';
    if (workspacePath && !p.includes(':') && !p.startsWith('/')) {
      p = `${workspacePath}/${p}`.replace(/\\/g, '/');
    }
    return p;
  };

  const handlePreviewInSandbox = () => {
    previewFileInSandbox(action.path);
  };

  const handleOpenExternal = async () => {
    setOpening(true);
    await openSystemPath(action.path);
    setTimeout(() => setOpening(false), 1500);
  };

  const handleSendTelegram = async () => {
    setSendingTelegram(true);
    const full = getFullPath();
    const res = await sendPdfToTelegram(full, `📄 *PDF Generado:* ${action.title || action.path}`);
    setSendingTelegram(false);
    if (res.success) {
      setTelegramSent(true);
      setTimeout(() => setTelegramSent(false), 4000);
    }
  };

  const handleSendDiscord = async () => {
    setSendingDiscord(true);
    const full = getFullPath();
    const res = await sendPdfToDiscord(full, `📄 **PDF Generado:** ${action.title || action.path}`);
    setSendingDiscord(false);
    if (res.success) {
      setDiscordSent(true);
      setTimeout(() => setDiscordSent(false), 4000);
    }
  };

  const handleSendWhatsApp = async () => {
    setSendingWhatsApp(true);
    const full = getFullPath();
    const res = await sendToWhatsApp(full, `📄 *PDF Generado:* ${action.title || action.path}`);
    setSendingWhatsApp(false);
    if (res.success) {
      setWhatsAppSent(true);
      setTimeout(() => setWhatsAppSent(false), 4000);
    }
  };

  const handleBackupDrive = async () => {
    setBackingUpDrive(true);
    const full = getFullPath();
    const res = await backupToGoogleDrive(full);
    setBackingUpDrive(false);
    if (res.success) {
      setDriveBackedUp(true);
      setTimeout(() => setDriveBackedUp(false), 4000);
    }
  };

  const handleBackupDropbox = async () => {
    setBackingUpDropbox(true);
    const full = getFullPath();
    const res = await backupToDropbox(full);
    setBackingUpDropbox(false);
    if (res.success) {
      setDropboxBackedUp(true);
      setTimeout(() => setDropboxBackedUp(false), 4000);
    }
  };

  return (
    <div className={`my-2.5 p-3 rounded-xl border shadow-lg font-sans transition-all w-full overflow-hidden ${
      isDark
        ? 'bg-gradient-to-r from-red-950/40 via-[#1b1b28] to-[#12121c] border-red-500/40 text-slate-100'
        : 'bg-gradient-to-r from-red-50 via-white to-red-50/50 border-red-200 text-slate-900'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
        {/* Left icon & text */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
            isDark ? 'bg-red-500/20 border-red-500/40' : 'bg-red-100 border-red-300'
          }`}>
            <FileText className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[12px] font-bold truncate max-w-[200px] ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={action.title || 'Documento PDF'}>
                {action.title || 'Documento PDF Listo'}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold flex-shrink-0 ${
                isDark ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                PDF Físico
              </span>
            </div>
            <span className={`text-[10px] font-mono block truncate w-full opacity-80`} title={action.path}>
              {action.path}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto flex-wrap">
          {googleDriveConfig?.enabled && googleDriveConfig?.folderPath && (
            <button
              onClick={handleBackupDrive}
              disabled={backingUpDrive}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                driveBackedUp
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
              title="Guardar copia en Google Drive"
            >
              {backingUpDrive ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : driveBackedUp ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Cloud className="w-3 h-3" />
              )}
              <span>{driveBackedUp ? 'En Drive' : 'Drive'}</span>
            </button>
          )}

          {dropboxConfig?.enabled && (dropboxConfig?.folderPath || dropboxConfig?.apiToken) && (
            <button
              onClick={handleBackupDropbox}
              disabled={backingUpDropbox}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                dropboxBackedUp
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
              title="Guardar copia en Dropbox"
            >
              {backingUpDropbox ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : dropboxBackedUp ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Box className="w-3 h-3" />
              )}
              <span>{dropboxBackedUp ? 'En Dropbox' : 'Dropbox'}</span>
            </button>
          )}

          {whatsappConfig?.enabled && (
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                whatsAppSent
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
              title="Compartir o enviar por WhatsApp"
            >
              {sendingWhatsApp ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : whatsAppSent ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Phone className="w-3 h-3" />
              )}
              <span>{whatsAppSent ? 'Enviado' : 'WhatsApp'}</span>
            </button>
          )}

          {telegramConfig?.enabled && (
            <button
              onClick={handleSendTelegram}
              disabled={sendingTelegram}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                telegramSent
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30'
              }`}
              title="Enviar este PDF directamente a tu Telegram"
            >
              {sendingTelegram ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : telegramSent ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Send className="w-3 h-3 transform -rotate-45" />
              )}
              <span>{telegramSent ? 'Enviado' : 'Telegram'}</span>
            </button>
          )}

          {discordConfig?.enabled && (
            <button
              onClick={handleSendDiscord}
              disabled={sendingDiscord}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                discordSent
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              }`}
              title="Enviar este PDF al canal de Discord"
            >
              {sendingDiscord ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : discordSent ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <MessageSquare className="w-3 h-3" />
              )}
              <span>{discordSent ? 'Enviado' : 'Discord'}</span>
            </button>
          )}

          <button
            onClick={() => revealInExplorer(action.path)}
            className={`p-1.5 rounded-lg text-[10px] border transition-all ${
              isDark ? 'bg-[#242436] hover:bg-[#2d3449] border-[#242436] text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Mostrar en Explorador de Archivos de Windows"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleOpenExternal}
            className={`p-1.5 rounded-lg text-[10px] border transition-all ${
              isDark ? 'bg-[#242436] hover:bg-[#2d3449] border-[#242436] text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Abrir con el visor de PDF externo / navegador del sistema"
          >
            {opening ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handlePreviewInSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-all shadow-md shadow-red-900/30 active:scale-95 whitespace-nowrap"
            title="Ver PDF en el Previsualizador Sandbox Integrado"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver en Sandbox</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Card for Created Workspace File - Fully Responsive
function FileCreatedCard({ action }) {
  const { openFileInEditor, previewFileInSandbox, revealInExplorer, setViewMode } = useWorkspace();
  const { isDark } = useTheme();
  const [opened, setOpened] = useState(false);

  const handleOpenEditor = async () => {
    setOpened(true);
    await openFileInEditor(action.path);
    setViewMode('editor');
    setTimeout(() => setOpened(false), 2000);
  };

  const handlePreview = () => {
    previewFileInSandbox(action.path);
  };

  const isPreviewable = /\.(html|htm|pdf|svg|png|jpg|jpeg|webp)$/i.test(action.path);

  return (
    <div className={`my-2 p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans transition-all w-full overflow-hidden ${
      isDark
        ? 'bg-[#151522] border-purple-500/30 text-slate-100'
        : 'bg-[#ede9fe]/40 border-purple-300 text-slate-900'
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
          isDark ? 'bg-purple-950/80 border-purple-500/40' : 'bg-purple-100 border-purple-300'
        }`}>
          <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold truncate max-w-[190px] ${isDark ? 'text-slate-200' : 'text-slate-900'}`} title={action.path}>
              {action.path}
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono flex-shrink-0 ${
              isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
            }`}>
              Guardado
            </span>
          </div>
          <span className="text-[10px] opacity-60 block truncate">Listo en el proyecto</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
        <button
          onClick={() => revealInExplorer(action.path)}
          className={`p-1.5 rounded border transition-all ${
            isDark ? 'bg-[#1b1b28] hover:bg-[#242436] border-[#242436] text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Ver en carpeta"
        >
          <FolderOpen className="w-3 h-3" />
        </button>

        {isPreviewable && (
          <button
            onClick={handlePreview}
            className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-semibold transition-all whitespace-nowrap"
            title="Previsualizar en el Sandbox"
          >
            <Eye className="w-3 h-3" />
            <span>Sandbox</span>
          </button>
        )}

        <button
          onClick={handleOpenEditor}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold transition-all shadow-sm whitespace-nowrap"
        >
          {opened ? <Check className="w-3 h-3 text-emerald-300" /> : <Code className="w-3 h-3" />}
          <span>Editor</span>
        </button>
      </div>
    </div>
  );
}

// Card for Moved / Organized Files
function MovedActionCard({ action }) {
  const { previewFileInSandbox, revealInExplorer } = useWorkspace();
  const { isDark } = useTheme();
  const targetFile = action.newPath || action.path || '';
  const isPdf = targetFile.toLowerCase().endsWith('.pdf');

  return (
    <div className={`my-1.5 p-2 rounded-xl border flex items-center justify-between gap-2 font-sans transition-all w-full overflow-hidden ${
      isDark ? 'bg-[#151522] border-emerald-500/30 text-slate-100' : 'bg-emerald-50/50 border-emerald-200 text-slate-900'
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${
          isDark ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
        }`}>
          <ArrowRightLeft className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
            {action.oldPath && (
              <span className="truncate opacity-60 max-w-[120px] line-through">{action.oldPath}</span>
            )}
            <span className="text-emerald-500 font-bold">➔</span>
            <span className="truncate text-emerald-600 dark:text-emerald-300 font-mono font-bold max-w-[180px]">{action.newPath || action.path}</span>
          </div>
          <span className="text-[10px] opacity-60 block">Organizado correctamente</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => revealInExplorer(action.newPath || action.path)}
          className={`p-1 rounded border transition-all ${
            isDark ? 'bg-[#1b1b28] hover:bg-[#242436] border-[#242436] text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Ver en carpeta"
        >
          <FolderOpen className="w-3 h-3" />
        </button>

        {isPdf && (
          <button
            onClick={() => previewFileInSandbox(action.newPath || action.path)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold transition-all whitespace-nowrap"
            title="Previsualizar PDF organizado"
          >
            <Eye className="w-3 h-3" />
            <span>Ver PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Card for Generated AI Image
function GeneratedImageCard({ action }) {
  const { isDark } = useTheme();
  const { openSystemPath, workspacePath } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [dataUrlFallback, setDataUrlFallback] = useState(action.dataUrl || '');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const targetPath = action.imagePath || action.path || action.filename || '';

  const getResolvedPath = () => {
    if (action.imagePath && fsPathIsAbsolute(action.imagePath)) return action.imagePath;
    if (targetPath && fsPathIsAbsolute(targetPath)) return targetPath;
    if (workspacePath && targetPath) return `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    return targetPath;
  };

  function fsPathIsAbsolute(p) {
    if (!p || typeof p !== 'string') return false;
    return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('/');
  }

  useEffect(() => {
    if (action.dataUrl) {
      setDataUrlFallback(action.dataUrl);
      return;
    }
    const fullP = getResolvedPath();
    if (fullP && window.electronAPI?.readImageDataUrl) {
      window.electronAPI.readImageDataUrl({ filePath: fullP }).then((res) => {
        if (res?.success && res?.dataUrl) {
          setDataUrlFallback(res.dataUrl);
        }
      }).catch(() => {});
    }
  }, [action, workspacePath]);

  const handleCopyPath = () => {
    const p = action.relativePath || action.path || action.imagePath || action.filename;
    if (p) {
      navigator.clipboard.writeText(p);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1500);
    }
  };

  const handleDownload = () => {
    setShowMenu(false);
    const finalDataUrl = dataUrlFallback || action.dataUrl;
    if (finalDataUrl) {
      const a = document.createElement('a');
      a.href = finalDataUrl;
      a.download = action.filename || `Imagen_IA_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (targetPath) {
      openSystemPath(getResolvedPath());
    }
  };

  const handleOpenPath = () => {
    setShowMenu(false);
    const fullP = getResolvedPath();
    if (fullP) {
      openSystemPath(fullP);
    }
  };

  const resolvedFull = getResolvedPath();
  const imgSrc = dataUrlFallback || action.dataUrl || (resolvedFull ? `media-local://${encodeURIComponent(resolvedFull.replace(/\\/g, '/'))}` : '');

  return (
    <div className={`my-2 p-2.5 rounded-2xl border flex flex-col gap-2 font-sans transition-all w-full overflow-visible shadow-lg relative ${
      isDark ? 'bg-[#151522] border-purple-500/40 text-slate-100' : 'bg-purple-50/80 border-purple-300 text-slate-900'
    }`}>
      <div className="flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${
            isDark ? 'bg-purple-950/80 border-purple-500/40 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'
          }`}>
            <Palette className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold truncate text-purple-600 dark:text-purple-300">
            🖼️ Imagen Generada
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 relative" ref={menuRef}>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            {action.width || 768}x{action.height || 768}
          </span>

          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className={`p-1 rounded-lg border transition-all ${
              showMenu
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : isDark
                ? 'bg-[#1e1e2f] hover:bg-[#28283e] border-[#2e2e46] text-slate-400 hover:text-white'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Opciones"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* 3-dots dropdown menu */}
          {showMenu && (
            <div className={`absolute right-0 top-7 w-44 rounded-xl border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 ${
              isDark ? 'bg-[#181827] border-[#2b2b42] text-slate-200 shadow-black/60' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            }`}>
              <button
                type="button"
                onClick={handleDownload}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-purple-600/20 hover:text-purple-300' : 'hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>Descargar imagen</span>
              </button>

              {targetPath && (
                <button
                  type="button"
                  onClick={handleOpenPath}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                    isDark ? 'hover:bg-purple-600/20 hover:text-purple-300' : 'hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>Abrir en visor</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyPath}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-purple-600/20 hover:text-purple-300' : 'hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-emerald-500 font-medium">Ruta copiada</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Copiar ruta</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {imgSrc && (
        <div
          onClick={() => targetPath && openSystemPath(targetPath)}
          className="relative rounded-xl overflow-hidden border border-purple-500/20 group max-h-[480px] bg-black/40 flex items-center justify-center cursor-pointer shadow-inner"
          title="Click para abrir imagen en visor de Windows"
        >
          <img
            src={imgSrc}
            alt={action.prompt || 'Imagen AI'}
            className="w-full h-auto object-contain max-h-[480px] rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
            <span className="px-3 py-1.5 rounded-xl bg-purple-600/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
              <Eye className="w-3.5 h-3.5" /> Abrir Imagen
            </span>
          </div>
        </div>
      )}

      {action.prompt && (
        <p className="text-[11px] italic opacity-85 line-clamp-2 px-1 text-slate-700 dark:text-slate-300">
          "{action.prompt}"
        </p>
      )}
    </div>
  );
}

// Card for Created Folder
function FolderActionCard({ action }) {
  const { revealInExplorer } = useWorkspace();
  const { isDark } = useTheme();

  return (
    <div className={`my-1.5 p-2 rounded-xl border flex items-center justify-between gap-2 font-sans transition-all w-full overflow-hidden ${
      isDark ? 'bg-[#151522] border-purple-500/30 text-slate-100' : 'bg-purple-50/50 border-purple-200 text-slate-900'
    }`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${
          isDark ? 'bg-purple-950/80 border-purple-500/40 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'
        }`}>
          <FolderPlus className="w-3 h-3" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="text-[11px] font-semibold truncate block font-mono text-purple-600 dark:text-purple-300">
            📁 {action.path}
          </span>
          <span className="text-[10px] opacity-60 block">Carpeta lista</span>
        </div>
      </div>

      <button
        onClick={() => revealInExplorer(action.path)}
        className={`p-1 rounded border transition-all ${
          isDark ? 'bg-[#1b1b28] hover:bg-[#242436] border-[#242436] text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
        }`}
        title="Abrir carpeta en Windows"
      >
        <FolderOpen className="w-3 h-3" />
      </button>
    </div>
  );
}

// Code Block Renderer with PDF Export Option
function CodeBlockRenderer({ block, onGeneratePDF }) {
  const { createOrApplyFile } = useWorkspace();
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [customPath, setCustomPath] = useState(block.filename);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = async () => {
    await createOrApplyFile(customPath || block.filename, block.code);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const isExportableToPDF = ['html', 'htm', 'md', 'markdown', 'txt'].includes(block.lang.toLowerCase()) || block.code.includes('<html') || block.code.includes('<div');

  return (
    <div className={`my-2.5 rounded-xl border overflow-hidden font-mono shadow-md transition-colors w-full ${
      isDark ? 'border-[#242436] bg-[#0c0c14]' : 'border-[#cbd5e1] bg-[#1e1e2d] text-slate-100'
    }`}>
      {/* Code Header */}
      <div className={`flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 border-b text-[11px] font-sans ${
        isDark ? 'bg-[#151522] border-[#242436] text-slate-400' : 'bg-[#151522] border-slate-700 text-slate-300'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
          <FileCode2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            className="bg-black/40 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[10px] focus:outline-none focus:border-purple-500 font-mono truncate w-full"
            title="Nombre o ruta del archivo"
          />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
            title="Copiar código"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {isExportableToPDF && onGeneratePDF && (
            <button
              onClick={() => onGeneratePDF(block.code, customPath ? `${customPath.replace(/\.[^/.]+$/, '')}.pdf` : 'Reporte.pdf')}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-semibold transition-all shadow-sm active:scale-95"
              title="Convertir y guardar este bloque directamente como archivo PDF"
            >
              <FileDown className="w-3 h-3 text-red-400" />
              <span>PDF</span>
            </button>
          )}

          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold transition-all shadow-sm active:scale-95"
            title="Guardar archivo en la carpeta de trabajo"
          >
            {applied ? (
              <>
                <Check className="w-3 h-3 text-emerald-300" />
                <span>¡Guardado!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-purple-200" />
                <span>Guardar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body - Fully selectable text */}
      <pre className="p-3 text-[11px] leading-relaxed text-slate-200 overflow-x-auto select-text font-mono">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}

// Component to render Web Sources cited by the AI
function WebSourcesRenderer({ results }) {
  const { isDark } = useTheme();
  if (!results || results.length === 0) return null;

  const handleOpenLink = (url) => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'enlace web';
    }
  };

  return (
    <div className={`mt-3 pt-2.5 border-t ${isDark ? 'border-[#242436]' : 'border-slate-200'}`}>
      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-purple-500">
        <Globe className="w-3.5 h-3.5" />
        <span>Fuentes Consultadas en Tiempo Real ({results.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {results.map((res, idx) => (
          <button
            key={idx}
            onClick={() => handleOpenLink(res.url)}
            title={`${res.title}\n\n${res.snippet}\n\nClick para abrir: ${res.url}`}
            className={`flex items-start gap-2 p-2 rounded-xl border text-left transition-all group ${
              isDark
                ? 'bg-[#12121c]/80 hover:bg-[#1b1b28] border-[#242436] hover:border-purple-500/40 text-slate-200'
                : 'bg-white hover:bg-purple-50/50 border-slate-200 hover:border-purple-300 text-slate-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isDark ? 'bg-purple-950/60 border-purple-800/40 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'
            }`}>
              <span className="text-[9px] font-bold">{idx + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium truncate flex items-center gap-1 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                <span className="truncate">{res.title}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 flex-shrink-0" />
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                {getDomain(res.url)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { activeProvider, providers, sendAIMessage, stopAIMessage } = useAI();
  const activeConfig = providers[activeProvider] || {};
  const { isDark } = useTheme();
  const { notifyPDFGenerated } = useIntegrations();

  const { currentSession, updateCurrentSessionMessages, createNewSession, openNewChatModal } = useChatSessions();
  const { activeSkills, getActiveSkillsSystemPrompt } = useSkills();
  const {
    workspacePath,
    workspaceName,
    createOrApplyFile,
    generatePDFFile,
    renameWorkspaceItem,
    makeWorkspaceDir,
    listWorkspaceFiles,
    readFileContent,
    readPdfText,
    refreshTree,
    extractAudioFromVideo,
    concatVideos,
    cutVideo,
    resizeImageFile,
    generateSubtitlesFile,
    translateSubtitlesFile,
    autoTranscribeVideo,
    generateAIImage,
    detectSystemHardware,
    openModelSetupModal,
  } = useWorkspace();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [agentStatusStep, setAgentStatusStep] = useState('');
  const [isAgentMode, setIsAgentMode] = useState(() => {
    return localStorage.getItem('nai_agent_mode') !== 'false';
  });
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(() => {
    return localStorage.getItem('nai_web_search') === 'true';
  });
  const [isImageMode, setIsImageMode] = useState(() => {
    return localStorage.getItem('nai_image_mode') === 'true';
  });
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1'); // '1:1', '16:9', '9:16', '4:3', '3:4'
  const [imageCount, setImageCount] = useState(1); // 1, 2, 3, 4
  const [imageQuality, setImageQuality] = useState('1080p'); // '480p', '720p', '1080p'
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [hardwareProfile, setHardwareProfile] = useState(null);

  useEffect(() => {
    detectSystemHardware().then((info) => setHardwareProfile(info)).catch(() => {});
  }, []);

  const getDimensionsFromRatioAndQuality = (ratio = '1:1', quality = '1080p') => {
    const table = {
      '480p': {
        '1:1': { width: 512, height: 512 },
        '16:9': { width: 640, height: 360 },
        '9:16': { width: 360, height: 640 },
        '4:3': { width: 640, height: 480 },
        '3:4': { width: 480, height: 640 },
      },
      '720p': {
        '1:1': { width: 768, height: 768 },
        '16:9': { width: 1024, height: 576 },
        '9:16': { width: 576, height: 1024 },
        '4:3': { width: 800, height: 600 },
        '3:4': { width: 600, height: 800 },
      },
      '1080p': {
        '1:1': { width: 1024, height: 1024 },
        '16:9': { width: 1280, height: 720 },
        '9:16': { width: 720, height: 1280 },
        '4:3': { width: 1024, height: 768 },
        '3:4': { width: 768, height: 1024 },
      },
      '1440p': {
        '1:1': { width: 1408, height: 1408 },
        '16:9': { width: 1536, height: 864 },
        '9:16': { width: 864, height: 1536 },
        '4:3': { width: 1440, height: 1080 },
        '3:4': { width: 1080, height: 1440 },
      },
      '2048p': {
        '1:1': { width: 2048, height: 2048 },
        '16:9': { width: 1920, height: 1080 },
        '9:16': { width: 1080, height: 1920 },
        '4:3': { width: 1600, height: 1200 },
        '3:4': { width: 1200, height: 1600 },
      },
    };
    return table[quality]?.[ratio] || table['1080p'][ratio] || { width: 1024, height: 1024 };
  };

  const messagesEndRef = useRef(null);
  const messages = currentSession?.messages || [];

  const handleStopGeneration = async () => {
    try {
      if (window.electronAPI?.cancelImageGeneration) {
        await window.electronAPI.cancelImageGeneration();
      }
      await stopAIMessage();
      setIsLoading(false);
      setAgentStatusStep('Generación detenida.');
    } catch (e) {}
  };

  const toggleAgentMode = () => {
    setIsAgentMode((prev) => {
      const next = !prev;
      localStorage.setItem('nai_agent_mode', next ? 'true' : 'false');
      return next;
    });
  };

  const toggleWebSearch = () => {
    setIsWebSearchEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('nai_web_search', next ? 'true' : 'false');
      return next;
    });
  };

  const toggleImageMode = () => {
    setIsImageMode((prev) => {
      const next = !prev;
      localStorage.setItem('nai_image_mode', next ? 'true' : 'false');
      return next;
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [voiceErrorMsg, setVoiceErrorMsg] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          setIsTranscribingVoice(true);
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result;

            let apiKey = '';
            let provider = '';
            try {
              const saved = JSON.parse(localStorage.getItem('nai_ai_providers') || '{}');
              if (saved.groq?.apiKey) {
                apiKey = saved.groq.apiKey;
                provider = 'groq';
              } else if (saved.google?.apiKey) {
                apiKey = saved.google.apiKey;
                provider = 'google';
              } else if (saved.openai?.apiKey) {
                apiKey = saved.openai.apiKey;
                provider = 'openai';
              }
            } catch (e) {}

            if (window.electronAPI?.transcribeAudioBuffer) {
              const res = await window.electronAPI.transcribeAudioBuffer({
                base64Audio,
                mimeType,
                lang: 'es',
                apiKey,
                provider,
              });

              if (res.success && res.text) {
                setInput((prev) => (prev ? `${prev} ${res.text}` : res.text).trim());
                setVoiceErrorMsg('');
              } else if (res.error === 'NO_API_KEY') {
                setVoiceErrorMsg('⚠️ Para convertir tu voz a texto con IA, agrega una API Key gratuita de Groq (o Google Gemini) en Ajustes > Proveedores.');
                setTimeout(() => setVoiceErrorMsg(''), 8000);
              }
            }
            setIsTranscribingVoice(false);
          };
        }
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(`No se pudo acceder al micrófono: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, agentStatusStep]);

  // Execute Agent Tool Calls on disk
  const executeAgentActions = async (actions) => {
    const executed = [];

    for (const act of actions) {
      try {
        const toolName = (act.tool || act.name || '').toLowerCase();

        if (toolName === 'create_file' || toolName === 'write_file' || toolName === 'save_file') {
          const targetPath = act.path || act.target || '';
          const isSubtitleExt = targetPath.toLowerCase().endsWith('.srt') || targetPath.toLowerCase().endsWith('.vtt');
          const isPlaceholderContent = !act.content || act.content.trim().startsWith('*') || act.content.trim().startsWith('[') || !act.content.includes('-->');

          if (isSubtitleExt && isPlaceholderContent) {
            setAgentStatusStep(`🎙️ Generando subtítulos reales para ${targetPath}...`);
            let matchedMedia = '';
            let matchedSrtSource = '';
            try {
              const detailed = await listWorkspaceFiles(false);
              const srtFiles = (detailed.files || []).filter((f) => /\.(srt|vtt)$/i.test(f.relativePath) && f.relativePath !== targetPath);
              if (srtFiles.length > 0) {
                matchedSrtSource = srtFiles[0].relativePath;
              }
              const mediaFiles = (detailed.files || []).filter((f) => /\.(mp4|mkv|mov|avi|webm|mp3|wav|m4a)$/i.test(f.relativePath));
              if (mediaFiles.length > 0) {
                const match = mediaFiles.find((m) => targetPath.toLowerCase().includes(m.name.replace(/\.[^.]+$/, '').toLowerCase()));
                matchedMedia = match ? match.relativePath : mediaFiles[0].relativePath;
              }
            } catch (e) {}

            const isTranslateToSpanish = targetPath.toLowerCase().includes('_es') || act.content?.toLowerCase().includes('español') || act.content?.toLowerCase().includes('espanol');
            const targetLang = isTranslateToSpanish ? 'es' : (targetPath.toLowerCase().includes('_en') || act.content?.toLowerCase().includes('inglés') || act.content?.toLowerCase().includes('ingles') || act.content?.toLowerCase().includes('english')) ? 'en' : 'es';

            if (matchedSrtSource && (targetPath.includes('_es') || targetPath.includes('_en') || isTranslateToSpanish)) {
              const res = await translateSubtitlesFile(matchedSrtSource, targetLang, targetPath, '');
              executed.push({ ...act, path: targetPath, status: res.success ? 'success' : 'error', result: res });
            } else if (matchedMedia) {
              const res = await autoTranscribeVideo(matchedMedia, targetLang, targetPath);
              executed.push({ ...act, path: targetPath, status: res.success ? 'success' : 'error', result: res });
            } else {
              const res = await createOrApplyFile(targetPath, act.content);
              executed.push({ ...act, path: targetPath, status: res.success ? 'success' : 'error', result: res });
            }
          } else {
            setAgentStatusStep(`📝 Creando archivo ${targetPath}...`);
            const res = await createOrApplyFile(targetPath, act.content);
            executed.push({ ...act, path: targetPath, status: res.success ? 'success' : 'error', result: res });
          }
        } else if (toolName === 'generate_pdf' || toolName === 'create_pdf' || toolName === 'pdf') {
          const targetPath = act.path || act.target || 'Reporte.pdf';
          setAgentStatusStep(`📄 Generando reporte PDF ${targetPath}...`);
          const res = await generatePDFFile(targetPath, act.content, act.title || 'Documento');
          if (res.success) {
            let fullPath = targetPath;
            if (workspacePath && !fullPath.includes(':') && !fullPath.startsWith('/')) {
              fullPath = `${workspacePath}/${fullPath}`.replace(/\\/g, '/');
            }
            notifyPDFGenerated(fullPath, act.title || targetPath);
          }
          executed.push({ ...act, path: targetPath, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'make_dir' || toolName === 'create_folder' || toolName === 'mkdir') {
          const dirPath = act.path || act.target || '';
          setAgentStatusStep(`📁 Creando carpeta ${dirPath}...`);
          const res = await makeWorkspaceDir(dirPath);
          executed.push({ ...act, path: dirPath, status: res.success ? 'success' : 'error', result: res });
        } else if (
          toolName === 'rename_or_move' ||
          toolName === 'move_file' ||
          toolName === 'move' ||
          toolName === 'organize' ||
          toolName === 'rename'
        ) {
          const oldPath = act.oldPath || act.src || act.from || act.path || '';
          const newPath = act.newPath || act.dest || act.to || act.destination || '';
          if (oldPath && newPath) {
            setAgentStatusStep(`🔄 Moviendo ${oldPath} a ${newPath}...`);
            const res = await renameWorkspaceItem(oldPath, newPath);
            executed.push({ ...act, oldPath, newPath, status: res.success ? 'success' : 'error', result: res });
          }
        } else if (toolName === 'extract_audio' || toolName === 'audio_extract') {
          const vPath = act.video_path || act.path || act.input || '';
          const oPath = act.output_path || act.output || '';
          setAgentStatusStep(`🎵 Extrayendo audio de ${vPath}...`);
          const res = await extractAudioFromVideo(vPath, oPath);
          executed.push({ ...act, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'concat_videos' || toolName === 'join_videos' || toolName === 'merge_videos' || toolName === 'pegar_videos') {
          let inputList = [];
          const rawInputs = act.inputs || act.video_paths || act.videos || act.files || act.sources || act.input || (act.video1 ? [act.video1, act.video2, act.video3].filter(Boolean) : '');
          if (Array.isArray(rawInputs)) {
            inputList = rawInputs;
          } else if (typeof rawInputs === 'string' && rawInputs.trim()) {
            inputList = rawInputs.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
          }

          if (inputList.length < 2) {
            try {
              const detailed = await listWorkspaceFiles(false);
              const mediaFiles = (detailed.files || []).filter((f) => /\.(mp4|mkv|mov|avi|webm)$/i.test(f.relativePath));
              if (mediaFiles.length >= 2) {
                inputList = mediaFiles.map((m) => m.relativePath);
              }
            } catch (e) {}
          }

          const oPath = act.output || act.output_path || act.dest || act.destination || 'Video_Unido.mp4';
          setAgentStatusStep(`🎬 Uniendo ${inputList.length} videos en ${oPath}...`);
          const res = await concatVideos(inputList, oPath);
          executed.push({ ...act, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'cut_video' || toolName === 'trim_video') {
          const vPath = act.input || act.video_path || act.path || '';
          const oPath = act.output || act.output_path || '';
          const startTime = act.start || act.start_time || '00:00:00';
          const endTime = act.end || act.end_time || '';
          setAgentStatusStep(`✂️ Recortando video ${vPath}...`);
          const res = await cutVideo(vPath, oPath, startTime, endTime);
          executed.push({ ...act, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'resize_image' || toolName === 'image_resize') {
          const inPath = act.input || act.path || act.src || '';
          const outPath = act.output || act.dest || '';
          const width = act.width ? parseInt(act.width, 10) : undefined;
          const height = act.height ? parseInt(act.height, 10) : undefined;
          const format = act.format || '';
          setAgentStatusStep(`🖼️ Redimensionando imagen ${inPath}...`);
          const res = await resizeImageFile(inPath, outPath, width, height, format);
          executed.push({ ...act, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'create_subtitles' || toolName === 'generate_subtitles' || toolName === 'subtitles') {
          const srtPath = act.srt_path || act.path || 'subtitulos.srt';
          setAgentStatusStep(`📄 Guardando subtítulos ${srtPath}...`);
          const res = await generateSubtitlesFile(srtPath, act.content);
          executed.push({ ...act, path: srtPath, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'translate_subtitles' || toolName === 'subtitle_translate') {
          const srtPath = act.srt_path || act.path || '';
          const targetLang = act.target_lang || act.lang || 'es';
          const outPath = act.output_path || act.output || '';
          setAgentStatusStep(`🌐 Traduciendo subtítulos a ${targetLang}...`);
          const res = await translateSubtitlesFile(srtPath, targetLang, outPath, act.content);
          executed.push({ ...act, path: outPath || srtPath, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'auto_transcribe' || toolName === 'transcribe_video' || toolName === 'transcribe') {
          const vPath = act.video_path || act.input || act.path || '';
          const lang = act.lang || act.target_lang || 'es';
          setAgentStatusStep(`🎙️ Transcribiendo audio de ${vPath}...`);
          const res = await autoTranscribeVideo(vPath, lang);
          executed.push({ ...act, status: res.success ? 'success' : 'error', result: res });
        } else if (toolName === 'generate_image' || toolName === 'create_image' || toolName === 'image' || toolName === 'draw') {
          const imgPrompt = act.prompt || act.content || act.text || '';
          const { width: targetW, height: targetH } = getDimensionsFromRatioAndQuality(imageAspectRatio, imageQuality);
          const finalW = act.width ? parseInt(act.width, 10) : targetW;
          const finalH = act.height ? parseInt(act.height, 10) : targetH;
          setAgentStatusStep(`🎨 Generando imagen con Krea 2 Turbo GGUF (${finalW}x${finalH})...`);
          const res = await generateAIImage({
            prompt: imgPrompt,
            negativePrompt: act.negativePrompt || act.negative_prompt || '',
            width: finalW,
            height: finalH,
            steps: act.steps ? parseInt(act.steps, 10) : undefined,
          });
          executed.push({
            ...act,
            prompt: imgPrompt,
            isImage: true,
            width: finalW,
            height: finalH,
            status: res.success ? 'success' : 'error',
            result: res,
            dataUrl: res.dataUrl,
            imagePath: res.imagePath,
            relativePath: res.relativePath,
          });
        }
      } catch (err) {
        console.error('Error executing agent tool:', err);
      }
    }

    if (executed.length > 0) {
      await refreshTree();
    }
    return executed;
  };

  // Convert any response text to a physical PDF in the workspace
  const handleExportResponseAsPDF = async (messageId, rawText) => {
    const cleanText = rawText.replace(/<agent_tool[\s\S]*?(?:<\/agent_tool>|\/>)/gi, '').trim();
    const defaultName = `Reporte_${new Date().toISOString().slice(0, 10)}.pdf`;
    const styledHtml = markdownToStyledHtml(cleanText, 'Reporte de Análisis');
    
    setAgentStatusStep(`📄 Creando archivo PDF ${defaultName}...`);
    const res = await generatePDFFile(defaultName, styledHtml, 'Reporte de Análisis');
    setAgentStatusStep('');

    if (res.success) {
      let fullPath = defaultName;
      if (workspacePath && !fullPath.includes(':') && !fullPath.startsWith('/')) {
        fullPath = `${workspacePath}/${fullPath}`.replace(/\\/g, '/');
      }
      notifyPDFGenerated(fullPath, 'Reporte de Análisis');

      updateCurrentSessionMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actions: [
                  ...(m.actions || []),
                  { tool: 'generate_pdf', path: defaultName, title: 'Reporte de Análisis' },
                ],
              }
            : m
        )
      );
    }
  };

  // Convert any code snippet directly to PDF
  const handleConvertCodeToPDF = async (code, filename) => {
    const pdfName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    let html = code;
    if (!code.includes('<html')) {
      html = markdownToStyledHtml(code, pdfName.replace('.pdf', ''));
    }
    await generatePDFFile(pdfName, html, pdfName.replace('.pdf', ''));
  };

  // Real-time chunk listener for progressive image streaming
  useEffect(() => {
    if (window.electronAPI?.onImageChunkReady) {
      const unsub = window.electronAPI.onImageChunkReady((chunk) => {
        console.log('[STREAMING IMAGE CHUNK]:', chunk);
        updateCurrentSessionMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          const newImg = {
            path: chunk.imagePath,
            relativePath: chunk.relativePath,
            filename: chunk.filename,
            dataUrl: chunk.dataUrl,
            prompt: chunk.prompt,
            width: chunk.width,
            height: chunk.height,
          };
          const cardAction = {
            tool: 'generate_image',
            isImage: true,
            path: chunk.relativePath,
            imagePath: chunk.imagePath,
            relativePath: chunk.relativePath,
            dataUrl: chunk.dataUrl,
            filename: chunk.filename,
            prompt: chunk.prompt,
            width: chunk.width,
            height: chunk.height,
          };

          if (lastMsg && lastMsg.role === 'assistant') {
            const currentImages = lastMsg.generatedImages || [];
            const currentActions = lastMsg.actions || [];
            if (!currentImages.some((img) => img.path === chunk.imagePath || img.filename === chunk.filename)) {
              return prev.map((m, idx) =>
                idx === prev.length - 1
                  ? {
                      ...m,
                      generatedImages: [...currentImages, newImg],
                      actions: [...currentActions, cardAction],
                      executedActions: [...currentActions, cardAction],
                      content: m.content || `🎨 Imagen generada en tiempo real: **${chunk.filename}**`,
                    }
                  : m
              );
            }
            return prev;
          } else {
            const newAssistantMsg = {
              id: `msg-stream-${Date.now()}`,
              role: 'assistant',
              content: `🎨 Imagen generada: **${chunk.filename}**`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              generatedImages: [newImg],
              actions: [cardAction],
              executedActions: [cardAction],
            };
            return [...prev, newAssistantMsg];
          }
        });
      });
      return () => unsub();
    }
  }, [updateCurrentSessionMessages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isUserSubmitting || isLoading) return;

    setIsUserSubmitting(true);
    const userText = input.trim();
    console.log('[CHATPANEL] handleSend iniciado con texto:', userText);
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      time: currentTime,
      webSearchUsed: isWebSearchEnabled,
      agentModeUsed: isAgentMode,
    };

    const newMessages = [...messages, userMessage];
    console.log('[CHATPANEL] Actualizando sesión con nuevo mensaje de usuario. Total mensajes:', newMessages.length);
    updateCurrentSessionMessages(newMessages);
    setInput('');

    // Pre-flight check: if cloud provider has no API key, alert the user immediately
    if (activeConfig.type === 'cloud' && !activeConfig.apiKey?.trim()) {
      setIsUserSubmitting(false);
      const promptMsg = {
        id: `key-req-${Date.now()}`,
        role: 'assistant',
        isError: true,
        content: `🔑 **API Key requerida para ${activeConfig.name}**\n\nPor favor ve a la pestaña **Modelos & Proveedores IA** (icono de controles 🎛️ en la barra lateral) e ingresa tu API Key para **${activeConfig.name}**, o selecciona otro proveedor disponible (Google Gemini, OpenAI, Claude, Groq, Ollama, etc.).`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateCurrentSessionMessages([...newMessages, promptMsg]);
      return;
    }

    setIsLoading(true);
    setAgentStatusStep('Analizando espacio de trabajo y ejecutando herramientas...');

    try {
      // Get workspace file list context only when Agent Mode is active
      let workspaceContext = '';
      if (isAgentMode && workspacePath) {
        try {
          const detailed = await listWorkspaceFiles(true);
          const fileList = (detailed.files || []).slice(0, 60).map((f) => {
            let line = `- ${f.relativePath} (${f.isDirectory ? 'Carpeta' : `${f.size} Bytes`})`;
            if (f.summary) {
              line += ` [Contenido / Resumen: "${f.summary.slice(0, 220)}"]`;
            }
            return line;
          }).join('\n');

          workspaceContext = `\nESPACIO DE TRABAJO LOCAL DEL USUARIO:
Ruta: ${workspacePath}
Archivos existentes y texto detectado:
${fileList || '(Carpeta vacía)'}`;

          // Load relevant text / subtitle / code files with safe memory bounds (PDFs only on explicit request)
          let filesContentSection = '';
          const textFiles = (detailed.files || []).filter((f) => !f.isDirectory && /\.(srt|vtt|txt|md|js|jsx|ts|tsx|html|css|json|py|sql|sh|env)$/i.test(f.relativePath) && f.size < 800000);
          for (const tf of textFiles.slice(0, 6)) {
            if (filesContentSection.length > 14000) break;
            try {
              const res = await readFileContent(tf.relativePath);
              if (res.success && res.content) {
                const chunk = res.content.slice(0, 4500);
                filesContentSection += `\n\n--- ARCHIVO: ${tf.relativePath} ---\n${chunk}\n--- FIN ARCHIVO ---`;
              }
            } catch (e) {}
          }

          if (filesContentSection) {
            workspaceContext += `\n\nCONTENIDO DE LOS ARCHIVOS DEL PROYECTO:${filesContentSection}`;
          }

          // Proactively inject full PDF content if user mentions PDF analysis/summary
          if (/(pdf|documento|informe|reporte|resum|analiz|explica|lee)/i.test(userText)) {
            const pdfFiles = (detailed.files || []).filter((f) => /\.pdf$/i.test(f.relativePath));
            if (pdfFiles.length > 0) {
              const matchedPdf = pdfFiles.find((f) => userText.toLowerCase().includes(f.name.toLowerCase())) || pdfFiles[0];
              const pdfRes = await readPdfText(matchedPdf.relativePath);
              if (pdfRes.success && pdfRes.text) {
                workspaceContext += `\n\n[CONTENIDO COMPLETO EXTRAÍDO DEL PDF ${matchedPdf.relativePath} (${pdfRes.numPages || 1} Páginas)]:\n${pdfRes.text.slice(0, 6000)}`;
              }
            }
          }

          // Check if user is asking to translate subtitles
          const isTranslateSubRequest = /(traduc|traducir|traducci[oó]n)/i.test(userText) && /(subt[ií]tulo|srt|vtt)/i.test(userText);
          if (isTranslateSubRequest) {
            const srtFiles = (detailed.files || []).filter((f) => /\.(srt|vtt)$/i.test(f.relativePath));
            if (srtFiles.length > 0) {
              const targetLang = /(espa[nñ]ol|al espa)/i.test(userText) ? 'es' : /(ingl[eé]s|english|al ingl)/i.test(userText) ? 'en' : 'es';
              const sourceSrt = srtFiles.find((f) => userText.toLowerCase().includes(f.name.toLowerCase())) || srtFiles[0];
              const outName = sourceSrt.relativePath.replace(/\.(srt|vtt)$/i, `_${targetLang}.srt`);
              setAgentStatusStep(`🌐 Traduciendo subtítulos de ${sourceSrt.relativePath} a ${targetLang}...`);
              const transRes = await translateSubtitlesFile(sourceSrt.relativePath, targetLang, outName, '');
              if (transRes.success && transRes.content) {
                workspaceContext += `\n\n[SUBTÍTULOS TRADUCIDOS CON ÉXITO A ${targetLang} EN ${outName}]:\n${transRes.content.slice(0, 1500)}`;
              }
            }
          } else if (/(unir|pegar|juntar|combinar|concatenar)/i.test(userText) && /(video|videos|clips)/i.test(userText)) {
            const videoFiles = (detailed.files || []).filter((f) => /\.(mp4|mkv|mov|avi|webm)$/i.test(f.relativePath));
            if (videoFiles.length >= 2) {
              const outName = 'Video_Unido.mp4';
              setAgentStatusStep(`🎬 Uniendo automáticamente ${videoFiles.length} videos con FFmpeg...`);
              const concatRes = await concatVideos(videoFiles.map((m) => m.relativePath), outName);
              if (concatRes.success) {
                workspaceContext += `\n\n[VIDEOS UNIDOS CON ÉXITO]: Se han concatenado ${videoFiles.map((m) => m.relativePath).join(' + ')} en el archivo ${outName}.`;
              }
            }
          } else {
            // Check if user is asking to generate an image (or if Image Mode is active)
            const countExplicitMatch = userText.match(/\b(4|cuatro|four|3|tres|three|2|dos|two|1|una|uno|one)\s*(?:de\s+)?(?:im[aá]genes|fotos|fotograf[ií]as|ilustraciones|dibujos|variaciones|opciones)\b/i) ||
                                       userText.match(/(?:haz|crea|genera|dame|saca|renderiza|quiero|pon|hazme|creame)\s*(?:unas|unos)?\s*(4|cuatro|four|3|tres|three|2|dos|two|1|una|uno|one)\b/i);

            let detectedCount = imageCount || 1;
            if (countExplicitMatch) {
              const term = (countExplicitMatch[1] || '').toLowerCase();
              if (term === '4' || term === 'cuatro' || term === 'four') detectedCount = 4;
              else if (term === '3' || term === 'tres' || term === 'three') detectedCount = 3;
              else if (term === '2' || term === 'dos' || term === 'two') detectedCount = 2;
              else if (term === '1' || term === 'una' || term === 'uno' || term === 'one') detectedCount = 1;
            }

            const isDirectImageGen = isImageMode ||
              /(genera|crea|dibuja|renderiza|haz|cr[eé]ame|dame|mu[eé]strame|saca|quiero)\s+(una\s+|un\s+|\d+\s+|dos\s+|tres\s+|cuatro\s+)?(imagen(es)?|im[aá]gen(es)?|foto(s)?|fotograf[ií]a(s)?|dibujo(s)?|logo(s)?|ilustraci[oó]n(es)?|retrato(s)?|paisaje(s)?|wallpaper(s)?)/i.test(userText) ||
              /\b(4|3|2|1|cuatro|tres|dos|una)\s+(im[aá]genes|fotos|fotograf[ií]as|dibujos|ilustraciones)\b/i.test(userText);

            if (isDirectImageGen) {
              const { width, height } = getDimensionsFromRatioAndQuality(imageAspectRatio, imageQuality);
              const countToGen = Math.max(1, Math.min(4, detectedCount));
              setAgentStatusStep(`🎨 Generando ${countToGen > 1 ? `${countToGen} imágenes` : 'imagen'} (${imageAspectRatio}, ${imageQuality})...`);

              const generatedToolsXml = [];
              const generatedActions = [];
              let anySuccess = false;

              // Clean natural prompt extraction
              let cleanPrompt = userText
                .replace(/^(genera|crea|dibuja|renderiza|haz|cr[eé]ame|dame|mu[eé]strame|saca|quiero)\s+(una\s+|un\s+|\d+\s+|dos\s+|tres\s+|cuatro\s+)?(imagen(es)?|im[aá]gen(es)?|foto(s)?|fotograf[ií]a(s)?|dibujo(s)?|logo(s)?|ilustraci[oó]n(es)?|retrato(s)?|paisaje(s)?|wallpaper(s)?)?\s*(de\s+|con\s+|sobre\s+)?/i, '')
                .trim();
              if (!cleanPrompt) cleanPrompt = userText.trim();

              let lastImageError = '';

              for (let i = 0; i < countToGen; i++) {
                if (countToGen > 1) setAgentStatusStep(`🎨 Generando imagen ${i + 1} de ${countToGen}...`);
                else setAgentStatusStep(`🎨 Generando imagen...`);

                const imgRes = await generateAIImage({
                  prompt: cleanPrompt,
                  width,
                  height,
                  seed: -1,
                });

                if (imgRes && imgRes.success) {
                  anySuccess = true;
                  const relP = imgRes.relativePath || imgRes.filename;
                  const fullP = imgRes.imagePath || relP;
                  const cardAction = {
                    tool: 'generate_image',
                    isImage: true,
                    path: relP,
                    imagePath: fullP,
                    relativePath: relP,
                    dataUrl: imgRes.dataUrl || '',
                    filename: imgRes.filename || relP,
                    prompt: cleanPrompt,
                    width,
                    height,
                  };
                  generatedActions.push(cardAction);
                  generatedToolsXml.push(
                    `<agent_tool name="generate_image" path="${relP}" prompt="${cleanPrompt}" width="${width}" height="${height}" />`
                  );
                } else if (imgRes && imgRes.error) {
                  lastImageError = imgRes.error;
                }
              }

              // Finish turn with assistant message containing image tools and cards directly
              const assistantResponse = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: anySuccess
                  ? `✨ He generado ${countToGen > 1 ? `${countToGen} imágenes` : 'la imagen'} exitosamente (${imageAspectRatio}, ${imageQuality}).\n\n${generatedToolsXml.join('\n\n')}`
                  : `⚠️ ${lastImageError || 'No se pudo generar la imagen de forma local. Revisa que el modelo esté en disco y la memoria disponible.'}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                actions: generatedActions,
                executedActions: generatedActions,
              };

              updateCurrentSessionMessages([...newMessages, assistantResponse]);
              setIsLoading(false);
              setAgentStatusStep('');
              return;
            } else {
              // Check if user is asking for video/audio subtitles or transcription
              const isSubtitleRequest = /(subt[ií]tulo|transcrib|transcripci[oó]n|audio a texto|sacar subt|crear subt|generar subt)/i.test(userText);
              if (isSubtitleRequest) {
                const mediaFiles = (detailed.files || []).filter((f) => /\.(mp4|mkv|mov|avi|webm|mp3|wav|m4a)$/i.test(f.relativePath));
                if (mediaFiles.length > 0) {
                  const targetMedia = mediaFiles.find((f) => userText.toLowerCase().includes(f.name.toLowerCase())) || mediaFiles[0];
                  const targetLang = /(ingl[eé]s|english|en ingl)/i.test(userText) ? 'en' : 'es';
                  setAgentStatusStep(`🎙️ Transcribiendo audio de ${targetMedia.relativePath} con Whisper...`);
                  const transRes = await autoTranscribeVideo(targetMedia.relativePath, targetLang);
                  if (transRes.success && transRes.content) {
                    workspaceContext += `\n\n[SUBTÍTULOS EXTRAÍDOS DE ${targetMedia.relativePath} (${targetLang})]:\n${transRes.content.slice(0, 1500)}`;
                  }
                }
              }
            }
          }
        } catch (e) {}
      }

      const systemInstruction = isAgentMode
        ? `Eres Nai Agent, un asistente de Inteligencia Artificial profesional con capacidades de ejecución autónoma de archivos en el espacio de trabajo local del usuario.

REGLAS FUNDAMENTALES DEL MODO AGENTE:
1. NO ANUNCIES LO QUE VAS A HACER NI PIDAS PERMISO: Ejecuta las acciones directamente usando las etiquetas <agent_tool>.
2. NO DES LA TAREA POR TERMINADA HASTA HABER COMPLETADO TODOS LOS PASOS NECESARIOS: No te limites a planificar o crear carpetas vacías.
3. CREAR Y ORGANIZAR CARPETAS:
   - Si creas una carpeta con <agent_tool name="make_dir" path="Carpeta" />, DEBES emitir de inmediato en la misma respuesta todas las etiquetas <agent_tool name="rename_or_move"> o <agent_tool name="create_file"> para poblarla con los archivos correspondientes.
4. CREACIÓN DE PROYECTOS Y PÁGINAS WEB:
   - EMITE PRIMERO las etiquetas <agent_tool name="create_file" path="index.html">, <agent_tool name="create_file" path="styles.css">, etc. con el código completo y funcional.
   - NUNCA escribas el código como bloques de markdown normales en tu texto si vas a crear los archivos. Emite SIEMPRE <agent_tool name="create_file"> directamente.
   - Después de cerrar todas las etiquetas </agent_tool>, escribe una breve explicación o resumen.

HERRAMIENTAS DISPONIBLES:
1. CREAR ARCHIVOS:
<agent_tool name="create_file" path="nombre_archivo.ext">
contenido completo aquí
</agent_tool>

2. CARPETAS Y ORGANIZACIÓN:
<agent_tool name="make_dir" path="NombreCarpeta" />
<agent_tool name="rename_or_move" old_path="archivo.ext" new_path="NombreCarpeta/archivo.ext" />

3. GENERAR REPORTE PDF:
<agent_tool name="generate_pdf" path="Reporte.pdf" title="Título del Reporte">
<div class="max-w-4xl mx-auto p-6 font-sans text-slate-800">
  <h1 class="text-2xl font-bold mb-4">Título</h1>
  <p class="text-sm text-slate-600 mb-4">Contenido...</p>
</div>
</agent_tool>

${workspaceContext}`
        : 'Eres Nai Agent, un asistente de Inteligencia Artificial conversacional, rápido, inteligente y servicial. Responde de forma clara, directa y amable al usuario.';

      const skillsPrompt = isAgentMode && getActiveSkillsSystemPrompt ? getActiveSkillsSystemPrompt() : '';
      const fullSystemInstruction = skillsPrompt
        ? `${systemInstruction}\n${skillsPrompt}`
        : systemInstruction;

      // Check for attached or workspace images ONLY when user explicitly asks to inspect/analyze an existing image
      let attachedImages = [];
      const isVisionInspection = !isImageMode && /(analiza|describe|qu[eé] ves|qu[eé] hay en|lee|mira|observa|explica|interpreta)\s+(la\s+|el\s+)?(imagen|foto|captura|diagrama|screenshot|diseño)/i.test(userText);
      if (workspacePath && isVisionInspection) {
        try {
          const detailed = await listWorkspaceFiles(false);
          const imageFiles = (detailed.files || []).filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f.relativePath));
          if (imageFiles.length > 0) {
            const matchedImg = imageFiles.find((f) => userText.toLowerCase().includes(f.name.toLowerCase())) || imageFiles[0];
            const fullImgPath = matchedImg.path || (workspacePath + '/' + matchedImg.relativePath).replace(/\\/g, '/');
            if (window.electronAPI?.readImageDataUrl) {
              const imgRes = await window.electronAPI.readImageDataUrl({ filePath: fullImgPath });
              if (imgRes?.success && imgRes?.dataUrl) {
                attachedImages.push(imgRes.dataUrl);
                setAgentStatusStep(`👁️ Analizando imagen ${matchedImg.name} con Vision AI...`);
              }
            }
          }
        } catch (e) {}
      }

      const apiPayloadMessages = [
        { role: 'system', content: fullSystemInstruction },
        ...newMessages
          .filter((m) => !m.isError && (m.role === 'user' || m.role === 'assistant') && m.content && m.content.trim())
          .map((m, idx, arr) => {
            const isLastUser = m.role === 'user' && idx === arr.length - 1;
            return {
              role: m.role,
              content: m.content.trim(),
              images: isLastUser && attachedImages.length > 0 ? attachedImages : m.images || [],
            };
          }),
      ];

      let currentPayloadMessages = [...apiPayloadMessages];
      let accumulatedRawContent = '';
      let accumulatedDisplayText = '';
      let allParsedActions = [];
      let allExecutedActions = [];
      let allCodeBlocks = [];
      let lastModelUsed = '';
      let lastWebResults = [];
      let isFinalAborted = false;
      let finalErrorMessage = '';
      let autoTurnsCount = 0;
      const maxAutoTurns = 3;

      while (autoTurnsCount <= maxAutoTurns) {
        setAgentStatusStep(
          autoTurnsCount === 0
            ? 'Analizando espacio de trabajo y ejecutando herramientas...'
            : `Ejecutando pasos automáticos del agente (Turno ${autoTurnsCount + 1})...`
        );

        const response = await sendAIMessage(currentPayloadMessages, {
          webSearch: isWebSearchEnabled,
          max_tokens: isAgentMode ? 8192 : undefined,
        });

        console.log(`[CHATPANEL] sendAIMessage turno ${autoTurnsCount + 1} completado:`, response);

        if (!response || !response.success) {
          if (response?.aborted) {
            isFinalAborted = true;
          } else {
            finalErrorMessage = response?.error || 'Error al comunicarse con el proveedor de IA.';
          }
          break;
        }

        lastModelUsed = response.model;
        lastWebResults = response.webResults || [];
        const turnRawContent = response.content || '';
        accumulatedRawContent = accumulatedRawContent
          ? `${accumulatedRawContent}\n\n${turnRawContent}`
          : turnRawContent;

        const parsed = parseAgentMessage(turnRawContent);
        if (parsed.displayText) {
          accumulatedDisplayText = accumulatedDisplayText
            ? `${accumulatedDisplayText}\n\n${parsed.displayText}`
            : parsed.displayText;
        }
        allCodeBlocks.push(...(parsed.codeBlocks || []));

        let turnActions = parsed.actions || [];

        // Safety fallback: if in Agent Mode with file creation intent, and model output standard codeblocks without <agent_tool>, convert them
        if (isAgentMode && turnActions.length === 0 && parsed.codeBlocks && parsed.codeBlocks.length > 0) {
          const isFileCreationIntent = /(crea|genera|haz|construye|p[aá]gina|web|landing|proyecto|archivo|c[oó]digo|guarda)/i.test(userText);
          if (isFileCreationIntent) {
            for (const cb of parsed.codeBlocks) {
              if (cb.filename && !cb.filename.endsWith('.txt') && cb.code && cb.code.trim()) {
                turnActions.push({
                  type: 'tool_call',
                  tool: 'create_file',
                  path: cb.filename,
                  content: cb.code,
                });
              }
            }
          }
        }

        allParsedActions.push(...turnActions);

        // Execute actions for this turn
        if (isAgentMode && turnActions.length > 0) {
          const executed = await executeAgentActions(turnActions);
          allExecutedActions.push(...executed);
        }

        // Loop Stagnation Protection: If not in agent mode or no auto-continuation needed, exit
        if (!isAgentMode) {
          break;
        }

        // Evaluate task completion
        const hasMakeDir = allParsedActions.some((a) => a.tool === 'make_dir' || a.tool === 'create_folder');
        const hasMoveOrFile = allParsedActions.some((a) => a.tool === 'rename_or_move' || a.tool === 'move_file' || a.tool === 'create_file');

        // Accurate unclosed XML detection: count opening tags vs closing (/> or </agent_tool>)
        const openTagCount = (turnRawContent.match(/<agent_tool\b/gi) || []).length;
        const closedTagCount = (turnRawContent.match(/(?:\/>|<\/agent_tool>)/gi) || []).length;
        const hasUnclosedTag = openTagCount > closedTagCount;
        const isTruncated = response.finishReason === 'length' || hasUnclosedTag;

        // Structural Signal 1: Created folders with make_dir, but 0 move/file actions executed
        const hasEmptyDirsCreated = hasMakeDir && !hasMoveOrFile;

        const isTaskIncomplete = isTruncated || hasEmptyDirsCreated;

        // Loop Stagnation / Cost Protection:
        // If this turn added 0 new actions and not truncated, stop immediately
        const newActionsThisTurn = turnActions.length;
        if (autoTurnsCount > 0 && newActionsThisTurn === 0 && !isTruncated) {
          console.warn('[AGENT AUTO-LOOP] Modelo no generó acciones nuevas en el turno de continuación. Deteniendo bucle.');
          break;
        }

        if (!isTaskIncomplete) {
          // Task cleanly completed
          break;
        }

        autoTurnsCount++;
        if (autoTurnsCount > maxAutoTurns) {
          // Max turns reached, append safety notice
          accumulatedRawContent +=
            '\n\n⚠️ *Aviso del Agente:* El agente no pudo completar la tarea automáticamente después de varios intentos. Puede que falten pasos — revisa los archivos en tu espacio de trabajo o escribe *"continúa"* para seguir.';
          break;
        }

        // Prepare continuation message for next turn
        console.log(
          `[AGENT AUTO-LOOP] Disparando turno de continuación automático ${autoTurnsCount}... Causa: ${
            isTruncated ? 'truncado_por_longitud' : 'carpetas_sin_poblar'
          }`
        );
        currentPayloadMessages = [
          ...currentPayloadMessages,
          { role: 'assistant', content: turnRawContent },
          {
            role: 'user',
            content:
              'Continúa de inmediato ejecutando las acciones pendientes con las etiquetas <agent_tool> para los archivos restantes. No te detengas hasta completar todos los pasos.',
          },
        ];
      }

      if (accumulatedRawContent || allExecutedActions.length > 0) {
        const assistantMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: accumulatedRawContent || 'Tarea completada.',
          displayText: accumulatedDisplayText,
          actions: allParsedActions,
          executedActions: allExecutedActions,
          codeBlocks: allCodeBlocks,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: lastModelUsed,
          webResults: lastWebResults,
        };
        console.log('[CHATPANEL] Inyectando mensaje final de asistente en la sesión:', assistantMessage);
        updateCurrentSessionMessages([...newMessages, assistantMessage]);
      } else if (isFinalAborted) {
        updateCurrentSessionMessages([
          ...newMessages,
          {
            id: `stop-${Date.now()}`,
            role: 'assistant',
            content: '⏹️ *Generación detenida por el usuario.*',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else if (finalErrorMessage) {
        const isInternal = finalErrorMessage.toLowerCase().includes('error interno') || finalErrorMessage.includes('ReferenceError') || finalErrorMessage.includes('TypeError');
        updateCurrentSessionMessages([
          ...newMessages,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            isError: true,
            content: isInternal
              ? `⚠️ **Error Interno de la Aplicación:** ${finalErrorMessage.replace(/^Error interno de la aplicación:\s*/i, '')}`
              : `⚠️ **Error del Proveedor (${activeConfig.name}):** ${finalErrorMessage}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      updateCurrentSessionMessages([
        ...newMessages,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          content: `⚠️ **Error Inesperado:** ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsUserSubmitting(false);
      setAgentStatusStep('');
    }
  };

  const quickPrompts = [
    '📁 Organiza todos los PDFs de la carpeta en subcarpetas clasificadas por su contenido',
    '📄 Analiza los archivos de la carpeta y genera un reporte ejecutivo en PDF',
    '✨ Investiga las tendencias de IA en 2026 y crea una página web interactiva',
    '🚀 Crea una landing page moderna con animaciones y galería',
  ];

  return (
    <div className={`flex flex-col h-full font-sans transition-colors w-full overflow-hidden ${
      isDark ? 'bg-[#0c0c14] text-slate-200' : 'bg-[#ffffff] text-slate-800'
    }`}>
      {/* Chat Header - Fully Responsive Wrap */}
      <div className={`px-3 py-2 border-b backdrop-blur-sm flex flex-wrap items-center justify-between gap-1.5 flex-shrink-0 transition-colors ${
        isDark ? 'border-[#242436] bg-[#12121c]/80' : 'border-[#e2e8f0] bg-[#ffffff]/80'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              activeConfig.status === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                : activeConfig.status === 'checking'
                ? 'bg-amber-400 animate-pulse'
                : activeConfig.status === 'error'
                ? 'bg-rose-400'
                : 'bg-slate-400'
            }`}
            title={`Estado: ${activeConfig.status || 'idle'}`}
          />
          <span className={`text-xs font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            {activeConfig.name || 'IA Activa'}
          </span>
          {activeConfig.selectedModel && (
            <span className={`text-[10px] border px-1.5 py-0.5 rounded-full font-mono max-w-[100px] sm:max-w-[130px] truncate ${
              isDark ? 'bg-[#1a1a27] border-[#242436] text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`} title={activeConfig.selectedModel}>
              {activeConfig.selectedModel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Agent Mode Badge / Toggle */}
          <button
            onClick={toggleAgentMode}
            className={`flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-1 rounded-lg border transition-all active:scale-95 ${
              isAgentMode
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-600 dark:text-purple-300 shadow-sm shadow-purple-500/20 font-semibold'
                : isDark
                ? 'bg-[#151522] border-[#242436] text-slate-500 hover:text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
            title={
              isAgentMode
                ? 'Modo Agente Autónomo Activo: Crea archivos, organiza carpetas y genera PDFs automáticamente'
                : 'Modo Solo Chat (Click para activar Modo Agente)'
            }
          >
            <Wand2 className={`w-3 h-3 ${isAgentMode ? 'text-purple-500 animate-pulse' : ''}`} />
            <span className="hidden xs:inline">{isAgentMode ? 'Agente' : 'Chat'}</span>
          </button>

          <button
            onClick={openNewChatModal}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg transition-all active:scale-95"
            title="Iniciar una nueva conversación limpia"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden xs:inline">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Messages List - Selectable Text */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 select-text">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-slate-500">
            <Logo className="w-10 h-10 mb-2 opacity-80" />
            <h3 className={`text-xs font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Nai Agent - Workspace Autónomo
            </h3>
            <p className="text-[11px] max-w-xs mb-3 leading-relaxed opacity-80">
              Pídeme crear proyectos, mover y organizar archivos, investigar en la web o generar reportes en PDF.
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-left w-full max-w-xs">
              <div className={`p-2 rounded-xl border text-[10px] ${
                isDark ? 'bg-[#151522] border-[#242436] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="text-emerald-500 font-semibold block">📁 Organización de Archivos & PDFs</span>
                Clasifica y mueve documentos en carpetas automáticamente.
              </div>
              <div className={`p-2 rounded-xl border text-[10px] ${
                isDark ? 'bg-[#151522] border-[#242436] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="text-red-500 font-semibold block">📄 Reportes & PDFs</span>
                Documentos y análisis exportados en PDF físico.
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const parsed = parseAgentMessage(msg.content);
          const allActions = msg.actions || parsed.actions || [];
          const imageActions = (msg.executedActions || allActions).filter((a) => a.isImage || a.tool === 'generate_image' || a.tool === 'edit_image' || a.tool === 'create_image' || a.tool === 'image' || a.tool === 'draw');
          const pdfActions = allActions.filter((a) => a.tool === 'generate_pdf' || a.tool === 'create_pdf' || a.tool === 'pdf');
          const fileActions = allActions.filter((a) => a.tool === 'create_file' || a.tool === 'write_file' || a.tool === 'save_file');
          const folderActions = allActions.filter((a) => a.tool === 'make_dir' || a.tool === 'create_folder' || a.tool === 'mkdir');
          const moveActions = allActions.filter((a) => a.tool === 'rename_or_move' || a.tool === 'move_file' || a.tool === 'move' || a.tool === 'organize' || a.tool === 'rename');

          return (
            <div
              key={msg.id}
              className={`flex gap-2 w-full ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <Logo className="w-6 h-6 flex-shrink-0 mt-0.5" />
              )}

              <div
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed select-text overflow-hidden ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-600/10'
                    : msg.isError
                    ? isDark
                      ? 'bg-rose-950/60 border border-rose-800/60 text-rose-200 rounded-bl-none'
                      : 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-none'
                    : isDark
                    ? 'bg-[#151522] border border-[#242436] text-slate-200 rounded-bl-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <div>
                    <p className="whitespace-pre-wrap select-text break-words">{msg.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-purple-200 opacity-90 font-mono flex-wrap">
                      {msg.webSearchUsed && (
                        <span className="flex items-center gap-0.5">
                          <Globe className="w-2.5 h-2.5" /> Web
                        </span>
                      )}
                      {msg.agentModeUsed && (
                        <span className="flex items-center gap-0.5">
                          <Wand2 className="w-2.5 h-2.5" /> Agente
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    {/* Render Action Cards for Generated / Edited AI Images */}
                    {imageActions.map((act, iIdx) => (
                      <GeneratedImageCard
                        key={`img-${iIdx}`}
                        action={act}
                      />
                    ))}

                    {/* Render Action Cards for Created Folders */}
                    {folderActions.map((act, fIdx) => (
                      <FolderActionCard key={`folder-${fIdx}`} action={act} />
                    ))}

                    {/* Render Action Cards for Moved / Organized Files */}
                    {moveActions.map((act, mIdx) => (
                      <MovedActionCard key={`move-${mIdx}`} action={act} />
                    ))}

                    {/* Render Action Cards for Created PDFs */}
                    {pdfActions.map((act, pIdx) => (
                      <PDFActionCard key={`pdf-${pIdx}`} action={act} />
                    ))}

                    {/* Render Action Cards for Created Files */}
                    {fileActions.map((act, fIdx) => (
                      <FileCreatedCard key={`file-${fIdx}`} action={act} />
                    ))}

                    {/* Display readable text - Selectable */}
                    {parsed.displayText && (
                      <div className="whitespace-pre-wrap leading-relaxed select-text break-words">
                        {parsed.displayText}
                      </div>
                    )}

                    {/* Render standard code blocks if any */}
                    {parsed.codeBlocks.map((part, pIdx) => (
                      <CodeBlockRenderer
                        key={`code-${pIdx}`}
                        block={part}
                        onGeneratePDF={handleConvertCodeToPDF}
                      />
                    ))}

                    {/* Render Web Sources if available */}
                    {msg.webResults && msg.webResults.length > 0 && (
                      <WebSourcesRenderer results={msg.webResults} />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-1 pt-1 text-[9px] opacity-60">
                  {msg.modelUsed && (
                    <span className="font-mono truncate max-w-[120px]">
                      {msg.modelUsed}
                    </span>
                  )}
                  <span className={`block ml-auto ${msg.role === 'user' ? 'text-purple-100' : ''}`}>
                    {msg.time}
                  </span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isDark ? 'bg-[#1b1b28] border-[#242436] text-slate-300' : 'bg-purple-100 border-purple-200 text-purple-700'
                }`}>
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2 justify-start items-center">
            <Logo className="w-6 h-6 animate-pulse flex-shrink-0" />
            <div className={`border px-3 py-2 rounded-2xl rounded-bl-none text-xs flex items-center gap-2 shadow-sm ${
              isDark ? 'bg-[#151522] border-[#242436] text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500 flex-shrink-0" />
              <span className="truncate max-w-[220px]">{agentStatusStep || `Procesando con ${activeConfig.name}...`}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className={`px-2.5 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar flex-shrink-0 border-t ${
        isDark ? 'border-[#242436]/60 bg-[#0c0c14]' : 'border-slate-100 bg-white'
      }`}>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setInput(prompt.replace(/^[^\s]+\s/, ''))}
            className={`text-[10px] whitespace-nowrap border px-2 py-0.5 rounded-full transition-all ${
              isDark
                ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-400 hover:text-slate-200'
                : 'bg-slate-50 hover:bg-purple-50 border-slate-200 text-slate-600 hover:text-purple-700'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form with Agent Mode & Web Search */}
      <div className={`p-2.5 border-t flex-shrink-0 transition-colors ${
        isDark ? 'bg-[#12121c]/80 border-[#242436]' : 'bg-[#ffffff] border-[#e2e8f0]'
      }`}>
        {/* Active Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {activeSkills && activeSkills.length > 0 && (
            <div
              className={`px-1.5 py-0.5 rounded-md border text-[9px] flex items-center gap-1 font-semibold ${
                isDark ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
              title={`Habilidades activas: ${activeSkills.map((s) => s.name).join(', ')}`}
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
              <span>{activeSkills.length} {activeSkills.length === 1 ? 'Skill Activa' : 'Skills Activas'}</span>
            </div>
          )}

          {isAgentMode && (
            <div className={`px-1.5 py-0.5 rounded-md border text-[9px] flex items-center gap-1 font-semibold ${
              isDark ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              <Wand2 className="w-2.5 h-2.5 text-purple-500 flex-shrink-0" />
              <span>Agente: Creación, PDFs & Organización</span>
            </div>
          )}
          {isWebSearchEnabled && (
            <div className={`px-1.5 py-0.5 rounded-md border text-[9px] flex items-center gap-1 ${
              isDark ? 'bg-purple-950/40 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
            }`}>
              <Globe className="w-2.5 h-2.5 text-purple-500 flex-shrink-0" />
              <span>Web Search</span>
            </div>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>🎙️ Grabando audio ({formatTimer(recordSeconds)})... habla y haz clic para terminar</span>
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all"
            >
              Terminar y Transcribir
            </button>
          </div>
        )}

        {isTranscribingVoice && (
          <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-semibold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
            <span>Transcribiendo audio de voz a texto...</span>
          </div>
        )}

        {voiceErrorMsg && (
          <div className="flex items-center justify-between px-3 py-2 mb-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs leading-relaxed shadow-md">
            <span>{voiceErrorMsg}</span>
            <button
              type="button"
              onClick={() => setVoiceErrorMsg('')}
              className="text-[10px] text-amber-400 hover:text-white ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Image Mode Settings Toolbar */}
        {isImageMode && (
          <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-2 rounded-2xl border text-[11px] transition-all shadow-sm ${
            isDark ? 'bg-[#151522] border-purple-500/40 text-slate-200' : 'bg-purple-50 border-purple-300 text-slate-800'
          }`}>
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-purple-600 dark:text-purple-300 text-[10px] mr-1 flex items-center gap-1">
                <Palette className="w-3 h-3 text-purple-500" /> Aspecto:
              </span>
              {[
                { label: '1:1', name: 'Cuadrado (1:1)' },
                { label: '16:9', name: 'Paisaje (16:9)' },
                { label: '9:16', name: 'Vertical (9:16)' },
                { label: '4:3', name: 'Clásico (4:3)' },
                { label: '3:4', name: 'Retrato (3:4)' },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setImageAspectRatio(r.label)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold transition-all ${
                    imageAspectRatio === r.label
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  }`}
                  title={r.name}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Image Count (1 to 4) */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-purple-600 dark:text-purple-300 text-[10px] mr-1">
                Cantidad:
              </span>
              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setImageCount(cnt)}
                  className={`w-6 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center transition-all ${
                    imageCount === cnt
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  }`}
                  title={`${cnt} imagen(es)`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            {/* Quality / Resolution (480p, 720p, 1080p) */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-purple-600 dark:text-purple-300 text-[10px] mr-1">
                Calidad:
              </span>
              {[
                { q: '480p', label: '480p' },
                { q: '720p', label: '720p' },
                { q: '1080p', label: '1080p' },
                { q: '1440p', label: '1440p 2K' },
                { q: '2048p', label: '2048p 4K' },
              ].map((item) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setImageQuality(item.q)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    imageQuality === item.q
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Models Setup & Download Modal Trigger */}
            <button
              type="button"
              onClick={openModelSetupModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 active:scale-95 text-purple-700 dark:text-purple-300 border border-purple-500/40 font-bold text-[10px] transition-all ml-auto"
              title="Descargar o configurar los modelos Krea 2 Turbo, CLIP y VAE"
            >
              <Download className="w-3 h-3 text-purple-500" />
              <span>Modelos Krea 2</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="relative">
          <textarea
            rows={isTextareaExpanded ? 8 : 4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoading) {
                  handleSend(e);
                }
              }
            }}
            placeholder={
              isRecording
                ? `🎙️ Grabando tu voz (${formatTimer(recordSeconds)})...`
                : isTranscribingVoice
                ? `Transcribiendo voz a texto...`
                : isImageMode
                ? `🎨 Describe la imagen que deseas crear (${imageAspectRatio}, ${imageQuality}, ${imageCount}x)...`
                : isAgentMode
                ? `Pídele organizar archivos, crear proyectos o generar reportes en PDF...`
                : `Escribe o dicta a ${activeConfig.name || 'Nai Agent'}... (Enter)`
            }
            className={`w-full border rounded-2xl pl-3.5 pr-24 py-2.5 text-xs leading-relaxed placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-y font-sans transition-all ${
              isTextareaExpanded ? 'min-h-[170px]' : 'min-h-[84px]'
            } ${
              isRecording
                ? 'border-red-500/60 bg-red-950/20'
                : isDark
                ? 'bg-[#0c0c14] border-[#242436] text-slate-100'
                : 'bg-[#f8f9fa] border-[#cbd5e1] text-slate-900'
            }`}
          />

          {/* Expand / Minimize Textarea Toggle */}
          <button
            type="button"
            onClick={() => setIsTextareaExpanded((prev) => !prev)}
            className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all"
            title={isTextareaExpanded ? 'Reducir tamaño del cuadro' : 'Expandir cuadro de texto para prompts largos'}
          >
            {isTextareaExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
            {/* Voice Dictation Mic Button */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-1.5 rounded-lg transition-all ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/50 border border-red-400'
                  : 'text-slate-400 hover:text-purple-400 dark:hover:text-purple-300'
              }`}
              title={isRecording ? 'Detener y transcribir' : 'Grabar mensaje de voz (Micrófono)'}
            >
              {isRecording ? (
                <MicOff className="w-3.5 h-3.5 animate-bounce text-white" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Agent Mode Toggle */}
            <button
              type="button"
              onClick={toggleAgentMode}
              className={`p-1.5 rounded-lg transition-all ${
                isAgentMode
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isAgentMode ? 'Modo Agente Activado' : 'Activar Modo Agente Autónomo'}
            >
              <Wand2 className={`w-3.5 h-3.5 ${isAgentMode ? 'text-purple-500' : ''}`} />
            </button>

            {/* Web Search Toggle */}
            <button
              type="button"
              onClick={toggleWebSearch}
              className={`p-1.5 rounded-lg transition-all ${
                isWebSearchEnabled
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isWebSearchEnabled ? 'Búsqueda Web Activada' : 'Activar Búsqueda Web'}
            >
              <Globe className={`w-3.5 h-3.5 ${isWebSearchEnabled ? 'text-purple-500' : ''}`} />
            </button>

            {/* AI Image Generation Toggle (Krea / FLUX GGUF) */}
            <button
              type="button"
              onClick={toggleImageMode}
              className={`p-1.5 rounded-lg transition-all ${
                isImageMode
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title={isImageMode ? 'Generador de Imágenes IA Activado (Krea / FLUX GGUF)' : 'Activar Generador de Imágenes IA (Krea v2 / FLUX GGUF)'}
            >
              <Palette className={`w-3.5 h-3.5 ${isImageMode ? 'text-purple-500' : ''}`} />
            </button>

            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all shadow-md shadow-rose-600/40 flex-shrink-0 animate-pulse active:scale-95"
                title="Detener generación (Cancelar tarea)"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg transition-all shadow-md shadow-purple-600/30 flex-shrink-0"
                title="Enviar mensaje al Agente"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
