import { create } from 'zustand';
import type { Character, Frame, Layer, Action, PixelEditorState, PixelEditorActions, SaveData } from '@/types/animation';
import type { ParticleConfig, ParticleType } from '@/types/particle';
import { generateParticleFrames } from '@/utils/particleEngine';
import { DEFAULT_PARTICLE_CONFIGS } from '@/types/particle';
import {
  generateId,
  createDefaultLayer,
  cloneCharacter,
  cloneFrame,
  immutableUpdateCharacter,
  immutableUpdateAction,
} from './utils';
import { createSampleCharacter, defaultColors } from './initialData';
import { createCharacterSlice, CharacterSlice } from './slices/characterSlice';
import { createDrawingSlice, DrawingSlice } from './slices/drawingSlice';
import { createHistorySlice, HistorySlice } from './slices/historySlice';
import { createPaletteSlice, PaletteSlice, persistPalettes } from './slices/paletteSlice';
import { createSaveSlice, SaveSlice } from './slices/saveSlice';
import { createTransformSlice, TransformSlice } from './slices/transformSlice';
import { createUiSlice, UiSlice } from './slices/uiSlice';

type StoreState = PixelEditorState & PixelEditorActions;

type FullStore = CharacterSlice & DrawingSlice & HistorySlice & PaletteSlice & SaveSlice & TransformSlice & UiSlice;

const HISTORY_WRAPPED_METHODS = [
  'addAction',
  'deleteAction',
  'renameAction',
  'duplicateAction',
  'setActionLoop',
  'addFrame',
  'deleteFrame',
  'duplicateFrame',
  'renameFrame',
  'moveFrame',
  'batchRenameFrames',
  'batchDuplicateFrames',
  'batchDeleteFrames',
  'addLayer',
  'deleteLayer',
  'duplicateLayer',
  'renameLayer',
  'moveLayer',
  'setCharacterSize',
  'flipFrameHorizontal',
  'flipFrameVertical',
  'rotateFrame',
  'shiftFrame',
  'batchFlipFramesHorizontal',
  'batchFlipFramesVertical',
  'batchRotateFrames',
  'batchShiftFrames',
  'pasteClipboard',
  'deleteSelection',
  'generateParticleAnimation',
];

const wrapWithHistory = <T extends object>(store: T, pushHistory: () => void): T => {
  const wrapped = { ...store } as any;
  for (const methodName of HISTORY_WRAPPED_METHODS) {
    const original = wrapped[methodName];
    if (typeof original === 'function') {
      wrapped[methodName] = (...args: any[]) => {
        const result = original.apply(wrapped, args);
        setTimeout(() => pushHistory(), 0);
        return result;
      };
    }
  }
  return wrapped;
};

export const usePixelEditorStore = create<StoreState>((set, get, api) => {
  const initialCharacter = createSampleCharacter();
  const initialHistory = [cloneCharacter(initialCharacter)];

  const generateParticleAnimation = (config: {
    type: string;
    frameCount: number;
    actionName?: string;
    insertMode?: 'newAction' | 'currentAction';
    [key: string]: any;
  }): boolean => {
    const { character, currentActionId } = get();
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

      const newCharacter = immutableUpdateCharacter(character, (c) => {
        c.actions.push(newAction);
      });

      set({
        character: newCharacter,
        currentActionId: newAction.id,
        currentFrameId: newAction.frames[0]?.id || null,
        currentLayerId: newAction.frames[0]?.layers[0]?.id || null,
      });
    } else {
      const newCharacter = immutableUpdateAction(character, currentActionId!, (a) => {
        a.frames.push(...actionFrames);
      });

      const lastFrame = actionFrames[actionFrames.length - 1];
      set({
        character: newCharacter,
        currentFrameId: lastFrame?.id || null,
        currentLayerId: lastFrame?.layers[0]?.id || null,
      });
    }

    return true;
  };

  const baseStore: FullStore = {
    ...createCharacterSlice(set as any, get as any, api as any),
    ...createDrawingSlice(set as any, get as any, api as any),
    ...createHistorySlice(set as any, get as any, api as any),
    ...createPaletteSlice(set as any, get as any, api as any),
    ...createSaveSlice(set as any, get as any, api as any),
    ...createTransformSlice(set as any, get as any, api as any),
    ...createUiSlice(set as any, get as any, api as any),
    generateParticleAnimation,
  };

  const storeWithHistory = wrapWithHistory(baseStore, () => get().pushHistory());

  const resetCharacter = (): void => {
    const newCharacter = createSampleCharacter();
    const firstAction = newCharacter.actions[0];
    const firstFrame = firstAction.frames[0];
    const newHistory = [cloneCharacter(newCharacter)];
    const resetPalettes = [{
      id: 'default',
      name: '默认调色板',
      colors: [...defaultColors],
      isPreset: false,
    }];
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
      pixelColors: [...defaultColors],
      palettes: resetPalettes,
      activePaletteId: 'default',
    });
  };

  setTimeout(() => {
    const state = usePixelEditorStore.getState();
    if (state.character.actions.length > 0) {
      const firstAction = state.character.actions[0];
      const firstFrame = firstAction.frames[0];
      usePixelEditorStore.setState({
        currentActionId: firstAction.id,
        currentFrameId: firstFrame?.id || null,
        currentLayerId: firstFrame?.layers[0]?.id || null,
        history: [cloneCharacter(state.character)],
        historyIndex: 0,
      });
    }
  }, 0);

  return {
    ...storeWithHistory,
    character: initialCharacter,
    history: initialHistory,
    historyIndex: 0,
    resetCharacter,
  };
});

let lastPersistedPalettesKey = '';
usePixelEditorStore.subscribe((state) => {
  const key = JSON.stringify(state.palettes) + '|' + state.activePaletteId;
  if (key !== lastPersistedPalettesKey) {
    lastPersistedPalettesKey = key;
    persistPalettes(state.palettes, state.activePaletteId);
  }
});
