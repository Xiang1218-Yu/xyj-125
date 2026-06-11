import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Maximize2, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';
import { buildTweenPlaybackFrames } from '@/utils/frameTweener';
import type { Frame } from '@/types/animation';

const AnimationPreview = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState(4);

  const {
    character,
    currentActionId,
    isPlaying,
    setIsPlaying,
    fps,
    setFps,
    pixelColors,
    setCurrentFrame,
    tweenEnabled,
    tweenMode,
    tweenSteps,
    tweenFrameIds,
  } = usePixelEditorStore();

  const action = character.actions.find((a) => a.id === currentActionId);

  const originalFrames = useMemo(() => action?.frames || [], [action]);

  const playbackData = useMemo(() => {
    if (!tweenEnabled || originalFrames.length < 2) {
      return {
        frames: originalFrames,
        originalIndices: originalFrames.map((_, i) => i),
      };
    }
    return buildTweenPlaybackFrames(
      originalFrames,
      tweenFrameIds,
      tweenSteps,
      tweenMode,
      pixelColors,
      character.width,
      character.height
    );
  }, [tweenEnabled, originalFrames, tweenFrameIds, tweenSteps, tweenMode, pixelColors, character.width, character.height]);

  const playbackFrames = playbackData.frames;
  const originalIndices = playbackData.originalIndices;

  const drawFrame = useCallback(
    (frame: Frame, scale: number, ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);

      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = '#1a1a2e';
          } else {
            ctx.fillStyle = '#16213e';
          }
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }

      for (const layer of frame.layers) {
        if (!layer.visible) continue;
        for (let y = 0; y < character.height; y++) {
          for (let x = 0; x < character.width; x++) {
            const colorIndex = layer.pixels[y][x];
            if (colorIndex >= 0 && colorIndex < pixelColors.length) {
              ctx.globalAlpha = layer.opacity;
              ctx.fillStyle = pixelColors[colorIndex];
              ctx.fillRect(x * scale, y * scale, scale, scale);
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    },
    [character, pixelColors]
  );

  const drawFrameAtIndex = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frame = playbackFrames[index];
      if (!frame) return;

      const scale = previewScale;
      const w = character.width * scale;
      const h = character.height * scale;

      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;

      drawFrame(frame, scale, ctx, w, h);
    },
    [playbackFrames, previewScale, character, drawFrame]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (playbackFrames.length === 0 || !action) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const frameDelay = 1000 / fps;
      elapsedRef.current += deltaTime;

      if (elapsedRef.current >= frameDelay) {
        elapsedRef.current = 0;
        setCurrentFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= playbackFrames.length) {
            if (action.loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [playbackFrames, fps, action, setIsPlaying]
  );

  useEffect(() => {
    if (isPlaying && playbackFrames.length > 0) {
      lastTimeRef.current = 0;
      elapsedRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackFrames.length, animate]);

  useEffect(() => {
    if (currentFrameIndex < playbackFrames.length) {
      drawFrameAtIndex(currentFrameIndex);
    }
  }, [currentFrameIndex, drawFrameAtIndex, playbackFrames.length]);

  useEffect(() => {
    if (!isPlaying && playbackFrames.length > 0) {
      const idx = Math.min(currentFrameIndex, playbackFrames.length - 1);
      drawFrameAtIndex(idx);
    }
  }, [playbackFrames, isPlaying, currentFrameIndex, drawFrameAtIndex]);

  useEffect(() => {
    setCurrentFrameIndex(0);
  }, [currentActionId]);

  const handlePlayPause = () => {
    if (playbackFrames.length === 0) return;
    if (!isPlaying) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevFrame = () => {
    if (isPlaying) setIsPlaying(false);
    setCurrentFrameIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? playbackFrames.length - 1 : next;
    });
  };

  const handleNextFrame = () => {
    if (isPlaying) setIsPlaying(false);
    setCurrentFrameIndex((prev) => (prev + 1) % playbackFrames.length);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const handleCanvasClick = () => {
    const origIdx = originalIndices[currentFrameIndex];
    if (origIdx !== undefined && originalFrames[origIdx]) {
      setCurrentFrame(originalFrames[origIdx].id);
    }
  };

  const currentOriginalIndex = originalIndices[currentFrameIndex];

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">动画预览</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreviewScale(Math.max(1, previewScale - 1))}
            className="p-1.5 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-gray-500 w-8 text-center">{previewScale}x</span>
          <button
            onClick={() => setPreviewScale(Math.min(16, previewScale + 1))}
            className="p-1.5 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {tweenEnabled && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-[#9b59b6]/20 rounded border border-[#9b59b6]/30">
          <Sparkles size={12} className="text-[#9b59b6]" />
          <span className="text-[10px] text-[#9b59b6]">帧过渡已启用</span>
          <span className="text-[10px] text-gray-500 ml-auto">
            {playbackFrames.length} 帧 (含过渡)
          </span>
        </div>
      )}

      <div
        className="flex items-center justify-center bg-[#1a1a2e] rounded border border-[#0f3460] p-4 mb-3"
        style={{ minHeight: character.height * previewScale + 32 }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-pointer shadow-lg"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={handleReset}
          className="p-2 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          title="重置"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={handlePrevFrame}
          className="p-2 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          title="上一帧"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={handlePlayPause}
          disabled={playbackFrames.length === 0}
          className="p-3 rounded-full bg-[#e94560] text-white hover:bg-[#d63d55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={handleNextFrame}
          className="p-2 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          title="下一帧"
        >
          <SkipForward size={16} />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          title="全屏"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">FPS:</span>
          <input
            type="number"
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, parseInt(e.target.value) || 8)))}
            min={1}
            max={60}
            className="w-14 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
          />
        </div>
        <div className="text-xs text-gray-500">
          {playbackFrames.length > 0 ? (
            <span>
              {currentFrameIndex + 1} / {playbackFrames.length}
              {tweenEnabled && currentOriginalIndex !== undefined && (
                <span className="text-gray-600 ml-1">(原帧 #{currentOriginalIndex + 1})</span>
              )}
            </span>
          ) : (
            '无帧'
          )}
        </div>
      </div>

      {originalFrames.length > 0 && (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {originalFrames.map((frame, index) => (
            <button
              key={frame.id}
              onClick={() => {
                if (isPlaying) setIsPlaying(false);
                const playbackIdx = originalIndices.indexOf(index);
                if (playbackIdx >= 0) {
                  setCurrentFrameIndex(playbackIdx);
                }
              }}
              className={`flex-shrink-0 w-8 h-8 rounded border transition-colors relative ${
                currentOriginalIndex === index
                  ? 'border-[#e94560] bg-[#e94560]/20'
                  : tweenFrameIds.includes(frame.id) && tweenEnabled
                  ? 'border-[#9b59b6] bg-[#9b59b6]/10'
                  : 'border-[#0f3460] hover:border-gray-500'
              }`}
              title={frame.name}
            >
              <span className="text-[10px] text-gray-400">{index + 1}</span>
              {tweenFrameIds.includes(frame.id) && tweenEnabled && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#9b59b6] rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnimationPreview;
