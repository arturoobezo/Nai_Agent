import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [workspacePath, setWorkspacePath] = useState(() => {
    return localStorage.getItem('nai_workspace_path') || '';
  });
  const [workspaceName, setWorkspaceName] = useState(() => {
    return localStorage.getItem('nai_workspace_name') || '';
  });
  const [fileTree, setFileTree] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  // Global View Mode ('editor' | 'sandbox' | 'split')
  const [viewMode, setViewMode] = useState('editor');

  // Active Sandbox Target (file or custom preview)
  const [previewTarget, setPreviewTarget] = useState(null);

  // Refresh tree when workspacePath changes
  const refreshTree = async (targetPath = workspacePath) => {
    if (!targetPath) return;
    setIsLoadingTree(true);

    if (window.electronAPI?.readTree) {
      try {
        const res = await window.electronAPI.readTree(targetPath);
        if (res.success && Array.isArray(res.tree)) {
          setFileTree(res.tree);
          if (res.folderName) setWorkspaceName(res.folderName);
        }
      } catch (err) {
        console.error('Error reading directory tree:', err);
      }
    }
    setIsLoadingTree(false);
  };

  useEffect(() => {
    if (workspacePath) {
      refreshTree(workspacePath);
    }
  }, [workspacePath]);

  const [recentWorkspaces, setRecentWorkspaces] = useState(() => {
    try {
      const saved = localStorage.getItem('nai_recent_workspaces');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Switch workspace folder directly
  const switchWorkspace = async (folderPath, folderName) => {
    if (!folderPath) {
      setWorkspacePath('');
      setWorkspaceName('');
      setFileTree([]);
      setOpenFiles([]);
      setActiveFileId(null);
      setPreviewTarget(null);
      localStorage.removeItem('nai_workspace_path');
      localStorage.removeItem('nai_workspace_name');
      return { success: true };
    }

    const name = folderName || folderPath.split(/[/\\]/).pop() || 'Proyecto';
    setWorkspacePath(folderPath);
    setWorkspaceName(name);
    localStorage.setItem('nai_workspace_path', folderPath);
    localStorage.setItem('nai_workspace_name', name);

    // Save to recent workspaces list (up to 10)
    setRecentWorkspaces((prev) => {
      const filtered = prev.filter((item) => item.path !== folderPath);
      const updated = [
        { path: folderPath, name, lastUsed: new Date().toISOString() },
        ...filtered,
      ].slice(0, 10);
      localStorage.setItem('nai_recent_workspaces', JSON.stringify(updated));
      return updated;
    });

    await refreshTree(folderPath);
    return { success: true, folderPath, folderName: name };
  };

  // Open native Folder Dialog
  const openWorkspaceFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const res = await window.electronAPI.selectFolder();
      if (!res.canceled && res.folderPath) {
        await switchWorkspace(res.folderPath, res.folderName);
        return { folderPath: res.folderPath, folderName: res.folderName };
      }
    }
    return null;
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

  // Open a file into the editor tabs
  const openFileInEditor = async (filePath, fileName) => {
    // Check if already open
    const existing = openFiles.find((f) => f.filePath === filePath);
    if (existing) {
      setActiveFileId(existing.id);
      return existing;
    }

    const name = fileName || filePath.split(/[/\\]/).pop();
    const isImage = isImageFile(name);
    const isPdf = isPdfFile(name);
    const isHtml = isHtmlFile(name);
    const isMarkdown = isMarkdownFile(name);

    let fileContent = '';
    if (!isImage && !isPdf && window.electronAPI?.readFile) {
      const res = await window.electronAPI.readFile(filePath);
      if (res.success) {
        fileContent = res.content;
      } else {
        fileContent = `// Error al leer archivo: ${res.error || 'No disponible'}`;
      }
    }

    const fileId = filePath || `file-${Date.now()}`;
    const newFile = {
      id: fileId,
      name,
      filePath,
      content: fileContent,
      originalContent: fileContent,
      isImage,
      isPdf,
      isHtml,
      isMarkdown,
      isDirty: false,
    };

    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFileId(fileId);

    // If opening an image or PDF, also point previewTarget to it
    if (isImage || isPdf || isHtml) {
      setPreviewTarget({
        filePath,
        name,
        isPdf,
        isImage,
        isHtml,
        isMarkdown,
        content: fileContent,
      });
    }

    return newFile;
  };

  // Preview a file in the integrated Sandbox
  const previewFileInSandbox = async (target, forceViewMode) => {
    let targetPath = '';
    let targetName = '';
    let customContent = null;

    if (typeof target === 'string') {
      targetPath = target.trim();
      if (workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
        targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
      }
      targetName = targetPath.split(/[/\\]/).pop();
    } else if (target && typeof target === 'object') {
      targetPath = target.filePath || target.path || '';
      if (workspacePath && targetPath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
        targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
      }
      targetName = target.name || (targetPath ? targetPath.split(/[/\\]/).pop() : 'Documento');
      customContent = target.content || null;
    }

    const isPdf = isPdfFile(targetName);
    const isImage = isImageFile(targetName);
    const isHtml = isHtmlFile(targetName);
    const isMarkdown = isMarkdownFile(targetName);

    // If HTML or text file and content is not supplied, load from disk
    if (!customContent && targetPath && !isImage && !isPdf && window.electronAPI?.readFile) {
      try {
        const res = await window.electronAPI.readFile(targetPath);
        if (res.success) {
          customContent = res.content;
        }
      } catch (e) {}
    }

    // Set preview target
    setPreviewTarget({
      filePath: targetPath,
      name: targetName,
      isPdf,
      isImage,
      isHtml,
      isMarkdown,
      content: customContent,
    });

    if (forceViewMode) {
      setViewMode(forceViewMode);
    } else if (viewMode === 'editor') {
      setViewMode('sandbox');
    }

    // Also register in open files if it's text/html/code
    if (targetPath) {
      await openFileInEditor(targetPath, targetName);
    }
  };

  // Save current active file or specific file to disk
  const saveFile = async (fileId, customContent) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (!file || !file.filePath) return { success: false, error: 'No file path' };

    const contentToSave = customContent !== undefined ? customContent : file.content;

    if (window.electronAPI?.writeFile) {
      const res = await window.electronAPI.writeFile({
        filePath: file.filePath,
        content: contentToSave,
      });

      if (res.success) {
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, content: contentToSave, originalContent: contentToSave, isDirty: false }
              : f
          )
        );
        refreshTree();
        return { success: true };
      }
      return res;
    }

    return { success: true };
  };

  // Create/Apply file in Workspace from AI
  const createOrApplyFile = async (relativeOrFullPath, content) => {
    let targetPath = relativeOrFullPath.trim();

    // If relative path and workspace is open, combine with workspacePath
    if (workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
      targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    }

    const fileName = targetPath.split(/[/\\]/).pop();

    if (window.electronAPI?.writeFile) {
      const res = await window.electronAPI.writeFile({
        filePath: targetPath,
        content,
      });

      if (res.success) {
        await refreshTree();
        await openFileInEditor(targetPath, fileName);
        return { success: true, targetPath };
      }
      return res;
    } else {
      // Browser fallback
      const fileId = `applied-${Date.now()}`;
      const newFile = {
        id: fileId,
        name: fileName,
        filePath: targetPath,
        content,
        originalContent: content,
        isDirty: false,
      };
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFileId(fileId);
      return { success: true, targetPath };
    }
  };

  // Direct PDF Generation into Workspace
  const generatePDFFile = async (relativeOrFullPath, htmlContent, title = 'Documento') => {
    let targetPath = relativeOrFullPath.trim();
    if (workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
      targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    }

    if (!targetPath.toLowerCase().endsWith('.pdf')) {
      targetPath += '.pdf';
    }

    if (window.electronAPI?.generateDirectPDF) {
      const res = await window.electronAPI.generateDirectPDF({
        outputPath: targetPath,
        htmlContent,
        title,
      });

      if (res.success) {
        await refreshTree();
        return { success: true, targetPath, filename: res.filename, size: res.size };
      }
      return res;
    }
    return { success: false, error: 'No disponible en entorno sin Electron' };
  };

  // Rename or move item in workspace
  const renameWorkspaceItem = async (oldRelOrAbs, newRelOrAbs) => {
    let oldPath = oldRelOrAbs.trim();
    let newPath = newRelOrAbs.trim();

    if (workspacePath && !oldPath.includes(':') && !oldPath.startsWith('/')) {
      oldPath = `${workspacePath}/${oldPath}`.replace(/\\/g, '/');
    }
    if (workspacePath && !newPath.includes(':') && !newPath.startsWith('/')) {
      newPath = `${workspacePath}/${newPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.renameItem) {
      const res = await window.electronAPI.renameItem({ oldPath, newPath });
      if (res.success) {
        await refreshTree();
        return res;
      }
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  // Make directory in workspace
  const makeWorkspaceDir = async (relativeOrFullPath) => {
    let dirPath = relativeOrFullPath.trim();
    if (workspacePath && !dirPath.includes(':') && !dirPath.startsWith('/')) {
      dirPath = `${workspacePath}/${dirPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.makeDir) {
      const res = await window.electronAPI.makeDir({ dirPath });
      if (res.success) {
        await refreshTree();
        return res;
      }
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  // List all workspace files detailed
  const listWorkspaceFiles = async (recursive = true) => {
    if (!workspacePath) return { success: true, files: [] };
    if (window.electronAPI?.listFilesDetailed) {
      return await window.electronAPI.listFilesDetailed({ folderPath: workspacePath, recursive });
    }
    return { success: true, files: [] };
  };

  // Read file from workspace
  const readFileContent = async (relativeOrFullPath) => {
    let targetPath = relativeOrFullPath.trim();
    if (workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
      targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.readFile) {
      return await window.electronAPI.readFile(targetPath);
    }
    return { success: false, error: 'No disponible' };
  };

  // Read PDF text from workspace
  const readPdfText = async (relativeOrFullPath) => {
    let targetPath = relativeOrFullPath.trim();
    if (workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
      targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.readPdfText) {
      return await window.electronAPI.readPdfText({ filePath: targetPath });
    }
    return { success: false, error: 'No disponible' };
  };

  // Open with system default viewer (e.g. external PDF viewer / Browser)
  const openSystemPath = async (targetPath) => {
    let full = targetPath.trim();
    if (workspacePath && !full.includes(':') && !full.startsWith('/')) {
      full = `${workspacePath}/${full}`.replace(/\\/g, '/');
    }
    if (window.electronAPI?.openPath) {
      return await window.electronAPI.openPath(full);
    }
    return { success: false };
  };

  // Reveal in OS Explorer
  const revealInExplorer = async (targetPath) => {
    let full = targetPath.trim();
    if (workspacePath && !full.includes(':') && !full.startsWith('/')) {
      full = `${workspacePath}/${full}`.replace(/\\/g, '/');
    }
    if (window.electronAPI?.showItemInFolder) {
      return await window.electronAPI.showItemInFolder(full);
    }
    return { success: false };
  };

  // Update file content in tab memory (e.g. typing in editor)
  const updateFileContent = (fileId, newContent) => {
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          const isDirty = newContent !== f.originalContent;
          return { ...f, content: newContent, isDirty };
        }
        return f;
      })
    );
  };

  // Close tab
  const closeFile = (fileId) => {
    const remaining = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(remaining);

    if (activeFileId === fileId) {
      if (remaining.length > 0) {
        setActiveFileId(remaining[remaining.length - 1].id);
      } else {
        setActiveFileId(null);
      }
    }
  };

  // Media Processing Helpers (FFmpeg & Subtitles)
  const extractAudioFromVideo = async (videoRelOrFull, outputRelOrFull) => {
    let videoPath = videoRelOrFull.trim();
    if (workspacePath && !videoPath.includes(':') && !videoPath.startsWith('/')) {
      videoPath = `${workspacePath}/${videoPath}`.replace(/\\/g, '/');
    }
    let outputPath = outputRelOrFull ? outputRelOrFull.trim() : '';
    if (outputPath && workspacePath && !outputPath.includes(':') && !outputPath.startsWith('/')) {
      outputPath = `${workspacePath}/${outputPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.extractAudio) {
      const res = await window.electronAPI.extractAudio({ videoPath, outputPath });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const concatVideos = async (videoList, outputRelOrFull) => {
    const fullList = videoList.map((v) => {
      let p = v.trim();
      if (workspacePath && !p.includes(':') && !p.startsWith('/')) {
        p = `${workspacePath}/${p}`.replace(/\\/g, '/');
      }
      return p;
    });
    let outputPath = outputRelOrFull ? outputRelOrFull.trim() : '';
    if (outputPath && workspacePath && !outputPath.includes(':') && !outputPath.startsWith('/')) {
      outputPath = `${workspacePath}/${outputPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.concatVideos) {
      const res = await window.electronAPI.concatVideos({ videoPaths: fullList, outputPath });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const cutVideo = async (videoRelOrFull, outputRelOrFull, startTime, endTime) => {
    let videoPath = videoRelOrFull.trim();
    if (workspacePath && !videoPath.includes(':') && !videoPath.startsWith('/')) {
      videoPath = `${workspacePath}/${videoPath}`.replace(/\\/g, '/');
    }
    let outputPath = outputRelOrFull ? outputRelOrFull.trim() : '';
    if (outputPath && workspacePath && !outputPath.includes(':') && !outputPath.startsWith('/')) {
      outputPath = `${workspacePath}/${outputPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.cutVideo) {
      const res = await window.electronAPI.cutVideo({ videoPath, outputPath, startTime, endTime });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const resizeImageFile = async (inputRelOrFull, outputRelOrFull, width, height, format) => {
    let inputPath = inputRelOrFull.trim();
    if (workspacePath && !inputPath.includes(':') && !inputPath.startsWith('/')) {
      inputPath = `${workspacePath}/${inputPath}`.replace(/\\/g, '/');
    }
    let outputPath = outputRelOrFull ? outputRelOrFull.trim() : '';
    if (outputPath && workspacePath && !outputPath.includes(':') && !outputPath.startsWith('/')) {
      outputPath = `${workspacePath}/${outputPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.resizeImage) {
      const res = await window.electronAPI.resizeImage({ inputPath, outputPath, width, height, format });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const generateSubtitlesFile = async (srtRelOrFull, content) => {
    let srtPath = srtRelOrFull.trim();
    if (workspacePath && !srtPath.includes(':') && !srtPath.startsWith('/')) {
      srtPath = `${workspacePath}/${srtPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.generateSubtitles) {
      const res = await window.electronAPI.generateSubtitles({ srtPath, content });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const translateSubtitlesFile = async (srtRelOrFull, targetLang, targetRelOrFull, translatedContent) => {
    let srtPath = srtRelOrFull.trim();
    if (workspacePath && !srtPath.includes(':') && !srtPath.startsWith('/')) {
      srtPath = `${workspacePath}/${srtPath}`.replace(/\\/g, '/');
    }
    let targetPath = targetRelOrFull ? targetRelOrFull.trim() : '';
    if (targetPath && workspacePath && !targetPath.includes(':') && !targetPath.startsWith('/')) {
      targetPath = `${workspacePath}/${targetPath}`.replace(/\\/g, '/');
    }

    if (window.electronAPI?.translateSubtitles) {
      const res = await window.electronAPI.translateSubtitles({ srtPath, targetLang, targetPath, translatedContent });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const autoTranscribeVideo = async (videoRelOrFull, targetLang = 'es', outputRelOrFull = '') => {
    let videoPath = videoRelOrFull.trim();
    if (workspacePath && !videoPath.includes(':') && !videoPath.startsWith('/')) {
      videoPath = `${workspacePath}/${videoPath}`.replace(/\\/g, '/');
    }
    let outputPath = outputRelOrFull ? outputRelOrFull.trim() : '';
    if (outputPath && workspacePath && !outputPath.includes(':') && !outputPath.startsWith('/')) {
      outputPath = `${workspacePath}/${outputPath}`.replace(/\\/g, '/');
    }

    let apiKey = '';
    let provider = 'groq';
    try {
      const savedProviders = JSON.parse(localStorage.getItem('nai_ai_providers') || '{}');
      if (savedProviders.groq?.apiKey) {
        apiKey = savedProviders.groq.apiKey;
        provider = 'groq';
      } else if (savedProviders.openai?.apiKey) {
        apiKey = savedProviders.openai.apiKey;
        provider = 'openai';
      }
    } catch (e) {}

    if (window.electronAPI?.autoTranscribeVideo) {
      const res = await window.electronAPI.autoTranscribeVideo({ videoPath, targetLang, outputPath, apiKey, provider });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const generateAIImage = async (options = {}) => {
    const workspaceTarget = workspacePath || '';

    if (window.electronAPI?.generateAIImage) {
      const res = await window.electronAPI.generateAIImage({
        ...options,
        workspaceTarget,
      });
      if (res.success) await refreshTree();
      return res;
    }
    return { success: false, error: 'No disponible' };
  };

  const detectSystemHardware = async () => {
    if (window.electronAPI?.detectHardware) {
      return await window.electronAPI.detectHardware();
    }
    return {
      gpuName: 'NVIDIA GeForce RTX',
      vramGB: 8,
      totalRamGB: 32,
      profile: 'high',
      recommendedModel: 'Krea 2 Turbo Q4 GGUF',
      maxResolution: '1024x1024',
    };
  };

  const getModelStatus = async () => {
    if (window.electronAPI?.getModelStatus) {
      return await window.electronAPI.getModelStatus();
    }
    return { allCoreInstalled: true, models: [] };
  };

  const downloadModel = async (modelId) => {
    if (window.electronAPI?.downloadModel) {
      return await window.electronAPI.downloadModel({ modelId });
    }
    return { success: false, error: 'No disponible' };
  };

  const readFile = async (relativeOrFullPath) => {
    return await readFileContent(relativeOrFullPath);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspacePath,
        workspaceName,
        recentWorkspaces,
        switchWorkspace,
        fileTree,
        isLoadingTree,
        openFiles,
        activeFileId,
        setActiveFileId,
        viewMode,
        setViewMode,
        previewTarget,
        setPreviewTarget,
        previewFileInSandbox,
        openWorkspaceFolder,
        refreshTree,
        openFileInEditor,
        saveFile,
        createOrApplyFile,
        generatePDFFile,
        renameWorkspaceItem,
        makeWorkspaceDir,
        listWorkspaceFiles,
        readFileContent,
        readPdfText,
        openSystemPath,
        revealInExplorer,
        readFile,
        updateFileContent,
        closeFile,
        setOpenFiles,
        extractAudioFromVideo,
        concatVideos,
        cutVideo,
        resizeImageFile,
        generateSubtitlesFile,
        translateSubtitlesFile,
        autoTranscribeVideo,
        generateAIImage,
        detectSystemHardware,
        getModelStatus,
        downloadModel,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
