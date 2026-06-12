import { useRef, useEffect, useState, useCallback } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Pencil, Eraser, PaintBucket, Grid3X3, ZoomIn, ZoomOut, Layers, ImagePlus, Eye, EyeOff, X } from 'lucide-react';

const PixelCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);
  const [referenceImageLoaded, setReferenceImageLoaded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const {
    character,
    currentFrameId,
    currentActionId,
    currentLayerId,
    gridSize,
    showGrid,
    selectedTool,
    pixelColors,
    onionSkinEnabled,
    onionSkinPrevFrames,
    onionSkinNextFrames,
    onionSkinOpacity,
    referenceImage,
    referenceImageOpacity,
    referenceImageEnabled,
    setPixel,
    setGridSize,
    setShowGrid,
    setSelectedTool,
    setOnionSkinEnabled,
    setOnionSkinPrevFrames,
    setOnionSkinNextFrames,
    setOnionSkinOpacity,
    setReferenceImage,
    setReferenceImageOpacity,
    setReferenceImageEnabled,
  } = usePixelEditorStore();

  const isDrawingRef = useRef(false);
  const hasChangedRef = useRef(false);
  const previousPixelsRef = useRef<string>('');

  const saveStateBeforeDraw = useCallback(() => {
    const state = usePixelEditorStore.getState();
    const action = state.character.actions.find((a) => a.id === state.currentActionId);
    const frame = action?.frames.find((f) => f.id === state.currentFrameId);
    const layer = frame?.layers.find((l) => l.id === state.currentLayerId);
    if (layer) {
      previousPixelsRef.current = JSON.stringify(layer.pixels);
    }
  }, []);

  const commitHistoryIfChanged = useCallback(() => {
    if (hasChangedRef.current && previousPixelsRef.current) {
      const state = usePixelEditorStore.getState();
      const action = state.character.actions.find((a) => a.id === state.currentActionId);
      const frame = action?.frames.find((f) => f.id === state.currentFrameId);
      const layer = frame?.layers.find((l) => l.id === state.currentLayerId);
      if (layer && JSON.stringify(layer.pixels) !== previousPixelsRef.current) {
        state.pushHistory();
      }
    }
    hasChangedRef.current = false;
    previousPixelsRef.current = '';
  }, []);

  const currentColorIndex = pixelColors.indexOf(usePixelEditorStore.getState().currentColor);

  const getCurrentFrame = useCallback(() => {
    const state = usePixelEditorStore.getState();
    const action = state.character.actions.find((a) => a.id === state.currentActionId);
    return action?.frames.find((f) => f.id === state.currentFrameId) || null;
  }, []);

  const getAdjacentFrames = useCallback(() => {
    const state = usePixelEditorStore.getState();
    const action = state.character.actions.find((a) => a.id === state.currentActionId);
    if (!action) return { prevFrames: [], nextFrames: [] };

    const currentIndex = action.frames.findIndex((f) => f.id === state.currentFrameId);
    if (currentIndex === -1) return { prevFrames: [], nextFrames: [] };

    const prevFrames: { frame: typeof action.frames[0]; offset: number }[] = [];
    const nextFrames: { frame: typeof action.frames[0]; offset: number }[] = [];

    for (let i = 1; i <= state.onionSkinPrevFrames; i++) {
      const idx = currentIndex - i;
      if (idx >= 0) {
        prevFrames.push({ frame: action.frames[idx], offset: i });
      }
    }

    for (let i = 1; i <= state.onionSkinNextFrames; i++) {
      const idx = currentIndex + i;
      if (idx < action.frames.length) {
        nextFrames.push({ frame: action.frames[idx], offset: i });
      }
    }

    return { prevFrames, nextFrames };
  }, []);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const drawFrameLayersWithOpacity = (
    ctx: CanvasRenderingContext2D,
    frame: { layers: { pixels: number[][]; visible: boolean; opacity: number }[] },
    opacity: number,
    tintColor?: string
  ) => {
    const { width, height } = character;
    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      const layerOpacity = layer.opacity * opacity;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = layer.pixels[y][x];
          if (colorIndex >= 0 && colorIndex < pixelColors.length) {
            const baseColor = pixelColors[colorIndex];
            const rgb = hexToRgb(baseColor);
            if (rgb) {
              if (tintColor) {
                const tintRgb = hexToRgb(tintColor);
                if (tintRgb) {
                  ctx.fillStyle = `rgba(${Math.round(rgb.r * 0.5 + tintRgb.r * 0.5)}, ${Math.round(rgb.g * 0.5 + tintRgb.g * 0.5)}, ${Math.round(rgb.b * 0.5 + tintRgb.b * 0.5)}, ${layerOpacity})`;
                }
              } else {
                ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${layerOpacity})`;
              }
              ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
            }
          }
        }
      }
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = getCurrentFrame();
    const { width, height } = character;

    canvas.width = width * gridSize;
    canvas.height = height * gridSize;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#1a1a2e';
        } else {
          ctx.fillStyle = '#16213e';
        }
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
    }

    if (referenceImageEnabled && referenceImageLoaded && referenceImgRef.current) {
      ctx.save();
      ctx.globalAlpha = referenceImageOpacity;
      ctx.imageSmoothingEnabled = true;
      const img = referenceImgRef.current;
      const canvasW = width * gridSize;
      const canvasH = height * gridSize;
      const imgAspect = img.width / img.height;
      const canvasAspect = canvasW / canvasH;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgAspect > canvasAspect) {
        drawW = canvasW;
        drawH = canvasW / imgAspect;
        drawX = 0;
        drawY = (canvasH - drawH) / 2;
      } else {
        drawH = canvasH;
        drawW = canvasH * imgAspect;
        drawX = (canvasW - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    if (onionSkinEnabled) {
      const { prevFrames, nextFrames } = getAdjacentFrames();

      for (const { frame: prevFrame, offset } of prevFrames) {
        const opacity = onionSkinOpacity / offset;
        drawFrameLayersWithOpacity(ctx, prevFrame, opacity, '#3498db');
      }

      for (const { frame: nextFrame, offset } of nextFrames) {
        const opacity = onionSkinOpacity / offset;
        drawFrameLayersWithOpacity(ctx, nextFrame, opacity, '#e74c3c');
      }
    }

    if (frame) {
      drawFrameLayersWithOpacity(ctx, frame, 1);
    }

    if (showGrid && gridSize > 4) {
      ctx.strokeStyle = '#0f3460';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * gridSize + 0.5, 0);
        ctx.lineTo(x * gridSize + 0.5, height * gridSize);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * gridSize + 0.5);
        ctx.lineTo(width * gridSize, y * gridSize + 0.5);
        ctx.stroke();
      }
    }
  }, [character, gridSize, showGrid, pixelColors, getCurrentFrame, onionSkinEnabled, onionSkinOpacity, getAdjacentFrames, referenceImageEnabled, referenceImageLoaded, referenceImageOpacity]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, currentFrameId, currentActionId, currentLayerId, character, gridSize, showGrid, pixelColors, selectedTool, onionSkinEnabled, onionSkinPrevFrames, onionSkinNextFrames, onionSkinOpacity, referenceImageEnabled, referenceImageLoaded, referenceImageOpacity]);

  useEffect(() => {
    if (!referenceImage) {
      referenceImgRef.current = null;
      setReferenceImageLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      referenceImgRef.current = img;
      setReferenceImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load reference image');
      referenceImgRef.current = null;
      setReferenceImageLoaded(false);
    };
    img.src = referenceImage;
  }, [referenceImage]);

  const getPixelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: -1, y: -1 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / gridSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / gridSize);

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    isDrawingRef.current = true;
    saveStateBeforeDraw();
    const pos = getPixelPos(e);
    setLastPos(pos);
    const colorIdx = pixelColors.indexOf(usePixelEditorStore.getState().currentColor);
    setPixel(pos.x, pos.y, colorIdx);
    hasChangedRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPixelPos(e);

    if (lastPos && (pos.x !== lastPos.x || pos.y !== lastPos.y)) {
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      const colorIdx = pixelColors.indexOf(usePixelEditorStore.getState().currentColor);

      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const x = Math.round(lastPos.x + dx * t);
        const y = Math.round(lastPos.y + dy * t);
        setPixel(x, y, colorIdx);
      }
      hasChangedRef.current = true;
    }

    setLastPos(pos);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    isDrawingRef.current = false;
    setLastPos(null);
    commitHistoryIfChanged();
  };

  const handleMouseLeave = () => {
    if (isDrawingRef.current) {
      commitHistoryIfChanged();
    }
    setIsDrawing(false);
    isDrawingRef.current = false;
    setLastPos(null);
  };

  const handleReferenceImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReferenceImage(result);
      setReferenceImageEnabled(true);
    };
    reader.onerror = () => {
      alert('读取图片失败');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImageEnabled(false);
  };

  const tools = [
    { id: 'pencil', icon: Pencil, label: '画笔' },
    { id: 'eraser', icon: Eraser, label: '橡皮' },
    { id: 'bucket', icon: PaintBucket, label: '填充' },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#16213e] rounded-lg border border-[#0f3460] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f3460] border-b border-[#1a1a2e]">
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-2 rounded transition-colors ${
                selectedTool === tool.id
                  ? 'bg-[#e94560] text-white'
                  : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
              }`}
              title={tool.label}
            >
              <tool.icon size={18} />
            </button>
          ))}
          <div className="w-px h-6 bg-[#1a1a2e] mx-2" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded transition-colors ${
              showGrid ? 'bg-[#e94560] text-white' : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
            }`}
            title="网格"
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
            className={`p-2 rounded transition-colors ${
              onionSkinEnabled ? 'bg-[#e94560] text-white' : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
            }`}
            title="洋葱皮"
          >
            <Layers size={18} />
          </button>
          <div className="w-px h-6 bg-[#1a1a2e] mx-2" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleReferenceImageClick}
            className={`p-2 rounded transition-colors ${
              referenceImage ? 'text-[#2ecc71] hover:bg-[#1a1a2e]' : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
            }`}
            title="导入参考图"
          >
            <ImagePlus size={18} />
          </button>
          {referenceImage && (
            <>
              <button
                onClick={() => setReferenceImageEnabled(!referenceImageEnabled)}
                className={`p-2 rounded transition-colors ${
                  referenceImageEnabled ? 'bg-[#e94560] text-white' : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
                }`}
                title={referenceImageEnabled ? '隐藏参考图' : '显示参考图'}
              >
                {referenceImageEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button
                onClick={handleClearReferenceImage}
                className="p-2 rounded text-gray-400 hover:bg-[#1a1a2e] hover:text-[#e74c3c] transition-colors"
                title="移除参考图"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGridSize(Math.max(4, gridSize - 4))}
            className="p-1.5 rounded text-gray-400 hover:bg-[#1a1a2e] hover:text-white transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{gridSize}px</span>
          <button
            onClick={() => setGridSize(Math.min(60, gridSize + 4))}
            className="p-1.5 rounded text-gray-400 hover:bg-[#1a1a2e] hover:text-white transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {onionSkinEnabled && (
        <div className="flex items-center gap-4 px-3 py-2 bg-[#1a1a2e] border-b border-[#0f3460] text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-[#3498db]">前帧:</span>
            <button
              onClick={() => setOnionSkinPrevFrames(Math.max(0, onionSkinPrevFrames - 1))}
              className="w-5 h-5 rounded bg-[#0f3460] hover:bg-[#e94560] text-white transition-colors flex items-center justify-center"
            >
              -
            </button>
            <span className="w-4 text-center">{onionSkinPrevFrames}</span>
            <button
              onClick={() => setOnionSkinPrevFrames(Math.min(5, onionSkinPrevFrames + 1))}
              className="w-5 h-5 rounded bg-[#0f3460] hover:bg-[#e94560] text-white transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#e74c3c]">后帧:</span>
            <button
              onClick={() => setOnionSkinNextFrames(Math.max(0, onionSkinNextFrames - 1))}
              className="w-5 h-5 rounded bg-[#0f3460] hover:bg-[#e94560] text-white transition-colors flex items-center justify-center"
            >
              -
            </button>
            <span className="w-4 text-center">{onionSkinNextFrames}</span>
            <button
              onClick={() => setOnionSkinNextFrames(Math.min(5, onionSkinNextFrames + 1))}
              className="w-5 h-5 rounded bg-[#0f3460] hover:bg-[#e94560] text-white transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span>透明度:</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={onionSkinOpacity}
              onChange={(e) => setOnionSkinOpacity(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#0f3460] rounded-lg appearance-none cursor-pointer accent-[#e94560]"
            />
            <span className="w-8 text-center">{Math.round(onionSkinOpacity * 100)}%</span>
          </div>
        </div>
      )}

      {referenceImage && referenceImageEnabled && (
        <div className="flex items-center gap-4 px-3 py-2 bg-[#1a1a2e] border-b border-[#0f3460] text-xs text-gray-300">
          <div className="flex items-center gap-2 flex-1">
            <ImagePlus size={14} className="text-[#2ecc71]" />
            <span className="text-[#2ecc71]">参考图透明度:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={referenceImageOpacity}
              onChange={(e) => setReferenceImageOpacity(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#0f3460] rounded-lg appearance-none cursor-pointer accent-[#2ecc71]"
            />
            <span className="w-8 text-center">{Math.round(referenceImageOpacity * 100)}%</span>
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair shadow-lg"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default PixelCanvas;
