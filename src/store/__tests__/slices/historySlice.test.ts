import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createHistorySlice } from '../../slices/historySlice';
import { createTestCharacter } from '../testHelpers';
import type { Character } from '@/types/animation';
import { cloneCharacter } from '../../utils';

describe('store/slices/historySlice', () => {
  const createStore = () => {
    const character = createTestCharacter(4, 4);
    const store = create<any>((set, get, api) => ({
      ...createHistorySlice(set, get, api),
      character,
      currentActionId: character.actions[0].id,
      currentFrameId: character.actions[0].frames[0].id,
      currentLayerId: character.actions[0].frames[0].layers[0].id,
    }));
    return store;
  };

  describe('initial state', () => {
    it('should have empty history and -1 index initially', () => {
      const store = createStore();
      const state = store.getState();
      expect(state.history).toEqual([]);
      expect(state.historyIndex).toBe(-1);
    });
  });

  describe('pushHistory', () => {
    it('should push character clone to history', () => {
      const store = createStore();
      store.getState().pushHistory();
      const state = store.getState();
      expect(state.history.length).toBe(1);
      expect(state.historyIndex).toBe(0);
      expect(state.history[0]).toEqual(state.character);
    });

    it('should truncate redo history when pushing after undo', () => {
      const store = createStore();
      store.getState().pushHistory();
      store.setState({ character: cloneCharacter(createTestCharacter(4, 4)) });
      store.getState().pushHistory();
      expect(store.getState().history.length).toBe(2);

      store.getState().undo();
      expect(store.getState().historyIndex).toBe(0);
      expect(store.getState().history.length).toBe(2);

      store.setState({ character: cloneCharacter(createTestCharacter(4, 4)) });
      store.getState().pushHistory();
      expect(store.getState().history.length).toBe(2);
      expect(store.getState().historyIndex).toBe(1);
    });

    it('should enforce MAX_HISTORY limit of 50', () => {
      const store = createStore();
      for (let i = 0; i < 60; i++) {
        store.setState({ character: cloneCharacter(createTestCharacter(4, 4)) });
        store.getState().pushHistory();
      }
      const state = store.getState();
      expect(state.history.length).toBe(50);
      expect(state.historyIndex).toBe(49);
    });
  });

  describe('undo', () => {
    it('should not undo when historyIndex <= 0', () => {
      const store = createStore();
      store.getState().pushHistory();
      const beforeChar = store.getState().character;
      store.getState().undo();
      expect(store.getState().character).toBe(beforeChar);
      expect(store.getState().historyIndex).toBe(0);
    });

    it('should undo to previous state', () => {
      const store = createStore();
      store.getState().pushHistory();
      const firstChar = store.getState().character;

      const newChar = cloneCharacter(createTestCharacter(4, 4));
      newChar.name = 'Modified';
      store.setState({ character: newChar });
      store.getState().pushHistory();
      expect(store.getState().character.name).toBe('Modified');

      store.getState().undo();
      expect(store.getState().character.name).toBe(firstChar.name);
      expect(store.getState().historyIndex).toBe(0);
    });

    it('should update current action/frame/layer ids after undo', () => {
      const store = createStore();
      store.getState().pushHistory();
      store.getState().undo();
      const state = store.getState();
      expect(state.currentActionId).toBeDefined();
      expect(state.currentFrameId).toBeDefined();
      expect(state.currentLayerId).toBeDefined();
    });

    it('should handle character with no actions on undo', () => {
      const store = createStore();
      const emptyChar: Character = {
        id: 'empty',
        name: 'Empty',
        width: 4,
        height: 4,
        actions: [],
      };
      store.setState({ character: emptyChar });
      store.getState().pushHistory();
      store.getState().pushHistory();
      store.getState().undo();
      const state = store.getState();
      expect(state.currentActionId).toBeNull();
      expect(state.currentFrameId).toBeNull();
      expect(state.currentLayerId).toBeNull();
    });
  });

  describe('redo', () => {
    it('should not redo when at end of history', () => {
      const store = createStore();
      store.getState().pushHistory();
      const beforeChar = store.getState().character;
      store.getState().redo();
      expect(store.getState().character).toBe(beforeChar);
      expect(store.getState().historyIndex).toBe(0);
    });

    it('should redo to next state', () => {
      const store = createStore();
      store.getState().pushHistory();

      const newChar = cloneCharacter(createTestCharacter(4, 4));
      newChar.name = 'RedoTarget';
      store.setState({ character: newChar });
      store.getState().pushHistory();
      expect(store.getState().character.name).toBe('RedoTarget');

      store.getState().undo();
      expect(store.getState().historyIndex).toBe(0);

      store.getState().redo();
      expect(store.getState().character.name).toBe('RedoTarget');
      expect(store.getState().historyIndex).toBe(1);
    });

    it('should update current action/frame/layer ids after redo', () => {
      const store = createStore();
      store.getState().pushHistory();
      store.getState().pushHistory();
      store.getState().undo();
      store.getState().redo();
      const state = store.getState();
      expect(state.currentActionId).toBeDefined();
      expect(state.currentFrameId).toBeDefined();
      expect(state.currentLayerId).toBeDefined();
    });
  });

  describe('canUndo', () => {
    it('should return false when historyIndex <= 0', () => {
      const store = createStore();
      expect(store.getState().canUndo()).toBe(false);
      store.getState().pushHistory();
      expect(store.getState().canUndo()).toBe(false);
    });

    it('should return true when historyIndex > 0', () => {
      const store = createStore();
      store.getState().pushHistory();
      store.getState().pushHistory();
      expect(store.getState().canUndo()).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('should return false when at end of history', () => {
      const store = createStore();
      expect(store.getState().canRedo()).toBe(false);
      store.getState().pushHistory();
      expect(store.getState().canRedo()).toBe(false);
    });

    it('should return true when not at end of history', () => {
      const store = createStore();
      store.getState().pushHistory();
      store.getState().pushHistory();
      store.getState().undo();
      expect(store.getState().canRedo()).toBe(true);
    });
  });
});
