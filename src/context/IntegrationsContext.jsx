import React, { createContext, useContext, useState, useEffect } from 'react';

const IntegrationsContext = createContext();

const STORAGE_KEY = 'nai_integrations_config_v1';

const DEFAULT_CONFIG = {
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    autoSendPdf: true,
    autoNotifyTasks: true,
  },
  discord: {
    enabled: false,
    webhookUrl: '',
    autoSendPdf: true,
    autoNotifyTasks: true,
  },
  whatsapp: {
    enabled: false,
    phone: '',
    apiKey: '',
    autoSendPdf: true,
    autoNotifyTasks: true,
  },
  googleDrive: {
    enabled: false,
    mode: 'webhook', // 'webhook' | 'folder'
    webhookUrl: '',
    folderPath: '',
    autoBackupPdf: true,
  },
  dropbox: {
    enabled: false,
    mode: 'api', // 'api' | 'folder'
    folderPath: '',
    apiToken: '',
    autoBackupPdf: true,
  },
};

export function IntegrationsProvider({ children }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading integrations config:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [isTestingDropbox, setIsTestingDropbox] = useState(false);

  const [telegramStatus, setTelegramStatus] = useState(null);
  const [discordStatus, setDiscordStatus] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);
  const [dropboxStatus, setDropboxStatus] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving integrations config:', e);
    }
  }, [config]);

  const updateTelegramConfig = (updates) => {
    setConfig((prev) => ({
      ...prev,
      telegram: { ...prev.telegram, ...updates },
    }));
  };

  const updateDiscordConfig = (updates) => {
    setConfig((prev) => ({
      ...prev,
      discord: { ...prev.discord, ...updates },
    }));
  };

  const updateWhatsAppConfig = (updates) => {
    setConfig((prev) => ({
      ...prev,
      whatsapp: { ...prev.whatsapp, ...updates },
    }));
  };

  const updateGoogleDriveConfig = (updates) => {
    setConfig((prev) => ({
      ...prev,
      googleDrive: { ...prev.googleDrive, ...updates },
    }));
  };

  const updateDropboxConfig = (updates) => {
    setConfig((prev) => ({
      ...prev,
      dropbox: { ...prev.dropbox, ...updates },
    }));
  };

  // Select Local Google Drive Folder
  const selectDriveFolder = async () => {
    if (window.electronAPI?.selectCloudFolder) {
      const res = await window.electronAPI.selectCloudFolder({
        title: 'Seleccionar Carpeta de Google Drive para Respaldos de Nai Agent',
      });
      if (!res.canceled && res.folderPath) {
        updateGoogleDriveConfig({ folderPath: res.folderPath, enabled: true });
        return res.folderPath;
      }
    }
    return null;
  };

  // Select Local Dropbox Folder
  const selectDropboxFolder = async () => {
    if (window.electronAPI?.selectCloudFolder) {
      const res = await window.electronAPI.selectCloudFolder({
        title: 'Seleccionar Carpeta de Dropbox para Respaldos de Nai Agent',
      });
      if (!res.canceled && res.folderPath) {
        updateDropboxConfig({ folderPath: res.folderPath, enabled: true });
        return res.folderPath;
      }
    }
    return null;
  };

  // Test Telegram Bot connection
  const testTelegramConnection = async () => {
    if (!config.telegram.botToken || !config.telegram.chatId) {
      setTelegramStatus({
        success: false,
        message: 'Por favor ingresa el Bot Token y Chat ID',
      });
      return false;
    }

    setIsTestingTelegram(true);
    setTelegramStatus(null);

    try {
      if (window.electronAPI?.testTelegram) {
        const res = await window.electronAPI.testTelegram({
          botToken: config.telegram.botToken,
          chatId: config.telegram.chatId,
        });

        if (res.success) {
          setTelegramStatus({ success: true, message: '¡Conexión exitosa! Revisa tu chat de Telegram.' });
          setIsTestingTelegram(false);
          return true;
        } else {
          setTelegramStatus({ success: false, message: res.error || 'Error al conectar con Telegram' });
          setIsTestingTelegram(false);
          return false;
        }
      }
      setTelegramStatus({ success: false, message: 'API de Electron no disponible' });
    } catch (err) {
      setTelegramStatus({ success: false, message: err.message });
    } finally {
      setIsTestingTelegram(false);
    }
    return false;
  };

  // Test Discord Webhook connection
  const testDiscordConnection = async () => {
    if (!config.discord.webhookUrl) {
      setDiscordStatus({
        success: false,
        message: 'Por favor ingresa la URL del Webhook de Discord',
      });
      return false;
    }

    setIsTestingDiscord(true);
    setDiscordStatus(null);

    try {
      if (window.electronAPI?.testDiscord) {
        const res = await window.electronAPI.testDiscord({
          webhookUrl: config.discord.webhookUrl,
        });

        if (res.success) {
          setDiscordStatus({ success: true, message: '¡Conexión exitosa! Mensaje enviado a tu canal.' });
          setIsTestingDiscord(false);
          return true;
        } else {
          setDiscordStatus({ success: false, message: res.error || 'Error al conectar con Discord' });
          setIsTestingDiscord(false);
          return false;
        }
      }
      setDiscordStatus({ success: false, message: 'API de Electron no disponible' });
    } catch (err) {
      setDiscordStatus({ success: false, message: err.message });
    } finally {
      setIsTestingDiscord(false);
    }
    return false;
  };

  // Test WhatsApp connection
  const testWhatsAppConnection = async () => {
    if (!config.whatsapp.phone) {
      setWhatsappStatus({
        success: false,
        message: 'Por favor ingresa tu número con código de país (ej. +52155...)',
      });
      return false;
    }

    setIsTestingWhatsApp(true);
    setWhatsappStatus(null);

    try {
      if (window.electronAPI?.testWhatsApp) {
        const res = await window.electronAPI.testWhatsApp({
          phone: config.whatsapp.phone,
          apiKey: config.whatsapp.apiKey,
        });

        if (res.success) {
          setWhatsappStatus({ success: true, message: res.message || 'Mensaje de prueba enviado.' });
          setIsTestingWhatsApp(false);
          return true;
        } else {
          setWhatsappStatus({ success: false, message: res.error || 'Error al conectar con WhatsApp' });
          setIsTestingWhatsApp(false);
          return false;
        }
      }
      setWhatsappStatus({ success: false, message: 'API de Electron no disponible' });
    } catch (err) {
      setWhatsappStatus({ success: false, message: err.message });
    } finally {
      setIsTestingWhatsApp(false);
    }
    return false;
  };

  // Test Google Drive Webhook connection
  const testGoogleDriveConnection = async () => {
    if (!config.googleDrive.webhookUrl) {
      setDriveStatus({
        success: false,
        message: 'Por favor ingresa la URL de Webhook / Apps Script de Google Drive',
      });
      return false;
    }

    setIsTestingDrive(true);
    setDriveStatus(null);

    try {
      if (window.electronAPI?.testGoogleDriveWebhook) {
        const res = await window.electronAPI.testGoogleDriveWebhook({
          webhookUrl: config.googleDrive.webhookUrl,
        });

        if (res.success) {
          setDriveStatus({ success: true, message: '¡Conexión exitosa! Archivo de prueba creado en Drive.' });
          setIsTestingDrive(false);
          return true;
        } else {
          setDriveStatus({ success: false, message: res.error || 'Error al conectar con Google Drive' });
          setIsTestingDrive(false);
          return false;
        }
      }
      setDriveStatus({ success: false, message: 'API no disponible' });
    } catch (err) {
      setDriveStatus({ success: false, message: err.message });
    } finally {
      setIsTestingDrive(false);
    }
    return false;
  };

  // Send PDF or file to Telegram
  const sendPdfToTelegram = async (filePath, caption = '') => {
    if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) {
      return { success: false, error: 'Telegram no está habilitado o configurado' };
    }

    try {
      if (window.electronAPI?.sendTelegramDocument) {
        return await window.electronAPI.sendTelegramDocument({
          botToken: config.telegram.botToken,
          chatId: config.telegram.chatId,
          filePath,
          caption: caption || `📄 Documento generado por Nai Agent: ${filePath.split(/[\\/]/).pop()}`,
        });
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'API no disponible' };
  };

  // Send PDF or file to Discord
  const sendPdfToDiscord = async (filePath, message = '') => {
    if (!config.discord.enabled || !config.discord.webhookUrl) {
      return { success: false, error: 'Discord no está habilitado o configurado' };
    }

    try {
      if (window.electronAPI?.sendDiscordFile) {
        return await window.electronAPI.sendDiscordFile({
          webhookUrl: config.discord.webhookUrl,
          filePath,
          message: message || `📄 Documento generado por Nai Agent: **${filePath.split(/[\\/]/).pop()}**`,
        });
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'API no disponible' };
  };

  // Send to WhatsApp
  const sendToWhatsApp = async (filePath, text = '') => {
    if (!config.whatsapp.enabled || !config.whatsapp.phone) {
      return { success: false, error: 'WhatsApp no está habilitado o configurado' };
    }

    try {
      if (window.electronAPI?.sendWhatsApp) {
        const fileName = (filePath || '').split(/[\\/]/).pop();
        const msg = text || `📄 *Reporte generado por Nai Agent:* ${fileName}`;
        return await window.electronAPI.sendWhatsApp({
          phone: config.whatsapp.phone,
          apiKey: config.whatsapp.apiKey,
          text: msg,
          filePath,
        });
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'API no disponible' };
  };

  // Backup to Google Drive (Webhook or Folder)
  const backupToGoogleDrive = async (filePath) => {
    if (!config.googleDrive.enabled) {
      return { success: false, error: 'Google Drive no habilitado' };
    }

    try {
      if (config.googleDrive.mode === 'webhook' && config.googleDrive.webhookUrl) {
        if (window.electronAPI?.uploadToGoogleDriveWebhook) {
          return await window.electronAPI.uploadToGoogleDriveWebhook({
            webhookUrl: config.googleDrive.webhookUrl,
            filePath,
          });
        }
      } else if (config.googleDrive.folderPath) {
        if (window.electronAPI?.backupToCloud) {
          return await window.electronAPI.backupToCloud({
            filePath,
            destinationFolder: config.googleDrive.folderPath,
          });
        }
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Configuración incompleta' };
  };

  // Backup to Dropbox (API or Folder)
  const backupToDropbox = async (filePath) => {
    if (!config.dropbox.enabled) {
      return { success: false, error: 'Dropbox no habilitado' };
    }

    try {
      if (config.dropbox.mode === 'api' && config.dropbox.apiToken) {
        if (window.electronAPI?.uploadToDropboxAPI) {
          return await window.electronAPI.uploadToDropboxAPI({
            token: config.dropbox.apiToken,
            filePath,
          });
        }
      } else if (config.dropbox.folderPath) {
        if (window.electronAPI?.backupToCloud) {
          return await window.electronAPI.backupToCloud({
            filePath,
            destinationFolder: config.dropbox.folderPath,
          });
        }
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Configuración incompleta' };
  };

  // Automated notification dispatcher
  const notifyPDFGenerated = async (filePath, title = '') => {
    const results = [];
    const fileName = (filePath || '').split(/[\\/]/).pop();

    if (config.telegram.enabled && config.telegram.autoSendPdf) {
      const res = await sendPdfToTelegram(
        filePath,
        `✅ *Nuevo PDF Generado por Nai Agent*\n\n📄 *Título:* ${title || 'Documento'}\n📁 *Archivo:* \`${fileName}\``
      );
      results.push({ target: 'telegram', ...res });
    }

    if (config.discord.enabled && config.discord.autoSendPdf) {
      const res = await sendPdfToDiscord(
        filePath,
        `✅ **Nuevo PDF Generado por Nai Agent**\n📄 **Título:** ${title || 'Documento'}`
      );
      results.push({ target: 'discord', ...res });
    }

    if (config.whatsapp.enabled && config.whatsapp.autoSendPdf && config.whatsapp.apiKey) {
      const res = await sendToWhatsApp(
        filePath,
        `✅ *Nuevo PDF Generado por Nai Agent*\n📄 *Título:* ${title || 'Documento'}\n📁 *Archivo:* ${fileName}`
      );
      results.push({ target: 'whatsapp', ...res });
    }

    if (config.googleDrive.enabled && config.googleDrive.autoBackupPdf) {
      const res = await backupToGoogleDrive(filePath);
      results.push({ target: 'googleDrive', ...res });
    }

    if (config.dropbox.enabled && config.dropbox.autoBackupPdf) {
      const res = await backupToDropbox(filePath);
      results.push({ target: 'dropbox', ...res });
    }

    return results;
  };

  return (
    <IntegrationsContext.Provider
      value={{
        telegramConfig: config.telegram,
        discordConfig: config.discord,
        whatsappConfig: config.whatsapp,
        googleDriveConfig: config.googleDrive,
        dropboxConfig: config.dropbox,
        updateTelegramConfig,
        updateDiscordConfig,
        updateWhatsAppConfig,
        updateGoogleDriveConfig,
        updateDropboxConfig,
        selectDriveFolder,
        selectDropboxFolder,
        isTestingTelegram,
        isTestingDiscord,
        isTestingWhatsApp,
        isTestingDrive,
        isTestingDropbox,
        telegramStatus,
        discordStatus,
        whatsappStatus,
        driveStatus,
        dropboxStatus,
        testTelegramConnection,
        testDiscordConnection,
        testWhatsAppConnection,
        testGoogleDriveConnection,
        sendPdfToTelegram,
        sendPdfToDiscord,
        sendToWhatsApp,
        backupToGoogleDrive,
        backupToDropbox,
        notifyPDFGenerated,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
}
