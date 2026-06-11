import { useState, useRef, useEffect } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Plus, Trash2, Copy, Edit3, Check, X, Play, Repeat } from 'lucide-react';

const ActionPanel = () => {
  const {
    character,
    currentActionId,
    addAction,
    deleteAction,
    renameAction,
    duplicateAction,
    setCurrentAction,
    setActionLoop,
  } = usePixelEditorStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isAdding) {
          setIsAdding(false);
          setNewActionName('');
        }
        if (editingId) {
          setEditingId(null);
          setEditingName('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdding, editingId]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleAddAction = () => {
    if (newActionName.trim()) {
      addAction(newActionName.trim());
      setNewActionName('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      renameAction(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const currentAction = character.actions.find((a) => a.id === currentActionId);

  return (
    <div ref={containerRef} className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">动作列表</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1.5 rounded text-[#e94560] hover:bg-[#e94560]/20 transition-colors"
          title="添加动作"
        >
          <Plus size={16} />
        </button>
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-[#0f3460] rounded">
          <input
            ref={addInputRef}
            type="text"
            value={newActionName}
            onChange={(e) => setNewActionName(e.target.value)}
            placeholder="动作名称..."
            className="flex-1 px-2 py-1 text-sm bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddAction();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewActionName('');
              }
              e.stopPropagation();
            }}
          />
          <button
            onClick={handleAddAction}
            className="p-1 text-[#2ecc71] hover:bg-[#2ecc71]/20 rounded"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewActionName('');
            }}
            className="p-1 text-[#e74c3c] hover:bg-[#e74c3c]/20 rounded"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {character.actions.map((action) => (
          <div
            key={action.id}
            className={`group relative flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
              currentActionId === action.id
                ? 'bg-[#e94560]/20 border border-[#e94560]'
                : 'border border-transparent hover:bg-[#0f3460]'
            }`}
            onClick={() => setCurrentAction(action.id)}
          >
            {editingId === action.id ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-1 py-0.5 text-sm bg-[#1a1a2e] border border-[#e94560] rounded text-gray-200 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                    e.stopPropagation();
                  }}
                />
                <button onClick={handleSaveEdit} className="p-0.5 text-[#2ecc71]">
                  <Check size={14} />
                </button>
                <button onClick={handleCancelEdit} className="p-0.5 text-[#e74c3c]">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Play size={12} className="text-[#e94560] flex-shrink-0" />
                <span className="text-sm text-gray-300 flex-1 truncate">{action.name}</span>
                <span className="text-xs text-gray-500">{action.frames.length}帧</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionLoop(action.id, !action.loop);
                  }}
                  className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    action.loop ? 'text-[#2ecc71]' : 'text-gray-500'
                  }`}
                  title={action.loop ? '循环播放' : '单次播放'}
                >
                  <Repeat size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(action.id, action.name);
                  }}
                  className="p-0.5 text-gray-500 hover:text-[#3498db] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="重命名"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateAction(action.id);
                  }}
                  className="p-0.5 text-gray-500 hover:text-[#f39c12] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="复制动作"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除动作 "${action.name}"?`)) {
                      deleteAction(action.id);
                    }
                  }}
                  className="p-0.5 text-gray-500 hover:text-[#e74c3c] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除动作"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {currentAction && (
        <div className="mt-3 pt-3 border-t border-[#0f3460]">
          <div className="text-xs text-gray-500 space-y-1">
            <p>帧数: <span className="text-gray-300">{currentAction.frames.length}</span></p>
            <p>循环: <span className="text-gray-300">{currentAction.loop ? '是' : '否'}</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionPanel;
