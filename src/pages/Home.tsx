import { useState, useEffect, useCallback, useRef } from 'react';
import PixelCanvas from '@/components/PixelCanvas';
import ColorPalette from '@/components/ColorPalette';
import ActionPanel from '@/components/ActionPanel';
import FrameList from '@/components/FrameList';
import AnimationPreview from '@/components/AnimationPreview';
import SpriteSheetGenerator from '@/components/SpriteSheetGenerator';
import CharacterSettings from '@/components/CharacterSettings';
import { SaveManager } from '@/components/SaveManager';
import { Palette, Layers, Film, Settings, Grid3X3, Undo2, Redo2, Save, HardDrive, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';

type TabType = 'preview' | 'spritesheet' | 'settings';

const Home = () => {
  const [rightTab, setRightTab] = useState<TabType>('preview');
  const [framePanelExpanded, setFramePanelExpanded] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saveManagerOpen, setSaveManagerOpen] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    saveAs,
    loadSave,
    resetCharacter,
    lastSavedTime,
    currentSaveName,
    autoSave,
    autoSaveInterval,
    listSaves,
    selectedTool,
    setSelectedTool,
    setIsPlaying,
    isPlaying,
    addFrame,
    currentActionId,
    duplicateFrame,
    currentFrameId,
    deleteFrame,
    character,
    pushHistory,
  } = usePixelEditorStore();

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage({ text: msg, type });
    setTimeout(() => setSaveMessage(null), 2500);
  }, []);

  const handleQuickSave = useCallback(() => {
    if (currentSaveName) {
      const success = save();
      if (success) {
        showToast(`✓ 已保存 \"${currentSaveName}\"`, 'success');
      } else {
        showToast('✗ 保存失败', 'error');
      }
    } else {
      setSaveManagerOpen(true);
    }
  }, [currentSaveName, save, showToast]);

  const handleReset = useCallback(() => {
    if (confirm('确定要重置所有内容吗？此操作不可撤销。')) {
      resetCharacter();
      showToast('✓ 已重置', 'success');
    }
  }, [resetCharacter, showToast]);

  useEffect(() => {
    if (!autoSave || !currentSaveName) {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    autoSaveTimerRef.current = window.setInterval(() => {
      const success = save();
      if (success) {
        showToast(`✓ 自动保存 \"${currentSaveName}\"`, 'success');
      }
    }, autoSaveInterval * 60 * 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSave, autoSaveInterval, currentSaveName, save, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput) {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleQuickSave();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setSaveManagerOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setSaveManagerOpen(true);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          setSelectedTool('pencil');
          break;
        case 'e':
          setSelectedTool('eraser');
          break;
        case 'g':
          setSelectedTool('bucket');
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'n':
          if (currentActionId) addFrame(currentActionId);
          break;
        case 'd':
          if (currentFrameId) duplicateFrame(currentFrameId);
          break;
        case 'delete':
        case 'backspace':
          if (currentFrameId && character.actions.find(a => a.id === currentActionId)?.frames.length! > 1) {
            if (confirm('确定删除当前帧？')) {
              deleteFrame(currentFrameId);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleQuickSave, setSaveManagerOpen, setSelectedTool, setIsPlaying, isPlaying, addFrame, currentActionId, duplicateFrame, currentFrameId, deleteFrame, character]);

  const rightTabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'preview', label: '预览', icon: Film },
    { id: 'spritesheet', label: 'SpriteSheet', icon: Grid3X3 },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] text-gray-200 overflow-hidden relative">
      {saveMessage && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-white rounded shadow-lg text-sm animate-pulse ${
          saveMessage.type === 'success' ? 'bg-[#2ecc71]' : 'bg-[#e74c3c]'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <header className="flex-shrink-0 bg-[#16213e] border-b border-[#0f3460] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#e94560] rounded flex items-center justify-center">
            <Palette size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white pixel-font">Pixel Animator</h1>
            <p className="text-xs text-gray-500">像素动画帧管理工具</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0f3460] rounded p-1 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 rounded text-gray-300 hover:bg-[#16213e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 rounded text-gray-300 hover:bg-[#16213e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#0f3460] rounded p-1 mr-2">
            <button
              onClick={handleQuickSave}
              className="p-1.5 rounded text-[#2ecc71] hover:bg-[#16213e] transition-colors flex items-center gap-1"
              title={`${currentSaveName ? `保存 \"${currentSaveName}\"` : '快速保存'} (Ctrl+S)`}
            >
              <Save size={16} />
              <span className="text-xs hidden sm:inline">{currentSaveName ? '保存' : '保存'}</span>
            </button>
            <button
              onClick={() => setSaveManagerOpen(true)}
              className="p-1.5 rounded text-[#3498db] hover:bg-[#16213e] transition-colors flex items-center gap-1"
              title="存档管理 (Ctrl+O)"
            >
              <HardDrive size={16} />
              <span className="text-xs hidden sm:inline">存档</span>
            </button>
            <button
              onClick={handleReset}
              className="p-1.5 rounded text-gray-400 hover:bg-[#16213e] hover:text-[#e74c3c] transition-colors"
              title="重置"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {lastSavedTime && (
            <div className="text-xs text-gray-500 hidden md:flex items-center gap-2">
              {currentSaveName && (
                <span className="text-[#e94560]">{currentSaveName}</span>
              )}
              <span>
                上次保存: {new Date(lastSavedTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 flex-shrink-0 bg-[#16213e] border-r border-[#0f3460] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#0f3460]">
            <CharacterSettings />
          </div>
          <div className="p-3 border-b border-[#0f3460]">
            <ActionPanel />
          </div>
          <div className="p-3 flex-1 overflow-hidden">
            <ColorPalette />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            <PixelCanvas />
          </div>
          <div
            className={`border-t border-[#0f3460] transition-all duration-300 ease-in-out overflow-hidden ${
              framePanelExpanded ? 'h-auto min-h-[160px] max-h-[50vh]' : 'h-[44px]'
            }`}
          >
            <div
              className="flex items-center justify-between px-3 py-2 bg-[#16213e] border-b border-[#0f3460] transition-colors hover:bg-[#0f3460]"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#e94560]" />
                <span className="text-xs font-medium text-gray-300 pixel-font">帧序列</span>
                <span className="text-[10px] text-gray-500">
                  ({character.actions.find(a => a.id === currentActionId)?.frames.length || 0} 帧)
                </span>
              </div>
              <button
                onClick={() => setFramePanelExpanded(!framePanelExpanded)}
                className="p-1 rounded hover:bg-[#1a1a2e] text-gray-400 hover:text-white transition-colors"
                title={framePanelExpanded ? '收起帧序列' : '展开帧序列'}
              >
                {framePanelExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>
            </div>
            {framePanelExpanded && (
              <div className="p-3 pt-2 overflow-y-auto" style={{ maxHeight: 'calc(50vh - 44px - 10px)' }}>
                <FrameList />
              </div>
            )}
          </div>
        </main>

        <aside className="w-72 flex-shrink-0 bg-[#16213e] border-l border-[#0f3460] flex flex-col overflow-hidden">
          <div className="flex border-b border-[#0f3460]">
            {rightTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === tab.id
                    ? 'text-[#e94560] border-b-2 border-[#e94560] bg-[#e94560]/5'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#0f3460]/50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'preview' && <AnimationPreview />}
            {rightTab === 'spritesheet' && <SpriteSheetGenerator />}
            {rightTab === 'settings' && (
              <div className="space-y-3">
                <div className="bg-[#1a1a2e] rounded-lg border border-[#0f3460] p-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 pixel-font text-xs">快捷键</h3>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Ctrl+Z</kbd> 撤销</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Ctrl+Y</kbd> 重做</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Ctrl+S</kbd> 快速保存</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Ctrl+O</kbd> 存档管理</p>
                    <p className="border-t border-[#0f3460] pt-1 mt-1"><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">B</kbd> 画笔工具</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">E</kbd> 橡皮擦</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">G</kbd> 填充工具</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Space</kbd> 播放/暂停</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">[</kbd> 上一帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">]</kbd> 下一帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">N</kbd> 新建帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">D</kbd> 复制帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Delete</kbd> 删除帧</p>
                  </div>
                </div>
                <div className="bg-[#1a1a2e] rounded-lg border border-[#0f3460] p-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 pixel-font text-xs">使用说明</h3>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <p>1. 在左侧创建角色和动作</p>
                    <p>2. 使用画布编辑像素帧</p>
                    <p>3. 添加/复制/重排帧序列</p>
                    <p>4. 预览动画效果</p>
                    <p>5. 导出 SpriteSheet</p>
                    <p className="pt-1 text-[#e94560]/80">提示: 按住 Shift 点击可多选帧进行批量操作</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <SaveManager
        isOpen={saveManagerOpen}
        onClose={() => setSaveManagerOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};

export default Home;
