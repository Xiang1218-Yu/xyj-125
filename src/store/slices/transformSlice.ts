import type { StateCreator } from 'zustand';
import type { PixelEditorState, PixelEditorActions } from '@/types/animation';
import {
  createEmptyPixels,
  immutableUpdateFrame,
  immutableUpdateAction,
  clonePixels,
} from '../utils';

export type TransformSlice = Pick<
  PixelEditorActions,
  | 'flipFrameHorizontal'
  | 'flipFrameVertical'
  | 'rotateFrame'
  | 'shiftFrame'
  | 'batchFlipFramesHorizontal'
  | 'batchFlipFramesVertical'
  | 'batchRotateFrames'
  | 'batchShiftFrames'
>;

export type TransformSliceCreator = StateCreator<
  any,
  [],
  [],
  TransformSlice
>;

const rotatePixels90 = (pixels: number[][], w: number, h: number): number[][] => {
  const rotated = createEmptyPixels(w, h);
  const srcW = w;
  const srcH = h;
  const temp: number[][] = Array(srcW).fill(null).map(() => Array(srcH).fill(-1));
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      temp[x][srcH - 1 - y] = pixels[y][x];
    }
  }
  const offsetX = Math.floor((w - srcH) / 2);
  const offsetY = Math.floor((h - srcW) / 2);
  for (let y = 0; y < srcW; y++) {
    for (let x = 0; x < srcH; x++) {
      const dstY = y + offsetY;
      const dstX = x + offsetX;
      if (dstY >= 0 && dstY < h && dstX >= 0 && dstX < w) {
        rotated[dstY][dstX] = temp[y][x];
      }
    }
  }
  return rotated;
};

const rotatePixels180 = (pixels: number[][], w: number, h: number): number[][] => {
  const rotated = createEmptyPixels(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      rotated[h - 1 - y][w - 1 - x] = pixels[y][x];
    }
  }
  return rotated;
};

const rotatePixels270 = (pixels: number[][], w: number, h: number): number[][] => {
  const rotated = createEmptyPixels(w, h);
  const srcW = w;
  const srcH = h;
  const temp: number[][] = Array(srcW).fill(null).map(() => Array(srcH).fill(-1));
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      temp[srcW - 1 - x][y] = pixels[y][x];
    }
  }
  const offsetX = Math.floor((w - srcH) / 2);
  const offsetY = Math.floor((h - srcW) / 2);
  for (let y = 0; y < srcW; y++) {
    for (let x = 0; x < srcH; x++) {
      const dstY = y + offsetY;
      const dstX = x + offsetX;
      if (dstY >= 0 && dstY < h && dstX >= 0 && dstX < w) {
        rotated[dstY][dstX] = temp[y][x];
      }
    }
  }
  return rotated;
};

const rotatePixels = (pixels: number[][], degrees: 90 | 180 | 270, w: number, h: number): number[][] => {
  if (degrees === 90) return rotatePixels90(pixels, w, h);
  if (degrees === 180) return rotatePixels180(pixels, w, h);
  if (degrees === 270) return rotatePixels270(pixels, w, h);
  return pixels;
};

const shiftPixels = (pixels: number[][], direction: 'left' | 'right' | 'up' | 'down', amount: number, w: number, h: number): number[][] => {
  const result = createEmptyPixels(w, h);
  const dx = direction === 'left' ? -amount : direction === 'right' ? amount : 0;
  const dy = direction === 'up' ? -amount : direction === 'down' ? amount : 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcY = y - dy;
      const srcX = x - dx;
      if (srcY >= 0 && srcY < h && srcX >= 0 && srcX < w) {
        result[y][x] = pixels[srcY][srcX];
      }
    }
  }
  return result;
};

export const createTransformSlice: TransformSliceCreator = (set, get) => ({
  flipFrameHorizontal: (frameId: string): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, frameId, (f) => {
      for (const layer of f.layers) {
        if (layer.locked) continue;
        const reversed = clonePixels(layer.pixels);
        for (let y = 0; y < reversed.length; y++) {
          reversed[y].reverse();
        }
        layer.pixels = reversed;
      }
    });

    set({ character: newCharacter });
  },

  flipFrameVertical: (frameId: string): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, frameId, (f) => {
      for (const layer of f.layers) {
        if (layer.locked) continue;
        layer.pixels = clonePixels(layer.pixels).reverse();
      }
    });

    set({ character: newCharacter });
  },

  rotateFrame: (frameId: string, degrees: 90 | 180 | 270): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const w = character.width;
    const h = character.height;

    const newCharacter = immutableUpdateFrame(character, currentActionId, frameId, (f) => {
      for (const layer of f.layers) {
        if (layer.locked) continue;
        layer.pixels = rotatePixels(layer.pixels, degrees, w, h);
      }
    });

    set({ character: newCharacter });
  },

  shiftFrame: (frameId: string, direction: 'left' | 'right' | 'up' | 'down', amount = 1): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const w = character.width;
    const h = character.height;

    const newCharacter = immutableUpdateFrame(character, currentActionId, frameId, (f) => {
      for (const layer of f.layers) {
        if (layer.locked) continue;
        layer.pixels = shiftPixels(layer.pixels, direction, amount, w, h);
      }
    });

    set({ character: newCharacter });
  },

  batchFlipFramesHorizontal: (frameIds: string[]): void => {
    const { character, currentActionId } = get();
    if (!currentActionId || frameIds.length === 0) return;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      for (const frameId of frameIds) {
        const frame = a.frames.find((f) => f.id === frameId);
        if (!frame) continue;
        for (const layer of frame.layers) {
          if (layer.locked) continue;
          const reversed = clonePixels(layer.pixels);
          for (let y = 0; y < reversed.length; y++) {
            reversed[y].reverse();
          }
          layer.pixels = reversed;
        }
      }
    });

    set({ character: newCharacter });
  },

  batchFlipFramesVertical: (frameIds: string[]): void => {
    const { character, currentActionId } = get();
    if (!currentActionId || frameIds.length === 0) return;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      for (const frameId of frameIds) {
        const frame = a.frames.find((f) => f.id === frameId);
        if (!frame) continue;
        for (const layer of frame.layers) {
          if (layer.locked) continue;
          layer.pixels = clonePixels(layer.pixels).reverse();
        }
      }
    });

    set({ character: newCharacter });
  },

  batchRotateFrames: (frameIds: string[], degrees: 90 | 180 | 270): void => {
    const { character, currentActionId } = get();
    if (!currentActionId || frameIds.length === 0) return;

    const w = character.width;
    const h = character.height;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      for (const frameId of frameIds) {
        const frame = a.frames.find((f) => f.id === frameId);
        if (!frame) continue;
        for (const layer of frame.layers) {
          if (layer.locked) continue;
          layer.pixels = rotatePixels(layer.pixels, degrees, w, h);
        }
      }
    });

    set({ character: newCharacter });
  },

  batchShiftFrames: (frameIds: string[], direction: 'left' | 'right' | 'up' | 'down', amount = 1): void => {
    const { character, currentActionId } = get();
    if (!currentActionId || frameIds.length === 0) return;

    const w = character.width;
    const h = character.height;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      for (const frameId of frameIds) {
        const frame = a.frames.find((f) => f.id === frameId);
        if (!frame) continue;
        for (const layer of frame.layers) {
          if (layer.locked) continue;
          layer.pixels = shiftPixels(layer.pixels, direction, amount, w, h);
        }
      }
    });

    set({ character: newCharacter });
  },
});
