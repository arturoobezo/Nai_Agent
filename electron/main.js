const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, Menu, MenuItem, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { pathToFileURL } = require('url');
const { exec, execFile } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Ensure macOS GUI environment inherits standard /opt/homebrew and /usr/local PATHs
if (process.platform === 'darwin') {
  const extraPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  const curPath = process.env.PATH || '';
  const toAdd = extraPaths.filter((p) => !curPath.includes(p) && fs.existsSync(p));
  if (toAdd.length > 0) {
    process.env.PATH = toAdd.join(':') + ':' + curPath;
  }
}

// ----------------------------------------------------
// MIME Types Map
// ----------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

// ----------------------------------------------------
// Internal High-Performance Streaming Server (HTTP 206)
// Enables smooth video scrubbing, canvas frame sequences, GSAP & scroll effects
// ----------------------------------------------------
let activeServerRoot = '';
let memoryOverrideFile = { name: '', content: '' };
let localServerPort = 54321;
let localServer = null;

// Prevent unhandled crashes from showing ugly dialogs
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

function startLocalPreviewServer() {
  if (localServer) return;

  localServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${localServerPort}`);
      const queryFullPath = parsedUrl.searchParams.get('fullPath') || parsedUrl.searchParams.get('file');
      let reqPath = decodeURIComponent(parsedUrl.pathname);

      if (reqPath === '/' || !reqPath) {
        reqPath = '/index.html';
      }

      const fileName = path.basename(queryFullPath || reqPath);

      // In-memory override for live editing before saving
      if (memoryOverrideFile.name && memoryOverrideFile.name === fileName && memoryOverrideFile.content) {
        const ext = path.extname(fileName).toLowerCase();
        const mime = MIME_TYPES[ext] || 'text/html; charset=utf-8';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(memoryOverrideFile.content, 'utf-8');
        return;
      }

      let targetFilePath = '';
      const cleanRelPath = reqPath.replace(/^[/\\]+/, '');

      if (queryFullPath && fs.existsSync(queryFullPath)) {
        targetFilePath = queryFullPath;
      } else if (activeServerRoot && fs.existsSync(path.join(activeServerRoot, cleanRelPath))) {
        targetFilePath = path.join(activeServerRoot, cleanRelPath);
      } else if (activeServerRoot && fs.existsSync(path.join(activeServerRoot, fileName))) {
        targetFilePath = path.join(activeServerRoot, fileName);
      } else if (fs.existsSync(reqPath)) {
        targetFilePath = reqPath;
      }

      if (!targetFilePath || !fs.existsSync(targetFilePath) || fs.statSync(targetFilePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File not found: ${reqPath}`);
        return;
      }

      const stat = fs.statSync(targetFilePath);
      const ext = path.extname(targetFilePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const range = req.headers.range;

      // HTTP 206 Partial Content for video/audio seek & PDF chunking
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(targetFilePath, { start, end });

        fileStream.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Stream error: ${err.message}`);
          }
        });

        req.on('close', () => {
          fileStream.destroy();
        });

        res.on('finish', () => {
          fileStream.destroy();
        });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mime,
        });
        fileStream.pipe(res);
      } else {
        const fileStream = fs.createReadStream(targetFilePath);

        fileStream.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Stream error: ${err.message}`);
          }
        });

        req.on('close', () => {
          fileStream.destroy();
        });

        res.on('finish', () => {
          fileStream.destroy();
        });

        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': mime,
          'Accept-Ranges': 'bytes',
        });
        fileStream.pipe(res);
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server error: ${err.message}`);
      }
    }
  });

  localServer.listen(localServerPort, '127.0.0.1', () => {
    const addr = localServer.address();
    if (addr && addr.port) localServerPort = addr.port;
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      localServerPort = 0;
      localServer.listen(0, '127.0.0.1', () => {
        const addr = localServer.address();
        if (addr && addr.port) localServerPort = addr.port;
      });
    }
  });
}

// ----------------------------------------------------
// Register Privileged Scheme before App Ready
// ----------------------------------------------------
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-local',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      streamOnly: true,
      bypassCSP: true,
      standard: true,
      corsEnabled: true,
    },
  },
]);

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow = null;

function getDevServerUrl() {
  try {
    const portFile = path.join(__dirname, '../.vite-port');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf-8').trim();
      return `http://localhost:${port}`;
    }
  } catch (e) {}
  return 'http://localhost:5173';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#090d16',
    title: 'Nai Agent',
    icon: path.join(__dirname, '../public/icono.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
      plugins: true,
    },
  });

  if (isDev) {
    const devUrl = getDevServerUrl();
    console.log(`[Nai Agent] Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);

    // Retry if Vite isn't ready yet
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.log(`[Nai Agent] Load failed (${errorCode}: ${errorDescription}), retrying in 1s...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(getDevServerUrl());
        }
      }, 1000);
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) {
        console.log(`[Renderer ${level === 3 ? 'ERROR' : 'WARN'}]: ${message} (${sourceId}:${line})`);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Right-click context menu (Copiar, Cortar, Pegar, Seleccionar todo)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo', label: 'Deshacer' }));
      menu.append(new MenuItem({ role: 'redo', label: 'Rehacer' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut', label: 'Cortar' }));
      menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      menu.append(new MenuItem({ role: 'paste', label: 'Pegar' }));
      menu.append(new MenuItem({ role: 'delete', label: 'Eliminar' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Seleccionar todo' }));
    } else if (params.selectionText && params.selectionText.trim().length > 0) {
      menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Seleccionar todo' }));
    } else {
      menu.append(new MenuItem({ role: 'reload', label: 'Recargar' }));
      menu.append(new MenuItem({ role: 'forceReload', label: 'Forzar Recarga' }));
      menu.append(new MenuItem({ role: 'toggleDevTools', label: 'Inspeccionar consola' }));
      menu.append(new MenuItem({ role: 'selectAll', label: 'Seleccionar todo' }));
    }

    menu.popup({ window: mainWindow, x: params.x, y: params.y });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------
// Directory Tree Traversal Helper
// ----------------------------------------------------
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  'build',
  '.next',
  '.cache',
  'out',
  '.idea',
  '.vscode',
  '__pycache__',
]);

async function buildDirectoryTree(dirPath, rootPath = dirPath, depth = 0) {
  if (depth > 6) return [];

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = await buildDirectoryTree(fullPath, rootPath, depth + 1);
      nodes.push({
        id: fullPath,
        name: entry.name,
        path: fullPath,
        relativePath,
        isDirectory: true,
        children,
      });
    } else {
      nodes.push({
        id: fullPath,
        name: entry.name,
        path: fullPath,
        relativePath,
        isDirectory: false,
        extension: path.extname(entry.name).toLowerCase(),
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });
}

// Helper to resolve provider endpoints
function resolveProviderEndpoints(provider, config = {}) {
  let baseUrl = (config.url || '').trim().replace(/\/+$/, '');
  let apiKey = (config.apiKey || '').trim();

  if (!baseUrl) {
    if (provider === 'openai') baseUrl = 'https://api.openai.com/v1';
    else if (provider === 'anthropic') baseUrl = 'https://api.anthropic.com/v1';
    else if (provider === 'google') baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
    else if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1';
    else if (provider === 'github') baseUrl = 'https://models.inference.ai.azure.com';
    else if (provider === 'deepseek') baseUrl = 'https://api.deepseek.com/v1';
    else if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1';
    else if (provider === 'perplexity') baseUrl = 'https://api.perplexity.ai';
    else if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1';
    else if (provider === 'lmstudio') baseUrl = 'http://127.0.0.1:1234/v1';
    else if (provider === 'ollama') baseUrl = 'http://127.0.0.1:11434/v1';
    else baseUrl = 'http://127.0.0.1:8000/v1';
  }

  // Convert localhost to 127.0.0.1 for local providers to avoid Node IPv6 resolution issues
  if (baseUrl.includes('localhost:1234')) {
    baseUrl = baseUrl.replace('localhost:1234', '127.0.0.1:1234');
  } else if (baseUrl.includes('localhost:11434')) {
    baseUrl = baseUrl.replace('localhost:11434', '127.0.0.1:11434');
  } else if (baseUrl.includes('localhost:8000')) {
    baseUrl = baseUrl.replace('localhost:8000', '127.0.0.1:8000');
  }

  if (provider === 'anthropic') {
    return {
      baseUrl,
      chatUrl: baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`,
      modelsUrl: baseUrl.endsWith('/models') ? baseUrl : `${baseUrl}/models`,
      apiKey,
      isAnthropicNative: true,
    };
  }

  let chatUrl = '';
  if (baseUrl.includes('/chat/completions')) {
    chatUrl = baseUrl;
  } else if (baseUrl.endsWith('/v1') || baseUrl.endsWith('/openai')) {
    chatUrl = `${baseUrl}/chat/completions`;
  } else {
    chatUrl = `${baseUrl}/v1/chat/completions`;
  }

  let modelsUrl = '';
  if (baseUrl.includes('/models')) {
    modelsUrl = baseUrl;
  } else if (baseUrl.endsWith('/v1') || baseUrl.endsWith('/openai')) {
    modelsUrl = `${baseUrl}/models`;
  } else {
    modelsUrl = `${baseUrl}/v1/models`;
  }

  return { baseUrl, chatUrl, modelsUrl, apiKey, isAnthropicNative: false };
}

// ----------------------------------------------------
// IPC Handlers - Filesystem & Workspace
// ----------------------------------------------------

ipcMain.handle('fs:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar Carpeta del Proyecto',
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true };
  }

  const folderPath = result.filePaths[0];
  activeServerRoot = folderPath;

  try {
    const tree = await buildDirectoryTree(folderPath);
    return {
      canceled: false,
      folderPath,
      folderName: path.basename(folderPath),
      tree,
    };
  } catch (err) {
    return {
      canceled: false,
      folderPath,
      folderName: path.basename(folderPath),
      tree: [],
      error: err.message,
    };
  }
});

ipcMain.handle('fs:read-tree', async (event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: 'Carpeta no encontrada', tree: [] };
    }
    activeServerRoot = folderPath;
    const tree = await buildDirectoryTree(folderPath);
    return { success: true, tree, folderName: path.basename(folderPath) };
  } catch (err) {
    return { success: false, error: err.message, tree: [] };
  }
});

ipcMain.handle('fs:read-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return {
      success: true,
      content,
      filePath,
      name: path.basename(filePath),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:write-file', async (event, { filePath, content }) => {
  try {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return {
      success: true,
      filePath,
      name: path.basename(filePath),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:delete-item', async (event, itemPath) => {
  try {
    if (fs.existsSync(itemPath)) {
      await fs.promises.rm(itemPath, { recursive: true, force: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:rename-item', async (event, { oldPath, newPath }) => {
  try {
    if (!fs.existsSync(oldPath)) {
      return { success: false, error: 'El archivo o carpeta origen no existe' };
    }
    const parentDir = path.dirname(newPath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.rename(oldPath, newPath);
    return { success: true, oldPath, newPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:make-dir', async (event, { dirPath }) => {
  try {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
    return { success: true, dirPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

async function extractPdfTextAsync(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    if (!fs.existsSync(filePath)) return '';
    const stat = await fs.promises.stat(filePath);
    if (stat.size === 0) return '';
    const dataBuffer = await fs.promises.readFile(filePath);
    if (!dataBuffer || dataBuffer.length === 0) return '';
    const pdfModule = require('pdf-parse');
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      const text = typeof result === 'string' ? result : result?.text || '';
      if (text && text.trim()) return text.trim();
    } else if (typeof pdfModule === 'function') {
      const data = await pdfModule(dataBuffer);
      if (data?.text?.trim()) return data.text.trim();
    }
  } catch (e) {
    // Graceful fallback on malformed or empty PDF
  }
  return '';
}

ipcMain.handle('fs:read-pdf-text', async (event, { filePath }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    const cleanText = await extractPdfTextAsync(filePath);
    return {
      success: true,
      text: cleanText || '(El documento PDF no contiene capas de texto seleccionables o es una imagen escaneada)',
      filePath,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:read-image-data-url', async (event, { filePath }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'image/png';
    const buffer = await fs.promises.readFile(filePath);
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    return { success: true, dataUrl, fileName: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:list-files-detailed', async (event, { folderPath, recursive = true, includeTextSummary = true }) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: 'Carpeta no encontrada', files: [] };
    }

    const results = [];
    async function scan(currentDir, depth = 0) {
      if (depth > 5) return;
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(currentDir, entry.name);
        const rel = path.relative(folderPath, full).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          results.push({ name: entry.name, path: full, relativePath: rel, isDirectory: true });
          if (recursive) await scan(full, depth + 1);
        } else {
          const stat = await fs.promises.stat(full);
          const ext = path.extname(entry.name).toLowerCase();
          let summary = '';

          if (includeTextSummary) {
            try {
              if (ext === '.pdf') {
                summary = 'Documento PDF';
              } else if (['.txt', '.md', '.json', '.html', '.js', '.py', '.css'].includes(ext) && stat.size < 20000) {
                const raw = await fs.promises.readFile(full, 'utf-8');
                summary = raw.slice(0, 300).replace(/\s+/g, ' ').trim();
              }
            } catch (e) {}
          }

          results.push({
            name: entry.name,
            path: full,
            relativePath: rel,
            isDirectory: false,
            size: stat.size,
            extension: ext,
            modified: stat.mtimeMs,
            summary,
          });
        }
      }
    }

    await scan(folderPath);
    return { success: true, files: results };
  } catch (err) {
    return { success: false, error: err.message, files: [] };
  }
});

// ----------------------------------------------------
// IPC Handlers - External Integrations (Telegram / Discord)
// ----------------------------------------------------

ipcMain.handle('integrations:telegram-test', async (event, { botToken, chatId }) => {
  try {
    if (!botToken || !chatId) {
      return { success: false, error: 'Token del Bot y Chat ID son requeridos' };
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: '🤖 *¡Conexión Exitosa con Nai Agent!*\n\nTu bot de Telegram está vinculado y listo para enviarte notificaciones y documentos PDF en tiempo real.',
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'Error de autenticación con Telegram' };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:telegram-send-document', async (event, { botToken, chatId, filePath, caption }) => {
  try {
    if (!botToken || !chatId || !filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Parámetros incompletos o archivo no encontrado' };
    }

    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    const url = `https://api.telegram.org/bot${cleanToken}/sendDocument`;

    const fileBuffer = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('chat_id', cleanChatId);
    if (caption) formData.append('caption', caption);
    formData.append('document', new Blob([fileBuffer]), fileName);

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'Error al enviar documento a Telegram' };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:discord-test', async (event, { webhookUrl }) => {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { success: false, error: 'URL del Webhook de Discord inválida' };
    }

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Nai Agent',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
        embeds: [
          {
            title: '🤖 ¡Conexión Exitosa con Nai Agent!',
            description: 'El webhook de Discord está vinculado y listo para recibir alertas y documentos.',
            color: 0x9333ea,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Discord devolvió estado ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:discord-send-file', async (event, { webhookUrl, filePath, message }) => {
  try {
    if (!webhookUrl || !filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Parámetros incompletos o archivo no encontrado' };
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('content', message || `📄 Documento generado por Nai Agent: **${fileName}**`);
    formData.append('file', new Blob([fileBuffer]), fileName);

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Discord devolvió estado ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:whatsapp-test', async (event, { phone, apiKey }) => {
  try {
    if (!phone) {
      return { success: false, error: 'Por favor ingresa tu número de WhatsApp con código de país' };
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    const message = '🤖 *¡Conexión Exitosa con Nai Agent!*\n\nTu WhatsApp está vinculado para recibir reportes y resúmenes de proyectos.';

    if (apiKey) {
      // CallMeBot Free WhatsApp Gateway
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${apiKey.trim()}`;
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('Message Queued') || text.includes('success') || text.includes('OK') || res.ok) {
        return { success: true, message: 'Mensaje enviado a tu WhatsApp' };
      }
      return { success: false, error: text || 'Error en la pasarela de WhatsApp' };
    } else {
      // Open WhatsApp Web / App directly
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      await shell.openExternal(waUrl);
      return { success: true, message: 'Abriendo WhatsApp' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:whatsapp-send', async (event, { phone, apiKey, text, filePath }) => {
  try {
    const cleanPhone = (phone || '').replace(/[^\d]/g, '');
    let msg = text || '📄 Reporte de Nai Agent';
    if (filePath) {
      const fileName = path.basename(filePath);
      msg += `\n📁 Archivo: ${fileName}`;
    }

    if (apiKey && cleanPhone) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(msg)}&apikey=${apiKey.trim()}`;
      const res = await fetch(url);
      const resText = await res.text();
      return { success: true, resText };
    } else {
      const targetPhone = cleanPhone ? `${cleanPhone}` : '';
      const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      await shell.openExternal(waUrl);
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// IPC Handlers - Cloud Storage (Google Drive & Dropbox)
// ----------------------------------------------------

ipcMain.handle('integrations:select-cloud-folder', async (event, { title }) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Seleccionar Carpeta de Nube (Drive o Dropbox)',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return { canceled: false, folderPath: result.filePaths[0] };
  } catch (err) {
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('integrations:cloud-backup-file', async (event, { filePath, destinationFolder }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo de origen no encontrado' };
    }
    if (!destinationFolder || !fs.existsSync(destinationFolder)) {
      return { success: false, error: 'Carpeta de destino en la nube no encontrada' };
    }

    const fileName = path.basename(filePath);
    const destPath = path.join(destinationFolder, fileName);

    await fs.promises.copyFile(filePath, destPath);
    return { success: true, destPath, fileName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:dropbox-upload-api', async (event, { token, filePath, targetFolder = '' }) => {
  try {
    if (!token) {
      return { success: false, error: 'Token de acceso de Dropbox requerido' };
    }
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }

    const fileName = path.basename(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);
    const dropboxPath = targetFolder ? `/${targetFolder.replace(/^\//, '')}/${fileName}` : `/${fileName}`;

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: dropboxPath,
          mode: 'overwrite',
          autorename: true,
          mute: false,
          strict_conflict: false,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error_summary || 'Error al subir a Dropbox' };
    }

    return { success: true, data, fileName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:google-drive-test-webhook', async (event, { webhookUrl }) => {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { success: false, error: 'URL del Webhook de Google Apps Script inválida' };
    }

    const testPayload = {
      action: 'test',
      fileName: 'Nai_Agent_Test.txt',
      mimeType: 'text/plain',
      base64: Buffer.from('¡Conexión exitosa entre Nai Agent y Google Drive!').toString('base64'),
    };

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const resText = await res.text();
    let data;
    try {
      data = JSON.parse(resText);
    } catch {
      data = { status: resText };
    }

    if (!res.ok || (data.status && data.status === 'error')) {
      return { success: false, error: data.message || resText || 'Error en Google Webhook' };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('integrations:google-drive-webhook-upload', async (event, { webhookUrl, filePath, folderName }) => {
  try {
    if (!webhookUrl || !filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Parámetros incompletos o archivo no encontrado' };
    }

    const fileName = path.basename(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);
    const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

    const payload = {
      action: 'upload',
      fileName,
      mimeType,
      base64: fileBuffer.toString('base64'),
      folderName: folderName || 'Nai_Agent_Reportes',
    };

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const resText = await res.text();
    let data;
    try {
      data = JSON.parse(resText);
    } catch {
      data = { status: resText };
    }

    if (!res.ok || (data.status && data.status === 'error')) {
      return { success: false, error: data.message || resText || 'Error al subir a Google Drive' };
    }

    return { success: true, data, fileName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// IPC Handlers - High Fidelity Sandbox Server
// ----------------------------------------------------

const getSandboxDir = () => {
  const sandboxDir = path.join(app.getPath('userData'), 'sandbox_preview');
  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  }
  return sandboxDir;
};

ipcMain.handle('sandbox:update', async (event, { html, css, js, fullContent, basePath, filePath }) => {
  try {
    // If a real file from disk is provided, set server root to its directory or workspace
    if (filePath && fs.existsSync(filePath)) {
      const fileDir = path.dirname(filePath);
      activeServerRoot = basePath || fileDir;
      const fileName = path.basename(filePath);

      // In-memory override if modified in editor
      if (fullContent) {
        memoryOverrideFile = { name: fileName, content: fullContent };
      } else {
        memoryOverrideFile = { name: '', content: '' };
      }

      const localHttpUrl = `http://127.0.0.1:${localServerPort}/${encodeURIComponent(fileName)}?fullPath=${encodeURIComponent(filePath)}&t=${Date.now()}`;
      return {
        success: true,
        url: localHttpUrl,
      };
    }

    if (basePath && fs.existsSync(basePath)) {
      activeServerRoot = basePath;
    } else {
      activeServerRoot = getSandboxDir();
    }

    const sandboxDir = getSandboxDir();
    const indexPath = path.join(sandboxDir, 'index.html');

    let documentHtml = '';
    if (fullContent && (fullContent.includes('<!DOCTYPE') || fullContent.includes('<html'))) {
      documentHtml = fullContent;
    } else {
      documentHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sandbox Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    ${css || ''}
  </style>
</head>
<body>
  ${html || fullContent || '<div class="p-8 text-center text-slate-500">Esperando contenido...</div>'}
  <script>
    try {
      ${js || ''}
    } catch (err) {
      console.error('Error en Sandbox:', err);
    }
  </script>
</body>
</html>`;
    }

    await fs.promises.writeFile(indexPath, documentHtml, 'utf-8');
    memoryOverrideFile = { name: 'index.html', content: documentHtml };

    const localHttpUrl = `http://127.0.0.1:${localServerPort}/index.html?t=${Date.now()}`;

    return {
      success: true,
      url: localHttpUrl,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:open-external', async (event, url) => {
  try {
    if (url) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'URL inválida' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:open-path', async (event, targetPath) => {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      await shell.openPath(targetPath);
      return { success: true };
    }
    return { success: false, error: 'Ruta no encontrada' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:show-item-in-folder', async (event, targetPath) => {
  try {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return { success: true };
    }
    return { success: false, error: 'Ruta no encontrada' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// IPC Handlers - Direct PDF Creation & Export
// ----------------------------------------------------

ipcMain.handle('pdf:generate-direct', async (event, { htmlContent, outputPath, title = 'Documento' }) => {
  let printWin = null;
  let tempFile = '';
  try {
    if (!outputPath) {
      return { success: false, error: 'No se especificó la ruta de salida para el PDF' };
    }

    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }

    printWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Make sure HTML has nice styling for print
    let completeHtml = htmlContent;
    if (!completeHtml.includes('<html')) {
      completeHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background: white; padding: 20px; }
    h1, h2, h3 { color: #0f172a; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 600; }
    pre, code { background-color: #f8fafc; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body class="p-6">
  ${htmlContent}
</body>
</html>`;
    }

    tempFile = path.join(app.getPath('temp'), `nai_direct_print_${Date.now()}.html`);
    await fs.promises.writeFile(tempFile, completeHtml, 'utf-8');
    await printWin.loadFile(tempFile);

    // Wait for fonts & Tailwind
    await new Promise((r) => setTimeout(r, 1000));

    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await fs.promises.writeFile(outputPath, pdfBuffer);

    if (printWin && !printWin.isDestroyed()) {
      printWin.close();
    }

    try { if (tempFile && fs.existsSync(tempFile)) await fs.promises.unlink(tempFile); } catch (e) {}

    return {
      success: true,
      filePath: outputPath,
      filename: path.basename(outputPath),
      size: pdfBuffer.length,
    };
  } catch (err) {
    if (printWin && !printWin.isDestroyed()) printWin.close();
    try { if (tempFile && fs.existsSync(tempFile)) await fs.promises.unlink(tempFile); } catch (e) {}
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sandbox:export-pdf', async (event, { htmlContent, url, defaultFilename = 'documento.pdf' }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar como Documento PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'Documento PDF (*.pdf)', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) return { canceled: true };

    const printWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      await printWin.loadURL(url);
    } else {
      const tempFile = path.join(app.getPath('temp'), `nai_print_${Date.now()}.html`);
      await fs.promises.writeFile(tempFile, htmlContent || '<!DOCTYPE html><html><body><h1>Documento</h1></body></html>', 'utf-8');
      await printWin.loadFile(tempFile);
      setTimeout(async () => {
        try { await fs.promises.unlink(tempFile); } catch (e) {}
      }, 5000);
    }

    // Wait for fonts & CSS to render
    await new Promise((r) => setTimeout(r, 800));

    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await fs.promises.writeFile(filePath, pdfBuffer);
    printWin.close();

    return { success: true, filePath, filename: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// IPC Handlers - Chat History Storage
// ----------------------------------------------------

const getChatStorageFile = () => {
  const userDir = app.getPath('userData');
  return path.join(userDir, 'nai_agent_chats.json');
};

ipcMain.handle('chats:get-all', async () => {
  try {
    const filePath = getChatStorageFile();
    if (!fs.existsSync(filePath)) {
      return { success: true, chats: [] };
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const chats = JSON.parse(data || '[]');
    return { success: true, chats };
  } catch (err) {
    return { success: false, error: err.message, chats: [] };
  }
});

ipcMain.handle('chats:save-all', async (event, { chats }) => {
  try {
    const filePath = getChatStorageFile();
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, JSON.stringify(chats, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// Universal Real-Time Web Search Engine
// Supports: DuckDuckGo HTML Lite (Free/Zero-Key) + Tavily API (Custom Key)
// ----------------------------------------------------
async function performWebSearch(query, options = {}) {
  const maxResults = options.maxResults || 5;
  const tavilyKey = options.apiKey || options.tavilyApiKey || process.env.TAVILY_API_KEY || '';

  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return { success: true, results: [] };

  // 1. Tavily Search API (High quality AI search if API key is provided)
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: cleanQuery,
          search_depth: 'basic',
          include_answer: true,
          max_results: maxResults,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).slice(0, maxResults).map((r) => ({
          title: r.title || 'Resultado Web',
          snippet: r.content || r.snippet || '',
          url: r.url || '',
          source: 'Tavily',
        }));
        if (results.length > 0) {
          return { success: true, query: cleanQuery, results };
        }
      }
    } catch (e) {
      console.log('[WebSearch] Tavily API error:', e.message);
    }
  }

  // 2. DuckDuckGo HTML Lite Web Search (100% Free, zero configuration needed)
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const results = [];

      // Split by DuckDuckGo result blocks
      const resultBlocks = html.split(/class="[^"]*result\s+results_links[^"]*"/g).slice(1);

      for (const block of resultBlocks) {
        if (results.length >= maxResults) break;

        const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                             block.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const urlMatch = block.match(/<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"[^>]*>/i) ||
                         block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>/i);

        let rawUrl = (urlMatch ? urlMatch[1] : '').trim();
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            try { rawUrl = decodeURIComponent(uddgMatch[1]); } catch (e) {}
          }
        }

        const title = (titleMatch ? titleMatch[1] : '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const snippet = (snippetMatch ? snippetMatch[1] : '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

        if (title && rawUrl && rawUrl.startsWith('http')) {
          results.push({
            title,
            snippet: snippet || title,
            url: rawUrl,
            source: 'DuckDuckGo',
          });
        }
      }

      if (results.length > 0) {
        return { success: true, query: cleanQuery, results };
      }
    }
  } catch (e) {
    console.log('[WebSearch] DuckDuckGo HTML scraping error:', e.message);
  }

  // 3. Fallback: DuckDuckGo Instant Answer API
  try {
    const instantRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`);
    if (instantRes.ok) {
      const data = await instantRes.json();
      const results = [];
      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || cleanQuery,
          snippet: data.AbstractText,
          url: data.AbstractURL,
          source: data.AbstractSource || 'DuckDuckGo',
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= maxResults) break;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Resultado Web',
              snippet: topic.Text,
              url: topic.FirstURL,
              source: 'DuckDuckGo',
            });
          }
        }
      }
      if (results.length > 0) {
        return { success: true, query: cleanQuery, results };
      }
    }
  } catch (e) {
    console.log('[WebSearch] DuckDuckGo Instant API fallback error:', e.message);
  }

  return { success: false, query: cleanQuery, results: [], error: 'No se encontraron resultados web.' };
}

ipcMain.handle('web:search', async (event, { query, maxResults = 5, apiKey = '' }) => {
  return await performWebSearch(query, { maxResults, apiKey });
});

// ----------------------------------------------------
// IPC Handlers - App Info & AI
// ----------------------------------------------------

ipcMain.handle('app:get-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  };
});

let currentAIController = null;

ipcMain.handle('ai:abort-request', () => {
  if (currentAIController) {
    try {
      currentAIController.abort();
    } catch (e) {}
    currentAIController = null;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('ai:send-message', async (event, { provider, config, messages, model, temperature, max_tokens, webSearch = false, tavilyApiKey = '' }) => {
  try {
    let rawMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m && !m.isError && (m.content || m.images?.length > 0))
          .map((m) => {
            const role = m.role === 'system' || m.role === 'assistant' ? m.role : 'user';
            if (Array.isArray(m.images) && m.images.length > 0) {
              const parts = [];
              if (m.content && String(m.content).trim()) {
                parts.push({ type: 'text', text: String(m.content).trim() });
              }
              for (const img of m.images) {
                if (img) {
                  parts.push({
                    type: 'image_url',
                    image_url: { url: img },
                  });
                }
              }
              return { role, content: parts };
            }
            if (Array.isArray(m.content)) {
              return { role, content: m.content };
            }
            return {
              role,
              content: String(m.content || '').trim(),
            };
          })
      : [{ role: 'user', content: String(messages) }];

    // Separate system prompt and conversational chat
    const systemMessages = rawMessages.filter((m) => m.role === 'system');
    const chatHistory = rawMessages.filter((m) => m.role !== 'system');

    // Strip leading assistant messages (e.g. initial welcome message) so conversation ALWAYS starts with 'user'
    while (chatHistory.length > 0 && chatHistory[0].role === 'assistant') {
      chatHistory.shift();
    }

    // Merge consecutive messages with the same role (prevents HTTP 400 across all LLM engines)
    const cleanHistory = [];
    for (const m of chatHistory) {
      if (
        cleanHistory.length > 0 &&
        cleanHistory[cleanHistory.length - 1].role === m.role &&
        typeof cleanHistory[cleanHistory.length - 1].content === 'string' &&
        typeof m.content === 'string'
      ) {
        cleanHistory[cleanHistory.length - 1].content += '\n\n' + m.content;
      } else {
        cleanHistory.push(typeof m.content === 'object' ? { ...m } : { ...m });
      }
    }

    if (cleanHistory.length === 0) {
      cleanHistory.push({ role: 'user', content: 'Hola' });
    }

    const finalMessages = [...systemMessages, ...cleanHistory];
    let webResults = [];

    // 1. If Web Search is enabled, perform search and inject live context
    if (webSearch) {
      const lastUserMsg = [...finalMessages].reverse().find((m) => m.role === 'user');
      const searchQuery = typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.find((p) => p.type === 'text')?.text || ''
        : '';

      if (searchQuery) {
        const searchRes = await performWebSearch(searchQuery, {
          maxResults: 5,
          apiKey: tavilyApiKey || config?.tavilyApiKey,
        });

        if (searchRes.success && searchRes.results && searchRes.results.length > 0) {
          webResults = searchRes.results;

          const webContextString = [
            '=== INFORMACIÓN OBTENIDA DE LA WEB EN TIEMPO REAL ===',
            ...webResults.map(
              (r, idx) => `[${idx + 1}] Título: ${r.title}\n    URL: ${r.url}\n    Contenido: ${r.snippet}`
            ),
            '=== FIN DE INFORMACIÓN WEB ===',
            'Instrucciones: Utiliza la información web reciente anterior para responder de forma precisa, actualizada y objetiva a la duda del usuario. Cita o menciona las fuentes de ser relevante.',
          ].join('\n\n');

          const sysIdx = finalMessages.findIndex((m) => m.role === 'system');
          if (sysIdx !== -1) {
            finalMessages[sysIdx].content = `${finalMessages[sysIdx].content}\n\n${webContextString}`;
          } else {
            finalMessages.unshift({
              role: 'system',
              content: webContextString,
            });
          }
        }
      }
    }

    const endpointInfo = resolveProviderEndpoints(provider, config);
    const { chatUrl, apiKey, isAnthropicNative } = endpointInfo;

    const isLocalProvider = provider === 'lmstudio' || provider === 'ollama' || provider === 'custom';
    currentAIController = new AbortController();
    const controller = currentAIController;
    // Allow up to 15 minutes (900s) for heavy local models (Qwen 27B, 70B, long documents)
    const timeoutDuration = isLocalProvider ? 900000 : 180000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    let response;

    if (isAnthropicNative) {
      let systemPrompt = '';
      const formattedMessages = [];

      for (const m of finalMessages) {
        if (m.role === 'system') {
          systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + m.content;
        } else {
          formattedMessages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          });
        }
      }

      const payload = {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: max_tokens || 4096,
        messages: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', content: 'Hola' }],
        temperature: temperature !== undefined ? temperature : 0.7,
      };

      if (systemPrompt) {
        payload.system = systemPrompt;
      }

      response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let parsed;
        try { parsed = JSON.parse(errorText); } catch { parsed = { message: errorText }; }
        return {
          success: false,
          status: response.status,
          error: parsed.error?.message || parsed.message || `Anthropic HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const textContent = data.content?.find((c) => c.type === 'text')?.text || '';

      return {
        success: true,
        content: textContent,
        usage: data.usage || null,
        model: data.model || model,
        webResults,
        raw: data,
      };
    } else {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        if (provider === 'google') {
          headers['x-goog-api-key'] = apiKey;
        }
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://nai-agent.app';
        headers['X-Title'] = 'Nai Agent';
      }

      let effectiveModel = model;
      if (provider === 'lmstudio' && (!effectiveModel || effectiveModel === 'local-model' || effectiveModel === 'default')) {
        try {
          const mRes = await fetch(modelsUrl, { headers, signal: controller.signal });
          if (mRes.ok) {
            const mData = await mRes.json();
            if (Array.isArray(mData.data) && mData.data.length > 0) {
              const textModels = mData.data.filter((m) => !m.id.toLowerCase().includes('embed'));
              effectiveModel = (textModels[0] || mData.data[0]).id;
            }
          }
        } catch (e) {}
      }

      // Check if any message has multimodal content
      const hasMultimodal = finalMessages.some((m) => Array.isArray(m.content));

      const buildPayload = (usePlainStrings = false) => {
        const msgs = finalMessages.map((m) => {
          if (usePlainStrings || !Array.isArray(m.content)) {
            return {
              role: m.role,
              content: typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                ? m.content.map((p) => (p.type === 'text' ? p.text : '')).filter(Boolean).join('\n')
                : String(m.content || ''),
            };
          }
          return { role: m.role, content: m.content };
        });

        const p = {
          model: effectiveModel || (
            provider === 'groq' ? 'llama-3.3-70b-versatile' :
            provider === 'google' ? 'gemini-2.0-flash' :
            provider === 'openai' ? 'gpt-4o' :
            provider === 'github' ? 'gpt-4o' :
            provider === 'deepseek' ? 'deepseek-chat' :
            provider === 'mistral' ? 'mistral-large-latest' :
            provider === 'perplexity' ? 'sonar' :
            provider === 'ollama' ? 'llama3:8b' :
            provider === 'lmstudio' ? 'local-model' :
            'openai/gpt-4o-mini'
          ),
          messages: msgs,
          stream: false,
        };

        if (temperature !== undefined && !effectiveModel?.includes('o1') && !effectiveModel?.includes('o3')) {
          p.temperature = temperature;
        }
        if (max_tokens) p.max_tokens = max_tokens;
        return p;
      };

      let payload = buildPayload(false);

      try {
        response = await fetch(chatUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        // If OpenRouter / Groq / other provider fails with HTTP 400 (due to multimodal array on a text-only model), retry with clean string content
        if (!response.ok && (response.status === 400 || response.status === 422) && hasMultimodal) {
          console.warn('[AI] Retrying with sanitized plain text messages for text-only model...');
          payload = buildPayload(true);
          response = await fetch(chatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }

        // If OpenRouter fails with upstream error (e.g. 500, 502 "Provider returned error", 404), fallback to reliable model
        if (!response.ok && provider === 'openrouter' && (response.status >= 500 || response.status === 404 || response.status === 429)) {
          console.warn('[OpenRouter] Upstream provider error. Retrying with reliable fallback model...');
          payload = buildPayload(true);
          payload.model = payload.model?.includes(':free') ? 'meta-llama/llama-3.3-70b-instruct:free' : 'openai/gpt-4o-mini';
          response = await fetch(chatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        }
      } catch (postErr) {
        if (provider === 'lmstudio' && (chatUrl.includes('127.0.0.1') || chatUrl.includes('localhost'))) {
          const altChatUrl = chatUrl.includes('127.0.0.1')
            ? chatUrl.replace('127.0.0.1', 'localhost')
            : chatUrl.replace('localhost', '127.0.0.1');
          response = await fetch(altChatUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        } else {
          throw postErr;
        }
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try { parsedError = JSON.parse(errorText); } catch { parsedError = { message: errorText }; }
        const errDetail = parsedError.error?.message || parsedError.message || errorText || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[AI Error Response]', response.status, errDetail);
        return {
          success: false,
          status: response.status,
          error: errDetail,
        };
      }

      const data = await response.json();
      const choiceMsg = data.choices?.[0]?.message;
      let messageContent = choiceMsg?.content ?? '';
      if (!messageContent && choiceMsg?.reasoning_content) {
        messageContent = choiceMsg.reasoning_content;
      }

      return {
        success: true,
        content: messageContent,
        usage: data.usage || null,
        model: data.model || model,
        webResults,
        raw: data,
      };
    }
  } catch (err) {
    const wasAborted = err.name === 'AbortError' || err.message?.includes('aborted');
    return {
      success: false,
      aborted: wasAborted,
      error: wasAborted ? 'Generación detenida.' : err.message,
    };
  } finally {
    currentAIController = null;
  }
});

ipcMain.handle('ai:fetch-models', async (event, { provider, config }) => {
  try {
    const { baseUrl, modelsUrl, apiKey, isAnthropicNative } = resolveProviderEndpoints(provider, config);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;

    const DEFAULT_PROVIDER_MODELS = {
      anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      ],
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'o3-mini', name: 'o3-mini (Razonamiento)' },
        { id: 'o1', name: 'o1' },
      ],
      google: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Exp' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      ],
      groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
        { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
      ],
      deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)' },
      ],
      github: [
        { id: 'gpt-4o', name: 'GPT-4o (GitHub Token)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'Phi-3.5-mini-instruct', name: 'Microsoft Phi-3.5 Mini' },
        { id: 'Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
      ],
      mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large' },
        { id: 'codestral-latest', name: 'Codestral (Programación)' },
        { id: 'ministral-8b-latest', name: 'Ministral 8B' },
      ],
      openrouter: [
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
        { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
      ],
    };

    if (isAnthropicNative) {
      if (!apiKey) {
        clearTimeout(timeoutId);
        return {
          success: false,
          error: 'Por favor ingresa tu API Key de Anthropic Claude.',
          models: DEFAULT_PROVIDER_MODELS.anthropic,
        };
      }
      clearTimeout(timeoutId);
      return {
        success: true,
        models: DEFAULT_PROVIDER_MODELS.anthropic,
        count: DEFAULT_PROVIDER_MODELS.anthropic.length,
      };
    } else {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        if (provider === 'google') {
          headers['x-goog-api-key'] = apiKey;
        }
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://nai-agent.app';
        headers['X-Title'] = 'Nai Agent';
      }

      try {
        response = await fetch(modelsUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        if (provider === 'lmstudio') {
          // Fallback to localhost if 127.0.0.1 failed, or try api/v0/models
          const altUrl = modelsUrl.includes('127.0.0.1')
            ? modelsUrl.replace('127.0.0.1', 'localhost')
            : modelsUrl.replace('localhost', '127.0.0.1');
          try {
            response = await fetch(altUrl, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
          } catch (e2) {
            const v0Url = baseUrl.replace(/\/v1$/, '') + '/api/v0/models';
            try {
              response = await fetch(v0Url, { method: 'GET', headers, signal: controller.signal });
            } catch (e3) {
              clearTimeout(timeoutId);
              return {
                success: false,
                error: `No se pudo conectar a LM Studio en ${baseUrl}. Asegúrate de tener LM Studio abierto y el servidor local iniciado en la pestaña 'Local Server' (<->) en el puerto 1234.`,
                models: [],
              };
            }
          }
        } else if (provider === 'ollama') {
          const ollamaTagsUrl = baseUrl.replace(/\/v1$/, '') + '/api/tags';
          try {
            response = await fetch(ollamaTagsUrl, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
          } catch (e) {
            clearTimeout(timeoutId);
            return {
              success: false,
              error: `No se pudo conectar a Ollama en ${baseUrl}. Asegúrate de que el servicio de Ollama esté ejecutándose ('ollama serve').`,
              models: [],
            };
          }
        } else if (DEFAULT_PROVIDER_MODELS[provider] && apiKey) {
          clearTimeout(timeoutId);
          return {
            success: true,
            models: DEFAULT_PROVIDER_MODELS[provider],
            count: DEFAULT_PROVIDER_MODELS[provider].length,
          };
        } else {
          clearTimeout(timeoutId);
          return {
            success: false,
            error: `Error de red al conectar con ${baseUrl}: ${fetchErr.message}`,
            models: DEFAULT_PROVIDER_MODELS[provider] || [],
          };
        }
      }
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (DEFAULT_PROVIDER_MODELS[provider] && apiKey) {
        return {
          success: true,
          models: DEFAULT_PROVIDER_MODELS[provider],
          count: DEFAULT_PROVIDER_MODELS[provider].length,
        };
      }
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText} (${errorText.slice(0, 150)})`,
        models: DEFAULT_PROVIDER_MODELS[provider] || [],
      };
    }

    const data = await response.json();
    let modelsList = [];

    const isChatModel = (m) => {
      const id = (m.id || m.name || m.model || '').toLowerCase();
      const type = (m.type || '').toLowerCase();
      if (type === 'embeddings' || type === 'embedding') return false;
      if (
        id.includes('embed') ||
        id.includes('embedding') ||
        id.includes('bge-') ||
        id.includes('nomic-bert') ||
        id.includes('rerank') ||
        id.includes('whisper') ||
        id.includes('tts')
      ) {
        return false;
      }
      return true;
    };

    if (Array.isArray(data.data)) {
      modelsList = data.data
        .filter(isChatModel)
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.name || m.id,
        }));
    } else if (Array.isArray(data.models)) {
      modelsList = data.models
        .filter(isChatModel)
        .map((m) => ({
          id: m.name || m.model || m.id,
          name: m.name || m.model || m.id,
        }));
    }

    if (modelsList.length === 0 && DEFAULT_PROVIDER_MODELS[provider]) {
      modelsList = DEFAULT_PROVIDER_MODELS[provider];
    } else if (modelsList.length === 0 && (provider === 'lmstudio' || provider === 'ollama' || provider === 'custom')) {
      modelsList = [
        { id: 'local-model', name: 'Modelo Activo en Servidor Local' },
      ];
    }

    return {
      success: true,
      models: modelsList,
      count: modelsList.length,
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Tiempo de espera agotado al consultar modelos.' : err.message,
      models: [],
    };
  }
});




// ----------------------------------------------------
// IPC Handlers - Multimedia & Audio / Video Processing (FFmpeg Native & Subtitles)
// ----------------------------------------------------

function convertSrtToVtt(srtText) {
  if (!srtText) return 'WEBVTT\n\n';
  return 'WEBVTT\n\n' + srtText
    .replace(/\r\n|\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .trim();
}

// 1. Extract Audio from Video (MP3 / WAV)
ipcMain.handle('media:extract-audio', async (event, { videoPath, outputPath }) => {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return { success: false, error: `Archivo de video no encontrado: ${videoPath}` };
    }

    const ext = path.extname(outputPath || '').toLowerCase();
    const finalOutput = outputPath || path.join(path.dirname(videoPath), `${path.basename(videoPath, path.extname(videoPath))}.mp3`);
    const parentDir = path.dirname(finalOutput);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    const isWav = ext === '.wav';
    const audioCodec = isWav ? '-acodec pcm_s16le -ar 16000 -ac 1' : '-vn -acodec libmp3lame -q:a 2';

    const cmd = `ffmpeg -y -i "${videoPath}" ${audioCodec} "${finalOutput}"`;
    await execAsync(cmd);

    return {
      success: true,
      outputPath: finalOutput,
      filename: path.basename(finalOutput),
      format: isWav ? 'wav' : 'mp3',
    };
  } catch (err) {
    return { success: false, error: `Error extrayendo audio con FFmpeg: ${err.message}` };
  }
});

// 2. Concatenate / Join Multiple Videos into One (Robust filter_complex engine)
ipcMain.handle('media:concat-videos', async (event, { videoPaths, outputPath }) => {
  try {
    if (!Array.isArray(videoPaths) || videoPaths.length < 2) {
      return { success: false, error: 'Se requieren al menos 2 videos para unir' };
    }

    const validPaths = videoPaths.filter((p) => p && fs.existsSync(p));
    if (validPaths.length < 2) {
      return { success: false, error: 'No se encontraron los archivos de video en el disco' };
    }

    const firstDir = path.dirname(validPaths[0]);
    const finalOutput = outputPath || path.join(firstDir, `Video_Unido_${Date.now()}.mp4`);
    const parentDir = path.dirname(finalOutput);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    // Universal filter_complex concat handles any resolution, framerate, and codecs
    const inputsStr = validPaths.map((p) => `-i "${p}"`).join(' ');
    const filterInputs = validPaths.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('');
    const filterComplex = `"${filterInputs}concat=n=${validPaths.length}:v=1:a=1[v][a]"`;

    let cmd = `ffmpeg -y ${inputsStr} -filter_complex ${filterComplex} -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 22 -c:a aac "${finalOutput}"`;

    try {
      await execAsync(cmd);
    } catch (eWithAudio) {
      // Fallback: If one video lacks an audio track, concat video streams
      const filterVideoOnly = `"${validPaths.map((_, i) => `[${i}:v:0]`).join('')}concat=n=${validPaths.length}:v=1:a=0[v]"`;
      const cmdVideoOnly = `ffmpeg -y ${inputsStr} -filter_complex ${filterVideoOnly} -map "[v]" -c:v libx264 -preset fast -crf 22 "${finalOutput}"`;
      await execAsync(cmdVideoOnly);
    }

    return {
      success: true,
      outputPath: finalOutput,
      filename: path.basename(finalOutput),
      count: validPaths.length,
    };
  } catch (err) {
    return { success: false, error: `Error al unir videos: ${err.message}` };
  }
});

// 3. Cut / Trim Video Fragment
ipcMain.handle('media:cut-video', async (event, { videoPath, outputPath, startTime, endTime, duration }) => {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return { success: false, error: `Archivo de video no encontrado: ${videoPath}` };
    }

    const ext = path.extname(videoPath);
    const finalOutput = outputPath || path.join(path.dirname(videoPath), `${path.basename(videoPath, ext)}_clip_${Date.now()}${ext}`);
    const parentDir = path.dirname(finalOutput);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    let timeArgs = '';
    if (startTime) timeArgs += `-ss ${startTime} `;
    if (endTime) timeArgs += `-to ${endTime} `;
    else if (duration) timeArgs += `-t ${duration} `;

    const cmd = `ffmpeg -y ${timeArgs}-i "${videoPath}" -c copy "${finalOutput}"`;
    await execAsync(cmd);

    return {
      success: true,
      outputPath: finalOutput,
      filename: path.basename(finalOutput),
      startTime,
      endTime,
    };
  } catch (err) {
    return { success: false, error: `Error recortando video: ${err.message}` };
  }
});

// 4. Resize / Convert / Optimize Image
ipcMain.handle('media:resize-image', async (event, { inputPath, outputPath, width, height, format, quality = 85 }) => {
  try {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return { success: false, error: `Imagen no encontrada: ${inputPath}` };
    }

    const targetExt = format ? (format.startsWith('.') ? format : `.${format}`) : path.extname(inputPath);
    const finalOutput = outputPath || path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}_resized${targetExt}`);
    const parentDir = path.dirname(finalOutput);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    let scaleFilter = '';
    if (width && height) {
      scaleFilter = `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease"`;
    } else if (width) {
      scaleFilter = `-vf "scale=${width}:-1"`;
    } else if (height) {
      scaleFilter = `-vf "scale=-1:${height}"`;
    }

    const cmd = `ffmpeg -y -i "${inputPath}" ${scaleFilter} "${finalOutput}"`;
    await execAsync(cmd);

    return {
      success: true,
      outputPath: finalOutput,
      filename: path.basename(finalOutput),
      width,
      height,
    };
  } catch (err) {
    return { success: false, error: `Error redimensionando imagen: ${err.message}` };
  }
});

// 5. Generate & Save Subtitles (SRT + VTT)
ipcMain.handle('media:generate-subtitles', async (event, { srtPath, content, vttContent }) => {
  try {
    if (!srtPath) return { success: false, error: 'Ruta del archivo de subtítulos requerida' };

    const parentDir = path.dirname(srtPath);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    const cleanSrt = (content || '').trim();
    await fs.promises.writeFile(srtPath, cleanSrt, 'utf-8');

    // Also auto-generate companion .vtt for browser player preview
    const vttPath = srtPath.replace(/\.srt$/i, '.vtt');
    const cleanVtt = vttContent || convertSrtToVtt(cleanSrt);
    await fs.promises.writeFile(vttPath, cleanVtt, 'utf-8');

    return {
      success: true,
      srtPath,
      vttPath,
      filename: path.basename(srtPath),
      vttFilename: path.basename(vttPath),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// Native Subtitle Translation Engine (Timecode-Preserving)
// ----------------------------------------------------
async function translateTextFree(text, targetLang = 'es') {
  try {
    const lang = targetLang === 'español' || targetLang === 'espanol' ? 'es' : targetLang === 'ingles' || targetLang === 'inglés' ? 'en' : targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data[0])) {
        return data[0].map((item) => item[0]).join('');
      }
    }
  } catch (e) {
    console.error('Subtitle line translation error:', e);
  }
  return text;
}

async function translateSrtFileContent(rawSrt, targetLang = 'es') {
  if (!rawSrt) return '';
  const blocks = rawSrt.replace(/\r\n/g, '\n').split(/\n\s*\n/).filter(Boolean);
  const translatedBlocks = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const indexLine = lines[0];
      const timeLine = lines[1];
      const textLines = lines.slice(2).join(' ');

      if (timeLine.includes('-->') && textLines) {
        const translated = await translateTextFree(textLines, targetLang);
        translatedBlocks.push(`${indexLine}\n${timeLine}\n${translated}`);
      } else {
        translatedBlocks.push(block);
      }
    } else {
      translatedBlocks.push(block);
    }
  }

  return translatedBlocks.join('\n\n');
}

// 6. Translate Subtitles File (Preserving Timecodes)
ipcMain.handle('media:translate-subtitles', async (event, { srtPath, targetLang = 'es', targetPath = '', translatedContent = '' }) => {
  try {
    let sourceSrt = '';
    if (srtPath && fs.existsSync(srtPath)) {
      sourceSrt = await fs.promises.readFile(srtPath, 'utf-8');
    }

    let finalContent = (translatedContent || '').trim();
    const isPlaceholder = !finalContent || finalContent.startsWith('*') || finalContent.startsWith('[') || !finalContent.includes('-->');

    if (isPlaceholder && sourceSrt) {
      finalContent = await translateSrtFileContent(sourceSrt, targetLang);
    }

    if (!finalContent && sourceSrt) {
      finalContent = await translateSrtFileContent(sourceSrt, targetLang);
    }

    const finalPath = targetPath || (srtPath ? srtPath.replace(/\.(srt|vtt)$/i, `_${targetLang}.srt`) : '');
    if (!finalPath) return { success: false, error: 'Ruta de archivo no especificada' };

    const parentDir = path.dirname(finalPath);
    if (!fs.existsSync(parentDir)) await fs.promises.mkdir(parentDir, { recursive: true });

    await fs.promises.writeFile(finalPath, finalContent, 'utf-8');

    const vttPath = finalPath.replace(/\.srt$/i, '.vtt');
    await fs.promises.writeFile(vttPath, convertSrtToVtt(finalContent), 'utf-8');

    return {
      success: true,
      srtPath: finalPath,
      vttPath,
      filename: path.basename(finalPath),
      content: finalContent,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function formatSecondsToSrtTime(seconds) {
  const sec = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  const millis = Math.floor((sec % 1) * 1000);
  const pad = (n, z = 2) => String(n).padStart(z, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

// 7. Auto Transcribe Video to SRT / VTT with Whisper
ipcMain.handle('media:auto-transcribe-video', async (event, { videoPath, targetLang = 'es', lang = '', outputPath = '', apiKey = '', provider = 'groq' }) => {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return { success: false, error: `Video no encontrado: ${videoPath}` };
    }

    const tempAudio = path.join(app.getPath('temp'), `nai_whisper_${Date.now()}.mp3`);
    // Extract lightweight mono 16kHz audio for Whisper API (max 25MB)
    const cmd = `ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k "${tempAudio}"`;
    await execAsync(cmd);

    const baseName = path.basename(videoPath, path.extname(videoPath));
    const targetDir = path.dirname(videoPath);
    const requestedLang = lang || targetLang || 'es';
    const isTranslateToEnglish = requestedLang === 'en' || requestedLang === 'english' || requestedLang === 'ingles';

    const defaultSrtName = isTranslateToEnglish ? `${baseName}_en.srt` : `${baseName}_subtitulos.srt`;
    const srtPath = outputPath ? (outputPath.endsWith('.vtt') ? outputPath.replace(/\.vtt$/, '.srt') : outputPath) : path.join(targetDir, defaultSrtName);
    const vttPath = srtPath.replace(/\.srt$/, '.vtt');

    let generatedSrt = '';

    // If Groq or OpenAI key is provided, transcribe with Whisper API
    const effectiveKey = apiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
    const isGroq = provider === 'groq' || !provider || effectiveKey.startsWith('gsk_');

    if (effectiveKey) {
      try {
        const audioBuffer = await fs.promises.readFile(tempAudio);
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer]), path.basename(tempAudio));
        formData.append('model', isGroq ? 'whisper-large-v3-turbo' : 'whisper-1');
        formData.append('response_format', 'verbose_json');
        if (isTranslateToEnglish) {
          formData.append('language', 'en');
        }

        const endpoint = isTranslateToEnglish ? 'translations' : 'transcriptions';
        const apiUrl = isGroq
          ? `https://api.groq.com/openai/v1/audio/${endpoint}`
          : `https://api.openai.com/v1/audio/${endpoint}`;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${effectiveKey.trim()}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.segments) && data.segments.length > 0) {
            generatedSrt = data.segments.map((seg, idx) => {
              const start = formatSecondsToSrtTime(seg.start);
              const end = formatSecondsToSrtTime(seg.end);
              const text = (seg.text || '').trim();
              return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
            }).join('\n');
          } else if (data.text) {
            generatedSrt = `1\n00:00:01,000 --> 00:00:10,000\n${data.text.trim()}\n`;
          }
        }
      } catch (err) {
        console.error('Whisper API transcription error:', err);
      }
    }

    // 2. If no cloud key or API call returned empty, run local native Whisper offline!
    if (!generatedSrt && fs.existsSync(tempAudio)) {
      try {
        const whisperTask = isTranslateToEnglish ? 'translate' : 'transcribe';
        const localText = await transcribeAudioFileLocal(tempAudio, requestedLang, whisperTask);
        if (localText) {
          const sentences = localText.split(/(?<=[.?!])\s+/).filter(Boolean);
          if (sentences.length > 0) {
            generatedSrt = sentences.map((sent, i) => {
              const startSec = i * 4;
              const endSec = startSec + 4;
              const formatTc = (s) => {
                const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
                const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
                const secs = String(Math.floor(s % 60)).padStart(2, '0');
                return `${hrs}:${mins}:${secs},000`;
              };
              return `${i + 1}\n${formatTc(startSec)} --> ${formatTc(endSec)}\n${sent.trim()}`;
            }).join('\n\n');
          } else {
            generatedSrt = `1\n00:00:01,000 --> 00:00:10,000\n${localText}\n`;
          }
        }
      } catch (localErr) {
        console.error('Local Whisper video transcription fallback error:', localErr);
      }
    }

    // Cleanup temp audio
    try { if (fs.existsSync(tempAudio)) await fs.promises.unlink(tempAudio); } catch (e) {}

    // Fallback template if no speech detected
    if (!generatedSrt) {
      generatedSrt = `1\n00:00:01,000 --> 00:00:05,000\n[Audio sincronizado de ${baseName}]\n`;
    } else if (requestedLang === 'es' || requestedLang === 'español' || requestedLang === 'spanish') {
      // Auto-translate speech dialogues to Spanish preserving all timecodes
      try {
        generatedSrt = await translateSrtFileContent(generatedSrt, 'es');
      } catch (transErr) {
        console.error('Subtitle auto-translation to Spanish error:', transErr);
      }
    }

    await fs.promises.writeFile(srtPath, generatedSrt.trim(), 'utf-8');
    await fs.promises.writeFile(vttPath, convertSrtToVtt(generatedSrt), 'utf-8');

    return {
      success: true,
      srtPath,
      vttPath,
      filename: path.basename(srtPath),
      content: generatedSrt,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// Local Offline Whisper Engine (@xenova/transformers)
// ----------------------------------------------------
let localTranscriber = null;

async function getLocalTranscriber() {
  if (!localTranscriber) {
    const { pipeline, env } = await import('@xenova/transformers');
    env.cacheDir = path.join(app.getPath('userData'), 'transformers_cache');
    localTranscriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      quantized: true,
    });
  }
  return localTranscriber;
}

const wavefile = require('wavefile');

async function transcribeAudioFileLocal(audioFilePath, lang = 'spanish', task = 'transcribe') {
  try {
    const tempWav = path.join(app.getPath('temp'), `nai_local_whisper_${Date.now()}.wav`);
    const cmd = `ffmpeg -y -i "${audioFilePath}" -ar 16000 -ac 1 -c:a pcm_s16le "${tempWav}"`;
    await execAsync(cmd);

    const buffer = await fs.promises.readFile(tempWav);
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      if (audioData.length > 1) {
        const SCALING_FACTOR = Math.sqrt(2);
        for (let i = 0; i < audioData[0].length; ++i) {
          audioData[0][i] = (audioData[0][i] + audioData[1][i]) / SCALING_FACTOR;
        }
      }
      audioData = audioData[0];
    }

    const transcriber = await getLocalTranscriber();
    const languageCode = (lang === 'en' || lang === 'english' || lang === 'ingles') ? 'english' : 'spanish';

    // Chunk in 30-second segments (480,000 samples) to ensure zero memory exhaustion
    const CHUNK_SIZE = 16000 * 30;
    const totalSamples = audioData.length;
    let fullText = '';

    if (totalSamples <= CHUNK_SIZE) {
      const output = await transcriber(audioData, {
        language: languageCode,
        task: task || 'transcribe',
      });
      fullText = output?.text?.trim() || '';
    } else {
      const chunks = [];
      for (let offset = 0; offset < totalSamples; offset += CHUNK_SIZE) {
        const chunkSlice = audioData.slice(offset, Math.min(offset + CHUNK_SIZE, totalSamples));
        if (chunkSlice.length > 8000) {
          const chunkRes = await transcriber(chunkSlice, {
            language: languageCode,
            task: task || 'transcribe',
          });
          if (chunkRes?.text) {
            chunks.push(chunkRes.text.trim());
          }
        }
      }
      fullText = chunks.join(' ');
    }

    try { await fs.promises.unlink(tempWav); } catch (e) {}
    return fullText.trim();
  } catch (err) {
    console.error('Error in local Whisper transcription:', err);
    return '';
  }
}

// 8. Transcribe Live Audio Buffer / Voice Dictation (Local Native Whisper + Cloud Fallback)
ipcMain.handle('media:transcribe-audio-buffer', async (event, { base64Audio, mimeType = 'audio/webm', lang = 'es', apiKey = '', provider = '' }) => {
  try {
    if (!base64Audio) return { success: false, error: 'No se recibió audio' };
    const rawBase64 = base64Audio.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    const ext = mimeType.includes('wav') ? '.wav' : mimeType.includes('mp3') ? '.mp3' : '.webm';
    const tempAudio = path.join(app.getPath('temp'), `nai_voice_${Date.now()}${ext}`);
    await fs.promises.writeFile(tempAudio, buffer);

    let effectiveKey = apiKey || '';
    let effectiveProvider = provider || '';

    // If not passed directly, look for any available key in environment
    if (!effectiveKey) {
      if (process.env.GROQ_API_KEY) {
        effectiveKey = process.env.GROQ_API_KEY;
        effectiveProvider = 'groq';
      } else if (process.env.OPENAI_API_KEY) {
        effectiveKey = process.env.OPENAI_API_KEY;
        effectiveProvider = 'openai';
      } else if (process.env.GEMINI_API_KEY) {
        effectiveKey = process.env.GEMINI_API_KEY;
        effectiveProvider = 'google';
      }
    }

    let transcribedText = '';

    // 1. If user has cloud key, use ultra-fast cloud API
    if (effectiveKey) {
      if (effectiveProvider === 'google' || effectiveKey.startsWith('AIza')) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey.trim()}`;
          const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: mimeType.split(';')[0] || 'audio/webm', data: rawBase64 } },
                  { text: 'Transcribe fielmente las palabras de este audio en español. Devuelve ÚNICAMENTE el texto hablado, sin notas, sin comillas, sin introducciones.' },
                ],
              }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            transcribedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          }
        } catch (geminiErr) {
          console.error('Gemini audio transcription error:', geminiErr);
        }
      } else {
        const isGroq = effectiveProvider === 'groq' || effectiveKey.startsWith('gsk_');
        try {
          const formData = new FormData();
          formData.append('file', new Blob([buffer]), path.basename(tempAudio));
          formData.append('model', isGroq ? 'whisper-large-v3-turbo' : 'whisper-1');
          formData.append('response_format', 'text');
          if (lang) formData.append('language', lang);

          const apiUrl = isGroq
            ? 'https://api.groq.com/openai/v1/audio/transcriptions'
            : 'https://api.openai.com/v1/audio/transcriptions';

          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${effectiveKey.trim()}` },
            body: formData,
          });

          if (res.ok) {
            transcribedText = (await res.text()).trim();
          }
        } catch (whisperErr) {
          console.error('Whisper transcription error:', whisperErr);
        }
      }
    }

    // 2. If no cloud key or cloud call failed, run 100% Native Local Offline Whisper!
    if (!transcribedText) {
      transcribedText = await transcribeAudioFileLocal(tempAudio, lang || 'spanish');
    }

    try { await fs.promises.unlink(tempAudio); } catch (e) {}

    return {
      success: true,
      text: transcribedText,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 9. Video / Audio Streaming Data URL Reader
ipcMain.handle('media:read-video-data-url', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'video/mp4';
    const buffer = await fs.promises.readFile(filePath);
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    return { success: true, dataUrl, mime };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------
// Hardware Profiler & Recommended Model Analyzer
// ----------------------------------------------------
async function detectSystemHardware() {
  const totalRamGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  let gpuName = 'GPU Integrada / Genérica';
  let vramGB = 4;

  try {
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
        const line = stdout.trim().split('\n')[0];
        if (line) {
          const parts = line.split(',');
          gpuName = parts[0]?.trim() || gpuName;
          const mb = parseInt(parts[1]?.trim() || '4096', 10);
          vramGB = Math.round(mb / 1024);
        }
      } catch (eNvidia) {
        const { stdout: wmicOut } = await execAsync('wmic path win32_VideoController get name,adapterram');
        const lines = wmicOut.trim().split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const firstGpu = lines[1].split(/\s{2,}/);
          if (firstGpu.length >= 2) {
            const bytes = parseInt(firstGpu[0] || '0', 10);
            gpuName = firstGpu[1] || gpuName;
            if (bytes > 0) vramGB = Math.round(bytes / (1024 * 1024 * 1024));
          }
        }
      }
    } else if (process.platform === 'darwin') {
      try {
        const { stdout } = await execAsync('sysctl -n machdep.cpu.brand_string');
        if (stdout && stdout.trim()) {
          gpuName = `${stdout.trim()} (Metal GPU)`;
        } else {
          gpuName = 'Apple Silicon Metal GPU';
        }
        // Unified memory on macOS acts as high-speed VRAM for Metal
        vramGB = Math.max(4, Math.round(totalRamGB * 0.75));
      } catch (eMac) {
        gpuName = 'Apple Metal Graphics';
        vramGB = Math.max(4, Math.round(totalRamGB * 0.5));
      }
    }
  } catch (err) {
    console.warn('Hardware detection fallback:', err.message);
  }

  const canEditWithFlux = vramGB >= 6 || (vramGB >= 4 && totalRamGB >= 32);

  if (vramGB >= 12 || (vramGB >= 8 && totalRamGB >= 32)) {
    profile = 'high';
    recommendedModel = 'Krea v2 Q8 GGUF';
    maxResolution = '1024x1024';
  } else if (vramGB >= 6) {
    profile = 'balanced';
    recommendedModel = 'Krea v2 Q4 GGUF';
    maxResolution = '768x768';
  } else {
    profile = 'lite';
    recommendedModel = 'SD 1.5 LCM Q4 GGUF';
    maxResolution = '512x512';
  }

  return {
    gpuName,
    vramGB,
    totalRamGB,
    profile,
    recommendedModel,
    maxResolution,
    canEditWithFlux,
    editModel: canEditWithFlux ? 'Flux Klein GGUF' : null,
  };
}

function getAppModelsDir() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const candidateRoots = [
    path.join(appData, 'NaiAgent', 'models'),
    path.join(app.getPath('userData'), 'models'),
    path.join(appData, 'nai-agent', 'models'),
  ];

  let baseDir = candidateRoots[0];
  for (const c of candidateRoots) {
    if (fs.existsSync(c)) {
      baseDir = c;
      break;
    }
  }

  const dirs = {
    root: baseDir,
    diffusion: path.join(baseDir, 'diffusion'),
    unet: path.join(baseDir, 'unet'),
    clip: path.join(baseDir, 'clip'),
    vae: path.join(baseDir, 'vae'),
    bin: path.join(baseDir, '..', 'bin'),
  };
  Object.values(dirs).forEach((d) => {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    }
  });
  return dirs;
}

function getSdCliBinaryPath() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const binaryName = isWin ? 'sd-cli.exe' : 'sd-cli';
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

  const candidatePaths = [
    path.join(appData, 'NaiAgent', 'bin', 'sdcpp', binaryName),
    path.join(app.getPath('userData'), 'bin', 'sdcpp', binaryName),
    path.join(appData, 'nai-agent', 'bin', 'sdcpp', binaryName),
    path.join(process.resourcesPath, 'bin', binaryName),
    path.join(__dirname, '../bin', isWin ? 'win' : isMac ? 'mac' : 'linux', binaryName),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }

  return candidatePaths[0];
}

