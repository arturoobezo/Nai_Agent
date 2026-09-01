import React, { createContext, useContext, useState, useEffect } from 'react';

const AIContext = createContext(null);

const DEFAULT_PROVIDERS = {
  anthropic: {
    name: 'Anthropic Claude',
    type: 'cloud',
    url: 'https://api.anthropic.com/v1',
    apiKey: '',
    selectedModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  openai: {
    name: 'OpenAI',
    type: 'cloud',
    url: 'https://api.openai.com/v1',
    apiKey: '',
    selectedModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini (Razonamiento)' },
      { id: 'o1', name: 'o1' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  google: {
    name: 'Google Gemini',
    type: 'cloud',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    selectedModel: 'gemini-2.0-flash',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Exp' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  groq: {
    name: 'Groq Cloud',
    type: 'cloud',
    url: 'https://api.groq.com/openai/v1',
    apiKey: '',
    selectedModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  deepseek: {
    name: 'DeepSeek',
    type: 'cloud',
    url: 'https://api.deepseek.com/v1',
    apiKey: '',
    selectedModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  github: {
    name: 'GitHub Models',
    type: 'cloud',
    url: 'https://models.inference.ai.azure.com',
    apiKey: '',
    selectedModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (GitHub Token)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'Phi-3.5-mini-instruct', name: 'Microsoft Phi-3.5 Mini' },
      { id: 'Meta-Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  mistral: {
    name: 'Mistral AI',
    type: 'cloud',
    url: 'https://api.mistral.ai/v1',
    apiKey: '',
    selectedModel: 'mistral-large-latest',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'codestral-latest', name: 'Codestral (Programación)' },
      { id: 'ministral-8b-latest', name: 'Ministral 8B' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  openrouter: {
    name: 'OpenRouter',
    type: 'cloud',
    url: 'https://openrouter.ai/api/v1',
    apiKey: '',
    selectedModel: 'anthropic/claude-3.5-sonnet',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
    ],
    status: 'idle',
    errorMsg: '',
  },
  lmstudio: {
    name: 'LM Studio',
    type: 'local',
    url: 'http://127.0.0.1:1234/v1',
    apiKey: '',
    selectedModel: '',
    models: [],
    status: 'idle',
    errorMsg: '',
  },
  ollama: {
    name: 'Ollama',
    type: 'local',
    url: 'http://127.0.0.1:11434/v1',
    apiKey: '',
    selectedModel: '',
    models: [],
    status: 'idle',
    errorMsg: '',
  },
  custom: {
    name: 'Personalizado',
    type: 'custom',
    url: 'http://127.0.0.1:8000/v1',
    apiKey: '',
    selectedModel: '',
    models: [],
    status: 'idle',
    errorMsg: '',
  },
};

export function AIProvider({ children }) {
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('nai_active_provider') || 'lmstudio';
  });

  const [providers, setProviders] = useState(() => {
    const saved = localStorage.getItem('nai_providers_config');
    let loaded = { ...DEFAULT_PROVIDERS };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loaded = { ...DEFAULT_PROVIDERS, ...parsed };
      } catch (e) {
        console.error('Error loading saved providers config', e);
      }
    }

    // Auto-fix localhost to 127.0.0.1 to avoid Node IPv6 resolution bugs
    if (loaded.lmstudio?.url?.includes('localhost:1234')) {
      loaded.lmstudio.url = loaded.lmstudio.url.replace('localhost:1234', '127.0.0.1:1234');
    }
    if (loaded.ollama?.url?.includes('localhost:11434')) {
      loaded.ollama.url = loaded.ollama.url.replace('localhost:11434', '127.0.0.1:11434');
    }
    return loaded;
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('nai_active_provider', activeProvider);
    localStorage.setItem('nai_providers_config', JSON.stringify(providers));
  }, [activeProvider, providers]);

  // Auto-connect and load available models for local providers on mount or switch
  useEffect(() => {
    if (activeProvider === 'lmstudio' || activeProvider === 'ollama' || providers[activeProvider]?.type === 'local') {
      checkConnectionAndFetchModels(activeProvider);
    }
  }, [activeProvider]);

  // Update specific provider field
  const updateProviderConfig = (providerKey, field, value) => {
    setProviders((prev) => ({
      ...prev,
      [providerKey]: {
        ...prev[providerKey],
        [field]: value,
      },
    }));
  };

  // Test and fetch models for a provider
  const checkConnectionAndFetchModels = async (providerKey) => {
    const config = providers[providerKey];
    if (!config) return;

    // For cloud providers without API Key, don't throw connection error, display gentle prompt
    if (config.type === 'cloud' && !config.apiKey?.trim()) {
      setProviders((prev) => ({
        ...prev,
        [providerKey]: {
          ...prev[providerKey],
          status: 'idle',
          errorMsg: 'Ingresa tu API Key para conectar este proveedor.',
        },
      }));
      return;
    }

    updateProviderConfig(providerKey, 'status', 'checking');
    updateProviderConfig(providerKey, 'errorMsg', '');

    if (window.electronAPI?.fetchModels) {
      try {
        const res = await window.electronAPI.fetchModels({
          provider: providerKey,
          config: {
            url: config.url,
            apiKey: config.apiKey,
          },
        });

        if (res.success && res.models?.length > 0) {
          setProviders((prev) => {
            const currentSelected = prev[providerKey]?.selectedModel;
            const hasCurrent = res.models.some((m) => m.id === currentSelected);
            const nextSelected = hasCurrent ? currentSelected : res.models[0]?.id || '';

            return {
              ...prev,
              [providerKey]: {
                ...prev[providerKey],
                status: 'connected',
                models: res.models,
                selectedModel: nextSelected,
                errorMsg: '',
              },
            };
          });
        } else if (res.success && (!res.models || res.models.length === 0)) {
          setProviders((prev) => ({
            ...prev,
            [providerKey]: {
              ...prev[providerKey],
              status: 'connected',
              models: DEFAULT_PROVIDERS[providerKey]?.models || [{ id: 'default-model', name: 'Modelo Activo' }],
              selectedModel: DEFAULT_PROVIDERS[providerKey]?.selectedModel || 'default-model',
              errorMsg: '',
            },
          }));
        } else if (config.type === 'cloud' && config.apiKey?.trim()) {
          // Cloud provider with API key: fallback to predefined models and mark as connected
          setProviders((prev) => ({
            ...prev,
            [providerKey]: {
              ...prev[providerKey],
              status: 'connected',
              models: prev[providerKey]?.models?.length > 0 ? prev[providerKey].models : DEFAULT_PROVIDERS[providerKey]?.models || [],
              selectedModel: prev[providerKey]?.selectedModel || DEFAULT_PROVIDERS[providerKey]?.selectedModel || '',
              errorMsg: '',
            },
          }));
        } else {
          setProviders((prev) => ({
            ...prev,
            [providerKey]: {
              ...prev[providerKey],
              status: 'error',
              errorMsg: res.error || 'No se pudo conectar con el proveedor.',
            },
          }));
        }
      } catch (err) {
        if (config.type === 'cloud' && config.apiKey?.trim()) {
          setProviders((prev) => ({
            ...prev,
            [providerKey]: {
              ...prev[providerKey],
              status: 'connected',
              errorMsg: '',
            },
          }));
        } else {
          setProviders((prev) => ({
            ...prev,
            [providerKey]: {
              ...prev[providerKey],
              status: 'error',
              errorMsg: err.message,
            },
          }));
        }
      }
    } else {
      // Fallback for browser preview
      setTimeout(() => {
        setProviders((prev) => ({
          ...prev,
          [providerKey]: {
            ...prev[providerKey],
            status: config.type === 'cloud' && !config.apiKey ? 'idle' : 'connected',
            errorMsg: '',
          },
        }));
      }, 300);
    }
  };

  // Check connection on load
  useEffect(() => {
    checkConnectionAndFetchModels(activeProvider);
  }, []);

  // Send message via Electron IPC
  const sendAIMessage = async (messages, customOptions = {}) => {
    const currentConfig = providers[activeProvider];
    if (!currentConfig) {
      throw new Error(`Proveedor ${activeProvider} no configurado`);
    }

    console.log('[FRONTEND AI] Enviando mensaje con proveedor:', activeProvider, 'Modelo:', customOptions.model || currentConfig.selectedModel, 'ElectronAPI disponible:', !!window.electronAPI?.sendMessage);
    if (window.electronAPI?.sendMessage) {
      const response = await window.electronAPI.sendMessage({
        provider: activeProvider,
        config: {
          url: currentConfig.url,
          apiKey: currentConfig.apiKey,
        },
        model: customOptions.model || currentConfig.selectedModel,
        messages,
        temperature: customOptions.temperature ?? 0.7,
        max_tokens: customOptions.max_tokens,
        webSearch: !!customOptions.webSearch,
        tavilyApiKey: customOptions.tavilyApiKey || localStorage.getItem('nai_tavily_key') || '',
      });
      console.log('[FRONTEND AI] Respuesta recibida del proceso principal:', response);
      return response;
    } else {
      // Simulated response in browser mode
      await new Promise((r) => setTimeout(r, 1000));
      return {
        success: true,
        content: `[Respuesta simulada]: Mensaje procesado para ${currentConfig.name} (${currentConfig.selectedModel}). En Electron realizará la petición real a la API.`,
        model: currentConfig.selectedModel || 'mock-model',
        webResults: customOptions.webSearch ? [
          { title: 'Ejemplo Web DuckDuckGo', snippet: 'Resultado simulado de búsqueda web.', url: 'https://duckduckgo.com' }
        ] : [],
      };
    }
  };

  // Cancel ongoing AI generation on demand
  const stopAIMessage = async () => {
    if (window.electronAPI?.abortMessage) {
      return await window.electronAPI.abortMessage();
    }
    return { success: true };
  };

  return (
    <AIContext.Provider
      value={{
        activeProvider,
        setActiveProvider,
        providers,
        updateProviderConfig,
        checkConnectionAndFetchModels,
        sendAIMessage,
        stopAIMessage,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
