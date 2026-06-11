import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Sparkles, Play, Pause, RefreshCw, Settings2, Zap, Flame, Wind, Star, CloudRain, Bomb } from 'lucide-react';
import { DEFAULT_PARTICLE_CONFIGS } from '@/types/particle';
import type { ParticleType, ParticleConfig } from '@/types/particle';
import { generateParticleFrames } from '@/utils/particleEngine';

import type { LucideIcon } from 'lucide-react';

const particleTypeOptions: { id: ParticleType; name: string; icon: LucideIcon; color: string }[] = [
  { id: 'explosion', name: '爆炸', icon: Bomb, color: '#e94560' },
  { id: 'fire', name: '火焰', icon: Flame, color: '#f39c12' },
  { id: 'smoke', name: '烟雾', icon: Wind, color: '#95a5a6' },
  { id: 'magic', name: '魔法光环', icon: Sparkles, color: '#9b59b6' },
  { id: 'sparkle', name: '闪光', icon: Star, color: '#f1c40f' },
  { id: 'rain', name: '雨滴', icon: CloudRain, color: '#3498db' },
];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-300 font-mono">{typeof value === 'number' && step < 1 ? value.toFixed(2) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-[#0f3460] rounded-lg appearance-none cursor-pointer accent-[#e94560]"
    />
  </div>
);

