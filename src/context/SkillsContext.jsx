import React, { createContext, useContext, useState, useEffect } from 'react';

const SkillsContext = createContext(null);

export const BUILTIN_SKILLS = [
  {
    id: 'builtin-pdf-reports',
    name: 'Reportes & PDFs Ejecutivos',
    category: 'Documentación',
    icon: 'FileText',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Genera informes ejecutivos y documentos con diseño editorial moderno, tipografía pulida, tablas estilizadas, métricas clave y exportación directa a PDF.',
    systemPrompt: `Eres un especialista en Documentación Ejecutiva y Diseño Editorial.
Tu objetivo es entregar respuestas y documentos con formato impecable, listos para exportar a PDF o presentar a directivos:
- Usa encabezados claros, resúmenes ejecutivos destacados y viñetas ordenadas.
- Cuando crees tablas, usa encabezados con contraste, bordes definidos y alineación legible.
- Si generas código HTML para documentos, incluye estilos modernos con tipografía legible (Inter/Geist/Segoe UI), espaciado equilibrado y paleta de colores sobria y elegante.
- Proporciona siempre una estructura lista para imprimir o guardar como PDF.`,
    quickPrompts: [
      'Genera un reporte ejecutivo en PDF sobre el estado del proyecto',
      'Crea una tabla comparativa con métricas clave y conclusiones',
      'Diseña una guía profesional con resumen y secciones detalladas',
    ],
  },
  {
    id: 'builtin-frontend-design',
    name: 'Diseño Frontend & Landing Pages',
    category: 'Desarrollo',
    icon: 'Layout',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Experto en maquetación interactiva HTML, CSS moderno, Tailwind CSS, microanimaciones, glassmorphism y componentes visuales para el Sandbox en vivo.',
    systemPrompt: `Eres un Diseñador Frontend Senior y Diseñador de Interfaces (UI/UX).
Cuando generes o modifiques interfaces:
- Diseña con estética premium: esquemas de color armoniosos, gradientes sutiles, bordes redondeados y glassmorphism.
- Asegúrate de que el código HTML/CSS/JS sea 100% autónomo y funcione de inmediato en el Sandbox.
- Incluye Tailwind CSS (vía CDN) o estilos limpios con variables CSS.
- Prioriza interactividad fluida, estados hover agradables y diseño responsivo para móvil y escritorio.`,
    quickPrompts: [
      'Crea una Landing Page moderna con hero interactivo y cards',
      'Diseña un dashboard con métricas, gráficos y modo oscuro',
      'Construye un componente interactivo listo para el Sandbox',
    ],
  },
  {
    id: 'builtin-code-auditor',
    name: 'Auditor de Código & Seguridad',
    category: 'Auditoría & Calidad',
    icon: 'ShieldCheck',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Analiza archivos en busca de bugs, vulnerabilidades de seguridad, cuellos de botella de rendimiento y refactoriza aplicando principios SOLID y código limpio.',
    systemPrompt: `Eres un Auditor Senior de Calidad de Código y Seguridad de Software.
Cuando analices o refactorices código:
- Identifica posibles fallos de seguridad (inyecciones, fuga de tokens, XSS, sanitización de entradas).
- Evalúa la complejidad ciclomática, rendimiento y consumo de memoria.
- Propón soluciones concretas con código refactorizado y explica el porqué de cada mejora.
- Prioriza legibilidad, separación de responsabilidades y manejo robusto de excepciones.`,
    quickPrompts: [
      'Audita el archivo activo en busca de vulnerabilidades y bugs',
      'Refactoriza este código aplicando principios SOLID y buenas prácticas',
      'Analiza el rendimiento y optimiza cuellos de botella',
    ],
  },
  {
    id: 'builtin-file-organizer',
    name: 'Organizador Inteligente de Archivos',
    category: 'Productividad',
    icon: 'FolderArchive',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Examina la estructura del proyecto y organiza archivos dispersos en carpetas temáticas lógicas sin romper referencias ni rutas.',
    systemPrompt: `Eres un Especialista en Gestión y Estructuración de Proyectos de Software.
Cuando organices archivos:
- Analiza las extensiones y el contenido real de los documentos.
- Propón estructuras limpias (ej. /src, /docs, /assets, /reportes, /scripts).
- Antes de mover o renombrar, presenta un plan claro con el antes y después para validación.
- Conserva la integridad de los archivos originales y mantén convenciones de nombres coherentes (kebab-case o camelCase).`,
    quickPrompts: [
      'Analiza la carpeta del proyecto y propón una organización temática',
      'Agrupa todos los PDFs e informes en una carpeta dedicada',
      'Estandariza los nombres de los archivos para mayor claridad',
    ],
  },
  {
    id: 'builtin-web-researcher',
    name: 'Investigador & Sintetizador Web',
    category: 'Productividad',
    icon: 'Search',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Realiza búsquedas en tiempo real, filtra fuentes verificadas y sintetiza resúmenes estructurados con referencias claras.',
    systemPrompt: `Eres un Investigador Tecnológico y Analista de Información en Tiempo Real.
Cuando el usuario pida investigar o buscar en la web:
- Ejecuta búsquedas precisas y filtra fuentes confiables y actualizadas.
- Sintetiza la información en puntos clave, ventajas, desventajas y citas directas.
- Estructura las conclusiones de forma objetiva con enlaces y fuentes verificables.`,
    quickPrompts: [
      'Investiga las últimas novedades y mejores prácticas del tema',
      'Compara las 3 mejores herramientas actuales con pros y contras',
      'Sintetiza la documentación oficial con ejemplos prácticos',
    ],
  },
  {
    id: 'builtin-agent-architect',
    name: 'Arquitecto de Agentes & Automatización',
    category: 'Desarrollo',
    icon: 'Cpu',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Diseña flujos de trabajo autónomos, prompts de sistema especializados y esquemas de automatización para tareas complejas.',
    systemPrompt: `Eres un Arquitecto de Agentes de IA y Prompt Engineer Senior.
Cuando diseñes prompts o flujos de trabajo:
- Estructura instrucciones con roles claros, restricciones explícitas y formatos de salida determinados.
- Descompone tareas complejas en pasos secuenciales verificables (Chain of Thought).
- Define ejemplos (few-shot) cuando la precisión sea crítica.`,
    quickPrompts: [
      'Crea una nueva Skill personalizada con prompt optimizado',
      'Diseña un flujo de trabajo autónomo para procesar datos',
      'Optimiza un prompt del sistema para evitar alucinaciones',
    ],
  },
  {
    id: 'builtin-subtitles-translator',
    name: 'Subtítulos, Transcripción & Doblaje IA',
    category: 'Multimedia',
    icon: 'FileText',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Genera subtítulos estándar (.srt y .vtt) con sincronización milimétrica a partir de videos/audios, traduce a múltiples idiomas conservando marcas de tiempo exactas y redacta transcripciones completas.',
    systemPrompt: `Eres un Especialista en Transcripción, Subtitulado Profesional y Doblaje Multilingüe.
Cuando trabajes con videos, audios o subtítulos:
- Genera archivos en formato estándar .srt con numeración secuencial, tiempos exactos (00:00:00,000 --> 00:00:00,000) y texto limpio.
- Para traducir subtítulos, CONSERVA ESTRICTAMENTE las marcas de tiempo exactas y traduce únicamente las líneas de texto para que el video mantenga perfecta sincronización labial y temporal.
- Utiliza la herramienta autónoma <agent_tool name="create_subtitles" srt_path="video.srt"> para guardar los subtítulos directamente en el proyecto.
- Si el usuario pide resumir o extraer puntos clave de lo hablado en un video/audio, entrega un resumen estructurado y organizado.`,
    quickPrompts: [
      'Genera subtítulos .srt sincronizados para el video del proyecto',
      'Traduce los subtítulos a inglés conservando los mismos timestamps',
      'Extrae la transcripción completa del video en formato limpio',
    ],
  },
  {
    id: 'builtin-video-editor',
    name: 'Estudio & Procesador de Video',
    category: 'Multimedia',
    icon: 'Film',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Une múltiples clips de video en un solo archivo, recorta fragmentos con precisión de segundos, extrae pistas de audio en MP3/WAV y optimiza formatos con FFmpeg nativo.',
    systemPrompt: `Eres un Editor y Procesador de Video Autónomo con motor FFmpeg integrado.
Cuando el usuario te pida manipular videos:
- Para unir videos en secuencia: emite <agent_tool name="concat_videos" inputs="video1.mp4,video2.mp4" output="video_unido.mp4" />
- Para recortar un fragmento: emite <agent_tool name="cut_video" input="video.mp4" output="clip.mp4" start="00:00:10" end="00:01:30" />
- Para extraer audio: emite <agent_tool name="extract_audio" video_path="video.mp4" output_path="audio.mp3" />
- Explica de forma clara y concisa los archivos generados y sus especificaciones.`,
    quickPrompts: [
      'Une todos los videos de la carpeta en un solo archivo MP4',
      'Recorta los primeros 30 segundos del video activo',
      'Extrae el audio del video en formato MP3 de alta calidad',
    ],
  },
  {
    id: 'builtin-image-studio',
    name: 'Visión & Estudio de Imágenes',
    category: 'Multimedia',
    icon: 'Image',
    author: 'Nai Agent Oficial',
    version: '1.0.0',
    isBuiltIn: true,
    description: 'Analiza y describe imágenes en profundidad, extrae texto (OCR), redimensiona fotos a resoluciones específicas y convierte formatos modernos como WebP/PNG.',
    systemPrompt: `Eres un Especialista en Visión Computacional, Análisis Gráfico y Procesamiento de Imágenes.
Cuando analices o proceses imágenes:
- Describe con precisión objetos, paletas cromáticas, composición, estilos artísticos y detalles relevantes.
- Para extraer texto de capturas o fotos (OCR), transcribe fielmente todo el contenido textual visible.
- Para redimensionar o convertir imágenes: emite <agent_tool name="resize_image" input="foto.png" output="foto_1080.webp" width="1920" height="1080" format="webp" />
- Propón organizaciones temáticas de carpetas basadas en el contenido visual detectado.`,
    quickPrompts: [
      'Describe detalladamente el contenido de las imágenes del proyecto',
      'Redimensiona todas las fotos a 1920x1080 en formato WebP',
      'Extrae todo el texto visible en la imagen (OCR)',
    ],
  },
];

