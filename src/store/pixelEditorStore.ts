import { create } from 'zustand';
import type { Character, Frame, Action, Layer, PixelEditorState, PixelEditorActions, SaveEntry, SaveMeta, SaveData } from '@/types/animation';
import { characterTemplates } from '@/data/characterTemplates';
import { generateParticleFrames } from '@/utils/particleEngine';
import { DEFAULT_PARTICLE_CONFIGS } from '@/types/particle';
import type { ParticleConfig, ParticleType } from '@/types/particle';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createEmptyPixels = (width: number, height: number): number[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(-1));
};

const createDefaultLayer = (width: number, height: number, name = 'Layer 1'): Layer => ({
  id: generateId(),
  name,
  pixels: createEmptyPixels(width, height),
  visible: true,
  locked: false,
  opacity: 1,
});

const createFrameWithPixels = (width: number, height: number, pixels: number[][], name: string, delay: number): Frame => {
  const layer: Layer = {
    id: generateId(),
    name: 'Layer 1',
    pixels: pixels.map((row) => [...row]),
    visible: true,
    locked: false,
    opacity: 1,
  };
  return {
    id: generateId(),
    name,
    layers: [layer],
    delay,
  };
};

const migrateFramePixelsToLayers = (frame: any, width: number, height: number): Frame => {
  if (frame.layers && Array.isArray(frame.layers)) {
    return frame as Frame;
  }
  const pixels = frame.pixels || createEmptyPixels(width, height);
  return createFrameWithPixels(width, height, pixels, frame.name || 'frame', frame.delay || 200);
};

const getFrameMergedPixelsImpl = (frame: Frame, width: number, height: number): number[][] => {
  const merged = createEmptyPixels(width, height);
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    const layerOpacity = layer.opacity;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorIndex = layer.pixels[y]?.[x] ?? -1;
        if (colorIndex >= 0) {
          if (layerOpacity >= 1) {
            merged[y][x] = colorIndex;
          } else if (layerOpacity > 0) {
            if (merged[y][x] === -1 || Math.random() < layerOpacity) {
              merged[y][x] = colorIndex;
            }
          }
        }
      }
    }
  }
  return merged;
};

const defaultColors = [
  '#000000',
  '#ffffff',
  '#e94560',
  '#0f3460',
  '#16213e',
  '#f39c12',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#e74c3c',
  '#95a5a6',
  '#34495e',
  '#f1c40f',
  '#2c3e50',
];

const createSampleCharacter = (): Character => {
  const width = 16;
  const height = 16;

  const createIdleFramePixels = (): number[][] => {
    const pixels = createEmptyPixels(width, height);
    for (let y = 3; y < 6; y++) {
      for (let x = 5; x < 11; x++) {
        pixels[y][x] = 1;
      }
    }
    for (let y = 2; y < 7; y++) {
      pixels[y][4] = 0;
      pixels[y][11] = 0;
    }
    for (let x = 4; x < 12; x++) {
      pixels[2][x] = 0;
      pixels[6][x] = 0;
    }
    pixels[4][6] = 0;
    pixels[4][9] = 0;
    for (let y = 6; y < 12; y++) {
      for (let x = 5; x < 11; x++) {
        pixels[y][x] = 3;
      }
    }
    for (let y = 6; y < 12; y++) {
      pixels[y][4] = 0;
      pixels[y][11] = 0;
    }
    pixels[12][4] = 0;
    pixels[12][11] = 0;
    pixels[12][5] = 0;
    pixels[12][10] = 0;
    for (let y = 12; y < 15; y++) {
      pixels[y][6] = 0;
      pixels[y][7] = 3;
      pixels[y][8] = 3;
      pixels[y][9] = 0;
    }
    pixels[15][6] = 0;
    pixels[15][7] = 0;
    pixels[15][8] = 0;
    pixels[15][9] = 0;
    pixels[7][3] = 0;
    pixels[8][3] = 3;
    pixels[9][3] = 3;
    pixels[10][3] = 0;
    pixels[7][12] = 0;
    pixels[8][12] = 3;
    pixels[9][12] = 3;
    pixels[10][12] = 0;
    return pixels;
  };

  const createWalkFrame1Pixels = (): number[][] => {
    const pixels = createIdleFramePixels();
    for (let y = 12; y < 15; y++) {
      pixels[y][6] = -1;
      pixels[y][7] = -1;
    }
    pixels[13][5] = 0;
    pixels[14][5] = 0;
    pixels[13][6] = 3;
    pixels[14][6] = 3;
    return pixels;
  };

  const createWalkFrame2Pixels = (): number[][] => {
    const pixels = createIdleFramePixels();
    for (let y = 12; y < 15; y++) {
      pixels[y][8] = -1;
      pixels[y][9] = -1;
    }
    pixels[13][9] = 0;
    pixels[14][9] = 0;
    pixels[13][10] = 0;
    pixels[14][10] = 0;
    pixels[13][8] = 3;
    pixels[14][8] = 3;
    return pixels;
  };

  const idleFrame = createFrameWithPixels(width, height, createIdleFramePixels(), 'idle_001', 200);
  const walkFrame1 = createFrameWithPixels(width, height, createWalkFrame1Pixels(), 'walk_001', 150);
  const walkFrame2 = createFrameWithPixels(width, height, createWalkFrame2Pixels(), 'walk_002', 150);
  const jumpFrame = createFrameWithPixels(width, height, createIdleFramePixels(), 'jump_001', 300);

  const idleAction: Action = {
    id: generateId(),
    name: 'idle',
    frames: [idleFrame],
    loop: true,
  };

  const walkAction: Action = {
    id: generateId(),
    name: 'walk',
    frames: [walkFrame1, walkFrame2],
    loop: true,
  };

  const jumpAction: Action = {
    id: generateId(),
    name: 'jump',
    frames: [jumpFrame],
    loop: false,
  };

  return {
    id: generateId(),
    name: 'Player',
    width,
    height,
    actions: [idleAction, walkAction, jumpAction],
  };
};