const LOCAL_MODELS_CATALOG = {
  krea2_turbo: {
    id: 'krea2_turbo',
    name: 'Krea 2 Turbo Q4_K_M (Motor Principal)',
    type: 'diffusion',
    filename: 'Krea-2-Turbo-Q4_K_M.gguf',
    sizeBytes: 7215545088,
    url: 'https://huggingface.co/realrebelai/KREA-2_GGUFs/resolve/main/TURBO/Krea-2-Turbo-Q4_K_M.gguf',
    minVramGB: 6,
    subfolder: 'diffusion',
  },
  qwen_clip: {
    id: 'qwen_clip',
    name: 'Qwen 3 4B Text Encoder (Krea 2)',
    type: 'clip',
    filename: 'qwen3vl_4b_fp8_scaled.safetensors',
    sizeBytes: 2500000000,
    url: 'https://huggingface.co/Comfy-Org/Qwen3-VL/resolve/main/text_encoders/qwen3vl_4b_fp8_scaled.safetensors',
    minVramGB: 2,
    subfolder: 'clip',
  },
  qwen_vae: {
    id: 'qwen_vae',
    name: 'Qwen Image VAE (Krea 2)',
    type: 'vae',
    filename: 'qwen_image_vae.safetensors',
    sizeBytes: 335544320,
    url: 'https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors',
    minVramGB: 2,
    subfolder: 'vae',
  },
  sd15_turbo: {
    id: 'sd15_turbo',
    name: 'SD 1.5 LCM Turbo (Equipos Ligeros)',
    type: 'diffusion',
    filename: 'sd-v1-5-lcm-q4_0.gguf',
    sizeBytes: 2147483648,
    url: 'https://huggingface.co/leejet/stable-diffusion.cpp-models/resolve/main/v1-5-pruned-emaonly-q4_0.gguf',
    minVramGB: 2,
    subfolder: 'diffusion',
  },
};

