import { useRef, useEffect, useState, useMemo } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Clock,
  Edit3,
  Check,
  X,
  Layers,
  ChevronUp,
  ChevronDown,
  MoveRight,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
} from 'lucide-react';

const PIXELS_PER_MS_MIN = 0.05;
const PIXELS_PER_MS_MAX = 1.0;
const DEFAULT_PIXELS_PER_MS = 0.2;
const MIN_FRAME_WIDTH = 30;
const HANDLE_WIDTH = 8;
const ROW_HEIGHT = 60;
const TIMELINE_PADDING_LEFT = 60;
const TIMELINE_PADDING_RIGHT = 20;

const FrameThumbnail = ({
  frameId,
  pixelColors,
  size = 48,
}: {
  frameId: string;
  pixelColors: string[];
  size?: number;
}) => {
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

    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = layer.pixels[y][x];
          if (colorIndex >= 0 && colorIndex < pixelColors.length) {
            ctx.globalAlpha = layer.opacity;
            ctx.fillStyle = pixelColors[colorIndex];
            ctx.fillRect(x * scale, y * scale, scale + 1, scale + 1);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }, [frameId, character, currentActionId, pixelColors, size]);

  return (
    <canvas
      ref={canvasRef}
      className="border border-[#0f3460] rounded bg-[#1a1a2e] flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
};