type StoreState = PixelEditorState & PixelEditorActions;

const deepCloneCharacter = (c: Character): Character => JSON.parse(JSON.stringify(c));

const STORAGE_PREFIX = 'pixel_animator_save_';
const STORAGE_INDEX_KEY = 'pixel_animator_saves_index';
const MAX_HISTORY = 50;
const DEFAULT_AUTOSAVE_INTERVAL = 5;

const readSaveIndex = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeSaveIndex = (names: string[]) => {
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(names));
  } catch {
    console.error('Failed to write save index');
  }
};

const countFrames = (character: Character): number => {
  return character.actions.reduce((sum, a) => sum + a.frames.length, 0);
};

export const usePixelEditorStore = create<StoreState>((set, get) => ({
  character: createSampleCharacter(),
  currentActionId: null,
  currentFrameId: null,
  currentLayerId: null,
  selectedTool: 'pencil' as const,
  currentColor: '#000000',
  gridSize: 20,
  showGrid: true,
  isPlaying: false,
  fps: 8,
  selectedFrameIds: [],
  pixelColors: [...defaultColors],
  history: [],
  historyIndex: -1,
  lastSavedTime: null,
  currentSaveName: null,
  autoSave: false,
  autoSaveInterval: DEFAULT_AUTOSAVE_INTERVAL,
  onionSkinEnabled: false,
  onionSkinPrevFrames: 1,
  onionSkinNextFrames: 1,
  onionSkinOpacity: 0.3,

  applyTemplate: (templateId) => {
    const template = characterTemplates.find((t) => t.id === templateId);
    if (!template) return false;
    const newCharacter = template.buildCharacter();
    const firstAction = newCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    const newHistory = [deepCloneCharacter(newCharacter)];
    set({
      character: newCharacter,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
      history: newHistory,
      historyIndex: 0,
      currentSaveName: null,
      lastSavedTime: null,
      selectedFrameIds: [],
    });
    return true;
  },

  setCharacter: (character) => set({ character }),

  setCurrentAction: (actionId) => {
    const { character } = get();
    const action = character.actions.find((a) => a.id === actionId);
    const firstFrame = action?.frames[0];
    set({
      currentActionId: actionId,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
  },

  setCurrentFrame: (frameId) => {
    const { character, currentActionId } = get();
    const action = character.actions.find((a) => a.id === currentActionId);
    const frame = action?.frames.find((f) => f.id === frameId);
    set({
      currentFrameId: frameId,
      currentLayerId: frame?.layers[0]?.id || null,
    });
  },

  setCurrentLayer: (layerId) => set({ currentLayerId: layerId }),

  setPixel: (x, y, colorIndex) => {
    const { character, currentActionId, currentFrameId, currentLayerId, selectedTool } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === currentLayerId);
    if (!layer || layer.locked) return;

    if (x < 0 || x >= character.width || y < 0 || y >= character.height) return;

    if (selectedTool === 'pencil') {
      layer.pixels[y][x] = colorIndex;
    } else if (selectedTool === 'eraser') {
      layer.pixels[y][x] = -1;
    } else if (selectedTool === 'bucket') {
      const targetIndex = layer.pixels[y][x];
      if (targetIndex === colorIndex) return;
      const stack: [number, number][] = [[x, y]];
      const visited = new Set<string>();
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        if (cx < 0 || cx >= character.width || cy < 0 || cy >= character.height) continue;
        if (layer.pixels[cy][cx] !== targetIndex) continue;
        visited.add(key);
        layer.pixels[cy][cx] = colorIndex;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }

    set({ character: newCharacter });
  },

  setCurrentColor: (color) => set({ currentColor: color }),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  setGridSize: (size) => set({ gridSize: size }),

  setShowGrid: (show) => set({ showGrid: show }),

  setFps: (fps) => set({ fps }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  addAction: (name) => {
    const { character } = get();
    const framePixels = createEmptyPixels(character.width, character.height);
    const layer = createDefaultLayer(character.width, character.height);
    layer.pixels = framePixels;
    const newAction: Action = {
      id: generateId(),
      name,
      frames: [
        {
          id: generateId(),
          name: `${name}_001`,
          layers: [layer],
          delay: 200,
        },
      ],
      loop: true,
    };
    set({
      character: { ...character, actions: [...character.actions, newAction] },
      currentActionId: newAction.id,
      currentFrameId: newAction.frames[0].id,
      currentLayerId: newAction.frames[0].layers[0].id,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  deleteAction: (actionId) => {
    const { character, currentActionId } = get();
    const newActions = character.actions.filter((a) => a.id !== actionId);
    const newCurrentId = currentActionId === actionId
      ? newActions[0]?.id || null
      : currentActionId;
    const currentAction = newActions.find((a) => a.id === newCurrentId);
    const firstFrame = currentAction?.frames[0];
    set({
      character: { ...character, actions: newActions },
      currentActionId: newCurrentId,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  renameAction: (actionId, name) => {
    const { character } = get();
    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === actionId);
    if (action) action.name = name;
    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  duplicateAction: (actionId) => {
    const { character } = get();
    const action = character.actions.find((a) => a.id === actionId);
    if (!action) return;

    const newAction: Action = {
      id: generateId(),
      name: `${action.name}_copy`,
      loop: action.loop,
      frames: action.frames.map((f) => ({
        ...f,
        id: generateId(),
        layers: f.layers.map((l) => ({
          ...l,
          id: generateId(),
          pixels: l.pixels.map((row) => [...row]),
        })),
      })),
    };

    set({
      character: { ...character, actions: [...character.actions, newAction] },
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  addFrame: (actionId) => {
    const { character, currentFrameId } = get();
    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === actionId);
    if (!action) return;

    const baseFrame = action.frames.find((f) => f.id === currentFrameId) || action.frames[action.frames.length - 1];
    const newFrame: Frame = {
      id: generateId(),
      name: `${action.name}_${String(action.frames.length + 1).padStart(3, '0')}`,
      layers: baseFrame
        ? baseFrame.layers.map((l) => ({
            ...l,
            id: generateId(),
            pixels: l.pixels.map((row) => [...row]),
          }))
        : [createDefaultLayer(character.width, character.height)],
      delay: baseFrame?.delay || 200,
    };

    const currentIndex = action.frames.findIndex((f) => f.id === currentFrameId);
    if (currentIndex >= 0) {
      action.frames.splice(currentIndex + 1, 0, newFrame);
    } else {
      action.frames.push(newFrame);
    }

    set({
      character: newCharacter,
      currentFrameId: newFrame.id,
      currentLayerId: newFrame.layers[0]?.id || null,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  deleteFrame: (frameId) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const index = action.frames.findIndex((f) => f.id === frameId);
    if (index === -1) return;

    action.frames.splice(index, 1);

    let newFrameId: string | null = null;
    let newLayerId: string | null = null;
    if (action.frames.length > 0) {
      const newIndex = Math.min(index, action.frames.length - 1);
      const newFrame = action.frames[newIndex];
      newFrameId = newFrame.id;
      newLayerId = newFrame.layers[0]?.id || null;
    }

    set({
      character: newCharacter,
      currentFrameId: currentFrameId === frameId ? newFrameId : currentFrameId,
      currentLayerId: currentFrameId === frameId ? newLayerId : get().currentLayerId,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  duplicateFrame: (frameId) => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frameIndex = action.frames.findIndex((f) => f.id === frameId);
    if (frameIndex === -1) return;

    const frame = action.frames[frameIndex];
    const newFrame: Frame = {
      id: generateId(),
      name: `${frame.name}_copy`,
      layers: frame.layers.map((l) => ({
        ...l,
        id: generateId(),
        pixels: l.pixels.map((row) => [...row]),
      })),
      delay: frame.delay,
    };

    action.frames.splice(frameIndex + 1, 0, newFrame);
    set({
      character: newCharacter,
      currentFrameId: newFrame.id,
      currentLayerId: newFrame.layers[0]?.id || null,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  renameFrame: (frameId, name) => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === frameId);
    if (frame) frame.name = name;

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  moveFrame: (fromIndex, toIndex) => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const [movedFrame] = action.frames.splice(fromIndex, 1);
    action.frames.splice(toIndex, 0, movedFrame);

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  setFrameDelay: (frameId, delay) => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === frameId);
    if (frame) frame.delay = delay;

    set({ character: newCharacter });
  },

  setSelectedFrameIds: (ids) => set({ selectedFrameIds: ids }),

  toggleFrameSelection: (frameId) => {
    const { selectedFrameIds } = get();
    if (selectedFrameIds.includes(frameId)) {
      set({ selectedFrameIds: selectedFrameIds.filter((id) => id !== frameId) });
    } else {
      set({ selectedFrameIds: [...selectedFrameIds, frameId] });
    }
  },

  clearFrameSelection: () => set({ selectedFrameIds: [] }),

  batchRenameFrames: (prefix, startIndex) => {
    const { character, currentActionId, selectedFrameIds } = get();
    if (!currentActionId || selectedFrameIds.length === 0) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    let idx = startIndex;
    for (const frameId of selectedFrameIds) {
      const frame = action.frames.find((f) => f.id === frameId);
      if (frame) {
        frame.name = `${prefix}_${String(idx).padStart(3, '0')}`;
        idx++;
      }
    }

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  batchDuplicateFrames: (frameIds) => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const newFrameIds: string[] = [];
    for (const frameId of frameIds) {
      const frameIndex = action.frames.findIndex((f) => f.id === frameId);
      if (frameIndex === -1) continue;

      const frame = action.frames[frameIndex];
      const newFrame: Frame = {
        id: generateId(),
        name: `${frame.name}_copy`,
        layers: frame.layers.map((l) => ({
          ...l,
          id: generateId(),
          pixels: l.pixels.map((row) => [...row]),
        })),
        delay: frame.delay,
      };

      action.frames.splice(frameIndex + 1 + newFrameIds.length, 0, newFrame);
      newFrameIds.push(newFrame.id);
    }

    set({ character: newCharacter, selectedFrameIds: newFrameIds });
    setTimeout(() => get().pushHistory(), 0);
  },

  batchDeleteFrames: (frameIds) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    action.frames = action.frames.filter((f) => !frameIds.includes(f.id));

    let newCurrentId: string | null = currentFrameId;
    let newLayerId: string | null = get().currentLayerId;
    if (currentFrameId && frameIds.includes(currentFrameId)) {
      const firstFrame = action.frames[0];
      newCurrentId = firstFrame?.id || null;
      newLayerId = firstFrame?.layers[0]?.id || null;
    }

    set({
      character: newCharacter,
      currentFrameId: newCurrentId,
      currentLayerId: newLayerId,
      selectedFrameIds: [],
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  addLayer: () => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const newLayer = createDefaultLayer(
      character.width,
      character.height,
      `Layer ${frame.layers.length + 1}`
    );

    frame.layers.push(newLayer);

    set({
      character: newCharacter,
      currentLayerId: newLayer.id,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  deleteLayer: (layerId) => {
    const { character, currentActionId, currentFrameId, currentLayerId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    if (frame.layers.length <= 1) return;

    const index = frame.layers.findIndex((l) => l.id === layerId);
    if (index === -1) return;

    frame.layers.splice(index, 1);

    let newLayerId = currentLayerId;
    if (currentLayerId === layerId) {
      const newIndex = Math.min(index, frame.layers.length - 1);
      newLayerId = frame.layers[newIndex]?.id || null;
    }

    set({
      character: newCharacter,
      currentLayerId: newLayerId,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  duplicateLayer: (layerId) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layerIndex = frame.layers.findIndex((l) => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = frame.layers[layerIndex];
    const newLayer: Layer = {
      id: generateId(),
      name: `${layer.name}_copy`,
      pixels: layer.pixels.map((row) => [...row]),
      visible: layer.visible,
      locked: false,
      opacity: layer.opacity,
    };

    frame.layers.splice(layerIndex + 1, 0, newLayer);

    set({
      character: newCharacter,
      currentLayerId: newLayer.id,
    });
    setTimeout(() => get().pushHistory(), 0);
  },

  renameLayer: (layerId, name) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === layerId);
    if (layer) layer.name = name;

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  moveLayer: (fromIndex, toIndex) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const [movedLayer] = frame.layers.splice(fromIndex, 1);
    frame.layers.splice(toIndex, 0, movedLayer);

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  setLayerVisible: (layerId, visible) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === layerId);
    if (layer) layer.visible = visible;

    set({ character: newCharacter });
  },

  setLayerLocked: (layerId, locked) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === layerId);
    if (layer) layer.locked = locked;

    set({ character: newCharacter });
  },

  setLayerOpacity: (layerId, opacity) => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === layerId);
    if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));

    set({ character: newCharacter });
  },

  getCurrentLayer: () => {
    const state = get();
    const action = state.character.actions.find((a) => a.id === state.currentActionId);
    const frame = action?.frames.find((f) => f.id === state.currentFrameId);
    return frame?.layers.find((l) => l.id === state.currentLayerId) || null;
  },

  getFrameMergedPixels: (frame) => {
    const { character } = get();
    return getFrameMergedPixelsImpl(frame, character.width, character.height);
  },

  generateSpriteSheet: (actionId) => {
    const { character, pixelColors } = get();
    const action = character.actions.find((a) => a.id === actionId);
    if (!action || action.frames.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = character.width * action.frames.length;
    canvas.height = character.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < action.frames.length; i++) {
      const frame = action.frames[i];
      const offsetX = i * character.width;
      const mergedPixels = getFrameMergedPixelsImpl(frame, character.width, character.height);

      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = mergedPixels[y][x];
          if (colorIndex >= 0 && colorIndex < pixelColors.length) {
            ctx.fillStyle = pixelColors[colorIndex];
            ctx.fillRect(offsetX + x, y, 1, 1);
          }
        }
      }
    }

    return canvas;
  },

  getCurrentAction: () => {
    const { character, currentActionId } = get();
    return character.actions.find((a) => a.id === currentActionId) || null;
  },

  getCurrentFrame: () => {
    const state = get();
    const action = state.getCurrentAction();
    return action?.frames.find((f) => f.id === state.currentFrameId) || null;
  },

  addColor: (color) => {
    const { pixelColors } = get();
    set({ pixelColors: [...pixelColors, color] });
  },

  removeColor: (index) => {
    const { pixelColors } = get();
    if (pixelColors.length <= 2) return;
    const newColors = pixelColors.filter((_, i) => i !== index);
    set({ pixelColors: newColors });
  },

  setCharacterSize: (width, height) => {
    const { character } = get();
    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    newCharacter.width = width;
    newCharacter.height = height;

    for (const action of newCharacter.actions) {
      for (const frame of action.frames) {
        for (const layer of frame.layers) {
          const newPixels = createEmptyPixels(width, height);
          const minW = Math.min(width, character.width);
          const minH = Math.min(height, character.height);
          for (let y = 0; y < minH; y++) {
            for (let x = 0; x < minW; x++) {
              newPixels[y][x] = layer.pixels[y][x];
            }
          }
          layer.pixels = newPixels;
        }
      }
    }

    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  setActionLoop: (actionId, loop) => {
    const { character } = get();
    const newCharacter = { ...character };
    const action = newCharacter.actions.find((a) => a.id === actionId);
    if (action) action.loop = loop;
    set({ character: newCharacter });
    setTimeout(() => get().pushHistory(), 0);
  },

  pushHistory: () => {
    const { character, history, historyIndex } = get();
    const newHistory = historyIndex < history.length - 1
      ? history.slice(0, historyIndex + 1)
      : [...history];

    newHistory.push(deepCloneCharacter(character));

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const restoredCharacter = deepCloneCharacter(history[newIndex]);

    const firstAction = restoredCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const restoredCharacter = deepCloneCharacter(history[newIndex]);

    const firstAction = restoredCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  hasSave: (name: string) => {
    return localStorage.getItem(STORAGE_PREFIX + name) !== null;
  },

  listSaves: (): SaveMeta[] => {
    const names = readSaveIndex();
    const metas: SaveMeta[] = [];
    for (const name of names) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + name);
        if (raw) {
          const entry: SaveEntry = JSON.parse(raw);
          metas.push(entry.meta);
        }
      } catch {
        // skip corrupted entry
      }
    }
    return metas.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  saveAs: (name: string): boolean => {
    if (!name || !name.trim()) return false;
    const trimmed = name.trim();

    try {
      const { character, pixelColors, fps, gridSize } = get();
      const now = Date.now();
      const data: SaveData = { character, pixelColors, fps, gridSize };

      const isNew = !get().hasSave(trimmed);
      let meta: SaveMeta;

      if (isNew) {
        meta = {
          name: trimmed,
          createdAt: now,
          updatedAt: now,
          actionCount: character.actions.length,
          frameCount: countFrames(character),
        };
      } else {
        const raw = localStorage.getItem(STORAGE_PREFIX + trimmed);
        const existing: SaveEntry = raw ? JSON.parse(raw) : null;
        meta = existing ? {
          ...existing.meta,
          updatedAt: now,
          actionCount: character.actions.length,
          frameCount: countFrames(character),
        } : {
          name: trimmed,
          createdAt: now,
          updatedAt: now,
          actionCount: character.actions.length,
          frameCount: countFrames(character),
        };
      }

      const entry: SaveEntry = { meta, data };
      localStorage.setItem(STORAGE_PREFIX + trimmed, JSON.stringify(entry));

      if (isNew) {
        const index = readSaveIndex();
        if (!index.includes(trimmed)) {
          index.push(trimmed);
          writeSaveIndex(index);
        }
      }

      set({ lastSavedTime: now, currentSaveName: trimmed });
      return true;
    } catch (e) {
      console.error('Failed to save as:', e);
      return false;
    }
  },

  save: (): boolean => {
    const { currentSaveName, saveAs } = get();
    if (currentSaveName) {
      return saveAs(currentSaveName);
    }
    return false;
  },

  loadSave: (name: string): boolean => {
    if (!name || !name.trim()) return false;
    const trimmed = name.trim();

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + trimmed);
      if (!raw) return false;

      const entry: SaveEntry = JSON.parse(raw);
      if (!entry.data || !entry.data.character) return false;

      let { character, pixelColors, fps, gridSize } = entry.data;

      // Migrate old frames without layers
      const migratedChar = JSON.parse(JSON.stringify(character)) as Character;
      for (const action of migratedChar.actions) {
        action.frames = action.frames.map((f) =>
          migrateFramePixelsToLayers(f, migratedChar.width, migratedChar.height)
        );
      }
      character = migratedChar;

      const firstAction = character.actions[0];
      const firstFrame = firstAction?.frames[0];

      const clonedChar = deepCloneCharacter(character);
      const newHistory = [deepCloneCharacter(clonedChar)];

      set({
        character: clonedChar,
        pixelColors: pixelColors || defaultColors,
        fps: fps || 8,
        gridSize: gridSize || 20,
        currentActionId: firstAction?.id || null,
        currentFrameId: firstFrame?.id || null,
        currentLayerId: firstFrame?.layers[0]?.id || null,
        history: newHistory,
        historyIndex: 0,
        lastSavedTime: entry.meta.updatedAt,
        currentSaveName: trimmed,
        selectedFrameIds: [],
      });

      return true;
    } catch (e) {
      console.error('Failed to load save:', e);
      return false;
    }
  },

  deleteSave: (name: string): boolean => {
    if (!name || !name.trim()) return false;
    const trimmed = name.trim();

    try {
      localStorage.removeItem(STORAGE_PREFIX + trimmed);
      const index = readSaveIndex().filter(n => n !== trimmed);
      writeSaveIndex(index);

      const { currentSaveName } = get();
      if (currentSaveName === trimmed) {
        set({ currentSaveName: null, lastSavedTime: null });
      }
      return true;
    } catch (e) {
      console.error('Failed to delete save:', e);
      return false;
    }
  },

  setAutoSave: (enabled: boolean) => {
    set({ autoSave: enabled });
  },

  setAutoSaveInterval: (minutes: number) => {
    set({ autoSaveInterval: Math.max(1, minutes) });
  },

  resetCharacter: () => {
    const newCharacter = createSampleCharacter();
    const firstAction = newCharacter.actions[0];
    const firstFrame = firstAction.frames[0];
    const newHistory = [deepCloneCharacter(newCharacter)];
    set({
      character: newCharacter,
      currentActionId: firstAction.id,
      currentFrameId: firstFrame.id,
      currentLayerId: firstFrame.layers[0].id,
      history: newHistory,
      historyIndex: 0,
      currentSaveName: null,
      lastSavedTime: null,
      selectedFrameIds: [],
    });
  },

  setOnionSkinEnabled: (enabled) => set({ onionSkinEnabled: enabled }),

  setOnionSkinPrevFrames: (count) => set({ onionSkinPrevFrames: Math.max(0, count) }),

  setOnionSkinNextFrames: (count) => set({ onionSkinNextFrames: Math.max(0, count) }),

  setOnionSkinOpacity: (opacity) => set({ onionSkinOpacity: Math.max(0.1, Math.min(0.9, opacity)) }),

  generateParticleAnimation: (config) => {
    const { character } = get();
    const {
      type,
      frameCount,
      actionName,
      insertMode = 'newAction',
      ...customParams
    } = config;

    const particleType = type as ParticleType;
    const defaultConfig = DEFAULT_PARTICLE_CONFIGS[particleType];
    if (!defaultConfig) return false;

    const particleConfig: ParticleConfig = {
      ...defaultConfig,
      width: character.width,
      height: character.height,
      frameCount,
      ...customParams,
    } as ParticleConfig;

    const frames = generateParticleFrames(particleConfig);
    if (frames.length === 0) return false;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;

    const actionFrames: Frame[] = frames.map((frame, index) => {
      const layer: Layer = {
        id: generateId(),
        name: 'Particle Layer',
        pixels: frame.pixels.map((row) => [...row]),
        visible: true,
        locked: false,
        opacity: 1,
      };
      return {
        id: generateId(),
        name: `${particleType}_${String(index + 1).padStart(3, '0')}`,
        layers: [layer],
        delay: 100,
      };
    });

    if (insertMode === 'newAction') {
      const name = actionName || particleType;
      const newAction: Action = {
        id: generateId(),
        name,
        frames: actionFrames,
        loop: true,
      };
      newCharacter.actions.push(newAction);

      set({
        character: newCharacter,
        currentActionId: newAction.id,
        currentFrameId: newAction.frames[0]?.id || null,
        currentLayerId: newAction.frames[0]?.layers[0]?.id || null,
      });
    } else {
      const currentAction = newCharacter.actions.find((a) => a.id === get().currentActionId);
      if (!currentAction) return false;

      currentAction.frames.push(...actionFrames);

      const lastFrame = actionFrames[actionFrames.length - 1];
      set({
        character: newCharacter,
        currentFrameId: lastFrame?.id || null,
        currentLayerId: lastFrame?.layers[0]?.id || null,
      });
    }

    setTimeout(() => get().pushHistory(), 0);
    return true;
  },
}));

setTimeout(() => {
  const state = usePixelEditorStore.getState();
  if (state.character.actions.length > 0) {
    const firstAction = state.character.actions[0];
    const firstFrame = firstAction.frames[0];
    const initialHistory = [deepCloneCharacter(state.character)];
    usePixelEditorStore.setState({
      currentActionId: firstAction.id,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
      history: initialHistory,
      historyIndex: 0,
    });
  }
}, 0);