ipcMain.handle('system:detect-hardware', async () => {
  return await detectSystemHardware();
});

ipcMain.handle('models:get-local-status', async () => {
  const dirs = getAppModelsDir();
  const hw = await detectSystemHardware();
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const allModelRoots = [
    path.join(appData, 'NaiAgent', 'models'),
    path.join(appData, 'nai-agent', 'models'),
    path.join(app.getPath('userData'), 'models'),
  ];

  const statusList = [];

  for (const [key, mod] of Object.entries(LOCAL_MODELS_CATALOG)) {
    let installed = false;
    let sizeOnDisk = 0;
    let targetFile = '';

    // Check primary file and alternate filenames (for Krea 2 variants: Q5_K_M, Q4_K_M, Q8_0, etc.)
    const filenamesToCheck = [mod.filename];
    if (mod.id === 'krea2_turbo') {
      filenamesToCheck.push(
        'krea2_turbo-Q5_K_M.gguf',
        'Krea-2-Turbo-Q4_K_M.gguf',
        'krea2_turbo-Q4_K_M.gguf',
        'krea2_turbo-Q8_0.gguf'
      );
    }

    for (const rootDir of allModelRoots) {
      for (const fn of filenamesToCheck) {
        const subP = path.join(rootDir, mod.subfolder || '', fn);
        const rootP = path.join(rootDir, fn);
        if (fs.existsSync(subP)) {
          installed = true;
          targetFile = subP;
          break;
        }
        if (fs.existsSync(rootP)) {
          installed = true;
          targetFile = rootP;
          break;
        }
      }
      if (installed) break;
    }

    if (installed && targetFile) {
      try {
        const stat = fs.statSync(targetFile);
        sizeOnDisk = stat.size;
      } catch (e) {}
    }

    statusList.push({
      ...mod,
      installed,
      sizeOnDisk,
      localPath: targetFile || path.join(dirs[mod.subfolder] || dirs.root, mod.filename),
      recommendedForHardware: hw.vramGB >= mod.minVramGB,
    });
  }

  // Check if primary Krea 2 models are installed
  const hasDiffusion = statusList.find((m) => m.id === 'krea2_turbo')?.installed;
  const hasClip = statusList.find((m) => m.id === 'qwen_clip')?.installed;
  const hasVae = statusList.find((m) => m.id === 'qwen_vae')?.installed;
  const allCoreInstalled = Boolean(hasDiffusion && hasClip && hasVae);

  return {
    modelsDir: dirs.root,
    hardware: hw,
    allCoreInstalled,
    platform: process.platform,
    models: statusList,
  };
});

