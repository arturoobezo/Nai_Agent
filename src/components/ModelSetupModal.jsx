import React, { useState, useEffect } from 'react';
import { Download, Sparkles, CheckCircle2, HardDrive, Cpu, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

export default function ModelSetupModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { getModelStatus, downloadModel } = useWorkspace();
  const [modelStatus, setModelStatus] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDownload, setCurrentDownload] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  const checkStatus = async () => {
    try {
      const res = await getModelStatus();
      setModelStatus(res);
    } catch (e) {
      console.warn('Error checking models status:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (window.electronAPI?.onModelDownloadProgress) {
      const unsub = window.electronAPI.onModelDownloadProgress((data) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [data.modelId]: data,
        }));
        setCurrentDownload(data);
      });
      return () => unsub();
    }
  }, []);

  if (!isOpen || !modelStatus) return null;

  const coreModels = (modelStatus.models || []).filter(
    (m) => m.id === 'krea2_turbo' || m.id === 'qwen_clip' || m.id === 'qwen_vae'
  );

  const missingModels = coreModels.filter((m) => !m.installed);
  const allInstalled = missingModels.length === 0;

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setErrorMsg('');

    for (const mod of missingModels) {
      setCurrentDownload({ name: mod.name, percent: 0 });
      const res = await downloadModel(mod.id);
      if (!res || !res.success) {
        setErrorMsg(`Error al descargar ${mod.name}: ${res?.error || 'Desconocido'}`);
        setIsDownloading(false);
        return;
      }
    }

    await checkStatus();
    setIsDownloading(false);
    setCurrentDownload(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 flex flex-col gap-4 font-sans ${
        isDark ? 'bg-[#13131f] border-purple-500/30 text-slate-100' : 'bg-white border-purple-200 text-slate-900'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDownloading}
          className="absolute top-4 right-4 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-500/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Motor de Generación Local (Krea 2 Turbo)</h2>
            <p className="text-xs opacity-75">Configuración de modelos de inteligencia artificial para tu equipo</p>
          </div>
        </div>

        {/* Hardware Status Tag */}
        {modelStatus.hardware && (
          <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border ${
            isDark ? 'bg-[#1a1a2e] border-slate-800 text-slate-300' : 'bg-purple-50/50 border-purple-100 text-slate-700'
          }`}>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>GPU: <strong>{modelStatus.hardware.gpuName}</strong> ({modelStatus.hardware.vramGB} GB VRAM)</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Compatible
            </span>
          </div>
        )}

        {/* Models List */}
        <div className="flex flex-col gap-2 my-1">
          {coreModels.map((mod) => {
            const prog = downloadProgress[mod.id];
            return (
              <div
                key={mod.id}
                className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                  mod.installed
                    ? (isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200')
                    : (isDark ? 'bg-[#181829] border-slate-800' : 'bg-slate-50 border-slate-200')
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {mod.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold truncate">{mod.name}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-70">
                    {(mod.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>

                {/* Progress Bar if currently downloading */}
                {isDownloading && prog && prog.percent !== undefined && !mod.installed && (
                  <div className="w-full flex flex-col gap-1 mt-1">
                    <div className="w-full bg-slate-700/30 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-200"
                        style={{ width: `${prog.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] opacity-75">
                      <span>{(prog.downloadedBytes / (1024 * 1024)).toFixed(0)} MB / {(prog.totalBytes / (1024 * 1024)).toFixed(0)} MB</span>
                      <span>{prog.percent}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-500/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-500/10 transition-colors"
          >
            {allInstalled ? 'Cerrar' : 'Omitir por ahora'}
          </button>

          {!allInstalled && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Descargando ({currentDownload?.percent || 0}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Modelos ({missingModels.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
