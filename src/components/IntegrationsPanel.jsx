import React, { useState } from 'react';
import {
  Send,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Radio,
  HelpCircle,
  Eye,
  EyeOff,
  Phone,
  Cloud,
  FolderOpen,
  Box,
  Copy,
  ExternalLink as LinkIcon
} from 'lucide-react';
import { useIntegrations } from '../context/IntegrationsContext';
import { useTheme } from '../context/ThemeContext';

export default function IntegrationsPanel() {
  const {
    telegramConfig,
    discordConfig,
    whatsappConfig,
    googleDriveConfig,
    dropboxConfig,
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
    telegramStatus,
    discordStatus,
    whatsappStatus,
    driveStatus,
    testTelegramConnection,
    testDiscordConnection,
    testWhatsAppConnection,
    testGoogleDriveConnection,
  } = useIntegrations();

  const { isDark } = useTheme();

  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);
  const [showDiscordHelp, setShowDiscordHelp] = useState(false);
  const [showWhatsAppHelp, setShowWhatsAppHelp] = useState(false);
  const [showDriveHelp, setShowDriveHelp] = useState(false);
  const [showDropboxHelp, setShowDropboxHelp] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const googleAppsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderName = data.folderName || "Nai_Agent_Reportes";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var decoded = Utilities.base64Decode(data.base64);
    var blob = Utilities.newBlob(decoded, data.mimeType || "application/pdf", data.fileName || "Reporte.pdf");
    var file = folder.createFile(blob);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", fileId: file.getId(), url: file.getUrl() })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleOpenCallMeBot = () => {
    // Official CallMeBot WhatsApp activation link
    const url = 'https://api.whatsapp.com/send?phone=34912906636&text=I+allow+callmebot+to+send+me+messages';
    if (window.electronAPI?.openSystemPath) {
      window.electronAPI.openSystemPath(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto p-3.5 space-y-4 font-sans select-text ${
      isDark ? 'bg-[#0c0c14] text-slate-200' : 'bg-[#ffffff] text-slate-800'
    }`}>
      {/* Header */}
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <Radio className="w-4 h-4 text-purple-500 animate-pulse" />
            <span>Conexiones & Nube</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Sube reportes directamente a tu nube (Drive, Dropbox) o mensajería.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GOOGLE DRIVE CARD */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        googleDriveConfig.enabled
          ? isDark
            ? 'bg-[#151522] border-amber-500/40 shadow-lg shadow-amber-950/20'
            : 'bg-amber-50/40 border-amber-200 shadow-sm'
          : isDark
          ? 'bg-[#12121c] border-[#242436]'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Google Drive</span>
                {googleDriveConfig.enabled && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">Subida directa a tu nube de Google</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={googleDriveConfig.enabled}
              onChange={(e) => updateGoogleDriveConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-black/20 border border-[#242436]">
            <button
              onClick={() => updateGoogleDriveConfig({ mode: 'webhook' })}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                googleDriveConfig.mode === 'webhook'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌐 Webhook Nube Directo
            </button>
            <button
              onClick={() => updateGoogleDriveConfig({ mode: 'folder' })}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                googleDriveConfig.mode === 'folder'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📁 Carpeta Sincronizada PC
            </button>
          </div>

          {googleDriveConfig.mode === 'webhook' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  URL de Webhook (Google Apps Script)
                </label>
                <button
                  onClick={() => setShowDriveHelp(!showDriveHelp)}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>¿Cómo obtener la URL en 1 min?</span>
                </button>
              </div>

              <input
                type="text"
                value={googleDriveConfig.webhookUrl || ''}
                onChange={(e) => updateGoogleDriveConfig({ webhookUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 ${
                  isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />

              {showDriveHelp && (
                <div className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-2 ${
                  isDark ? 'bg-[#0c0c14] border-amber-500/30 text-slate-300' : 'bg-white border-amber-200 text-slate-700'
                }`}>
                  <p className="font-semibold text-amber-400">Paso a paso para conectar tu Drive web:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[10px] opacity-90">
                    <li>Entra en <strong>script.google.com</strong> con tu cuenta de Google.</li>
                    <li>Crea un <strong>Nuevo Proyecto</strong> y pega este código:</li>
                  </ol>
                  <div className="relative">
                    <pre className="p-2 rounded bg-black/40 border border-amber-500/20 text-[9px] font-mono text-amber-300 overflow-x-auto max-h-24">
                      <code>{googleAppsScriptCode}</code>
                    </pre>
                    <button
                      onClick={handleCopyScript}
                      className="absolute right-2 top-2 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-semibold"
                    >
                      {copiedScript ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedScript ? 'Copiado' : 'Copiar Código'}</span>
                    </button>
                  </div>
                  <ol start="3" className="list-decimal list-inside space-y-1 text-[10px] opacity-90">
                    <li>Haz clic en <strong>Implementar</strong> ➔ <strong>Nueva implementación</strong>.</li>
                    <li>Tipo: <strong>Aplicación Web</strong> | Quién tiene acceso: <strong>Cualquier usuario</strong>.</li>
                    <li>Copia la <strong>URL de la aplicación web</strong> y pégala aquí arriba.</li>
                  </ol>
                </div>
              )}

              {/* Test Button & Status */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={testGoogleDriveConnection}
                  disabled={isTestingDrive || !googleDriveConfig.webhookUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-amber-950/30 active:scale-95"
                >
                  {isTestingDrive ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Probando Drive...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Probar Conexión Drive</span>
                    </>
                  )}
                </button>

                {driveStatus && (
                  <span className={`text-[10px] font-semibold flex items-center gap-1 truncate max-w-[180px] ${
                    driveStatus.success ? 'text-emerald-400' : 'text-rose-400'
                  }`} title={driveStatus.message}>
                    {driveStatus.success ? <Check className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">{driveStatus.message}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Carpeta Sincronizada de Google Drive en tu PC
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={googleDriveConfig.folderPath || ''}
                  placeholder="Ninguna carpeta seleccionada"
                  className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 truncate ${
                    isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={selectDriveFolder}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-md shadow-amber-950/30 active:scale-95 flex-shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{googleDriveConfig.folderPath ? 'Cambiar' : 'Elegir'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={googleDriveConfig.autoBackupPdf}
                onChange={(e) => updateGoogleDriveConfig({ autoBackupPdf: e.target.checked })}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>📄 Respaldar automáticamente cada PDF generado en Google Drive</span>
            </label>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DROPBOX CARD */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        dropboxConfig.enabled
          ? isDark
            ? 'bg-[#151522] border-blue-500/40 shadow-lg shadow-blue-950/20'
            : 'bg-blue-50/40 border-blue-200 shadow-sm'
          : isDark
          ? 'bg-[#12121c] border-[#242436]'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Dropbox</span>
                {dropboxConfig.enabled && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">Sincronización local o API en la nube</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dropboxConfig.enabled}
              onChange={(e) => updateDropboxConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Mode Selector */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-black/20 border border-[#242436]">
            <button
              onClick={() => updateDropboxConfig({ mode: 'api' })}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                dropboxConfig.mode === 'api'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔑 API Token Directo
            </button>
            <button
              onClick={() => updateDropboxConfig({ mode: 'folder' })}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                dropboxConfig.mode === 'folder'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📁 Carpeta Dropbox PC
            </button>
          </div>

          {dropboxConfig.mode === 'api' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">Dropbox Access Token</label>
                <button
                  onClick={() => setShowDropboxHelp(!showDropboxHelp)}
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>¿Cómo generarlo?</span>
                </button>
              </div>
              <input
                type="password"
                value={dropboxConfig.apiToken || ''}
                onChange={(e) => updateDropboxConfig({ apiToken: e.target.value })}
                placeholder="sl.Bxxxx..."
                className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                  isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />

              {showDropboxHelp && (
                <div className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1 ${
                  isDark ? 'bg-[#0c0c14] border-blue-500/30 text-slate-300' : 'bg-white border-blue-200 text-slate-700'
                }`}>
                  <p className="font-semibold text-blue-400">Crear Token en Dropbox:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] opacity-90">
                    <li>Entra en <strong>dropbox.com/developers/apps</strong>.</li>
                    <li>Crea una app (Scoped Access ➔ Full Dropbox o App Folder).</li>
                    <li>En la pestaña <strong>Permissions</strong> activa <code>files.content.write</code>.</li>
                    <li>En la pestaña <strong>Settings</strong> haz clic en <strong>Generate Access Token</strong> y pégalo aquí.</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Carpeta Sincronizada de Dropbox en tu PC
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={dropboxConfig.folderPath || ''}
                  placeholder="Ninguna carpeta seleccionada"
                  className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 truncate ${
                    isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={selectDropboxFolder}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-950/30 active:scale-95 flex-shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{dropboxConfig.folderPath ? 'Cambiar' : 'Elegir'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={dropboxConfig.autoBackupPdf}
                onChange={(e) => updateDropboxConfig({ autoBackupPdf: e.target.checked })}
                className="rounded text-blue-500 focus:ring-0"
              />
              <span>📄 Respaldar automáticamente cada PDF generado en Dropbox</span>
            </label>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* WHATSAPP CARD */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        whatsappConfig.enabled
          ? isDark
            ? 'bg-[#151522] border-emerald-500/40 shadow-lg shadow-emerald-950/20'
            : 'bg-emerald-50/40 border-emerald-200 shadow-sm'
          : isDark
          ? 'bg-[#12121c] border-[#242436]'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">WhatsApp</span>
                {whatsappConfig.enabled && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">Envío y alertas a tu WhatsApp personal</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappConfig.enabled}
              onChange={(e) => updateWhatsAppConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="space-y-2.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">Número de Teléfono (con código de país)</label>
              <span className="text-[10px] text-slate-400 font-mono">+52 / +34 / +1 ...</span>
            </div>
            <input
              type="text"
              value={whatsappConfig.phone}
              onChange={(e) => updateWhatsAppConfig({ phone: e.target.value })}
              placeholder="Ej: +5215512345678"
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">API Key Automática (Opcional - CallMeBot)</label>
              <button
                onClick={() => setShowWhatsAppHelp(!showWhatsAppHelp)}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3" />
                <span>¿Cómo activar alertas en 1 clic?</span>
              </button>
            </div>
            <input
              type="text"
              value={whatsappConfig.apiKey}
              onChange={(e) => updateWhatsAppConfig({ apiKey: e.target.value })}
              placeholder="Dejar vacío para usar WhatsApp Web o App directa"
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {showWhatsAppHelp && (
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-2 ${
              isDark ? 'bg-[#0c0c14] border-emerald-500/30 text-slate-300' : 'bg-white border-emerald-200 text-slate-700'
            }`}>
              <p className="font-semibold text-emerald-400">Activación oficial de CallMeBot en 1 Clic:</p>
              <p className="text-[10px] opacity-90">
                Para no escribir números manualmente, abre el chat oficial de CallMeBot en WhatsApp directamente con este botón:
              </p>
              <button
                onClick={handleOpenCallMeBot}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Chat Oficial de Activación en WhatsApp</span>
              </button>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px] opacity-90 pt-1">
                <li>Al abrir el enlace, presiona <strong>Enviar</strong> el mensaje preescrito (<em>"I allow callmebot to send me messages"</em>).</li>
                <li>El bot te responderá inmediatamente con tu <strong>API Key de 6 dígitos</strong>.</li>
                <li>Copia esa clave y pégala aquí arriba.</li>
              </ol>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={testWhatsAppConnection}
              disabled={isTestingWhatsApp || !whatsappConfig.phone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/30 active:scale-95"
            >
              {isTestingWhatsApp ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Probando...</span>
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5" />
                  <span>Probar WhatsApp</span>
                </>
              )}
            </button>

            {whatsappStatus && (
              <span className={`text-[10px] font-semibold flex items-center gap-1 truncate max-w-[180px] ${
                whatsappStatus.success ? 'text-emerald-400' : 'text-rose-400'
              }`} title={whatsappStatus.message}>
                {whatsappStatus.success ? <Check className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">{whatsappStatus.message}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TELEGRAM BOT CARD */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        telegramConfig.enabled
          ? isDark
            ? 'bg-[#151522] border-sky-500/40 shadow-lg shadow-sky-950/20'
            : 'bg-sky-50/40 border-sky-200 shadow-sm'
          : isDark
          ? 'bg-[#12121c] border-[#242436]'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Send className="w-4 h-4 transform -rotate-45 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Telegram Bot</span>
                {telegramConfig.enabled && (
                  <span className="text-[9px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">Envío directo de PDFs físicos a tu móvil</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={telegramConfig.enabled}
              onChange={(e) => updateTelegramConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>

        <div className="space-y-2.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">Bot Token</label>
              <button
                onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3" />
                <span>¿Cómo obtener Bot Token & Chat ID?</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showTelegramToken ? 'text' : 'password'}
                value={telegramConfig.botToken}
                onChange={(e) => updateTelegramConfig({ botToken: e.target.value })}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className={`w-full border rounded-xl px-3 py-1.5 pr-8 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 ${
                  isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowTelegramToken(!showTelegramToken)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
              >
                {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Telegram Guide */}
          {showTelegramHelp && (
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
              isDark ? 'bg-[#0c0c14] border-sky-500/30 text-slate-300' : 'bg-white border-sky-200 text-slate-700'
            }`}>
              <p className="font-semibold text-sky-400">Guía rápida de Telegram en 1 minuto:</p>
              <ol className="list-decimal list-inside space-y-1 text-[10px] opacity-90">
                <li>Abre Telegram y busca a <strong>@BotFather</strong>.</li>
                <li>Envía el comando <code>/newbot</code>, dale un nombre y un usuario que termine en <em>bot</em>.</li>
                <li>Copia el <strong>HTTP API Token</strong> que te entrega y pégalo arriba.</li>
                <li>Abre el bot que acabas de crear y dale a <strong>Iniciar</strong> (o mándale cualquier mensaje).</li>
                <li>Para tu <strong>Chat ID</strong>: busca en Telegram a <strong>@userinfobot</strong> y copia el número que dice <em>Id</em>.</li>
              </ol>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Chat ID de Telegram</label>
            <input
              type="text"
              value={telegramConfig.chatId}
              onChange={(e) => updateTelegramConfig({ chatId: e.target.value })}
              placeholder="Ej: 987654321"
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={testTelegramConnection}
              disabled={isTestingTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-sky-950/30 active:scale-95"
            >
              {isTestingTelegram ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Probando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Probar Conexión</span>
                </>
              )}
            </button>

            {telegramStatus && (
              <span className={`text-[10px] font-semibold flex items-center gap-1 truncate max-w-[180px] ${
                telegramStatus.success ? 'text-emerald-400' : 'text-rose-400'
              }`} title={telegramStatus.message}>
                {telegramStatus.success ? <Check className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">{telegramStatus.message}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DISCORD WEBHOOK CARD */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        discordConfig.enabled
          ? isDark
            ? 'bg-[#151522] border-indigo-500/40 shadow-lg shadow-indigo-950/20'
            : 'bg-indigo-50/40 border-indigo-200 shadow-sm'
          : isDark
          ? 'bg-[#12121c] border-[#242436]'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">Discord Webhooks</span>
                {discordConfig.enabled && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-semibold">
                    Activo
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block">Notificaciones en canales de tu servidor</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={discordConfig.enabled}
              onChange={(e) => updateDiscordConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>

        <div className="space-y-2.5 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-300">Webhook URL</label>
              <button
                onClick={() => setShowDiscordHelp(!showDiscordHelp)}
                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3" />
                <span>¿Cómo crear el Webhook en Discord?</span>
              </button>
            </div>

            <input
              type="text"
              value={discordConfig.webhookUrl}
              onChange={(e) => updateDiscordConfig({ webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className={`w-full border rounded-xl px-3 py-1.5 text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Collapsible Discord Guide */}
          {showDiscordHelp && (
            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
              isDark ? 'bg-[#0c0c14] border-indigo-500/30 text-slate-300' : 'bg-white border-indigo-200 text-slate-700'
            }`}>
              <p className="font-semibold text-indigo-400">Crear Webhook en Discord:</p>
              <ol className="list-decimal list-inside space-y-1 text-[10px] opacity-90">
                <li>En tu servidor de Discord, entra en los <strong>Ajustes del Canal</strong> (el icono de engranaje ⚙️).</li>
                <li>Ve a la pestaña <strong>Integraciones</strong> y haz clic en <strong>Webhooks</strong>.</li>
                <li>Haz clic en <strong>Crear Webhook</strong> y ponle de nombre <em>Nai Agent</em>.</li>
                <li>Haz clic en <strong>Copiar URL del Webhook</strong> y pégala en la casilla de arriba.</li>
              </ol>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={testDiscordConnection}
              disabled={isTestingDiscord || !discordConfig.webhookUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-950/30 active:scale-95"
            >
              {isTestingDiscord ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Probando...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Probar Conexión</span>
                </>
              )}
            </button>

            {discordStatus && (
              <span className={`text-[10px] font-semibold flex items-center gap-1 truncate max-w-[180px] ${
                discordStatus.success ? 'text-emerald-400' : 'text-rose-400'
              }`} title={discordStatus.message}>
                {discordStatus.success ? <Check className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">{discordStatus.message}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
