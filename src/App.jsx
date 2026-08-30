import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import NewChatModal from './components/NewChatModal';
import ModelSetupModal from './components/ModelSetupModal';
import { AIProvider } from './context/AIContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ChatSessionsProvider } from './context/ChatSessionsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { IntegrationsProvider } from './context/IntegrationsContext';
import { SkillsProvider } from './context/SkillsContext';
import {
  GripVertical,
  PanelRightOpen,
} from 'lucide-react';

function MainLayout() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { getModelStatus } = useWorkspace();
  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [showModelSetup, setShowModelSetup] = useState(false);

  useEffect(() => {
    // Check if models are installed on first boot
    const checkFirstBootModels = async () => {
      try {
        const res = await getModelStatus();
        if (res && res.allCoreInstalled === false) {
          const dismissed = sessionStorage.getItem('nai_models_setup_dismissed');
          if (!dismissed) {
            setShowModelSetup(true);
          }
        }
      } catch (e) {}
    };
    checkFirstBootModels();
  }, []);
  const [drawerWidth, setDrawerWidth] = useState(() => {
    const saved = localStorage.getItem('nai_drawer_width');
    return saved ? parseInt(saved, 10) : 380;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Handle Drag Resizing from the left border of the right drawer
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      // Calculate width of drawer (total distance from mouse to the 48px right dock)
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX - 48, 280), 750);
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('nai_drawer_width', drawerWidth.toString());
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, drawerWidth]);

  const toggleSidebarOpen = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSelectTab = (tabKey) => {
    if (isSidebarOpen && activeTab === tabKey) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tabKey);
      setIsSidebarOpen(true);
    }
  };

  const toggleEditorCollapse = () => {
    setIsEditorCollapsed((prev) => !prev);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden relative ${
      isDark ? 'bg-[#0c0c14] text-slate-100' : 'bg-[#f8f9fa] text-slate-800'
    }`}>
      {/* 1. Main Workspace (Editor / Sandbox / Terminal) */}
      {!isEditorCollapsed ? (
        <main className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
          isDark ? 'bg-[#0f0f18]' : 'bg-[#f4f4f8]'
        }`}>
          <EditorArea
            isCollapsed={isEditorCollapsed}
            onToggleCollapse={toggleEditorCollapse}
            isSidebarVisible={isSidebarOpen}
            onToggleSidebar={toggleSidebarOpen}
          />
        </main>
      ) : (
        /* Collapsed Editor Mode */
        <div className={`flex-1 flex flex-col items-center justify-center p-4 text-center ${
          isDark ? 'bg-[#0c0c14]' : 'bg-[#f8f9fa]'
        }`}>
          <button
            onClick={toggleEditorCollapse}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span>Restaurar Área de Trabajo</span>
          </button>
        </div>
      )}

      {/* 2. Drag Separator (when drawer is open) */}
      {isSidebarOpen && !isEditorCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-1.5 group relative flex items-center justify-center border-x transition-colors cursor-col-resize flex-shrink-0 select-none z-10 ${
            isDark
              ? 'bg-[#0c0c14] border-[#242436] hover:bg-purple-600'
              : 'bg-[#f1f5f9] border-[#e2e8f0] hover:bg-purple-600'
          } ${isDragging ? 'bg-purple-600' : ''}`}
          title="Arrastra para cambiar el ancho del panel"
        >
          <div
            className={`absolute w-3.5 h-8 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
              isDark
                ? 'bg-[#1b1b28] border-[#2d3449] group-hover:bg-purple-500'
                : 'bg-[#ffffff] border-[#cbd5e1] group-hover:bg-purple-500'
            } ${isDragging ? 'bg-purple-500 border-purple-400' : ''}`}
          >
            <GripVertical className={`w-2.5 h-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} group-hover:text-white`} />
          </div>
        </div>
      )}

      {/* 3. Right Sidebar (Sliding Content Drawer + 48px Vertical Icon Dock) */}
      <div
        style={{
          width: isSidebarOpen ? `${drawerWidth + 48}px` : '48px',
          minWidth: isSidebarOpen ? '328px' : '48px',
          maxWidth: isSidebarOpen ? '800px' : '48px',
        }}
        className="h-full flex-shrink-0 flex flex-row transition-all duration-150 ease-out z-20"
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onToggleOpen={toggleSidebarOpen}
          onSelectTab={handleSelectTab}
        />
      </div>

      {/* 4. Global New Chat Workspace Selector Modal */}
      <NewChatModal onAfterCreate={() => { setActiveTab('chat'); setIsSidebarOpen(true); }} />

      {/* 5. First-Run Local AI Model Setup Modal */}
      <ModelSetupModal
        isOpen={showModelSetup}
        onClose={() => {
          setShowModelSetup(false);
          sessionStorage.setItem('nai_models_setup_dismissed', '1');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AIProvider>
        <WorkspaceProvider>
          <ChatSessionsProvider>
            <IntegrationsProvider>
              <SkillsProvider>
                <MainLayout />
              </SkillsProvider>
            </IntegrationsProvider>
          </ChatSessionsProvider>
        </WorkspaceProvider>
      </AIProvider>
    </ThemeProvider>
  );
}
