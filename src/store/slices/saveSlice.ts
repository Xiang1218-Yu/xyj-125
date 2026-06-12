import type { StateCreator } from 'zustand';
import type { Character, PixelEditorState, PixelEditorActions, SaveMeta, SaveEntry, SaveData, PaletteGroup } from '@/types/animation';
import { cloneCharacter, migrateFramePixelsToLayers, countFrames } from '../utils';
import { defaultColors } from '../initialData';

const STORAGE_PREFIX = 'pixel_animator_save_';
const STORAGE_INDEX_KEY = 'pixel_animator_saves_index';
const DEFAULT_AUTOSAVE_INTERVAL = 5;

const readSaveIndex = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeSaveIndex = (names: string[]): void => {
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(names));
  } catch {
    console.error('Failed to write save index');
  }
};

export type SaveSlice = Pick<
  PixelEditorState,
  'lastSavedTime' | 'currentSaveName' | 'autoSave' | 'autoSaveInterval'
> &
  Pick<
    PixelEditorActions,
    | 'hasSave'
    | 'listSaves'
    | 'saveAs'
    | 'save'
    | 'loadSave'
    | 'deleteSave'
    | 'setAutoSave'
    | 'setAutoSaveInterval'
    | 'resetCharacter'
    | 'generateParticleAnimation'
  >;

export type SaveSliceCreator = StateCreator<
  any,
  [],
  [],
  SaveSlice
>;

export const createSaveSlice: SaveSliceCreator = (set, get) => ({
  lastSavedTime: null,
  currentSaveName: null,
  autoSave: false,
  autoSaveInterval: DEFAULT_AUTOSAVE_INTERVAL,

  hasSave: (name: string): boolean => {
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
      const { character, pixelColors, fps, gridSize, palettes, activePaletteId } = get() as any;
      const now = Date.now();
      const data: SaveData = { character, pixelColors, fps, gridSize, palettes, activePaletteId };

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
        const existing: SaveEntry | null = raw ? JSON.parse(raw) : null;
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

      let { character, pixelColors, fps, gridSize, palettes: savedPalettes, activePaletteId: savedActivePaletteId } = entry.data;

      const migratedChar = cloneCharacter(character);
      for (const action of migratedChar.actions) {
        action.frames = action.frames.map((f) =>
          migrateFramePixelsToLayers(f, migratedChar.width, migratedChar.height)
        );
      }
      character = migratedChar;

      const firstAction = character.actions[0];
      const firstFrame = firstAction?.frames[0];

      const clonedChar = cloneCharacter(character);
      const newHistory = [cloneCharacter(clonedChar)];

      const restoredPalettes = savedPalettes && savedPalettes.length > 0
        ? savedPalettes
        : [{
            id: 'default',
            name: '默认调色板',
            colors: pixelColors || defaultColors,
            isPreset: false,
          }];
      const restoredActivePaletteId = savedActivePaletteId || restoredPalettes[0]?.id || 'default';
      const restoredPixelColors = savedPalettes && savedPalettes.length > 0
        ? (restoredPalettes.find((p: PaletteGroup) => p.id === restoredActivePaletteId)?.colors || pixelColors || defaultColors)
        : (pixelColors || defaultColors);

      const persistPalettes = (palettes: PaletteGroup[], activePaletteId: string | null) => {
        try {
          localStorage.setItem('pixel_animator_palettes', JSON.stringify({ palettes, activePaletteId }));
        } catch {
          console.error('Failed to persist palettes');
        }
      };

      persistPalettes(restoredPalettes, restoredActivePaletteId);

      set({
        character: clonedChar,
        pixelColors: restoredPixelColors,
        fps: fps || 8,
        gridSize: gridSize || 20,
        palettes: restoredPalettes,
        activePaletteId: restoredActivePaletteId,
        currentActionId: firstAction?.id || null,
        currentFrameId: firstFrame?.id || null,
        currentLayerId: firstFrame?.layers[0]?.id || null,
        history: newHistory,
        historyIndex: 0,
        lastSavedTime: entry.meta.updatedAt,
        currentSaveName: trimmed,
        selectedFrameIds: [],
      } as Partial<PixelEditorState>);

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
      const index = readSaveIndex().filter((n) => n !== trimmed);
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

  setAutoSave: (enabled: boolean): void => {
    set({ autoSave: enabled });
  },

  setAutoSaveInterval: (minutes: number): void => {
    set({ autoSaveInterval: Math.max(1, minutes) });
  },

  resetCharacter: (): void => {},

  generateParticleAnimation: (): boolean => false,
});
