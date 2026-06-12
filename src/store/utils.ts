import type { Character, Frame, Layer, Action } from '@/types/animation';

export const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const createEmptyPixels = (width: number, height: number): number[][] =>
  Array.from({ length: height }, () => Array(width).fill(-1));

export const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const clonePixels = (pixels: number[][]): number[][] =>
  pixels.map((row) => [...row]);

export const cloneLayer = (layer: Layer): Layer => ({
  ...layer,
  pixels: clonePixels(layer.pixels),
});

export const cloneFrame = (frame: Frame): Frame => ({
  ...frame,
  layers: frame.layers.map(cloneLayer),
});

export const cloneAction = (action: Action): Action => ({
  ...action,
  frames: action.frames.map(cloneFrame),
});

export const cloneCharacter = (character: Character): Character => ({
  ...character,
  actions: character.actions.map(cloneAction),
});

export const createDefaultLayer = (width: number, height: number, name = 'Layer 1'): Layer => ({
  id: generateId(),
  name,
  pixels: createEmptyPixels(width, height),
  visible: true,
  locked: false,
  opacity: 1,
});

export const createFrameWithPixels = (
  width: number,
  height: number,
  pixels: number[][],
  name: string,
  delay: number,
): Frame => ({
  id: generateId(),
  name,
  layers: [
    {
      id: generateId(),
      name: 'Layer 1',
      pixels: clonePixels(pixels),
      visible: true,
      locked: false,
      opacity: 1,
    },
  ],
  delay,
});

export const migrateFramePixelsToLayers = (
  frame: any,
  width: number,
  height: number,
): Frame => {
  if (frame.layers && Array.isArray(frame.layers)) {
    return frame as Frame;
  }
  const pixels = frame.pixels || createEmptyPixels(width, height);
  return createFrameWithPixels(width, height, pixels, frame.name || 'frame', frame.delay || 200);
};

export const getFrameMergedPixels = (
  frame: Frame,
  width: number,
  height: number,
): number[][] => {
  const merged = createEmptyPixels(width, height);
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    const { opacity } = layer;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorIndex = layer.pixels[y]?.[x] ?? -1;
        if (colorIndex >= 0) {
          if (opacity >= 1) {
            merged[y][x] = colorIndex;
          } else if (opacity > 0 && (merged[y][x] === -1 || Math.random() < opacity)) {
            merged[y][x] = colorIndex;
          }
        }
      }
    }
  }
  return merged;
};

export const immutableUpdateCharacter = (
  character: Character,
  updater: (draft: Character) => void,
): Character => {
  const draft = cloneCharacter(character);
  updater(draft);
  return draft;
};

export const immutableUpdateAction = (
  character: Character,
  actionId: string,
  updater: (draft: Action) => void,
): Character =>
  immutableUpdateCharacter(character, (c) => {
    const action = c.actions.find((a) => a.id === actionId);
    if (action) updater(action);
  });

export const immutableUpdateFrame = (
  character: Character,
  actionId: string,
  frameId: string,
  updater: (draft: Frame) => void,
): Character =>
  immutableUpdateAction(character, actionId, (a) => {
    const frame = a.frames.find((f) => f.id === frameId);
    if (frame) updater(frame);
  });

export const immutableUpdateLayer = (
  character: Character,
  actionId: string,
  frameId: string,
  layerId: string,
  updater: (draft: Layer) => void,
): Character =>
  immutableUpdateFrame(character, actionId, frameId, (f) => {
    const layer = f.layers.find((l) => l.id === layerId);
    if (layer) updater(layer);
  });

export const immutableUpdateCurrentLayer = (
  character: Character,
  actionId: string | null,
  frameId: string | null,
  layerId: string | null,
  updater: (draft: Layer) => void,
): Character | null => {
  if (!actionId || !frameId || !layerId) return null;
  return immutableUpdateLayer(character, actionId, frameId, layerId, updater);
};

export const immutableArrayInsert = <T>(arr: T[], index: number, item: T): T[] => {
  const result = [...arr];
  result.splice(index, 0, item);
  return result;
};

export const immutableArrayRemove = <T>(arr: T[], index: number): T[] => {
  const result = [...arr];
  result.splice(index, 1);
  return result;
};

export const immutableArrayMove = <T>(arr: T[], from: number, to: number): T[] => {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
};

export const countFrames = (character: Character): number =>
  character.actions.reduce((sum, a) => sum + a.frames.length, 0);
