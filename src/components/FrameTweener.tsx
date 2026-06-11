import { useRef, useEffect } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Sparkles, ChevronRight, Check, Layers } from 'lucide-react';
import { tweenModeLabels } from '@/utils/frameTweener';
import type { TweenMode } from '@/types/animation';

const TweenFrameThumbnail = ({ frameId, pixelColors, size = 32 }: { frameId: string; pixelColors: string[]; size?: number }) => {
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
      className="border border-[#0f3460] rounded bg-[#1a1a2e]"
      style={{ width: size, height: size }}
    />
  );
};

const FrameTweener = () => {
  const {
    character,
    currentActionId,
    tweenEnabled,
    tweenMode,
    tweenSteps,
    tweenFrameIds,
    setTweenEnabled,
    setTweenMode,
    setTweenSteps,
    toggleTweenFrame,
    setTweenFrameIds,
    clearTweenFrames,
  } = usePixelEditorStore();

  const action = character.actions.find((a) => a.id === currentActionId);
  const frames = action?.frames || [];
  const pixelColors = usePixelEditorStore.getState().pixelColors;

  const tweenModeOptions: TweenMode[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'];

  const handleSelectAll = () => {
    const allIds = frames.slice(0, -1).map((f) => f.id);
    setTweenFrameIds(allIds);
  };

  const handleClearAll = () => {
    clearTweenFrames();
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#9b59b6]" />
          <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">帧过渡器</h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tweenEnabled}
            onChange={(e) => setTweenEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[#0f3460] rounded-full peer peer-checked:bg-[#9b59b6] transition-colors">
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${tweenEnabled ? 'translate-x-4' : ''}`} />
          </div>
        </label>
      </div>

      <div className={`space-y-3 transition-opacity ${tweenEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">插值模式</label>
          <select
            value={tweenMode}
            onChange={(e) => setTweenMode(e.target.value as TweenMode)}
            className="w-full px-2 py-1.5 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#9b59b6]"
          >
            {tweenModeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {tweenModeLabels[mode]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400">过渡帧数</label>
            <span className="text-xs text-[#9b59b6] font-medium">{tweenSteps} 帧</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={tweenSteps}
            onChange={(e) => setTweenSteps(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#0f3460] rounded-lg appearance-none cursor-pointer accent-[#9b59b6]"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="border-t border-[#0f3460] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">选择过渡帧</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSelectAll}
                className="px-2 py-0.5 text-[10px] bg-[#0f3460] text-gray-400 rounded hover:bg-[#1a1a2e] hover:text-gray-200 transition-colors"
              >
                全选
              </button>
              <button
                onClick={handleClearAll}
                className="px-2 py-0.5 text-[10px] bg-[#0f3460] text-gray-400 rounded hover:bg-[#1a1a2e] hover:text-gray-200 transition-colors"
              >
                清空
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mb-2">
            点击帧切换该帧到下一帧之间是否启用过渡动画
          </p>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {frames.length < 2 && (
              <div className="text-center text-gray-500 text-xs py-4">
                至少需要 2 帧才能设置过渡
              </div>
            )}
            {frames.map((frame, index) => {
              const isLast = index === frames.length - 1;
              const hasTween = tweenFrameIds.includes(frame.id);

              return (
                <div key={frame.id} className="flex items-center gap-2">
                  <button
                    onClick={() => !isLast && toggleTweenFrame(frame.id)}
                    disabled={isLast}
                    className={`flex-1 flex items-center gap-2 p-1.5 rounded transition-all ${
                      isLast
                        ? 'opacity-50 cursor-not-allowed'
                        : hasTween
                        ? 'bg-[#9b59b6]/20 border border-[#9b59b6]'
                        : 'border border-transparent hover:bg-[#0f3460] hover:border-[#0f3460] cursor-pointer'
                    }`}
                  >
                    <div className="relative">
                      <TweenFrameThumbnail frameId={frame.id} pixelColors={pixelColors} size={28} />
                      {!isLast && hasTween && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#9b59b6] rounded-full flex items-center justify-center">
                          <Check size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs text-gray-300 truncate font-medium">{frame.name}</div>
                      <div className="text-[10px] text-gray-500">#{index + 1}</div>
                    </div>
                    {!isLast && (
                      <div className={`flex items-center gap-1 ${hasTween ? 'text-[#9b59b6]' : 'text-gray-600'}`}>
                        <ChevronRight size={12} />
                        <span className="text-[10px]">
                          {hasTween ? '过渡' : '跳转'}
                        </span>
                      </div>
                    )}
                    {isLast && (
                      <span className="text-[10px] text-gray-600">最后一帧</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 py-2 bg-[#1a1a2e] rounded border border-[#0f3460]">
          <Layers size={12} className="text-[#9b59b6]" />
          <span className="text-[10px] text-gray-400">
            已选 <span className="text-[#9b59b6] font-medium">{tweenFrameIds.length}</span> 个过渡
          </span>
          <span className="text-[10px] text-gray-500 ml-auto">
            增加 {tweenFrameIds.length * tweenSteps} 帧
          </span>
        </div>
      </div>
    </div>
  );
};

export default FrameTweener;