ipcMain.handle('models:download-model', async (event, { modelId }) => {
  const mod = LOCAL_MODELS_CATALOG[modelId];
  if (!mod || !mod.url) {
    return { success: false, error: 'Modelo no encontrado en el catálogo' };
  }

  const dirs = getAppModelsDir();
  const targetDir = dirs[mod.subfolder] || dirs.root;
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, mod.filename);
  const tempPath = `${targetPath}.downloading`;

  try {
    const response = await fetch(mod.url, {
      headers: { 'User-Agent': 'NaiAgent/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || mod.sizeBytes.toString(), 10);
    let downloadedBytes = 0;

    const fileStream = fs.createWriteStream(tempPath);
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloadedBytes += value.length;
      fileStream.write(Buffer.from(value));
      const percent = Math.round((downloadedBytes / totalBytes) * 100);
      event.sender.send('models:download-progress', {
        modelId,
        filename: mod.filename,
        name: mod.name,
        downloadedBytes,
        totalBytes,
        percent,
      });
    }

    fileStream.end();
    await new Promise((res) => fileStream.on('finish', res));

    if (fs.existsSync(targetPath)) {
      try { await fs.promises.unlink(targetPath); } catch (e) {}
    }
    await fs.promises.rename(tempPath, targetPath);

    return { success: true, localPath: targetPath, filename: mod.filename };
  } catch (err) {
    console.error(`Error downloading model ${modelId}:`, err);
    if (fs.existsSync(tempPath)) {
      try { await fs.promises.unlink(tempPath); } catch (e) {}
    }
    return { success: false, error: err.message };
  }
});

const MODEL_INFERENCE_PRESETS = {
  krea2_turbo: {
    name: 'Krea 2 Turbo',
    steps: 8,
    cfgScale: 1.0,
    sampler: 'euler',
    scheduler: 'simple',
    denoise: 1.0,
    textEncoder: 'qwen3vl_4b_fp8_scaled.safetensors',
    clipType: 'krea2',
    vae: 'qwen_image_vae.safetensors',
  },
  sd15_turbo: {
    name: 'SD 1.5 LCM Turbo',
    steps: 5,
    cfgScale: 1.8,
    sampler: 'lcm',
    scheduler: 'karras',
    denoise: 1.0,
    textEncoder: 'openai/clip-vit-large-patch14',
    clipType: 'stable_diffusion',
    vae: 'sd-vae-ft-mse.safetensors',
  },
};

// ----------------------------------------------------
// Native AI Image Generation Engine (Krea 2 Turbo GGUF)
// ----------------------------------------------------
ipcMain.handle('media:generate-image-ai', async (event, {
  prompt,
  negativePrompt = 'blurry, low quality, distorted, bad anatomy, deformed',
  width = 768,
  height = 768,
  steps,
  cfgScale,
  seed = -1,
  workspaceTarget = null,
}) => {
  try {
    if (!prompt || !prompt.trim()) {
      return { success: false, error: 'El prompt de la imagen es requerido' };
    }

    const hw = await detectSystemHardware();
    const cleanPrompt = prompt.trim();

    // Auto-select optimal model preset (Krea 2 Turbo)
    const presetKey = hw.profile === 'lite' ? 'sd15_turbo' : 'krea2_turbo';
    const activePreset = MODEL_INFERENCE_PRESETS[presetKey];

    const effectiveSteps = steps || activePreset.steps;
    const effectiveCfg = cfgScale !== undefined ? cfgScale : activePreset.cfgScale;
    const effectiveSampler = activePreset.sampler || 'euler';
    const effectiveScheduler = activePreset.scheduler || 'normal';
    const effectiveStrength = activePreset.denoise || 1.0;

    const targetDir = workspaceTarget || (activeServerRoot && fs.existsSync(activeServerRoot) ? activeServerRoot : getSandboxDir());
    const imagesDir = path.join(targetDir, 'Imagenes_IA');
    if (!fs.existsSync(imagesDir)) await fs.promises.mkdir(imagesDir, { recursive: true });

    const timeId = Date.now();
    const safeTitle = cleanPrompt.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '_');
    const outFilename = `Imagen_Generada_Krea2_${safeTitle || 'ai'}_${timeId}.png`;
    const finalImagePath = path.join(imagesDir, outFilename);

    let generatedSuccess = false;

    // 0. Primary Local GPU Execution (ComfyUI GGUF on RTX 4060)
    try {
      const comfyCheck = await fetch('http://127.0.0.1:8188/system_stats', { signal: AbortSignal.timeout(1500) });
      if (comfyCheck.ok) {
        console.log(`[LOCAL GPU] Inferencia local con ${activePreset.name} en RTX 4060 (${effectiveSteps} pasos, CFG ${effectiveCfg}, denoise ${effectiveStrength}, sampler ${effectiveSampler}, scheduler ${effectiveScheduler})...`);
        const comfySeed = seed === -1 ? Math.floor(Math.random() * 999999999999) : seed;
        const unetName = "Krea-2-Turbo-Q4_K_M.gguf";
        const clipName = activePreset.textEncoder;
        const clipType = activePreset.clipType || "krea2";
        const vaeName = activePreset.vae;

        const targetWidth = Math.max(384, Math.round((width || 1024) / 64) * 64);
        const targetHeight = Math.max(384, Math.round((height || 1024) / 64) * 64);

        const comfyPrompt = {
          "1": { inputs: { unet_name: unetName }, class_type: "UnetLoaderGGUF" },
          "2": { inputs: { clip_name: clipName, type: clipType, device: "default" }, class_type: "CLIPLoader" },
          "3": { inputs: { vae_name: vaeName }, class_type: "VAELoader" },
          "4": { inputs: { text: cleanPrompt, clip: ["2", 0] }, class_type: "CLIPTextEncode" },
          "5": { inputs: { text: negativePrompt || "blurry, low quality, distorted, bad anatomy, deformed", clip: ["2", 0] }, class_type: "CLIPTextEncode" },
          "6": { inputs: { width: targetWidth, height: targetHeight, batch_size: 1 }, class_type: "EmptyLatentImage" },
          "7": {
            inputs: {
              seed: comfySeed,
              steps: effectiveSteps,
              cfg: effectiveCfg,
              sampler_name: effectiveSampler,
              scheduler: effectiveScheduler,
              denoise: effectiveStrength,
              model: ["1", 0],
              positive: ["4", 0],
              negative: ["5", 0],
              latent_image: ["6", 0]
            },
            class_type: "KSampler"
          },
          "8": { inputs: { samples: ["7", 0], vae: ["3", 0] }, class_type: "VAEDecode" },
          "9": { inputs: { filename_prefix: "NaiAgent_Krea2", images: ["8", 0] }, class_type: "SaveImage" }
        };

        const queueRes = await fetch('http://127.0.0.1:8188/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: comfyPrompt })
        });

        if (queueRes.ok) {
          const queueData = await queueRes.json();
          const promptId = queueData.prompt_id;
          if (promptId) {
            let finished = false;
            let comfyFilename = '';
            let comfySubfolder = '';
            let comfyType = 'output';

            for (let attempt = 0; attempt < 240; attempt++) {
              await new Promise((r) => setTimeout(r, 1000));
              try {
                const histRes = await fetch(`http://127.0.0.1:8188/history/${promptId}`);
                if (histRes.ok) {
                  const histData = await histRes.json();
                  if (histData[promptId] && histData[promptId].outputs) {
                    const outputs = histData[promptId].outputs;
                    for (const nodeKey of Object.keys(outputs)) {
                      if (outputs[nodeKey].images && outputs[nodeKey].images.length > 0) {
                        const imgInfo = outputs[nodeKey].images[0];
                        comfyFilename = imgInfo.filename;
                        comfySubfolder = imgInfo.subfolder || '';
                        comfyType = imgInfo.type || 'output';
                        finished = true;
                        break;
                      }
                    }
                  }
                }
              } catch (ePoll) {}
              if (finished) break;
            }

            if (finished && comfyFilename) {
              const viewUrl = `http://127.0.0.1:8188/view?filename=${encodeURIComponent(comfyFilename)}&subfolder=${encodeURIComponent(comfySubfolder)}&type=${encodeURIComponent(comfyType)}`;
              const viewRes = await fetch(viewUrl);
              if (viewRes.ok) {
                const arrBuf = await viewRes.arrayBuffer();
                const buf = Buffer.from(arrBuf);
                if (buf.length > 2000) {
                  await fs.promises.writeFile(finalImagePath, buf);
                  generatedSuccess = true;
                  console.log(`[LOCAL GPU] Imagen generada con éxito y guardada en ${finalImagePath}`);
                }
              }
            }
          }
        }
      }
    } catch (eLocal) {
      console.warn('[LOCAL GPU Check]:', eLocal.message);
    }

    let localFailureReason = '';

    // 1. Native Standalone Local Engine (sd-cli.exe with local GGUF models)
    if (!generatedSuccess) {
      const sdExe = getSdCliBinaryPath();
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      const allModelDirs = [
        path.join(appData, 'NaiAgent', 'models'),
        path.join(appData, 'nai-agent', 'models'),
        path.join(app.getPath('userData'), 'models'),
      ];

      // Find local diffusion model (Krea 2 Turbo Q4 / Q5 / Flux)
      let localDiffusion = '';
      const targetNames = [
        'Krea-2-Turbo-Q4_K_M.gguf',
        'krea2_turbo-Q4_K_M.gguf',
        'krea2_turbo-Q5_K_M.gguf',
        'krea2_turbo-Q8_0.gguf',
        'flux-2-klein-4b-BF16.gguf',
      ];
      for (const d of allModelDirs) {
        for (const fn of targetNames) {
          const p = path.join(d, 'diffusion', fn);
          if (fs.existsSync(p)) { localDiffusion = p; break; }
        }
        if (localDiffusion) break;
      }

      // Find local VAE
      let localVae = '';
      const vaeNames = ['qwen_image_vae.safetensors', 'ae.safetensors', 'flux2-vae.safetensors'];
      for (const d of allModelDirs) {
        for (const fn of vaeNames) {
          const p = path.join(d, 'vae', fn);
          if (fs.existsSync(p)) { localVae = p; break; }
        }
        if (localVae) break;
      }

      // Find local CLIP
      let localClip = '';
      const clipNames = ['qwen3vl_4b_fp8_scaled.safetensors', 'qwen_3_4b_fp4_flux2.safetensors'];
      for (const d of allModelDirs) {
        for (const fn of clipNames) {
          const p = path.join(d, 'clip', fn);
          if (fs.existsSync(p)) { localClip = p; break; }
        }
        if (localClip) break;
      }

      if (!fs.existsSync(sdExe)) {
        localFailureReason = `No se encontró el ejecutable de inferencia local sd-cli en disco.`;
        console.warn(`[NATIVE SD]: ${localFailureReason}`);
      } else if (!localDiffusion) {
        localFailureReason = `No se encontró ningún archivo de modelo de difusión (.gguf) en las carpetas de modelos locales.`;
        console.warn(`[NATIVE SD]: ${localFailureReason}`);
      } else {
        try {
          console.log(`[NATIVE SD] Inferencia 100% local con ${path.basename(localDiffusion)} (${effectiveSteps} pasos, CFG ${effectiveCfg}, ${width}x${height}, sampler ${effectiveSampler}, scheduler ${effectiveScheduler})...`);
          const args = [
            '--diffusion-model', localDiffusion,
            '-p', cleanPrompt,
            '-W', String(width),
            '-H', String(height),
            '--steps', String(effectiveSteps),
            '--cfg-scale', String(effectiveCfg),
            '--sampling-method', effectiveSampler,
            '--scheduler', effectiveScheduler,
            '--backend', 'cpu',
            '--vae-tiling',
            '-o', finalImagePath,
          ];

          if (localVae) {
            args.push('--vae', localVae);
          }
          if (localClip) {
            args.push('--llm', localClip);
          }

          await new Promise((resCli, rejCli) => {
            execFile(sdExe, args, { timeout: 300000 }, (err, stdout, stderr) => {
              if (err) {
                const errOut = stderr || stdout || err.message;
                if (/OutOfDeviceMemory|allocateMemory/i.test(errOut)) {
                  localFailureReason = 'Memoria VRAM insuficiente en la GPU para el tamaño de modelo seleccionado.';
                } else {
                  localFailureReason = `Error durante la ejecución local de sd-cli: ${err.message}`;
                }
                console.warn('[NATIVE SD Error]:', errOut);
                return rejCli(err);
              }
              if (fs.existsSync(finalImagePath)) {
                generatedSuccess = true;
                return resCli();
              }
              localFailureReason = 'El proceso de sd-cli finalizó pero el archivo de imagen no se guardó en disco.';
              rejCli(new Error(localFailureReason));
            });
          });
        } catch (eNative) {
          if (!localFailureReason) localFailureReason = eNative.message;
          console.warn('[NATIVE SD Execution Failed]:', eNative.message);
        }
      }
    }

    // 100% Local: Zero Cloud Fallback
    if (!generatedSuccess) {
      return {
        success: false,
        error: localFailureReason || 'No se pudo completar la generación local de imágenes. Verifica que el modelo esté en disco y haya memoria suficiente.',
      };
    }

    const imgBuf = await fs.promises.readFile(finalImagePath);
    const dataUrl = `data:image/png;base64,${imgBuf.toString('base64')}`;

    return {
      success: true,
      imagePath: finalImagePath,
      relativePath: path.relative(targetDir, finalImagePath).replace(/\\/g, '/'),
      filename: outFilename,
      dataUrl,
      prompt: cleanPrompt,
      width,
      height,
    };
  } catch (err) {
    return { success: false, error: `Error generando imagen: ${err.message}` };
  }
});

