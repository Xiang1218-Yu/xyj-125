import { useState, useEffect, useRef } from 'react';
import { X, Save, FolderOpen, Trash2, Clock, HardDrive, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import type { SaveMeta } from '@/types/animation';

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function SaveManager({ isOpen, onClose, showToast }: SaveManagerProps) {
  const {
    currentSaveName,
    autoSave,
    autoSaveInterval,
    listSaves,
    saveAs,
    save,
    loadSave,
    deleteSave,
    setAutoSave,
    setAutoSaveInterval,
  } = usePixelEditorStore();

  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [newSaveName, setNewSaveName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingSave, setLoadingSave] = useState<string | null>(null);
  const [deletingSave, setDeletingSave] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshSaves = () => {
    setSaves(listSaves());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSaves();
      if (showNewForm && inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, showNewForm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!newSaveName.trim()) {
      showToast('请输入存档名称', 'error');
      return;
    }
    const success = saveAs(newSaveName.trim());
    if (success) {
      showToast(`已保存为 \"${newSaveName.trim()}\"`, 'success');
      setNewSaveName('');
      setShowNewForm(false);
      refreshSaves();
    } else {
      showToast('保存失败', 'error');
    }
  };

  const handleQuickSave = () => {
    if (currentSaveName) {
      const success = save();
      if (success) {
        showToast(`已保存 \"${currentSaveName}\"`, 'success');
        refreshSaves();
      } else {
        showToast('保存失败', 'error');
      }
    } else {
      setShowNewForm(true);
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleLoad = async (name: string) => {
    setLoadingSave(name);
    await new Promise(r => setTimeout(r, 200));
    const success = loadSave(name);
    setLoadingSave(null);
    if (success) {
      showToast(`已加载 \"${name}\"`, 'success');
      onClose();
    } else {
      showToast('加载失败', 'error');
    }
  };

  const handleDelete = (name: string) => {
    if (!confirm(`确定要删除存档 \"${name}\" 吗？此操作无法撤销。`)) {
      return;
    }
    setDeletingSave(name);
    setTimeout(() => {
      const success = deleteSave(name);
      setDeletingSave(null);
      if (success) {
        showToast(`已删除 \"${name}\"`, 'success');
        refreshSaves();
      } else {
        showToast('删除失败', 'error');
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={containerRef}
        className="bg-[#0d1421] border-2 border-[#e94560] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl pixel-font"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#16213e] bg-[#0d1421]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#e94560]" />
            <h2 className="text-lg font-bold text-white">存档管理</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="关闭 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#16213e] space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#e94560] hover:bg-[#ff6b8a] text-white rounded transition-colors flex-shrink-0"
            >
              <Save className="w-4 h-4" />
              {currentSaveName ? `保存 \"${currentSaveName}\"` : '快速保存'}
            </button>

            <button
              onClick={() => { setShowNewForm(!showNewForm); setNewSaveName(currentSaveName || ''); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#16213e] hover:bg-[#1f3460] text-white border border-[#e94560]/30 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              另存为...
            </button>

            {currentSaveName && (
              <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>当前存档：<span className="text-white">{currentSaveName}</span></span>
              </div>
            )}
          </div>

          {showNewForm && (
            <div className="flex items-center gap-2 p-3 bg-[#16213e] rounded">
              <input
                ref={inputRef}
                type="text"
                value={newSaveName}
                onChange={e => setNewSaveName(e.target.value)}
                placeholder="输入存档名称..."
                className="flex-1 px-3 py-2 bg-[#0d1421] border border-[#e94560]/30 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setShowNewForm(false); setNewSaveName(''); }
                }}
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#e94560] hover:bg-[#ff6b8a] text-white rounded transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewSaveName(''); }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                取消
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={e => setAutoSave(e.target.checked)}
                className="w-4 h-4 accent-[#e94560]"
              />
              <span className="text-gray-300 text-sm">自动保存</span>
            </label>

            {autoSave && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock className="w-4 h-4" />
                <span>间隔：</span>
                <select
                  value={autoSaveInterval}
                  onChange={e => setAutoSaveInterval(Number(e.target.value))}
                  className="bg-[#16213e] border border-[#e94560]/30 rounded px-2 py-1 text-white focus:outline-none"
                >
                  <option value={1}>1 分钟</option>
                  <option value={5}>5 分钟</option>
                  <option value={10}>10 分钟</option>
                  <option value={30}>30 分钟</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {saves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>暂无存档</p>
              <p className="text-sm mt-1">点击"另存为..."创建第一个存档</p>
            </div>
          ) : (
            <div className="divide-y divide-[#16213e]">
              {saves.map(save => (
                <div
                  key={save.name}
                  className={`flex items-center gap-3 p-3 hover:bg-[#16213e]/50 transition-colors ${
                    save.name === currentSaveName ? 'bg-[#e94560]/10' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-[#16213e] rounded flex items-center justify-center flex-shrink-0 border border-[#e94560]/20">
                    <FolderOpen className={`w-5 h-5 ${save.name === currentSaveName ? 'text-[#e94560]' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{save.name}</span>
                      {save.name === currentSaveName && (
                        <span className="text-xs bg-[#e94560] text-white px-2 py-0.5 rounded flex-shrink-0">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>{save.actionCount} 个动作</span>
                      <span>{save.frameCount} 帧</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(save.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoad(save.name)}
                      disabled={loadingSave === save.name}
                      className="px-3 py-1.5 bg-[#16213e] hover:bg-[#1f3460] text-white text-sm rounded transition-colors border border-[#e94560]/30 disabled:opacity-50"
                    >
                      {loadingSave === save.name ? '加载中...' : '加载'}
                    </button>
                    <button
                      onClick={() => handleDelete(save.name)}
                      disabled={deletingSave === save.name}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#16213e] bg-[#0d1421] text-xs text-gray-500 flex items-center justify-between">
          <span>共 {saves.length} 个存档</span>
          <span>数据存储在浏览器本地（localStorage）</span>
        </div>
      </div>
    </div>
  );
}
