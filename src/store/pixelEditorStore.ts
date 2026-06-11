import { create } from 'zustand';
import type { Character, Frame, Action, PixelEditorState, PixelEditorActions } from '@/types/animation';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createEmptyPixels = (width: number, height: number): number[][] => {
  return Array(height).fill(null).map(() => Array(width).fill(-1));
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

  const createIdleFrame = (): number[][] => {
    const pixels = createEmptyPixels(width, height);
    const c = { skin: 2, hair: 3, body: 4, eye: 0, outline: 0 };
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

  const createWalkFrame1 = (): number[][] => {
    const pixels = createIdleFrame();
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

  const createWalkFrame2 = (): number[][] => {
    const pixels = createIdleFrame();
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

  const idleFrame: Frame = {
    id: generateId(),
    name: 'idle_001',
    pixels: createIdleFrame(),
    delay: 200,
  };

  const walkFrame1: Frame = {
    id: generateId(),
    name: 'walk_001',
    pixels: createWalkFrame1(),
    delay: 150,
  };

  const walkFrame2: Frame = {
    id: generateId(),
    name: 'walk_002',
    pixels: createWalkFrame2(),
    delay: 150,
  };

  const jumpFrame: Frame = {
    id: generateId(),
    name: 'jump_001',
    pixels: createIdleFrame(),
    delay: 300,
  };

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

const STORAGE_KEY = 'pixel_animator_save';
const MAX_HISTORY = 50;

export const usePixelEditorStore = create<StoreState>((set, get) => ({
  character: createSampleCharacter(),
  currentActionId: null,
  currentFrameId: null,
  selectedTool: 'pencil',
  currentColor: defaultColors[2],
  gridSize: 20,
  showGrid: true,
  isPlaying: false,
  fps: 8,
  selectedFrameIds: [],
  pixelColors: defaultColors,
  history: [],
  historyIndex: -1,
  lastSavedTime: null,

  setCharacter: (character) => set({ character }),

  setCurrentAction: (actionId) => {
    const { character } = get();
    const action = character.actions.find((a) => a.id === actionId);
    set({
      currentActionId: actionId,
      currentFrameId: action?.frames[0]?.id || null,
    });
  },

  setCurrentFrame: (frameId) => set({ currentFrameId: frameId }),

  setPixel: (x, y, colorIndex) => {
    const { character, currentActionId, currentFrameId, selectedTool } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
    const action = newCharacter.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    if (x < 0 || x >= character.width || y < 0 || y >= character.height) return;

    if (selectedTool === 'pencil') {
      frame.pixels[y][x] = colorIndex;
    } else if (selectedTool === 'eraser') {
      frame.pixels[y][x] = -1;
    } else if (selectedTool === 'bucket') {
      const targetIndex = frame.pixels[y][x];
      if (targetIndex === colorIndex) return;
      const stack: [number, number][] = [[x, y]];
      const visited = new Set<string>();
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        if (cx < 0 || cx >= character.width || cy < 0 || cy >= character.height) continue;
        if (frame.pixels[cy][cx] !== targetIndex) continue;
        visited.add(key);
        frame.pixels[cy][cx] = colorIndex;
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
    const newAction: Action = {
      id: generateId(),
      name,
      frames: [
        {
          id: generateId(),
          name: `${name}_001`,
          pixels: createEmptyPixels(character.width, character.height),
          delay: 200,
        },
      ],
      loop: true,
    };
    set({
      character: { ...character, actions: [...character.actions, newAction] },
      currentActionId: newAction.id,
      currentFrameId: newAction.frames[0].id,
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
    set({
      character: { ...character, actions: newActions },
      currentActionId: newCurrentId,
      currentFrameId: currentAction?.frames[0]?.id || null,
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
        pixels: f.pixels.map((row) => [...row]),
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
      pixels: baseFrame ? baseFrame.pixels.map((row) => [...row]) : createEmptyPixels(character.width, character.height),
      delay: baseFrame?.delay || 200,
    };

    const currentIndex = action.frames.findIndex((f) => f.id === currentFrameId);
    if (currentIndex >= 0) {
      action.frames.splice(currentIndex + 1, 0, newFrame);
    } else {
      action.frames.push(newFrame);
    }

    set({ character: newCharacter, currentFrameId: newFrame.id });
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
    if (action.frames.length > 0) {
      const newIndex = Math.min(index, action.frames.length - 1);
      newFrameId = action.frames[newIndex].id;
    }

    set({
      character: newCharacter,
      currentFrameId: currentFrameId === frameId ? newFrameId : currentFrameId,
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
      pixels: frame.pixels.map((row) => [...row]),
      delay: frame.delay,
    };

    action.frames.splice(frameIndex + 1, 0, newFrame);
    set({ character: newCharacter, currentFrameId: newFrame.id });
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
        pixels: frame.pixels.map((row) => [...row]),
        delay: frame.delay,
      };

      action.frames.splice(frameIndex + 1 + newFrameIds.indexOf(frameId) + 1 ? 0 : 0, 0, newFrame);
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
    if (currentFrameId && frameIds.includes(currentFrameId)) {
      newCurrentId = action.frames[0]?.id || null;
    }

    set({ character: newCharacter, currentFrameId: newCurrentId, selectedFrameIds: [] });
    setTimeout(() => get().pushHistory(), 0);
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

      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = frame.pixels[y][x];
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
        const newPixels = createEmptyPixels(width, height);
        const minW = Math.min(width, character.width);
        const minH = Math.min(height, character.height);
        for (let y = 0; y < minH; y++) {
          for (let x = 0; x < minW; x++) {
            newPixels[y][x] = frame.pixels[y][x];
          }
        }
        frame.pixels = newPixels;
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
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstAction?.frames[0]?.id || null,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const restoredCharacter = deepCloneCharacter(history[newIndex]);

    const firstAction = restoredCharacter.actions[0];
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstAction?.frames[0]?.id || null,
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

  saveToLocal: () => {
    const { character, pixelColors, fps, gridSize } = get();
    const saveData = {
      character,
      pixelColors,
      fps,
      gridSize,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      set({ lastSavedTime: Date.now() });
    } catch (e) {
      console.error('Failed to save:', e);
    }
  },

  loadFromLocal: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data.character) return false;

      const firstAction = data.character.actions[0];
      set({
        character: data.character,
        pixelColors: data.pixelColors || defaultColors,
        fps: data.fps || 8,
        gridSize: data.gridSize || 20,
        currentActionId: firstAction?.id || null,
        currentFrameId: firstAction?.frames[0]?.id || null,
        history: [],
        historyIndex: -1,
        lastSavedTime: data.savedAt || null,
      });
      return true;
    } catch (e) {
      console.error('Failed to load:', e);
      return false;
    }
  },

  resetCharacter: () => {
    const newCharacter = createSampleCharacter();
    const firstAction = newCharacter.actions[0];
    set({
      character: newCharacter,
      currentActionId: firstAction.id,
      currentFrameId: firstAction.frames[0].id,
      history: [],
      historyIndex: -1,
    });
  },
}));

setTimeout(() => {
  const state = usePixelEditorStore.getState();
  if (state.character.actions.length > 0) {
    const firstAction = state.character.actions[0];
    usePixelEditorStore.setState({
      currentActionId: firstAction.id,
      currentFrameId: firstAction.frames[0]?.id || null,
    });
  }
}, 0);
