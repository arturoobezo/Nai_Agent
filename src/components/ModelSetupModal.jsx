import React, { useState, useEffect } from 'react';
import { Download, Sparkles, CheckCircle2, HardDrive, Cpu, AlertCircle, RefreshCw, X, Check, ShieldAlert } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

export default function ModelSetupModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { getModelStatus, downloadModel, getActiveModel, setActiveModel } = useWorkspace();
  const [modelStatus, setModelStatus] = useState(null);
  const [activeModelId, setActiveModelId] = useState('krea2_turbo_q4');
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDownload, setCurrentDownload] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingWarningModel, setPendingWarningModel] = useState(null);

  const checkStatus = async () => {
    try {
      const res = await getModelStatus();
      setModelStatus(res);
      if (res?.activeModelId) {
        setActiveModelId(res.activeModelId);
      } else {
        const cur = await getActiveModel();
        if (cur) setActiveModelId(cur);
      }
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

  const modelsList = modelStatus.models || [];
  const diffusionModels = modelsList.filter((m) => m.type === 'diffusion');
  const helperModels = modelsList.filter((m) => m.type !== 'diffusion');

  const handleSelectModel = async (mod) => {
    const hw = modelStatus.hardware || {};
    const vram = hw.vramGB || 0;

    // Check if model exceeds VRAM
    if (mod.minVramGB && vram < mod.minVramGB) {
      setPendingWarningModel(mod);
      return;
    }

    await applyActiveModel(mod.id);
  };

  const applyActiveModel = async (modelId) => {
    setActiveModelId(modelId);
    setPendingWarningModel(null);
    await setActiveModel(modelId);
    await checkStatus();
  };

  const handleDownloadSingle = async (modelId, name) => {
    setIsDownloading(true);
    setErrorMsg('');
    setCurrentDownload({ name, percent: 0 });
    const res = await downloadModel(modelId);
    if (!res || !res.success) {
      setErrorMsg(`Error al descargar ${name}: ${res?.error || 'Desconocido'}`);
    }
    await checkStatus();
    setIsDownloading(false);
    setCurrentDownload(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl p-6 font-sans overflow-hidden ${
        isDark ? 'bg-[#13131f] border-purple-500/30 text-slate-100' : 'bg-white border-purple-200 text-slate-900'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDownloading}
          className="absolute top-4 right-4 p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-slate-500/10 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Motor de Generación Local (Krea 2 Turbo)</h2>
            <p className="text-xs opacity-75">Selecciona y administra la cuantización adecuada para tu hardware</p>
          </div>
        </div>

        {/* Hardware Status Tag */}
        {modelStatus.hardware && (
          <div className={`flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl border mb-3 flex-shrink-0 ${
            isDark ? 'bg-[#1a1a2e] border-slate-800 text-slate-300' : 'bg-purple-50/50 border-purple-100 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>GPU: <strong>{modelStatus.hardware.gpuName}</strong> ({modelStatus.hardware.vramGB} GB VRAM)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {modelStatus.hardware.vramGB >= 8 ? 'Aceleración GPU Lista' : 'Modo Ligero'}
            </span>
          </div>
        )}

        {/* Scrollable Model List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-1">
          {/* 1. Diffusion Quantizations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Cuantizaciones de Krea 2 Turbo</h3>
            <div className="space-y-2">
              {diffusionModels.map((mod) => {
                const prog = downloadProgress[mod.id];
                const isActive = activeModelId === mod.id;
                const isRecommended = mod.recommendedForHardware;

                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                      isActive
                        ? (isDark ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/30' : 'bg-purple-50 border-purple-400')
                        : mod.installed
                        ? (isDark ? 'bg-[#181829] border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                        : (isDark ? 'bg-[#141424] border-slate-800/40 opacity-80' : 'bg-slate-50/50 border-slate-100')
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleSelectModel(mod)}
                          className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                            isActive
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'border-slate-500/40 hover:border-purple-400'
                          }`}
                          title="Seleccionar como modelo activo"
                        >
                          {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold">{mod.name}</span>
                            {mod.badge && (
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${
                                isRecommended
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {mod.badge}
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-70 mt-0.5 leading-relaxed">{mod.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono opacity-70">
                          {(mod.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </span>

                        {mod.installed ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Instalado
                          </span>
                        ) : (
                          !isDownloading && (
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(mod.id, mod.name)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all text-[10px] flex items-center gap-1 font-semibold border border-purple-500/30"
                            >
                              <Download className="w-3 h-3" />
                              <span>Descargar</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
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
          </div>

          {/* 2. Helper Core Models (CLIP & VAE) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Componentes Base (CLIP & VAE)</h3>
            <div className="space-y-2">
              {helperModels.map((mod) => (
                <div
                  key={mod.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    mod.installed
                      ? (isDark ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-emerald-50/40 border-emerald-200')
                      : (isDark ? 'bg-[#181829] border-slate-800' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {mod.installed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold">{mod.name}</span>
                      <p className="text-[10px] opacity-60">{mod.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono opacity-70">
                      {(mod.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </span>
                    {!mod.installed && !isDownloading && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(mod.id, mod.name)}
                        className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all text-[10px] font-semibold border border-purple-500/30"
                      >
                        Descargar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warning Modal for VRAM Exceeded */}
        {pendingWarningModel && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2 text-amber-400 text-xs">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aviso de Memoria VRAM:</strong> Tu GPU tiene {modelStatus.hardware?.vramGB || 8} GB de VRAM. El modelo <strong>{pendingWarningModel.name}</strong> requiere {pendingWarningModel.minVramGB} GB de memoria de video y se ejecutará en CPU o podría exceder la memoria.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setPendingWarningModel(null)}
                className="px-3 py-1 text-[11px] font-medium rounded-lg hover:bg-slate-500/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => applyActiveModel(pendingWarningModel.id)}
                className="px-3 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors shadow-sm"
              >
                Usar de todos modos
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-500/20 flex-shrink-0">
          <span className="text-[11px] opacity-60">
            Modelo activo actual: <strong>{modelsList.find((m) => m.id === activeModelId)?.name || activeModelId}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md active:scale-95"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