const ParticleGenerator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const [particleType, setParticleType] = useState<ParticleType>('explosion');
  const [frameCount, setFrameCount] = useState(20);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionName, setActionName] = useState('');
  const [insertMode, setInsertMode] = useState<'newAction' | 'currentAction'>('newAction');

  const {
    character,
    pixelColors,
    generateParticleAnimation,
    currentActionId,
  } = usePixelEditorStore();

  const defaultConfig = DEFAULT_PARTICLE_CONFIGS[particleType];

  const [params, setParams] = useState(() => ({
    particleCount: defaultConfig.particleCount,
    emitX: defaultConfig.emitX,
    emitY: defaultConfig.emitY,
    emitRadius: defaultConfig.emitRadius,
    minSpeed: defaultConfig.minSpeed,
    maxSpeed: defaultConfig.maxSpeed,
    minLife: defaultConfig.minLife,
    maxLife: defaultConfig.maxLife,
    minSize: defaultConfig.minSize,
    maxSize: defaultConfig.maxSize,
    gravity: defaultConfig.gravity,
    friction: defaultConfig.friction,
    spread: defaultConfig.spread,
    emissionRate: defaultConfig.emissionRate,
  }));

  useEffect(() => {
    const def = DEFAULT_PARTICLE_CONFIGS[particleType];
    setParams({
      particleCount: def.particleCount,
      emitX: def.emitX,
      emitY: def.emitY,
      emitRadius: def.emitRadius,
      minSpeed: def.minSpeed,
      maxSpeed: def.maxSpeed,
      minLife: def.minLife,
      maxLife: def.maxLife,
      minSize: def.minSize,
      maxSize: def.maxSize,
      gravity: def.gravity,
      friction: def.friction,
      spread: def.spread,
      emissionRate: def.emissionRate,
    });
    setCurrentFrameIndex(0);
  }, [particleType]);

  const previewFrames = useMemo(() => {
    const config: ParticleConfig = {
      type: particleType,
      width: character.width,
      height: character.height,
      frameCount,
      particleCount: params.particleCount,
      colors: defaultConfig.colors,
      emitX: params.emitX,
      emitY: params.emitY,
      emitRadius: params.emitRadius,
      minSpeed: params.minSpeed,
      maxSpeed: params.maxSpeed,
      minLife: params.minLife,
      maxLife: params.maxLife,
      minSize: params.minSize,
      maxSize: params.maxSize,
      gravity: params.gravity,
      friction: params.friction,
      direction: defaultConfig.direction,
      spread: params.spread,
      emissionRate: params.emissionRate,
    };
    return generateParticleFrames(config);
  }, [particleType, frameCount, params, character.width, character.height, defaultConfig]);

  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas || previewFrames.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = Math.min(180 / character.width, 180 / character.height);
      const w = character.width * scale;
      const h = character.height * scale;

      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(0, 0, w, h);

      const frame = previewFrames[frameIndex];
      if (!frame) return;

      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = frame.pixels[y][x];
          if (colorIndex >= 0 && colorIndex < pixelColors.length) {
            ctx.fillStyle = pixelColors[colorIndex];
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
    },
    [previewFrames, character.width, character.height, pixelColors]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (previewFrames.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const frameDelay = 1000 / 12;
      elapsedRef.current += deltaTime;

      if (elapsedRef.current >= frameDelay) {
        elapsedRef.current = 0;
        setCurrentFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= previewFrames.length) {
            return 0;
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [previewFrames.length]
  );

  useEffect(() => {
    if (isPlaying && previewFrames.length > 0) {
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
  }, [isPlaying, previewFrames.length, animate]);

  useEffect(() => {
    if (previewFrames.length > 0) {
      drawFrame(currentFrameIndex);
    }
  }, [currentFrameIndex, drawFrame, previewFrames.length]);

  const handleGenerate = () => {
    const success = generateParticleAnimation({
      type: particleType,
      frameCount,
      actionName: actionName || particleType,
      insertMode,
      particleCount: params.particleCount,
      emitX: params.emitX,
      emitY: params.emitY,
      emitRadius: params.emitRadius,
      minSpeed: params.minSpeed,
      maxSpeed: params.maxSpeed,
      minLife: params.minLife,
      maxLife: params.maxLife,
      minSize: params.minSize,
      maxSize: params.maxSize,
      gravity: params.gravity,
      friction: params.friction,
      spread: params.spread,
      emissionRate: params.emissionRate,
    });
    if (success) {
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    const def = DEFAULT_PARTICLE_CONFIGS[particleType];
    setParams({
      particleCount: def.particleCount,
      emitX: def.emitX,
      emitY: def.emitY,
      emitRadius: def.emitRadius,
      minSpeed: def.minSpeed,
      maxSpeed: def.maxSpeed,
      minLife: def.minLife,
      maxLife: def.maxLife,
      minSize: def.minSize,
      maxSize: def.maxSize,
      gravity: def.gravity,
      friction: def.friction,
      spread: def.spread,
      emissionRate: def.emissionRate,
    });
  };

  const updateParam = (key: keyof typeof params, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#e94560]" />
          <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">粒子生成器</h3>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {particleTypeOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setParticleType(opt.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded border transition-all ${
              particleType === opt.id
                ? 'border-[#e94560] bg-[#e94560]/10'
                : 'border-[#0f3460] hover:border-gray-500 hover:bg-[#0f3460]/30'
            }`}
          >
            <opt.icon size={16} style={{ color: opt.color }} />
            <span className="text-[10px] text-gray-400">{opt.name}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center bg-[#0a0a14] rounded border border-[#0f3460] p-2 mb-3">
        <canvas
          ref={canvasRef}
          className="shadow-inner"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 rounded-full bg-[#e94560] text-white hover:bg-[#d63d55] transition-colors"
          title={isPlaying ? '暂停预览' : '播放预览'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded text-gray-400 hover:bg-[#0f3460] hover:text-white transition-colors"
          title="重置参数"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <Slider
          label="帧数"
          value={frameCount}
          min={5}
          max={60}
          step={1}
          onChange={setFrameCount}
        />
        <Slider
          label="粒子数量"
          value={params.particleCount}
          min={5}
          max={100}
          step={1}
          onChange={(v) => updateParam('particleCount', v)}
        />
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors border border-dashed border-[#0f3460] rounded mb-3"
      >
        <Settings2 size={12} />
        {showAdvanced ? '收起高级参数' : '展开高级参数'}
      </button>

      {showAdvanced && (
        <div className="space-y-2 mb-3 p-2 bg-[#0f3460]/30 rounded">
          <p className="text-xs text-gray-500 font-medium">发射点</p>
          <Slider
            label="X 位置"
            value={params.emitX}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateParam('emitX', v)}
          />
          <Slider
            label="Y 位置"
            value={params.emitY}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateParam('emitY', v)}
          />
          <Slider
            label="发射半径"
            value={params.emitRadius}
            min={0}
            max={0.5}
            step={0.02}
            onChange={(v) => updateParam('emitRadius', v)}
          />

          <div className="h-px bg-[#0f3460] my-2" />

          <p className="text-xs text-gray-500 font-medium">速度</p>
          <Slider
            label="最小速度"
            value={params.minSpeed}
            min={0.1}
            max={8}
            step={0.1}
            onChange={(v) => updateParam('minSpeed', v)}
          />
          <Slider
            label="最大速度"
            value={params.maxSpeed}
            min={0.5}
            max={10}
            step={0.1}
            onChange={(v) => updateParam('maxSpeed', v)}
          />

          <div className="h-px bg-[#0f3460] my-2" />

          <p className="text-xs text-gray-500 font-medium">生命周期</p>
          <Slider
            label="最小生命"
            value={params.minLife}
            min={2}
            max={60}
            step={1}
            onChange={(v) => updateParam('minLife', v)}
          />
          <Slider
            label="最大生命"
            value={params.maxLife}
            min={5}
            max={80}
            step={1}
            onChange={(v) => updateParam('maxLife', v)}
          />

          <div className="h-px bg-[#0f3460] my-2" />

          <p className="text-xs text-gray-500 font-medium">物理</p>
          <Slider
            label="重力"
            value={params.gravity}
            min={-0.5}
            max={0.5}
            step={0.01}
            onChange={(v) => updateParam('gravity', v)}
          />
          <Slider
            label="摩擦"
            value={params.friction}
            min={0.8}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('friction', v)}
          />
          <Slider
            label="扩散角度"
            value={params.spread}
            min={0}
            max={Math.PI * 2}
            step={0.1}
            onChange={(v) => updateParam('spread', v)}
          />

          <div className="h-px bg-[#0f3460] my-2" />

          <p className="text-xs text-gray-500 font-medium">大小 & 发射率</p>
          <Slider
            label="最小尺寸"
            value={params.minSize}
            min={1}
            max={5}
            step={1}
            onChange={(v) => updateParam('minSize', v)}
          />
          <Slider
            label="最大尺寸"
            value={params.maxSize}
            min={1}
            max={6}
            step={1}
            onChange={(v) => updateParam('maxSize', v)}
          />
          <Slider
            label="发射速率"
            value={params.emissionRate}
            min={0.5}
            max={8}
            step={0.5}
            onChange={(v) => updateParam('emissionRate', v)}
          />
        </div>
      )}

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-16">动作名</span>
          <input
            type="text"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
            placeholder={particleType}
            className="flex-1 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-16">插入方式</span>
          <div className="flex gap-1">
            <button
              onClick={() => setInsertMode('newAction')}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                insertMode === 'newAction'
                  ? 'border-[#e94560] bg-[#e94560]/20 text-[#e94560]'
                  : 'border-[#0f3460] text-gray-400 hover:border-gray-500'
              }`}
            >
              新建动作
            </button>
            <button
              onClick={() => setInsertMode('currentAction')}
              disabled={!currentActionId}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                insertMode === 'currentAction'
                  ? 'border-[#2ecc71] bg-[#2ecc71]/20 text-[#2ecc71]'
                  : 'border-[#0f3460] text-gray-400 hover:border-gray-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              追加到当前
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-2 px-4 bg-[#e94560] text-white rounded text-sm font-medium hover:bg-[#d63d55] transition-colors flex items-center justify-center gap-2"
      >
        <Zap size={14} />
        生成粒子动画 ({frameCount} 帧)
      </button>
    </div>
  );
};

export default ParticleGenerator;