const Timeline = () => {
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
    isPlaying,
    setIsPlaying,
    fps,
  } = usePixelEditorStore();

  const action = character.actions.find((a) => a.id === currentActionId);
  const frames = action?.frames || [];
  const pixelColors = usePixelEditorStore.getState().pixelColors;

  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pixelsPerMs, setPixelsPerMs] = useState(DEFAULT_PIXELS_PER_MS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [batchPrefix, setBatchPrefix] = useState('');
  const [batchStartIndex, setBatchStartIndex] = useState(1);

  const [resizing, setResizing] = useState<{
    frameId: string;
    startX: number;
    startDelay: number;
  } | null>(null);

  const [reordering, setReordering] = useState<{
    fromIndex: number;
    offsetX: number;
    currentX: number;
  } | null>(null);

  const [playbackTime, setPlaybackTime] = useState(0);
  const playbackAnimRef = useRef<number | null>(null);
  const lastPlaybackTsRef = useRef<number>(0);

  const frameOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const frame of frames) {
      offsets.push(acc);
      acc += frame.delay;
    }
    return offsets;
  }, [frames]);

  const totalDuration = useMemo(() => {
    return frames.reduce((sum, f) => sum + f.delay, 0);
  }, [frames]);

  const totalWidth = useMemo(() => {
    return Math.max(totalDuration * pixelsPerMs + TIMELINE_PADDING_LEFT + TIMELINE_PADDING_RIGHT, 500);
  }, [totalDuration, pixelsPerMs]);

  const zoomIn = () => {
    setPixelsPerMs((p) => Math.min(PIXELS_PER_MS_MAX, p * 1.4));
  };

  const zoomOut = () => {
    setPixelsPerMs((p) => Math.max(PIXELS_PER_MS_MIN, p / 1.4));
  };

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
    if (resizing || reordering) return;
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

  const handleResizeStart = (e: React.MouseEvent, frameId: string, delay: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      frameId,
      startX: e.clientX,
      startDelay: delay,
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX;
      const deltaMs = dx / pixelsPerMs;
      const newDelay = Math.max(10, Math.round((resizing.startDelay + deltaMs) / 10) * 10);
      setFrameDelay(resizing.frameId, newDelay);
    };

    const handleMouseUp = () => {
      setTimeout(() => usePixelEditorStore.getState().pushHistory(), 0);
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, pixelsPerMs, setFrameDelay]);

  const handleReorderStart = (e: React.MouseEvent, fromIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = timelineRef.current?.getBoundingClientRect();
    const offsetX = rect ? e.clientX - rect.left : 0;
    setReordering({
      fromIndex,
      offsetX,
      currentX: offsetX,
    });
  };

  useEffect(() => {
    if (!reordering) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      setReordering((prev) => (prev ? { ...prev, currentX: x } : prev));

      let targetTime = (x - TIMELINE_PADDING_LEFT) / pixelsPerMs;
      targetTime = Math.max(0, targetTime);

      let cumulative = 0;
      let targetIndex = frames.length;
      for (let i = 0; i < frames.length; i++) {
        if (i === reordering.fromIndex) continue;
        const mid = cumulative + frames[i].delay / 2;
        if (targetTime < mid) {
          targetIndex = i;
          break;
        }
        cumulative += frames[i].delay;
      }

      const from = reordering.fromIndex;
      let to = targetIndex;
      if (from < to) to -= 1;
      if (to < 0) to = 0;
      if (to >= frames.length) to = frames.length - 1;

      setDragOverIndex(to === from ? null : to);
    };

    const handleMouseUp = () => {
      const from = reordering.fromIndex;
      let to = dragOverIndex;
      if (to !== null && to !== from) {
        if (from < to) to += 1;
        moveFrame(from, to);
      }
      setReordering(null);
      setDragOverIndex(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [reordering, frames, pixelsPerMs, dragOverIndex, moveFrame]);

  const currentFrameIndex = useMemo(() => {
    return frames.findIndex((f) => f.id === currentFrameId);
  }, [frames, currentFrameId]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (playbackAnimRef.current) {
        cancelAnimationFrame(playbackAnimRef.current);
        playbackAnimRef.current = null;
      }
      if (currentFrameIndex >= 0) {
        setPlaybackTime(frameOffsets[currentFrameIndex] || 0);
      }
      return;
    }

    lastPlaybackTsRef.current = 0;
    let localTime = playbackTime;

    const step = (ts: number) => {
      if (!lastPlaybackTsRef.current) lastPlaybackTsRef.current = ts;
      const dt = ts - lastPlaybackTsRef.current;
      lastPlaybackTsRef.current = ts;

      localTime += dt;
      if (action?.loop) {
        if (localTime >= totalDuration) {
          localTime = localTime % totalDuration;
        }
      } else {
        if (localTime >= totalDuration) {
          localTime = totalDuration;
          setIsPlaying(false);
        }
      }
      setPlaybackTime(localTime);
      playbackAnimRef.current = requestAnimationFrame(step);
    };

    playbackAnimRef.current = requestAnimationFrame(step);
    return () => {
      if (playbackAnimRef.current) {
        cancelAnimationFrame(playbackAnimRef.current);
      }
    };
  }, [isPlaying, frames.length, totalDuration, action?.loop, setIsPlaying, frameOffsets, currentFrameIndex]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (resizing || reordering || frames.length === 0) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - TIMELINE_PADDING_LEFT;
    let time = x / pixelsPerMs;
    time = Math.max(0, Math.min(totalDuration - 0.01, time));

    let cumulative = 0;
    for (let i = 0; i < frames.length; i++) {
      cumulative += frames[i].delay;
      if (time < cumulative) {
        setCurrentFrame(frames[i].id);
        clearFrameSelection();
        setPlaybackTime(frameOffsets[i]);
        break;
      }
    }
  };

  const timeTicks = useMemo(() => {
    const ticks: { time: number; label: string; major: boolean }[] = [];
    if (totalDuration <= 0) return ticks;

    let stepMs = 100;
    if (pixelsPerMs * stepMs < 40) stepMs = 250;
    if (pixelsPerMs * stepMs < 40) stepMs = 500;
    if (pixelsPerMs * stepMs < 40) stepMs = 1000;
    if (pixelsPerMs * stepMs < 40) stepMs = 2000;
    if (pixelsPerMs * stepMs < 40) stepMs = 5000;

    const majorEvery = stepMs >= 1000 ? 1 : stepMs === 500 ? 2 : 5;

    for (let t = 0; t <= totalDuration + stepMs; t += stepMs) {
      const major = Math.round(t / stepMs) % majorEvery === 0;
      let label = '';
      if (t >= 1000) {
        label = (t / 1000).toFixed(t % 1000 === 0 ? 0 : 1) + 's';
      } else {
        label = t + 'ms';
      }
      ticks.push({ time: t, label, major });
    }
    return ticks;
  }, [totalDuration, pixelsPerMs]);

  const reorderGhostOffset = reordering
    ? reordering.currentX - (frameOffsets[reordering.fromIndex] * pixelsPerMs + TIMELINE_PADDING_LEFT)
    : 0;

  const currentDelay = currentFrameId
    ? frames.find((f) => f.id === currentFrameId)?.delay || 200
    : 200;

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3 flex flex-col h-full select-none">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs flex items-center gap-2">
          <Clock size={14} className="text-[#e94560]" />
          时间轴
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] text-gray-500 w-12 text-center">
            {(pixelsPerMs * 100).toFixed(0)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
            title="放大"
          >
            <ZoomIn size={14} />
          </button>

          <div className="w-px h-5 bg-[#0f3460] mx-1" />

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

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden border border-[#0f3460] rounded bg-[#1a1a2e] cursor-crosshair"
        style={{ minHeight: ROW_HEIGHT + 80 }}
        onClick={handleTimelineClick}
      >
        <div
          ref={timelineRef}
          className="relative"
          style={{ width: totalWidth, height: ROW_HEIGHT + 80 }}
        >
          <div className="absolute top-0 left-0 right-0 h-8 border-b border-[#0f3460] bg-[#0f3460]/30 flex items-center">
            <div
              className="absolute top-0 left-0 h-full border-r border-[#0f3460] bg-[#16213e] flex items-center justify-center"
              style={{ width: TIMELINE_PADDING_LEFT }}
            >
              <span className="text-[9px] text-gray-500 pixel-font">时间</span>
            </div>
            {timeTicks.map((tick, i) => {
              const x = TIMELINE_PADDING_LEFT + tick.time * pixelsPerMs;
              return (
                <div
                  key={i}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: x, height: '100%' }}
                >
                  <div
                    className={`border-l ${
                      tick.major ? 'border-gray-500 h-3' : 'border-gray-700 h-1.5'
                    }`}
                  />
                  {tick.major && (
                    <span className="text-[9px] text-gray-500 mt-0.5 whitespace-nowrap">
                      {tick.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-8 bottom-2 pointer-events-none"
            style={{
              left: TIMELINE_PADDING_LEFT + playbackTime * pixelsPerMs,
              zIndex: 20,
            }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#e94560] -ml-1.5" />
            <div className="w-0.5 h-full bg-[#e94560] -ml-px" />
          </div>

          <div
            className="absolute flex items-center"
            style={{
              top: 40,
              left: 0,
              width: TIMELINE_PADDING_LEFT,
              height: ROW_HEIGHT,
            }}
          >
            <span className="text-[9px] text-gray-500 pixel-font w-full text-center pr-2">
              帧
            </span>
          </div>

          {frames.map((frame, index) => {
            const x = TIMELINE_PADDING_LEFT + frameOffsets[index] * pixelsPerMs;
            const width = Math.max(frame.delay * pixelsPerMs, MIN_FRAME_WIDTH);
            const isCurrent = currentFrameId === frame.id;
            const isSelected = selectedFrameIds.includes(frame.id);
            const isDragOver = dragOverIndex === index;
            const isDragged = draggedIndex === index;
            const isReorderingThis = reordering?.fromIndex === index;

            let ghostOffsetPx = 0;
            if (isReorderingThis && reordering) {
              ghostOffsetPx = reorderGhostOffset;
            }

            return (
              <div key={frame.id}>
                <div
                  className={`absolute top-[40px] group rounded-md overflow-hidden cursor-pointer transition-opacity ${
                    isDragged ? 'opacity-30' : ''
                  } ${isReorderingThis ? 'opacity-60 z-10' : ''}`}
                  style={{
                    left: x + ghostOffsetPx,
                    width,
                    height: ROW_HEIGHT,
                    zIndex: isCurrent || isSelected ? 5 : 1,
                  }}
                  draggable={!resizing && !reordering}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleFrameClick(frame.id, e)}
                >
                  <div
                    className={`w-full h-full flex items-center gap-2 px-2 border-2 transition-all ${
                      isCurrent
                        ? 'bg-[#e94560]/25 border-[#e94560] shadow-[0_0_8px_rgba(233,69,96,0.35)]'
                        : isSelected
                        ? 'bg-[#f39c12]/20 border-[#f39c12] shadow-[0_0_6px_rgba(243,156,18,0.25)]'
                        : 'bg-gradient-to-r from-[#0f3460] to-[#16213e] border-[#0f3460] hover:border-[#3498db] hover:from-[#1a3a6e]'
                    } ${isDragOver ? 'ring-2 ring-offset-1 ring-offset-[#1a1a2e] ring-[#3498db]' : ''}`}
                  >
                    <div
                      className="cursor-grab text-gray-600 group-hover:text-gray-400 flex-shrink-0"
                      onMouseDown={(e) => handleReorderStart(e, index)}
                    >
                      <GripVertical size={14} />
                    </div>

                    {width >= 70 && (
                      <FrameThumbnail
                        frameId={frame.id}
                        pixelColors={pixelColors}
                        size={Math.min(40, ROW_HEIGHT - 16)}
                      />
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      {editingId === frame.id ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-1 py-0.5 text-[10px] bg-[#1a1a2e] border border-[#e94560] rounded text-gray-200 focus:outline-none min-w-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-0.5 text-[#2ecc71] flex-shrink-0"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-0.5 text-[#e74c3c] flex-shrink-0"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`text-[10px] truncate font-medium ${
                              isCurrent
                                ? 'text-white'
                                : isSelected
                                ? 'text-[#f39c12]'
                                : 'text-gray-300'
                            }`}
                          >
                            {width >= 50 ? frame.name : `#${index + 1}`}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-gray-500">
                            <Clock size={9} />
                            <span>{frame.delay}ms</span>
                          </div>
                        </>
                      )}
                    </div>

                    {width >= 120 && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveUp(index);
                          }}
                          disabled={index === 0}
                          className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                          title="前移"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveDown(index);
                          }}
                          disabled={index === frames.length - 1}
                          className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                          title="后移"
                        >
                          <ChevronDown size={10} />
                        </button>
                      </div>
                    )}

                    {width >= 150 && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(frame.id, frame.name);
                          }}
                          className="p-1 text-gray-500 hover:text-[#3498db] rounded"
                          title="重命名"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateFrame(frame.id);
                          }}
                          className="p-1 text-gray-500 hover:text-[#f39c12] rounded"
                          title="复制帧"
                        >
                          <Copy size={10} />
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
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}

                    <div
                      className={`absolute right-0 top-0 h-full cursor-ew-resize transition-colors flex items-center justify-center ${
                        resizing?.frameId === frame.id
                          ? 'bg-[#3498db]/50'
                          : 'hover:bg-[#3498db]/30'
                      }`}
                      style={{ width: HANDLE_WIDTH }}
                      onMouseDown={(e) => handleResizeStart(e, frame.id, frame.delay)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoveRight
                        size={12}
                        className={`${
                          resizing?.frameId === frame.id
                            ? 'text-white'
                            : 'text-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="absolute top-[40px] w-px h-[60px] bg-[#0f3460]/60 pointer-events-none"
                  style={{
                    left: TIMELINE_PADDING_LEFT + frameOffsets[index] * pixelsPerMs,
                    zIndex: 2,
                  }}
                />
              </div>
            );
          })}

          {totalDuration > 0 && (
            <div
              className="absolute top-[40px] w-px h-[60px] bg-[#0f3460]/60 pointer-events-none"
              style={{
                left: TIMELINE_PADDING_LEFT + totalDuration * pixelsPerMs,
                zIndex: 2,
              }}
            />
          )}

          {frames.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm"
              style={{ paddingLeft: TIMELINE_PADDING_LEFT }}
            >
              暂无帧，点击 + 添加
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#0f3460] flex-shrink-0 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-full transition-colors ${
              isPlaying
                ? 'bg-[#f39c12] text-white hover:bg-[#d98a0c]'
                : 'bg-[#e94560] text-white hover:bg-[#d63d55]'
            }`}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="text-[10px] text-gray-500">
            <div>总时长: {totalDuration}ms</div>
            <div>FPS: {fps}</div>
          </div>
        </div>

        {currentFrameId && (
          <div className="flex items-center gap-2 flex-1">
            <Clock size={12} className="text-gray-500 flex-shrink-0" />
            <span className="text-[10px] text-gray-400 flex-shrink-0">帧延迟:</span>
            <input
              type="number"
              value={currentDelay}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 50;
                setFrameDelay(currentFrameId, Math.max(10, value));
              }}
              onBlur={() => setTimeout(() => usePixelEditorStore.getState().pushHistory(), 0)}
              min={10}
              step={10}
              className="flex-1 w-20 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
            />
            <span className="text-[10px] text-gray-500 flex-shrink-0">ms</span>
          </div>
        )}

        <div className="text-[10px] text-gray-500 text-right flex-shrink-0">
          <div>拖拽右边缘调整时长</div>
          <div>拖动左侧图标重排</div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
