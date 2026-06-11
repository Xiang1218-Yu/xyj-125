import type { Frame, Layer, TweenMode } from '@/types/animation';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

const colorDistance = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number => {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
};

const findClosestColorIndex = (targetHex: string, palette: string[]): number => {
  const targetRgb = hexToRgb(targetHex);
  let minDist = Infinity;
  let closestIndex = -1;

  for (let i = 0; i < palette.length; i++) {
    const dist = colorDistance(targetRgb, hexToRgb(palette[i]));
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
};

const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t);
};

const easeIn = (t: number): number => t * t;
const easeOut = (t: number): number => t * (2 - t);
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeInQuad = (t: number): number => t * t;
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const applyEasing = (t: number, mode: TweenMode): number => {
  switch (mode) {
    case 'linear':
      return t;
    case 'easeIn':
      return easeIn(t);
    case 'easeOut':
      return easeOut(t);
    case 'easeInOut':
      return easeInOut(t);
    case 'easeInQuad':
      return easeInQuad(t);
    case 'easeOutQuad':
      return easeOutQuad(t);
    case 'easeInOutQuad':
      return easeInOutQuad(t);
    default:
      return t;
  }
};

const interpolatePixels = (
  pixels1: number[][],
  pixels2: number[][],
  t: number,
  palette: string[],
  width: number,
  height: number
): number[][] => {
  const result: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx1 = pixels1[y]?.[x] ?? -1;
      const idx2 = pixels2[y]?.[x] ?? -1;

      if (idx1 < 0 && idx2 < 0) {
        row.push(-1);
      } else if (idx1 < 0) {
        row.push(idx2);
      } else if (idx2 < 0) {
        row.push(idx1);
      } else {
        const color1 = palette[idx1] || '#000000';
        const color2 = palette[idx2] || '#000000';
        const interpolatedColor = lerpColor(color1, color2, t);
        const closestIndex = findClosestColorIndex(interpolatedColor, palette);
        row.push(closestIndex);
      }
    }
    result.push(row);
  }

  return result;
};

const interpolateLayer = (layer1: Layer, layer2: Layer, t: number, palette: string[], width: number, height: number): Layer => {
  return {
    id: layer1.id,
    name: layer1.name,
    pixels: interpolatePixels(layer1.pixels, layer2.pixels, t, palette, width, height),
    visible: layer1.visible || layer2.visible,
    locked: false,
    opacity: layer1.opacity + (layer2.opacity - layer1.opacity) * t,
  };
};

const generateId = () => Math.random().toString(36).substring(2, 11);

export const generateTweenFrames = (
  frame1: Frame,
  frame2: Frame,
  steps: number,
  mode: TweenMode,
  palette: string[],
  width: number,
  height: number
): Frame[] => {
  if (steps <= 0) return [];

  const tweenFrames: Frame[] = [];

  for (let i = 1; i <= steps; i++) {
    const rawT = i / (steps + 1);
    const t = applyEasing(rawT, mode);

    const layers: Layer[] = [];
    const maxLayers = Math.max(frame1.layers.length, frame2.layers.length);

    for (let li = 0; li < maxLayers; li++) {
      const layer1 = frame1.layers[li] || frame1.layers[frame1.layers.length - 1];
      const layer2 = frame2.layers[li] || frame2.layers[frame2.layers.length - 1];

      if (layer1 && layer2) {
        layers.push(interpolateLayer(layer1, layer2, t, palette, width, height));
      }
    }

    tweenFrames.push({
      id: generateId(),
      name: `${frame1.name}_tween_${i}`,
      layers,
      delay: Math.round((frame1.delay + frame2.delay) / 2),
    });
  }

  return tweenFrames;
};

export const buildTweenPlaybackFrames = (
  frames: Frame[],
  tweenFrameIds: string[],
  tweenSteps: number,
  tweenMode: TweenMode,
  palette: string[],
  width: number,
  height: number
): { frames: Frame[]; originalIndices: number[] } => {
  const resultFrames: Frame[] = [];
  const originalIndices: number[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    resultFrames.push(frame);
    originalIndices.push(i);

    if (i < frames.length - 1 && tweenFrameIds.includes(frame.id)) {
      const nextFrame = frames[i + 1];
      const tweenFrames = generateTweenFrames(frame, nextFrame, tweenSteps, tweenMode, palette, width, height);
      for (const tf of tweenFrames) {
        resultFrames.push(tf);
        originalIndices.push(i);
      }
    }
  }

  return { frames: resultFrames, originalIndices };
};

export const tweenModeLabels: Record<TweenMode, string> = {
  linear: '线性',
  easeIn: '缓入',
  easeOut: '缓出',
  easeInOut: '缓入缓出',
  easeInQuad: '二次缓入',
  easeOutQuad: '二次缓出',
  easeInOutQuad: '二次缓入缓出',
};
