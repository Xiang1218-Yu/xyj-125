import { useState } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Plus, Trash2, Copy, GripVertical, Eye, EyeOff, Lock, Unlock, Edit3, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

const LayerList = () => {
  const {
    character,
    currentActionId,
    currentFrameId,
    currentLayerId,
    setCurrentLayer,
    addLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    moveLayer,
    setLayerVisible,
    setLayerLocked,
    setLayerOpacity,
  } = usePixelEditorStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const action = character.actions.find((a) => a.id === currentActionId);
  const frame = action?.frames.find((f) => f.id === currentFrameId);
  const layers = frame?.layers || [];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      moveLayer(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      renameLayer(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveLayer(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < layers.length - 1) {
      moveLayer(index, index + 1);
    }
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">图层</h3>
        <button
          onClick={() => addLayer()}
          className="p-1.5 rounded text-[#e94560] hover:bg-[#e94560]/20 transition-colors"
          title="添加图层"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {layers.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            暂无图层，点击 + 添加
          </div>
        )}
        {layers.slice().reverse().map((layer, displayIndex) => {
          const realIndex = layers.length - 1 - displayIndex;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, realIndex)}
              onDragOver={(e) => handleDragOver(e, realIndex)}
              onDrop={(e) => handleDrop(e, realIndex)}
              onDragEnd={handleDragEnd}
              className={`group relative flex flex-col p-2 rounded cursor-pointer transition-all ${
                currentLayerId === layer.id
                  ? 'bg-[#e94560]/20 border border-[#e94560]'
                  : 'border border-transparent hover:bg-[#0f3460] hover:border-[#0f3460]'
              } ${dragOverIndex === realIndex ? 'border-t-2 border-t-[#e94560]' : ''} ${
                draggedIndex === realIndex ? 'opacity-50' : ''
              }`}
              onClick={() => setCurrentLayer(layer.id)}
            >
              <div className="flex items-center gap-2">
                <div className="cursor-grab text-gray-600 group-hover:text-gray-400">
                  <GripVertical size={14} />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerVisible(layer.id, !layer.visible);
                    }}
                    className={`p-1 rounded transition-colors ${
                      layer.visible
                        ? 'text-gray-300 hover:bg-[#1a1a2e]'
                        : 'text-gray-600 hover:bg-[#1a1a2e] hover:text-gray-400'
                    }`}
                    title={layer.visible ? '隐藏图层' : '显示图层'}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerLocked(layer.id, !layer.locked);
                    }}
                    className={`p-1 rounded transition-colors ${
                      layer.locked
                        ? 'text-[#f39c12] hover:bg-[#1a1a2e]'
                        : 'text-gray-600 hover:bg-[#1a1a2e] hover:text-gray-400'
                    }`}
                    title={layer.locked ? '解锁图层' : '锁定图层'}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === layer.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-1 py-0.5 text-xs bg-[#1a1a2e] border border-[#e94560] rounded text-gray-200 focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button onClick={handleSaveEdit} className="p-0.5 text-[#2ecc71]">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-0.5 text-[#e74c3c]">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 truncate font-medium">
                      {layer.name}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(realIndex);
                    }}
                    disabled={realIndex === 0}
                    className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                    title="上移"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(realIndex);
                    }}
                    disabled={realIndex === layers.length - 1}
                    className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                    title="下移"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(layer.id, layer.name);
                    }}
                    className="p-1 text-gray-500 hover:text-[#3498db] rounded"
                    title="重命名"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                    className="p-1 text-gray-500 hover:text-[#f39c12] rounded"
                    title="复制图层"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (layers.length > 1 && confirm(`确定删除图层 "${layer.name}"?`)) {
                        deleteLayer(layer.id);
                      }
                    }}
                    className={`p-1 rounded ${
                      layers.length <= 1
                        ? 'text-gray-700 cursor-not-allowed'
                        : 'text-gray-500 hover:text-[#e74c3c]'
                    }`}
                    title={layers.length <= 1 ? '至少保留一个图层' : '删除图层'}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">透明度</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={layer.opacity}
                  onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-[#0f3460] rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                  disabled={layer.locked}
                />
                <span className="text-[10px] text-gray-500 w-8 text-right flex-shrink-0">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[#0f3460]">
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>共 {layers.length} 个图层</span>
          <span>顶层 → 底层</span>
        </div>
      </div>
    </div>
  );
};

export default LayerList;
