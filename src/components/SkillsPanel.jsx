import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Layout,
  ShieldCheck,
  FolderArchive,
  Search,
  Cpu,
  Plus,
  Download,
  Upload,
  Check,
  X,
  Trash2,
  Edit2,
  AlertTriangle,
  Info,
  Layers,
  Code2,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Power,
  Film,
  Image,
  Video,
  Music
} from 'lucide-react';
import { useSkills } from '../context/SkillsContext';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';

const ICON_MAP = {
  FileText,
  Layout,
  ShieldCheck,
  FolderArchive,
  Search,
  Cpu,
  Sparkles,
  Film,
  Image,
  Video,
  Music,
};

const CATEGORIES = ['Todos', 'Activas', 'Multimedia', 'De Fábrica', 'Personalizadas'];

export default function SkillsPanel({ onApplyQuickPrompt }) {
  const {
    skills,
    builtinSkills,
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
  } = useSkills();

  const { isDark } = useTheme();
  const { detectSystemHardware } = useWorkspace();

  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [isDetectingHw, setIsDetectingHw] = useState(false);

  const refreshHardware = async () => {
    setIsDetectingHw(true);
    try {
      if (detectSystemHardware) {
        const info = await detectSystemHardware();
        setHardwareInfo(info);
      }
    } catch (e) {
    } finally {
      setIsDetectingHw(false);
    }
  };

  useEffect(() => {
    refreshHardware();
  }, []);

  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState(null);

  // Form State for Create/Edit
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Desarrollo');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [formDescription, setFormDescription] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formQuickPrompts, setFormQuickPrompts] = useState('');

  // Filtering
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'Activas') return activeSkillIds.includes(s.id);
    if (activeFilter === 'De Fábrica') return s.isBuiltIn;
    if (activeFilter === 'Personalizadas') return !s.isBuiltIn;
    return true;
  });

  const openCreateModal = () => {
    setEditingSkillId(null);
    setFormName('');
    setFormCategory('Desarrollo');
    setFormIcon('Sparkles');
    setFormDescription('');
    setFormSystemPrompt('');
    setFormQuickPrompts('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (skill) => {
    setEditingSkillId(skill.id);
    setFormName(skill.name);
    setFormCategory(skill.category);
    setFormIcon(skill.icon || 'Sparkles');
    setFormDescription(skill.description);
    setFormSystemPrompt(skill.systemPrompt);
    setFormQuickPrompts((skill.quickPrompts || []).join('\n'));
    setIsCreateModalOpen(true);
  };

  const handleSaveSkill = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formSystemPrompt.trim()) return;

    const quickList = formQuickPrompts
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (editingSkillId) {
      updateSkill(editingSkillId, {
        name: formName.trim(),
        category: formCategory,
        icon: formIcon,
        description: formDescription.trim(),
        systemPrompt: formSystemPrompt.trim(),
        quickPrompts: quickList,
      });
    } else {
      createSkill({
        name: formName.trim(),
        category: formCategory,
        icon: formIcon,
        description: formDescription.trim(),
        systemPrompt: formSystemPrompt.trim(),
        quickPrompts: quickList,
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;

    const res = importSkills(importJsonText.trim());
    if (res.success) {
      setImportStatus({ success: true, message: `¡Se importaron ${res.count} Skill(s) exitosamente!` });
      setTimeout(() => {
        setImportStatus(null);
        setImportJsonText('');
        setIsImportModalOpen(false);
      }, 1200);
    } else {
      setImportStatus({ success: false, message: res.error });
    }
  };

  return (
    <div className={`h-full flex flex-col p-3 space-y-3 overflow-hidden font-sans transition-colors ${
      isDark ? 'text-slate-200' : 'text-slate-800'
    }`}>
      {/* ========================================================= */}
      {/* Top Header & Actions */}
      {/* ========================================================= */}
      <div className={`pb-2 border-b flex items-center justify-between flex-shrink-0 gap-2 ${
        isDark ? 'border-[#242436]' : 'border-[#e2e8f0]'
      }`}>
        <div>
          <h2 className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <Sparkles className="w-4 h-4 text-purple-400" />
            Habilidades Especializadas (Skills)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {activeSkillIds.length} de {skills.length} skills activas
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
              isDark
                ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Importar Skills en formato JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          {customSkills.length > 0 && (
            <button
              onClick={exportSkills}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                isDark
                  ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Exportar tus Skills personalizadas"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
            title="Crear nueva Skill con instrucciones personalizadas"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Search & Category Filter Pills */}
      {/* ========================================================= */}
      <div className="space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors ${
              isDark
                ? 'bg-[#0c0c14] border-[#242436] text-slate-100'
                : 'bg-white border-[#cbd5e1] text-slate-900 shadow-sm'
            }`}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = activeFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDark
                    ? 'bg-[#151522] hover:bg-[#1b1b28] text-slate-400 border border-[#242436]'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
                {cat === 'Activas' && ` (${activeSkillIds.length})`}
                {cat === 'Personalizadas' && ` (${customSkills.length})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hardware & Image Model Diagnostics Banner */}
      {hardwareInfo && (
        <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all shadow-sm flex-shrink-0 ${
          isDark ? 'bg-[#151522] border-purple-500/30 text-slate-200' : 'bg-purple-50/90 border-purple-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              isDark ? 'bg-purple-950/80 border-purple-500/40 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[12px]">{hardwareInfo.gpuName || 'GPU'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 font-semibold">
                  {hardwareInfo.vramGB} GB VRAM • {hardwareInfo.totalRamGB} GB RAM
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                <span>🎨 Creación: <strong className="text-purple-600 dark:text-purple-300">{hardwareInfo.recommendedModel}</strong></span>
                <span>•</span>
                <span>🪄 Edición: <strong className={hardwareInfo.canEditWithFlux ? 'text-emerald-500' : 'text-amber-500'}>
                  {hardwareInfo.canEditWithFlux ? 'Flux Klein GGUF (Habilitado)' : 'Desactivada (< 6GB VRAM)'}
                </strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshHardware}
            disabled={isDetectingHw}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-all flex-shrink-0 ${
              isDark
                ? 'bg-[#1b1b28] hover:bg-purple-600/20 border-[#242436] text-slate-300'
                : 'bg-white hover:bg-purple-100 border-slate-200 text-slate-700'
            }`}
            title="Volver a analizar hardware del equipo"
          >
            <Sparkles className={`w-3 h-3 ${isDetectingHw ? 'animate-spin text-purple-400' : 'text-purple-500'}`} />
            <span>{isDetectingHw ? 'Analizando...' : 'Analizar PC'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* Personalizadas Dedicated Action Bar with Import Button */}
      {/* ========================================================= */}
      {activeFilter === 'Personalizadas' && (
        <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 flex-shrink-0 ${
          isDark ? 'bg-[#181827] border-purple-800/40 text-purple-200' : 'bg-purple-50/90 border-purple-200 text-purple-950'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-xs block">Skills Personalizadas ({customSkills.length})</span>
              <span className="text-[10px] text-slate-400 dark:text-purple-300/70 block truncate">
                Crea o importa habilidades en formato JSON
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
              title="Importar Skill en formato JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Skill</span>
            </button>

            <button
              onClick={openCreateModal}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                isDark
                  ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Crear nueva Skill"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Crear</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Security Disclaimer Banner */}
      {/* ========================================================= */}
      <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-[11px] flex-shrink-0 ${
        isDark ? 'bg-[#151522]/80 border-[#242436] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300 dark:text-slate-200">Seguridad y Privacidad: </span>
          Las skills de fábrica están auditadas al 100%. Las skills que crees o importes de terceros se ejecutan de forma aislada dentro de tu proyecto.
        </div>
      </div>

      {/* ========================================================= */}
      {/* Skills Grid / List */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => {
            const isActive = activeSkillIds.includes(skill.id);
            const IconComponent = ICON_MAP[skill.icon] || Sparkles;

            return (
              <div
                key={skill.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 relative group ${
                  isActive
                    ? isDark
                      ? 'bg-[#161626] border-purple-500/50 shadow-lg shadow-purple-950/30'
                      : 'bg-purple-50/70 border-purple-300 shadow-sm'
                    : isDark
                    ? 'bg-[#12121c] border-[#242436] hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Header: Icon, Name, Category & Switch */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-purple-600/30'
                        : isDark
                        ? 'bg-[#1b1b28] text-slate-400 border border-[#2d3449]'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs truncate" title={skill.name}>
                          {skill.name}
                        </h4>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                          skill.isBuiltIn
                            ? isDark
                              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isDark
                            ? 'bg-amber-950/40 border-amber-800/40 text-amber-400'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {skill.isBuiltIn ? 'De Fábrica' : 'Personalizada'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block -mt-0.5">
                        {skill.category}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!skill.isBuiltIn && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(skill)}
                          className="p-1 text-slate-400 hover:text-purple-400 rounded"
                          title="Editar Skill"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteSkill(skill.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                          title="Eliminar Skill"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleSkill(skill.id)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-purple-600' : isDark ? 'bg-[#242436]' : 'bg-slate-300'
                      }`}
                      title={isActive ? 'Desactivar esta Skill' : 'Activar esta Skill'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {skill.description}
                </p>

                {/* Quick Prompts Chips */}
                {skill.quickPrompts && skill.quickPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-700/20">
                    {skill.quickPrompts.slice(0, 2).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => onApplyQuickPrompt && onApplyQuickPrompt(prompt)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border text-left truncate max-w-full transition-colors ${
                          isDark
                            ? 'bg-[#181827] hover:bg-purple-950/40 border-[#2d3449] hover:border-purple-500/40 text-purple-300'
                            : 'bg-white hover:bg-purple-50 border-slate-200 hover:border-purple-300 text-purple-800 shadow-sm'
                        }`}
                        title={`Hacer clic para enviar al chat: "${prompt}"`}
                      >
                        💡 {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : activeFilter === 'Personalizadas' ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 space-y-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${
              isDark ? 'bg-purple-950/40 border-purple-800/40 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-600'
            }`}>
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                No tienes Skills personalizadas aún
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Importa una Skill compartida en archivo JSON o crea tu propia habilidad experta.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Skill</span>
              </button>
              <button
                onClick={openCreateModal}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                  isDark
                    ? 'bg-[#151522] hover:bg-[#1b1b28] border-[#242436] text-slate-300'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Skill</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <Sparkles className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs">No se encontraron skills con ese criterio.</p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* Modal: Crear / Editar Skill */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleSaveSkill}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
              isDark ? 'bg-[#12121c] border-[#242436] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-[#242436] bg-[#151522]' : 'border-slate-100 bg-slate-50'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                {editingSkillId ? 'Editar Skill' : 'Crear Nueva Skill'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold mb-1">Nombre de la Skill *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Experto en Python & FastAPI"
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:border-purple-500 ${
                    isDark ? 'bg-[#181824] border-[#2d3449] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full p-2 rounded-xl border focus:outline-none ${
                      isDark ? 'bg-[#181824] border-[#2d3449] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Documentación">Documentación</option>
                    <option value="Auditoría & Calidad">Auditoría & Calidad</option>
                    <option value="Productividad">Productividad</option>
                    <option value="Personalizada">Personalizada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Icono</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className={`w-full p-2 rounded-xl border focus:outline-none ${
                      isDark ? 'bg-[#181824] border-[#2d3449] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Sparkles">✨ Destellos</option>
                    <option value="FileText">📄 Documento / PDF</option>
                    <option value="Layout">🎨 Frontend / Diseño</option>
                    <option value="ShieldCheck">🛡️ Auditoría / Seguridad</option>
                    <option value="FolderArchive">📁 Archivos / Carpetas</option>
                    <option value="Search">🔍 Búsqueda Web</option>
                    <option value="Cpu">🤖 Agente / IA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explica qué hace esta habilidad en 1 o 2 líneas..."
                  className={`w-full p-2 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#181824] border-[#2d3449] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Instrucciones del Sistema (System Prompt) *</label>
                <textarea
                  rows={6}
                  required
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  placeholder="Define cómo debe comportarse el Agente cuando esta Skill esté activa..."
                  className={`w-full p-2 rounded-xl border font-mono text-xs focus:outline-none ${
                    isDark ? 'bg-[#181824] border-[#2d3449] text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Atajos Rápidos (Opcional - 1 por línea)</label>
                <textarea
                  rows={2}
                  value={formQuickPrompts}
                  onChange={(e) => setFormQuickPrompts(e.target.value)}
                  placeholder="Generar estructura inicial\nAuditar seguridad del código"
                  className={`w-full p-2 rounded-xl border text-xs focus:outline-none ${
                    isDark ? 'bg-[#181824] border-[#2d3449] text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2 ${
              isDark ? 'border-[#242436] bg-[#151522]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-black/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30"
              >
                {editingSkillId ? 'Guardar Cambios' : 'Crear Skill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* Modal: Importar Skills (JSON) */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleImportSubmit}
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
              isDark ? 'bg-[#12121c] border-[#242436] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-[#242436] bg-[#151522]' : 'border-slate-100 bg-slate-50'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                Importar Skills Personalizadas
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2 ${
                isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso de Responsabilidad: </span>
                  Importa únicamente Skills de fuentes confiables. Revisa las instrucciones antes de ejecutarlas en tu espacio de trabajo.
                </div>
              </div>

              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold">Pega el contenido JSON o carga un archivo:</label>
                <label className={`cursor-pointer text-[10px] font-semibold flex items-center gap-1 border px-2 py-0.5 rounded-lg transition-colors ${
                  isDark
                    ? 'border-purple-500/40 text-purple-300 hover:bg-purple-950/40'
                    : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}>
                  <Upload className="w-2.5 h-2.5" />
                  <span>Cargar archivo .json</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImportJsonText(String(event.target.result || ''));
                      };
                      reader.readAsText(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <textarea
                  rows={8}
                  required
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "name": "Mi Skill",\n    "category": "Desarrollo",\n    "description": "Descripción...",\n    "systemPrompt": "Instrucciones..."\n  }\n]`}
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs focus:outline-none ${
                    isDark ? 'bg-[#181824] border-[#2d3449] text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {importStatus && (
                <div className={`p-2 rounded-xl text-xs font-semibold ${
                  importStatus.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {importStatus.message}
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2 ${
              isDark ? 'border-[#242436] bg-[#151522]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-black/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30"
              >
                Importar Skills
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