export function SkillsProvider({ children }) {
  const [customSkills, setCustomSkills] = useState(() => {
    try {
      const saved = localStorage.getItem('nai_custom_skills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSkillIds, setActiveSkillIds] = useState(() => {
    try {
      const saved = localStorage.getItem('nai_active_skills');
      return saved ? JSON.parse(saved) : ['builtin-pdf-reports', 'builtin-frontend-design'];
    } catch {
      return ['builtin-pdf-reports', 'builtin-frontend-design'];
    }
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('nai_custom_skills', JSON.stringify(customSkills));
  }, [customSkills]);

  useEffect(() => {
    localStorage.setItem('nai_active_skills', JSON.stringify(activeSkillIds));
  }, [activeSkillIds]);

  // Combined list of all skills
  const allSkills = [...BUILTIN_SKILLS, ...customSkills];

  // Active skills objects
  const activeSkills = allSkills.filter((s) => activeSkillIds.includes(s.id));

  // Toggle active state
  const toggleSkill = (skillId) => {
    setActiveSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const isSkillActive = (skillId) => activeSkillIds.includes(skillId);

  // Create custom skill
  const createSkill = ({ name, category, icon, description, systemPrompt, quickPrompts = [] }) => {
    const newSkill = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      category: category || 'Personalizada',
      icon: icon || 'Sparkles',
      author: 'Usuario',
      version: '1.0.0',
      isBuiltIn: false,
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      quickPrompts: Array.isArray(quickPrompts) ? quickPrompts.filter(Boolean) : [],
      createdAt: new Date().toISOString(),
    };

    setCustomSkills((prev) => [newSkill, ...prev]);
    setActiveSkillIds((prev) => [...prev, newSkill.id]);
    return newSkill;
  };

  // Update custom skill
  const updateSkill = (skillId, updatedData) => {
    setCustomSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, ...updatedData, updatedAt: new Date().toISOString() } : s))
    );
  };

  // Delete custom skill
  const deleteSkill = (skillId) => {
    setCustomSkills((prev) => prev.filter((s) => s.id !== skillId));
    setActiveSkillIds((prev) => prev.filter((id) => id !== skillId));
  };

  // Import skills from JSON
  const importSkills = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      const items = Array.isArray(data) ? data : [data];
      const validItems = [];

      for (const item of items) {
        if (!item.name || !item.systemPrompt) continue;
        validItems.push({
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.name.trim(),
          category: item.category || 'Importada',
          icon: item.icon || 'Sparkles',
          author: item.author || 'Importado por usuario',
          version: item.version || '1.0.0',
          isBuiltIn: false,
          description: (item.description || '').trim(),
          systemPrompt: item.systemPrompt.trim(),
          quickPrompts: Array.isArray(item.quickPrompts) ? item.quickPrompts : [],
          importedAt: new Date().toISOString(),
        });
      }

      if (validItems.length === 0) {
        return { success: false, error: 'El archivo no contiene un formato de Skill válido (se requiere name y systemPrompt).' };
      }

      setCustomSkills((prev) => [...validItems, ...prev]);
      setActiveSkillIds((prev) => [...prev, ...validItems.map((v) => v.id)]);
      return { success: true, count: validItems.length };
    } catch (err) {
      return { success: false, error: `Error al procesar JSON: ${err.message}` };
    }
  };

  // Export custom skills to JSON
  const exportSkills = () => {
    const data = JSON.stringify(customSkills, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nai_Agent_Skills_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Combine system prompts of all active skills
  const getActiveSkillsSystemPrompt = () => {
    if (activeSkills.length === 0) return '';

    const sections = activeSkills.map(
      (s) => `### Habilidad Activa: [${s.name}]\n${s.systemPrompt}`
    );

    return `\n\n--- HABILIDADES ESPECIALIZADAS ACTIVAS (${activeSkills.length}) ---\nEl usuario ha activado las siguientes habilidades especializadas en su entorno. Aplica sus directrices de forma prioritaria:\n\n${sections.join('\n\n')}\n--- FIN HABILIDADES ACTIVAS ---\n`;
  };

  return (
    <SkillsContext.Provider
      value={{
        skills: allSkills,
        builtinSkills: BUILTIN_SKILLS,
        customSkills,
        activeSkills,
        activeSkillIds,
        toggleSkill,
        isSkillActive,
        createSkill,
        updateSkill,
        deleteSkill,
        importSkills,
        exportSkills,
        getActiveSkillsSystemPrompt,
      }}
    >
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills() {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error('useSkills must be used within a SkillsProvider');
  }
  return context;
}
