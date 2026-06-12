import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createSaveSlice } from '../../slices/saveSlice';
import { createTestCharacter, createDefaultPalette } from '../testHelpers';
import { defaultColors } from '../../initialData';
import type { SaveMeta } from '@/types/animation';

describe('store/slices/saveSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createStore = () => {
    const character = createTestCharacter(4, 4);
    const store = create<any>((set, get, api) => ({
      ...createSaveSlice(set, get, api),
      character,
      pixelColors: [...defaultColors],
      fps: 8,
      gridSize: 20,
      palettes: [createDefaultPalette()],
      activePaletteId: 'default',
      currentActionId: character.actions[0].id,
      currentFrameId: character.actions[0].frames[0].id,
      currentLayerId: character.actions[0].frames[0].layers[0].id,
      history: [],
      historyIndex: -1,
    }));
    return store;
  };

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const state = createStore().getState();
      expect(state.lastSavedTime).toBeNull();
      expect(state.currentSaveName).toBeNull();
      expect(state.autoSave).toBe(false);
      expect(state.autoSaveInterval).toBe(5);
    });
  });

  describe('hasSave', () => {
    it('should return false when save does not exist', () => {
      const store = createStore();
      expect(store.getState().hasSave('nonexistent')).toBe(false);
    });

    it('should return true when save exists', () => {
      const store = createStore();
      store.getState().saveAs('testSave');
      expect(store.getState().hasSave('testSave')).toBe(true);
    });
  });

  describe('listSaves', () => {
    it('should return empty array when no saves', () => {
      const store = createStore();
      expect(store.getState().listSaves()).toEqual([]);
    });

    it('should list saves sorted by updatedAt desc', () => {
      const store = createStore();
      store.getState().saveAs('save1');
      store.getState().saveAs('save2');
      const saves = store.getState().listSaves();
      expect(saves.length).toBe(2);
      expect(saves[0].updatedAt).toBeGreaterThanOrEqual(saves[1].updatedAt);
    });

    it('should skip corrupted save entries', () => {
      localStorage.setItem('pixel_animator_saves_index', JSON.stringify(['bad', 'good']));
      localStorage.setItem('pixel_animator_save_bad', 'not valid json');
      const store = createStore();
      store.getState().saveAs('good');
      const saves = store.getState().listSaves();
      expect(saves.length).toBe(1);
      expect(saves[0].name).toBe('good');
    });
  });

  describe('saveAs', () => {
    it('should save successfully and update state', () => {
      const store = createStore();
      const result = store.getState().saveAs('mySave');
      expect(result).toBe(true);
      expect(store.getState().currentSaveName).toBe('mySave');
      expect(store.getState().lastSavedTime).not.toBeNull();
    });

    it('should return false for empty name', () => {
      const store = createStore();
      expect(store.getState().saveAs('')).toBe(false);
      expect(store.getState().saveAs('   ')).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const store = createStore();
      store.getState().saveAs('  trimmed  ');
      expect(store.getState().currentSaveName).toBe('trimmed');
    });

    it('should update existing save metadata', () => {
      const store = createStore();
      store.getState().saveAs('updateTest');
      const firstTime = store.getState().lastSavedTime;
      store.getState().saveAs('updateTest');
      expect(store.getState().lastSavedTime!).toBeGreaterThanOrEqual(firstTime!);
    });

    it('should handle localStorage errors gracefully', () => {
      const store = createStore();
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('fail'); };
      const result = store.getState().saveAs('errorSave');
      expect(result).toBe(false);
      localStorage.setItem = originalSetItem;
    });
  });

  describe('save', () => {
    it('should return false when no current save name', () => {
      const store = createStore();
      expect(store.getState().save()).toBe(false);
    });

    it('should call saveAs with current name', () => {
      const store = createStore();
      store.getState().saveAs('existing');
      const result = store.getState().save();
      expect(result).toBe(true);
    });
  });

  describe('loadSave', () => {
    it('should load saved character and update state', () => {
      const store = createStore();
      store.getState().saveAs('loadTest');
      store.setState({ character: createTestCharacter(4, 4) });
      const result = store.getState().loadSave('loadTest');
      expect(result).toBe(true);
      expect(store.getState().currentSaveName).toBe('loadTest');
      expect(store.getState().lastSavedTime).not.toBeNull();
    });

    it('should return false for empty or nonexistent name', () => {
      const store = createStore();
      expect(store.getState().loadSave('')).toBe(false);
      expect(store.getState().loadSave('nonexistent')).toBe(false);
    });

    it('should return false for corrupted data', () => {
      localStorage.setItem('pixel_animator_saves_index', JSON.stringify(['corrupt']));
      localStorage.setItem('pixel_animator_save_corrupt', 'not valid json');
      const store = createStore();
      expect(store.getState().loadSave('corrupt')).toBe(false);
    });

    it('should handle save without character data', () => {
      localStorage.setItem('pixel_animator_saves_index', JSON.stringify(['noChar']));
      localStorage.setItem('pixel_animator_save_noChar', JSON.stringify({
        meta: { name: 'noChar', createdAt: 0, updatedAt: 0, actionCount: 0, frameCount: 0 },
        data: {},
      }));
      const store = createStore();
      expect(store.getState().loadSave('noChar')).toBe(false);
    });

    it('should restore default palettes when save has none', () => {
      const store = createStore();
      const char = store.getState().character;
      const saveData = {
        meta: { name: 'noPalette', createdAt: Date.now(), updatedAt: Date.now(), actionCount: 2, frameCount: 5 } as SaveMeta,
        data: { character: char, pixelColors: defaultColors, fps: 8, gridSize: 20 },
      };
      localStorage.setItem('pixel_animator_saves_index', JSON.stringify(['noPalette']));
      localStorage.setItem('pixel_animator_save_noPalette', JSON.stringify(saveData));
      const result = store.getState().loadSave('noPalette');
      expect(result).toBe(true);
      expect(store.getState().palettes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle localStorage errors gracefully', () => {
      const store = createStore();
      store.getState().saveAs('errorTest');
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => { throw new Error('fail'); };
      const result = store.getState().loadSave('errorTest');
      expect(result).toBe(false);
      localStorage.getItem = originalGetItem;
    });
  });

  describe('deleteSave', () => {
    it('should delete save and return true', () => {
      const store = createStore();
      store.getState().saveAs('toDelete');
      expect(store.getState().hasSave('toDelete')).toBe(true);
      const result = store.getState().deleteSave('toDelete');
      expect(result).toBe(true);
      expect(store.getState().hasSave('toDelete')).toBe(false);
    });

    it('should return false for empty name', () => {
      const store = createStore();
      expect(store.getState().deleteSave('')).toBe(false);
    });

    it('should clear currentSaveName if deleting current save', () => {
      const store = createStore();
      store.getState().saveAs('current');
      expect(store.getState().currentSaveName).toBe('current');
      store.getState().deleteSave('current');
      expect(store.getState().currentSaveName).toBeNull();
      expect(store.getState().lastSavedTime).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const store = createStore();
      store.getState().saveAs('errorDel');
      const originalRemove = localStorage.removeItem;
      localStorage.removeItem = () => { throw new Error('fail'); };
      const result = store.getState().deleteSave('errorDel');
      expect(result).toBe(false);
      localStorage.removeItem = originalRemove;
    });
  });

  describe('setAutoSave', () => {
    it('should toggle auto save', () => {
      const store = createStore();
      store.getState().setAutoSave(true);
      expect(store.getState().autoSave).toBe(true);
      store.getState().setAutoSave(false);
      expect(store.getState().autoSave).toBe(false);
    });
  });

  describe('setAutoSaveInterval', () => {
    it('should set interval with min value of 1', () => {
      const store = createStore();
      store.getState().setAutoSaveInterval(10);
      expect(store.getState().autoSaveInterval).toBe(10);
      store.getState().setAutoSaveInterval(0);
      expect(store.getState().autoSaveInterval).toBe(1);
      store.getState().setAutoSaveInterval(-5);
      expect(store.getState().autoSaveInterval).toBe(1);
    });
  });

  describe('resetCharacter', () => {
    it('should be a no-op placeholder in saveSlice', () => {
      const store = createStore();
      expect(() => store.getState().resetCharacter()).not.toThrow();
    });
  });

  describe('generateParticleAnimation', () => {
    it('should return false placeholder in saveSlice', () => {
      const store = createStore();
      expect(store.getState().generateParticleAnimation({ type: 'x', frameCount: 1 })).toBe(false);
    });
  });
});