// ----------------------------------------------------
// App Lifecycle & Protocol Handler
// ----------------------------------------------------
app.whenReady().then(() => {
  // Automatically grant microphone & media permissions to renderer and webviews
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler(() => true);
  }

  // Start the internal HTTP 206 Streaming Server for rich HTML/Video/Canvas previews
  startLocalPreviewServer();

  // Protocol handler for media-local://
  protocol.handle('media-local', async (request) => {
    try {
      let rawPath = request.url.replace(/^media-local:\/\//, '');
      rawPath = decodeURIComponent(rawPath);

      const queryIdx = rawPath.indexOf('?');
      if (queryIdx !== -1) rawPath = rawPath.substring(0, queryIdx);
      const hashIdx = rawPath.indexOf('#');
      if (hashIdx !== -1) rawPath = rawPath.substring(0, hashIdx);

      if (process.platform === 'win32') {
        if (/^\/[a-zA-Z]:/.test(rawPath)) {
          rawPath = rawPath.slice(1);
        }
      }

      let normalizedPath = path.normalize(rawPath);
      if (!path.isAbsolute(normalizedPath)) {
        normalizedPath = path.join(activeServerRoot || getSandboxDir(), normalizedPath);
      }

      if (!fs.existsSync(normalizedPath)) {
        // Fallback search in activeServerRoot / Imagenes_IA
        const altPath = path.join(activeServerRoot || getSandboxDir(), path.basename(normalizedPath));
        if (fs.existsSync(altPath)) {
          normalizedPath = altPath;
        } else {
          const imgDirAlt = path.join(activeServerRoot || getSandboxDir(), 'Imagenes_IA', path.basename(normalizedPath));
          if (fs.existsSync(imgDirAlt)) {
            normalizedPath = imgDirAlt;
          }
        }
      }

      if (!fs.existsSync(normalizedPath)) {
        return new Response(`Media file not found: ${normalizedPath}`, { status: 404 });
      }

      const ext = path.extname(normalizedPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'image/png';
      const fileBuf = await fs.promises.readFile(normalizedPath);
      return new Response(fileBuf, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(fileBuf.length),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err) {
      console.error('Error serving media-local:', err);
      return new Response(`Error: ${err.message}`, { status: 500 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    try { localServer.close(); } catch (e) {}
  }
  // In dev mode, don't quit — Electron may be retrying the Vite connection
  if (!isDev && process.platform !== 'darwin') {
    app.quit();
  } else if (!isDev) {
    app.quit();
  }
});
