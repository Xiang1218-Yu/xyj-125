import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Download, Grid3X3, FileJson, Image, Copy, Check, Film } from 'lucide-react';
import { buildTweenPlaybackFrames } from '@/utils/frameTweener';
import { encodeGif, type GifFrame } from '@/utils/gifEncoder';
import type { Frame } from '@/types/animation';

const SpriteSheetGenerator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(4);
  const [exportScale, setExportScale] = useState(1);
  const [gifScale, setGifScale] = useState(4);
  const [showAllActions, setShowAllActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [columns, setColumns] = useState(0);
  const [gifExporting, setGifExporting] = useState(false);
  const [gifWithTransparency, setGifWithTransparency] = useState(false);

  const {
    character,
    currentActionId,
    generateSpriteSheet,
    pixelColors,
    tweenEnabled,
    tweenMode,
    tweenSteps,
    tweenFrameIds,
    fps,
  } = usePixelEditorStore();

  const currentAction = character.actions.find((a) => a.id === currentActionId);

  const generateFullSpriteSheet = useCallback(
    (scaleFactor: number, useAllActions: boolean, cols: number) => {
      const actions = useAllActions ? character.actions : character.actions.filter((a) => a.id === currentActionId);
      if (actions.length === 0) return null;

      const allFrames: { action: string; frame: any }[] = [];
      for (const action of actions) {
        for (const frame of action.frames) {
          allFrames.push({ action: action.name, frame });
        }
      }

      if (allFrames.length === 0) return null;

      const numCols = cols > 0 ? cols : allFrames.length;
      const numRows = Math.ceil(allFrames.length / numCols);

      const canvas = document.createElement('canvas');
      canvas.width = character.width * scaleFactor * numCols;
      canvas.height = character.height * scaleFactor * numRows;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = false;

      for (let i = 0; i < allFrames.length; i++) {
        const { frame } = allFrames[i];
        const col = i % numCols;
        const row = Math.floor(i / numCols);
        const offsetX = col * character.width * scaleFactor;
        const offsetY = row * character.height * scaleFactor;

        for (const layer of frame.layers) {
          if (!layer.visible) continue;
          for (let y = 0; y < character.height; y++) {
            for (let x = 0; x < character.width; x++) {
              const colorIndex = layer.pixels[y][x];
              if (colorIndex >= 0 && colorIndex < pixelColors.length) {
                ctx.globalAlpha = layer.opacity;
                ctx.fillStyle = pixelColors[colorIndex];
                ctx.fillRect(
                  offsetX + x * scaleFactor,
                  offsetY + y * scaleFactor,
                  scaleFactor,
                  scaleFactor
                );
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      }

      return { canvas, frameData: allFrames, numCols, numRows };
    },
    [character, currentActionId, pixelColors]
  );

  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = generateFullSpriteSheet(scale, showAllActions, columns);
    if (!result) {
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('无帧数据', 50, 30);
      }
      return;
    }

    canvas.width = result.canvas.width;
    canvas.height = result.canvas.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(result.canvas, 0, 0);
    }
  }, [generateFullSpriteSheet, scale, showAllActions, columns]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview, character, currentActionId, showAllActions, scale, columns, pixelColors]);

  const handleExportPNG = () => {
    const result = generateFullSpriteSheet(exportScale, showAllActions, columns);
    if (!result) return;

    const link = document.createElement('a');
    link.download = `${character.name}_spritesheet.png`;
    link.href = result.canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportJSON = () => {
    const actions = showAllActions ? character.actions : character.actions.filter((a) => a.id === currentActionId);
    if (actions.length === 0) return;

    const spriteData = {
      meta: {
        image: `${character.name}_spritesheet.png`,
        size: {
          w: character.width,
          h: character.height,
        },
        scale: exportScale,
      },
      animations: actions.map((action) => ({
        name: action.name,
        loop: action.loop,
        frameCount: action.frames.length,
        frames: action.frames.map((frame, idx) => ({
          name: frame.name,
          delay: frame.delay,
          index: idx,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(spriteData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `${character.name}_spritesheet.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportBoth = () => {
    handleExportPNG();
    setTimeout(() => handleExportJSON(), 300);
  };

  const copyFrameDataToClipboard = async () => {
    const actions = showAllActions ? character.actions : character.actions.filter((a) => a.id === currentActionId);
    const data = actions.map((a) => ({
      action: a.name,
      frames: a.frames.length,
      loop: a.loop,
    }));
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const drawFrameToCanvas = useCallback(
    (frame: Frame, scaleFactor: number, withTransparency: boolean): ImageData => {
      const canvas = document.createElement('canvas');
      canvas.width = character.width * scaleFactor;
      canvas.height = character.height * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法获取 canvas 上下文');

      ctx.imageSmoothingEnabled = false;

      if (!withTransparency) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (const layer of frame.layers) {
        if (!layer.visible) continue;
        for (let y = 0; y < character.height; y++) {
          for (let x = 0; x < character.width; x++) {
            const colorIndex = layer.pixels[y][x];
            if (colorIndex >= 0 && colorIndex < pixelColors.length) {
              ctx.globalAlpha = layer.opacity;
              ctx.fillStyle = pixelColors[colorIndex];
              ctx.fillRect(
                x * scaleFactor,
                y * scaleFactor,
                scaleFactor,
                scaleFactor
              );
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
    [character, pixelColors]
  );

  const getPlaybackFramesForAction = useCallback(
    (action: { frames: Frame[]; loop: boolean }): { frames: Frame[]; delays: number[] } => {
      const originalFrames = action.frames;
      const defaultDelay = Math.round(1000 / fps);

      if (!tweenEnabled || originalFrames.length < 2) {
        return {
          frames: originalFrames,
          delays: originalFrames.map((f) => f.delay || defaultDelay),
        };
      }

      const playbackData = buildTweenPlaybackFrames(
        originalFrames,
        tweenFrameIds,
        tweenSteps,
        tweenMode,
        pixelColors,
        character.width,
        character.height
      );

      return {
        frames: playbackData.frames,
        delays: playbackData.frames.map((f, i) => {
          const originalIndex = playbackData.originalIndices[i];
          const originalFrame = originalFrames[originalIndex];
          return originalFrame?.delay || defaultDelay;
        }),
      };
    },
    [tweenEnabled, tweenFrameIds, tweenSteps, tweenMode, pixelColors, character.width, character.height, fps]
  );

  const handleExportGIF = useCallback(async () => {
    const actions = showAllActions ? character.actions : character.actions.filter((a) => a.id === currentActionId);
    if (actions.length === 0) return;

    setGifExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const gifFrames: GifFrame[] = [];
      const scaleFactor = gifScale;

      for (const action of actions) {
        const { frames, delays } = getPlaybackFramesForAction(action);
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          const imageData = drawFrameToCanvas(frame, scaleFactor, gifWithTransparency);
          gifFrames.push({
            imageData,
            delay: delays[i],
          });
        }
      }

      if (gifFrames.length === 0) {
        throw new Error('没有可导出的帧');
      }

      const width = character.width * scaleFactor;
      const height = character.height * scaleFactor;

      const blob = encodeGif(width, height, gifFrames, gifWithTransparency);

      const link = document.createElement('a');
      const actionName = showAllActions ? 'all' : (currentAction?.name || 'animation');
      link.download = `${character.name}_${actionName}.gif`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('GIF 导出失败:', err);
      alert('GIF 导出失败，请重试');
    } finally {
      setGifExporting(false);
    }
  }, [showAllActions, character, currentActionId, currentAction, gifScale, gifWithTransparency, getPlaybackFramesForAction, drawFrameToCanvas]);

  const totalFrames = showAllActions
    ? character.actions.reduce((sum, a) => sum + a.frames.length, 0)
    : currentAction?.frames.length || 0;

  const gifFrameCount = useMemo(() => {
    const actions = showAllActions ? character.actions : character.actions.filter((a) => a.id === currentActionId);
    let count = 0;
    for (const action of actions) {
      const { frames } = getPlaybackFramesForAction(action);
      count += frames.length;
    }
    return count;
  }, [showAllActions, character, currentActionId, getPlaybackFramesForAction]);

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">SpriteSheet 生成</h3>
        <button
          onClick={() => setShowAllActions(!showAllActions)}
          className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
            showAllActions
              ? 'bg-[#e94560] text-white'
              : 'bg-[#0f3460] text-gray-400 hover:text-white'
          }`}
        >
          <Grid3X3 size={12} />
          {showAllActions ? '全部动作' : '当前动作'}
        </button>
      </div>

      <div className="bg-[#1a1a2e] rounded border border-[#0f3460] p-3 mb-3 overflow-auto max-h-[200px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">预览缩放:</span>
          <input
            type="range"
            min={1}
            max={8}
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value))}
            className="flex-1 accent-[#e94560]"
          />
          <span className="text-xs text-gray-400 w-8 text-right">{scale}x</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">导出缩放:</span>
          <input
            type="range"
            min={1}
            max={16}
            value={exportScale}
            onChange={(e) => setExportScale(parseInt(e.target.value))}
            className="flex-1 accent-[#e94560]"
          />
          <span className="text-xs text-gray-400 w-8 text-right">{exportScale}x</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-16">列数:</span>
          <input
            type="number"
            min={0}
            value={columns}
            onChange={(e) => setColumns(Math.max(0, parseInt(e.target.value) || 0))}
            className="flex-1 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
          />
          <span className="text-[10px] text-gray-600">0=自动</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3 flex justify-between">
        <span>帧数: {totalFrames}</span>
        <span>
          尺寸: {character.width * exportScale} × {character.height * exportScale}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportPNG}
          disabled={totalFrames === 0}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#3498db] text-white rounded text-sm hover:bg-[#2980b9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Image size={14} />
          PNG
        </button>
        <button
          onClick={handleExportJSON}
          disabled={totalFrames === 0}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#2ecc71] text-white rounded text-sm hover:bg-[#27ae60] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileJson size={14} />
          JSON
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={handleExportBoth}
          disabled={totalFrames === 0}
          className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#e94560] text-white rounded text-sm hover:bg-[#d63d55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          导出全部 (PNG + JSON)
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-[#0f3460]">
        <div className="flex items-center gap-2 mb-3">
          <Film size={14} className="text-[#f39c12]" />
          <h4 className="text-sm font-medium text-gray-300 pixel-font text-xs">GIF 动画导出</h4>
          {tweenEnabled && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#9b59b6]/20 text-[#9b59b6] rounded">含补间</span>
          )}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">GIF缩放:</span>
            <input
              type="range"
              min={1}
              max={16}
              value={gifScale}
              onChange={(e) => setGifScale(parseInt(e.target.value))}
              className="flex-1 accent-[#f39c12]"
            />
            <span className="text-xs text-gray-400 w-8 text-right">{gifScale}x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">透明背景:</span>
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={gifWithTransparency}
                onChange={(e) => setGifWithTransparency(e.target.checked)}
                className="w-4 h-4 accent-[#f39c12]"
              />
              <span className="text-xs text-gray-400">启用透明背景</span>
            </label>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-3 flex justify-between">
          <span>GIF帧数: {gifFrameCount}</span>
          <span>
            尺寸: {character.width * gifScale} × {character.height * gifScale}
          </span>
        </div>

        <button
          onClick={handleExportGIF}
          disabled={gifFrameCount === 0 || gifExporting}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#f39c12] text-white rounded text-sm hover:bg-[#e67e22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Film size={14} />
          {gifExporting ? '导出中...' : '导出 GIF 动画'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={copyFrameDataToClipboard}
          className="col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#0f3460] text-gray-300 rounded text-xs hover:bg-[#1a1a2e] transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已复制!' : '复制帧信息'}
        </button>
      </div>
    </div>
  );
};

export default SpriteSheetGenerator;
