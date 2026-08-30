import React, { useState } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  Server,
  Cpu,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RadioTower,
  HelpCircle,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Zap,
  GitBranch,
  Bot,
  BrainCircuit,
  Flame
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';

export default function ProviderSettings() {
  const {
    activeProvider,
    setActiveProvider,
    providers,
    updateProviderConfig,
    checkConnectionAndFetchModels,
  } = useAI();

  const { isDark } = useTheme();
  const [showKey, setShowKey] = useState(false);

  const providerMetadata = {
    anthropic: {
      name: 'Anthropic Claude',
      desc: 'Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus (API Oficial)',
      badge: 'Cloud • Oficial Anthropic',
      icon: BrainCircuit,
      accent: 'from-amber-600 via-orange-600 to-amber-700',
      defaultUrl: 'https://api.anthropic.com/v1',
      docUrl: 'https://console.anthropic.com/settings/keys',
    },
    openai: {
      name: 'OpenAI',
      desc: 'GPT-4o, GPT-4o Mini, o1, o3-mini',
      badge: 'Cloud • Oficial',
      icon: Bot,
      accent: 'from-emerald-600 to-teal-700',
      defaultUrl: 'https://api.openai.com/v1',
      docUrl: 'https://platform.openai.com/api-keys',
    },
    google: {
      name: 'Google Gemini',
      desc: 'Gemini 2.0 Flash, Gemini 1.5 Pro (API Google AI Studio)',
      badge: 'Cloud • OpenAI Compat',
      icon: Sparkles,
      accent: 'from-blue-600 to-cyan-600',
      defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      docUrl: 'https://aistudio.google.com/app/apikey',
    },
    groq: {
      name: 'Groq Cloud',
      desc: 'Inferencia ultra rápida de Llama 3.3, Mixtral y DeepSeek',
      badge: 'Cloud • Ultra Rápido',
      icon: Zap,
      accent: 'from-orange-500 to-red-600',
      defaultUrl: 'https://api.groq.com/openai/v1',
      docUrl: 'https://console.groq.com/keys',
    },
    deepseek: {
      name: 'DeepSeek',
      desc: 'DeepSeek V3 (Chat) y DeepSeek R1 (Razonamiento)',
      badge: 'Cloud • Económico',
      icon: Globe,
      accent: 'from-indigo-600 to-blue-700',
      defaultUrl: 'https://api.deepseek.com/v1',
      docUrl: 'https://platform.deepseek.com/api_keys',
    },
    github: {
      name: 'GitHub Models',
      desc: 'Modelos de Azure/GitHub con tu GitHub Personal Access Token',
      badge: 'Cloud • GitHub PAT',
      icon: GitBranch,
      accent: 'from-slate-700 to-slate-900',
      defaultUrl: 'https://models.inference.ai.azure.com',
      docUrl: 'https://github.com/settings/tokens',
    },
    mistral: {
      name: 'Mistral AI',
      desc: 'Mistral Large, Codestral, Ministral',
      badge: 'Cloud • Oficial Mistral',
      icon: Flame,
      accent: 'from-amber-500 to-orange-600',
      defaultUrl: 'https://api.mistral.ai/v1',
      docUrl: 'https://console.mistral.ai/api-keys',
    },
    openrouter: {
      name: 'OpenRouter',
      desc: 'Acceso a Claude, GPT-4o, Llama 3, Qwen en un solo lugar',
      badge: 'Cloud • Multi-Modelo',
      icon: Globe,
      accent: 'from-purple-600 to-pink-600',
      defaultUrl: 'https://openrouter.ai/api/v1',
      docUrl: 'https://openrouter.ai/keys',
    },
    lmstudio: {
      name: 'LM Studio',
      desc: 'Servidor local para modelos GGUF (Llama, Mistral, Qwen)',
      badge: 'Local • Puerto 1234',
      icon: Cpu,
      accent: 'from-sky-600 to-blue-700',
      defaultUrl: 'http://localhost:1234/v1',
      docUrl: 'https://lmstudio.ai',
    },
    ollama: {
      name: 'Ollama',
      desc: 'Modelos locales en CLI (`ollama run llama3:8b`)',
      badge: 'Local • Puerto 11434',
      icon: Server,
      accent: 'from-yellow-600 to-amber-700',
      defaultUrl: 'http://localhost:11434/v1',
      docUrl: 'https://ollama.com',
    },
    custom: {
      name: 'Personalizado',
      desc: 'vLLM, llamafile, Together AI, Perplexity o servidor propio',
      badge: 'Custom • OpenAI Compat',
      icon: SlidersHorizontal,
      accent: 'from-teal-600 to-emerald-700',
      defaultUrl: 'http://localhost:8000/v1',
      docUrl: '',
    },
  };

  const current = providers[activeProvider] || {};
  const meta = providerMetadata[activeProvider] || {};

  const customPresets = [
    { label: 'Perplexity AI', url: 'https://api.perplexity.ai', model: 'sonar' },
    { label: 'Groq Cloud', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    { label: 'Google AI Studio', url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    { label: 'GitHub Models', url: 'https://models.inference.ai.azure.com', model: 'gpt-4o' },
    { label: 'Together AI', url: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
    { label: 'Mistral AI', url: 'https://api.mistral.ai/v1', model: 'mistral-large-latest' },
    { label: 'vLLM Local', url: 'http://localhost:8000/v1', model: '' },
    { label: 'llamafile', url: 'http://localhost:8080/v1', model: '' },
  ];

  return (
    <div className={`h-full flex flex-col p-4 space-y-4 overflow-y-auto font-sans transition-colors ${
      isDark ? 'text-slate-200' : 'text-slate-800'
    }`}>
      {/* Header */}
      <div className={`pb-3 border-b ${isDark ? 'border-[#242436]' : 'border-[#e2e8f0]'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-bold flex items-center gap-2 ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <RadioTower className="w-4 h-4 text-purple-500" />
            Proveedores de IA
          </h2>
          <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${
            isDark ? 'text-slate-400 bg-[#151522] border-[#242436]' : 'text-slate-600 bg-slate-50 border-slate-200'
          }`}>
            {Object.keys(providerMetadata).length} Motores Soportados
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Conéctate directamente a Anthropic Claude, OpenAI, Google, Groq, Mistral, GitHub o servidores locales.
        </p>
      </div>

      {/* Provider Selector Grid */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Seleccionar Proveedor Activo
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.keys(providerMetadata).map((key) => {
            const item = providerMetadata[key];
            const pConfig = providers[key] || {};
            const isSelected = activeProvider === key;
            const Icon = item.icon;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveProvider(key);
                  if (pConfig.status === 'idle') {
                    checkConnectionAndFetchModels(key);
                  }
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-start text-left gap-1.5 transition-all relative ${
                  isSelected
                    ? isDark
                      ? 'bg-[#1b1b28] border-purple-500/80 shadow-md shadow-purple-950/60'
                      : 'bg-purple-50 border-purple-300 shadow-sm'
                    : isDark
                    ? 'bg-[#151522] border-[#242436] hover:border-purple-500/40 hover:bg-[#181824]'
                    : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                }`}
              >
                {/* Live Status Dot */}
                <span
                  className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${
                    pConfig.status === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : pConfig.status === 'checking'
                      ? 'bg-amber-400 animate-pulse'
                      : pConfig.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-slate-400'
                  }`}
                  title={`Estado: ${pConfig.status}`}
                />

                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-tr ${item.accent} text-white shadow-sm`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="w-full overflow-hidden">
                  <span className={`text-xs font-semibold block truncate ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {item.badge.split('•')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Provider Details & Config */}
      <div className={`border rounded-2xl p-4 space-y-4 shadow-sm transition-colors ${
        isDark ? 'bg-[#151522] border-[#242436]' : 'bg-white border-slate-200'
      }`}>
        {/* Active Title + Status Badge */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-[#242436]' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${meta.accent}`} />
            <div>
              <h3 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{meta.name}</h3>
              <p className="text-[11px] text-slate-400">{meta.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {current.status === 'connected' && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 rounded-full ${
                isDark ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                <CheckCircle2 className="w-3 h-3" />
                Conectado
              </span>
            )}
            {current.status === 'checking' && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 rounded-full ${
                isDark ? 'text-amber-400 bg-amber-950/60 border-amber-800/50' : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Probando...
              </span>
            )}
            {current.status === 'error' && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 rounded-full ${
                isDark ? 'text-rose-400 bg-rose-950/60 border-rose-800/50' : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}>
                <AlertCircle className="w-3 h-3" />
                Desconectado
              </span>
            )}
            {current.status === 'idle' && (
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                isDark ? 'text-slate-400 bg-[#0c0c14] border-[#242436]' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                No verificado
              </span>
            )}
          </div>
        </div>

        {/* LM Studio Quick Guide */}
        {activeProvider === 'lmstudio' && (
          <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
            isDark ? 'bg-[#181827] border-purple-800/40 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <div className="font-semibold flex items-center gap-1.5 text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>Guía de Conexión para LM Studio:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 opacity-90 leading-relaxed">
              <li>Abre la aplicación <strong>LM Studio</strong> en tu computadora.</li>
              <li>Entra a la pestaña <strong>&lt;-&gt; (Local Server / Developer)</strong> en el menú lateral de LM Studio.</li>
              <li>Elige un modelo descargado arriba y presiona <strong>"Start Server"</strong>.</li>
              <li>Confirma que la URL sea <code className="font-mono bg-black/20 px-1 rounded">http://127.0.0.1:1234/v1</code> y pulsa <strong>"Probar Conexión"</strong> abajo.</li>
            </ol>
          </div>
        )}

        {/* Ollama Quick Guide */}
        {activeProvider === 'ollama' && (
          <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
            isDark ? 'bg-[#181827] border-amber-800/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="font-semibold flex items-center gap-1.5 text-amber-400">
              <Server className="w-3.5 h-3.5" />
              <span>Guía de Conexión para Ollama:</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              Asegúrate de que Ollama esté ejecutándose en Windows o ejecuta en tu terminal <code className="font-mono bg-black/20 px-1 rounded">ollama serve</code>. Tus modelos instalados se detectarán automáticamente.
            </p>
          </div>
        )}

        {/* Custom Presets Shortcut (If Custom Provider is active) */}
        {activeProvider === 'custom' && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Plantillas Rápidas para Autocompletar</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {customPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    updateProviderConfig('custom', 'url', preset.url);
                    if (preset.model) {
                      updateProviderConfig('custom', 'selectedModel', preset.model);
                    }
                  }}
                  className="text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-2 py-1 rounded-lg transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Server Endpoint URL */}
        <div className="space-y-1.5">
          <label className={`text-[11px] font-medium flex items-center justify-between ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <span>URL Base del Endpoint</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeProvider === 'anthropic' ? '/v1/messages' : '/v1/chat/completions'}
            </span>
          </label>
          <input
            type="text"
            value={current.url || ''}
            placeholder={meta.defaultUrl}
            onChange={(e) => updateProviderConfig(activeProvider, 'url', e.target.value)}
            className={`w-full border rounded-xl px-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 font-mono ${
              isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-medium flex items-center gap-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <Key className="w-3 h-3 text-purple-500" />
              <span>
                {activeProvider === 'github'
                  ? 'GitHub Personal Access Token (PAT)'
                  : activeProvider === 'lmstudio' || activeProvider === 'ollama'
                  ? 'API Key (Opcional en servidor local)'
                  : `API Key de ${meta.name}`}
              </span>
            </label>
            {meta.docUrl && (
              <a
                href={meta.docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                Obtener Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={current.apiKey || ''}
              placeholder={
                activeProvider === 'anthropic'
                  ? 'sk-ant-api03-...'
                  : activeProvider === 'google'
                  ? 'AIzaSy...'
                  : activeProvider === 'openai'
                  ? 'sk-proj-...'
                  : activeProvider === 'groq'
                  ? 'gsk_...'
                  : activeProvider === 'github'
                  ? 'ghp_... o github_pat_...'
                  : activeProvider === 'deepseek'
                  ? 'sk-...'
                  : activeProvider === 'mistral'
                  ? 'API Key de Mistral'
                  : activeProvider === 'openrouter'
                  ? 'sk-or-v1-...'
                  : 'API Key'
              }
              onChange={(e) => updateProviderConfig(activeProvider, 'apiKey', e.target.value)}
              className={`w-full border rounded-xl pl-3 pr-9 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 font-mono ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Model Selector & Auto Fetch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Modelo Seleccionado
            </label>
            <span className="text-[10px] text-slate-400">
              {current.models?.length || 0} modelos disponibles
            </span>
          </div>

          {current.models && current.models.length > 0 ? (
            <select
              value={current.selectedModel || ''}
              onChange={(e) =>
                updateProviderConfig(activeProvider, 'selectedModel', e.target.value)
              }
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-mono ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {current.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Ingresa el identificador del modelo..."
              value={current.selectedModel || ''}
              onChange={(e) =>
                updateProviderConfig(activeProvider, 'selectedModel', e.target.value)
              }
              className={`w-full border rounded-xl px-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 font-mono ${
                isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          )}
        </div>

        {/* Error Notification if any */}
        {current.errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <span className="font-semibold block">Error de conexión:</span>
              <p className="text-rose-300/90">{current.errorMsg}</p>
            </div>
          </div>
        )}

        {/* Test Connection Button */}
        <button
          type="button"
          disabled={current.status === 'checking'}
          onClick={() => checkConnectionAndFetchModels(activeProvider)}
          className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${current.status === 'checking' ? 'animate-spin' : ''}`} />
          <span>Probar Conexión & Consultar Modelos</span>
        </button>
      </div>

      {/* Guide Box */}
      <div className={`border p-3 rounded-xl text-[11px] space-y-1.5 ${
        isDark ? 'bg-[#0c0c14] border-[#242436] text-slate-400' : 'bg-purple-50/50 border-purple-200 text-slate-600'
      }`}>
        <span className={`font-semibold flex items-center gap-1.5 ${
          isDark ? 'text-slate-200' : 'text-slate-800'
        }`}>
          <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
          Protocolos Soportados Nativamente:
        </span>
        <p className="leading-relaxed">
          Nai Agent soporta de forma nativa la API directa de <strong>Anthropic Claude</strong> (<code className="text-amber-500 font-mono">/v1/messages</code> con <code className="text-amber-500 font-mono">x-api-key</code>) y el estándar universal <strong>OpenAI</strong> (<code className="text-purple-500 font-mono">/v1/chat/completions</code>) para Google Gemini, OpenAI, Groq, DeepSeek, Mistral, Perplexity, OpenRouter y servidores locales.
        </p>
      </div>
    </div>
  );
}
