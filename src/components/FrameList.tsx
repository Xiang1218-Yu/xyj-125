import { useRef, useEffect, useState, useCallback } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Plus, Trash2, Copy, GripVertical, Clock, Edit3, Check, X, Layers, ChevronUp, ChevronDown } from 'lucide-react';

const FrameThumbnail = ({ frameId, pixelColors, size = 48 }: { frameId: string; pixelColors: string[]; size?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { character, currentActionId } = usePixelEditorStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    const frame = action?.frames.find((f) => f.id === frameId);
    if (!frame) return;

    const scale = Math.min(size / character.width, size / character.height);
    const w = character.width * scale;
    const h = character.height * scale;

    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, w, h);

    for (let y = 0; y < character.height; y++) {
      for (let x = 0; x < character.width; x++) {
        const colorIndex = frame.pixels[y][x];
        if (colorIndex >= 0 && colorIndex < pixelColors.length) {
          ctx.fillStyle = pixelColors[colorIndex];
          ctx.fillRect(x * scale, y * scale, scale + 1, scale + 1);
        }
      }
    }
  }, [frameId, character, currentActionId, pixelColors, size]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-[#0f3460] rounded bg-[#1a1a2e]"
      style={{ width: size, height: size }}
    />
  );
};

const FrameList = () => {
  const {
    character,
    currentActionId,
    currentFrameId,
    selectedFrameIds,
    setCurrentFrame,
    addFrame,
    deleteFrame,
    duplicateFrame,
    renameFrame,
    moveFrame,
    toggleFrameSelection,
    setSelectedFrameIds,
    clearFrameSelection,
    batchRenameFrames,
    batchDuplicateFrames,
    batchDeleteFrames,
    setFrameDelay,
  } = usePixelEditorStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchStartIndex, setBatchStartIndex] = useState(1);

  const action = character.actions.find((a) => a.id === currentActionId);
  const frames = action?.frames || [];

  const pixelColors = usePixelEditorStore.getState().pixelColors;

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
      moveFrame(draggedIndex, toIndex);
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
      renameFrame(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleFrameClick = (frameId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      toggleFrameSelection(frameId);
    } else if (e.ctrlKey || e.metaKey) {
      toggleFrameSelection(frameId);
    } else {
      setCurrentFrame(frameId);
      clearFrameSelection();
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      moveFrame(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < frames.length - 1) {
      moveFrame(index, index + 1);
    }
  };

  const handleBatchRename = () => {
    if (batchPrefix && selectedFrameIds.length > 0) {
      batchRenameFrames(batchPrefix, batchStartIndex);
    }
    setShowBatchMenu(false);
  };

  const handleSelectAll = () => {
    setSelectedFrameIds(frames.map((f) => f.id));
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">帧序列</h3>
        <div className="flex items-center gap-1">
          {selectedFrameIds.length > 0 && (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowBatchMenu(!showBatchMenu)}
                  className="p-1.5 rounded text-[#f39c12] hover:bg-[#f39c12]/20 transition-colors flex items-center gap-1 text-xs"
                  title="批量操作"
                >
                  <Layers size={14} />
                  <span>{selectedFrameIds.length}项</span>
                </button>
                {showBatchMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[#0f3460] border border-[#1a1a2e] rounded shadow-lg z-10 p-3 w-56">
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">批量重命名前缀</label>
                        <input
                          type="text"
                          value={batchPrefix}
                          onChange={(e) => setBatchPrefix(e.target.value)}
                          placeholder="如: walk_"
                          className="w-full px-2 py-1 text-sm bg-[#1a1a2e] border border-[#16213e] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">起始序号</label>
                        <input
                          type="number"
                          value={batchStartIndex}
                          onChange={(e) => setBatchStartIndex(parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-full px-2 py-1 text-sm bg-[#1a1a2e] border border-[#16213e] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
                        />
                      </div>
                      <button
                        onClick={handleBatchRename}
                        className="w-full py-1.5 text-sm bg-[#e94560] text-white rounded hover:bg-[#d63d55] transition-colors"
                      >
                        批量重命名
                      </button>
                      <div className="border-t border-[#16213e] pt-2 space-y-1">
                        <button
                          onClick={() => {
                            batchDuplicateFrames(selectedFrameIds);
                            setShowBatchMenu(false);
                          }}
                          className="w-full py-1.5 text-sm text-left px-2 hover:bg-[#1a1a2e] rounded text-gray-300 flex items-center gap-2"
                        >
                          <Copy size={14} /> 批量复制
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确定删除 ${selectedFrameIds.length} 帧?`)) {
                              batchDeleteFrames(selectedFrameIds);
                            }
                            setShowBatchMenu(false);
                          }}
                          className="w-full py-1.5 text-sm text-left px-2 hover:bg-[#1a1a2e] rounded text-[#e74c3c] flex items-center gap-2"
                        >
                          <Trash2 size={14} /> 批量删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-[#0f3460]" />
            </>
          )}
          <button
            onClick={handleSelectAll}
            className="p-1.5 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
            title="全选"
          >
            <Layers size={16} />
          </button>
          <button
            onClick={() => currentActionId && addFrame(currentActionId)}
            className="p-1.5 rounded text-[#e94560] hover:bg-[#e94560]/20 transition-colors"
            title="添加帧"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {frames.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            暂无帧，点击 + 添加
          </div>
        )}
        {frames.map((frame, index) => (
          <div
            key={frame.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`group relative flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
              currentFrameId === frame.id
                ? 'bg-[#e94560]/20 border border-[#e94560]'
                : selectedFrameIds.includes(frame.id)
                ? 'bg-[#f39c12]/20 border border-[#f39c12]'
                : 'border border-transparent hover:bg-[#0f3460] hover:border-[#0f3460]'
            } ${dragOverIndex === index ? 'border-t-2 border-t-[#e94560]' : ''} ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
            onClick={(e) => handleFrameClick(frame.id, e)}
          >
            <div className="cursor-grab text-gray-600 group-hover:text-gray-400">
              <GripVertical size={16} />
            </div>

            <FrameThumbnail frameId={frame.id} pixelColors={pixelColors} size={40} />

            <div className="flex-1 min-w-0">
              {editingId === frame.id ? (
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
                <>
                  <div className="text-xs text-gray-300 truncate font-medium">{frame.name}</div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock size={10} />
                    <span>{frame.delay}ms</span>
                    <span className="ml-auto">#{index + 1}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveUp(index);
                }}
                disabled={index === 0}
                className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                title="上移"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveDown(index);
                }}
                disabled={index === frames.length - 1}
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
                  handleStartEdit(frame.id, frame.name);
                }}
                className="p-1 text-gray-500 hover:text-[#3498db] rounded"
                title="重命名"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateFrame(frame.id);
                }}
                className="p-1 text-gray-500 hover:text-[#f39c12] rounded"
                title="复制帧"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`确定删除帧 "${frame.name}"?`)) {
                    deleteFrame(frame.id);
                  }
                }}
                className="p-1 text-gray-500 hover:text-[#e74c3c] rounded"
                title="删除帧"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {currentFrameId && (
        <div className="mt-3 pt-3 border-t border-[#0f3460]">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs text-gray-400">帧延迟:</span>
            <input
              type="number"
              value={frames.find((f) => f.id === currentFrameId)?.delay || 200}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 50;
                setFrameDelay(currentFrameId, Math.max(10, value));
              }}
              min={10}
              step={10}
              className="flex-1 w-20 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
            />
            <span className="text-xs text-gray-500">ms</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameList;
