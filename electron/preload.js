const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  // AI Completion & Models
  sendMessage: (payload) => ipcRenderer.invoke('ai:send-message', payload),
  abortMessage: () => ipcRenderer.invoke('ai:abort-request'),
  fetchModels: (payload) => ipcRenderer.invoke('ai:fetch-models', payload),
  searchWeb: (payload) => ipcRenderer.invoke('web:search', payload),

  // Filesystem & Workspace
  selectFolder: () => ipcRenderer.invoke('fs:select-folder'),
  readTree: (folderPath) => ipcRenderer.invoke('fs:read-tree', folderPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (data) => ipcRenderer.invoke('fs:write-file', data),
  deleteItem: (itemPath) => ipcRenderer.invoke('fs:delete-item', itemPath),
  renameItem: (payload) => ipcRenderer.invoke('fs:rename-item', payload),
  makeDir: (payload) => ipcRenderer.invoke('fs:make-dir', payload),
  listFilesDetailed: (payload) => ipcRenderer.invoke('fs:list-files-detailed', payload),
  readPdfText: (payload) => ipcRenderer.invoke('fs:read-pdf-text', payload),

  // PDF Direct Generation & Export
  generateDirectPDF: (payload) => ipcRenderer.invoke('pdf:generate-direct', payload),
  exportPDF: (payload) => ipcRenderer.invoke('sandbox:export-pdf', payload),

  // Sandbox Real-time Preview & OS Integration
  updateSandbox: (payload) => ipcRenderer.invoke('sandbox:update', payload),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  openPath: (targetPath) => ipcRenderer.invoke('app:open-path', targetPath),
  showItemInFolder: (targetPath) => ipcRenderer.invoke('app:show-item-in-folder', targetPath),

  // Chat Sessions Storage
  getChatHistory: () => ipcRenderer.invoke('chats:get-all'),
  saveChatHistory: (chats) => ipcRenderer.invoke('chats:save-all', { chats }),

  // Integrations (Telegram, Discord, WhatsApp & Cloud)
  testTelegram: (payload) => ipcRenderer.invoke('integrations:telegram-test', payload),
  sendTelegramDocument: (payload) => ipcRenderer.invoke('integrations:telegram-send-document', payload),
  testDiscord: (payload) => ipcRenderer.invoke('integrations:discord-test', payload),
  sendDiscordFile: (payload) => ipcRenderer.invoke('integrations:discord-send-file', payload),
  testWhatsApp: (payload) => ipcRenderer.invoke('integrations:whatsapp-test', payload),
  sendWhatsApp: (payload) => ipcRenderer.invoke('integrations:whatsapp-send', payload),

  // Cloud Storage (Google Drive & Dropbox)
  selectCloudFolder: (payload) => ipcRenderer.invoke('integrations:select-cloud-folder', payload),
  backupToCloud: (payload) => ipcRenderer.invoke('integrations:cloud-backup-file', payload),
  uploadToDropboxAPI: (payload) => ipcRenderer.invoke('integrations:dropbox-upload-api', payload),
  testGoogleDriveWebhook: (payload) => ipcRenderer.invoke('integrations:google-drive-test-webhook', payload),
  uploadToGoogleDriveWebhook: (payload) => ipcRenderer.invoke('integrations:google-drive-webhook-upload', payload),

  // Multimedia & Audio / Video Processing (FFmpeg Native & Subtitles)
  extractAudio: (payload) => ipcRenderer.invoke('media:extract-audio', payload),
  concatVideos: (payload) => ipcRenderer.invoke('media:concat-videos', payload),
  cutVideo: (payload) => ipcRenderer.invoke('media:cut-video', payload),
  resizeImage: (payload) => ipcRenderer.invoke('media:resize-image', payload),
  generateSubtitles: (payload) => ipcRenderer.invoke('media:generate-subtitles', payload),
  translateSubtitles: (payload) => ipcRenderer.invoke('media:translate-subtitles', payload),
  autoTranscribeVideo: (payload) => ipcRenderer.invoke('media:auto-transcribe-video', payload),
  transcribeAudioBuffer: (payload) => ipcRenderer.invoke('media:transcribe-audio-buffer', payload),
  readVideoDataUrl: (payload) => ipcRenderer.invoke('media:read-video-data-url', payload),

  // System Hardware Profiler & Native AI Image Generation (stable-diffusion.cpp & FLUX)
  detectHardware: () => ipcRenderer.invoke('system:detect-hardware'),
  generateAIImage: (payload) => ipcRenderer.invoke('media:generate-image-ai', payload),
  readImageDataUrl: (payload) => ipcRenderer.invoke('media:read-image-data-url', payload),

  // Local AI Models & First-Run Manager
  getModelStatus: () => ipcRenderer.invoke('models:get-local-status'),
  getActiveModel: () => ipcRenderer.invoke('models:get-active-model'),
  setActiveModel: (modelId) => ipcRenderer.invoke('models:set-active-model', { modelId }),
  downloadModel: (payload) => ipcRenderer.invoke('models:download-model', payload),
  cancelImageGeneration: () => ipcRenderer.invoke('media:cancel-image-generation'),
  onModelDownloadProgress: (callback) => {
    const sub = (e, data) => callback(data);
    ipcRenderer.on('models:download-progress', sub);
    return () => ipcRenderer.removeListener('models:download-progress', sub);
  },
  onImageGenerationProgress: (callback) => {
    const sub = (e, data) => callback(data);
    ipcRenderer.on('models:generation-progress', sub);
    return () => ipcRenderer.removeListener('models:generation-progress', sub);
  },
  onImageChunkReady: (callback) => {
    const sub = (e, data) => callback(data);
    ipcRenderer.on('models:image-chunk-ready', sub);
    return () => ipcRenderer.removeListener('models:image-chunk-ready', sub);
  },
});

