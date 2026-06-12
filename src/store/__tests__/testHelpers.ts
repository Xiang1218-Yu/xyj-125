import { create } from 'zustand';
import type { Character, Action, Frame, Layer, PixelEditorState, PaletteGroup } from '@/types/animation';
import { generateId, createEmptyPixels } from '../utils';
import { defaultColors } from '../initialData';

export interface StoreState extends Partial<PixelEditorState> {
  [key: string]: any;
}

export const createTestCharacter = (width = 4, height = 4): Character => {
  const makeLayer = (): Layer => ({
    id: generateId(),
    name: 'Layer 1',
    pixels: createEmptyPixels(width, height),
    visible: true,
    locked: false,
    opacity: 1,
  });

  const makeFrame = (name: string): Frame => ({
    id: generateId(),
    name,
    layers: [makeLayer()],
    delay: 200,
  });

  const makeAction = (name: string, frameCount: number): Action => ({
    id: generateId(),
    name,
    frames: Array.from({ length: frameCount }, (_, i) => makeFrame(`${name}_${String(i + 1).padStart(3, '0')}`)),
    loop: true,
  });

  return {
    id: generateId(),
    name: 'TestChar',
    width,
    height,
    actions: [makeAction('idle', 2), makeAction('walk', 3)],
  };
};

export const createTestStore = <T extends object>(
  sliceCreator: (set: any, get: any, api: any) => T,
  initial: Partial<StoreState> = {}
): T & StoreState => {
  const store = create<any>((set, get, api) => ({
    ...sliceCreator(set, get, api),
    ...initial,
  }));
  return store.getState();
};

export const createDefaultPalette = (): PaletteGroup => ({
  id: 'default',
  name: '默认调色板',
  colors: [...defaultColors],
  isPreset: false,
});

export const createPixelWithValues = (w: number, h: number, value = -1): number[][] => {
  return Array.from({ length: h }, () => Array(w).fill(value));
};
