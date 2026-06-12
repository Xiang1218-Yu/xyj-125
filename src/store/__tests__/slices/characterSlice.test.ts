import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createCharacterSlice } from '../../slices/characterSlice';
import { createDrawingSlice } from '../../slices/drawingSlice';
import { createTestCharacter, createDefaultPalette } from '../testHelpers';
import { defaultColors } from '../../initialData';
import { generateId } from '../../utils';
import type { Character, Frame, Layer, Action } from '@/types/animation';

describe('store/slices/characterSlice', () => {
  const createStore = () => {
    const character = createTestCharacter(4, 4);
    const store = create<any>((set, get, api) => ({
      ...createCharacterSlice(set, get, api),
      ...createDrawingSlice(set, get, api),
      character,
      currentActionId: character.actions[0].id,
      currentFrameId: character.actions[0].frames[0].id,
      currentLayerId: character.actions[0].frames[0].layers[0].id,
      selectedFrameIds: [],
      selection: null,
      clipboardPixels: null,
      pixelColors: [...defaultColors],
      palettes: [createDefaultPalette()],
      activePaletteId: 'default',
    }));
    return store;
  };

  describe('initial state', () => {
    it('should have empty initial values for selection state', () => {
      const state = createStore().getState();
      expect(state.selectedFrameIds).toEqual([]);
      expect(state.selection).toBeNull();
      expect(state.clipboardPixels).toBeNull();
    });
  });

  describe('applyTemplate', () => {
    it('should apply warrior template successfully', () => {
      const store = createStore();
      const result = store.getState().applyTemplate('warrior');
      expect(result).toBe(true);
      expect(store.getState().character.name).toBe('战士');
    });

    it('should apply mage template successfully', () => {
      const store = createStore();
      const result = store.getState().applyTemplate('mage');
      expect(result).toBe(true);
      expect(store.getState().character.name).toBe('法师');
    });

    it('should return false for nonexistent template', () => {
      const store = createStore();
      const charBefore = store.getState().character;
      const result = store.getState().applyTemplate('nonexistent-template');
      expect(result).toBe(false);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should clear selectedFrameIds when applying template', () => {
      const store = createStore();
      store.setState({ selectedFrameIds: ['a', 'b'] });
      store.getState().applyTemplate('warrior');
      expect(store.getState().selectedFrameIds).toEqual([]);
    });
  });

  describe('setCharacter', () => {
    it('should replace character', () => {
      const store = createStore();
      const newChar = createTestCharacter(4, 4);
      newChar.name = 'NewChar';
      store.getState().setCharacter(newChar);
      expect(store.getState().character.name).toBe('NewChar');
    });
  });

  describe('setCurrentAction', () => {
    it('should set current action and update frame/layer ids', () => {
      const store = createStore();
      const secondActionId = store.getState().character.actions[1].id;
      store.getState().setCurrentAction(secondActionId);
      expect(store.getState().currentActionId).toBe(secondActionId);
      expect(store.getState().currentFrameId).toBe(store.getState().character.actions[1].frames[0].id);
      expect(store.getState().currentLayerId).toBe(store.getState().character.actions[1].frames[0].layers[0].id);
    });

    it('should handle action with no frames', () => {
      const store = createStore();
      const char = store.getState().character;
      const emptyAction: Action = { id: generateId(), name: 'Empty', frames: [], loop: true };
      store.setState({ character: { ...char, actions: [...char.actions, emptyAction] } });
      store.getState().setCurrentAction(emptyAction.id);
      expect(store.getState().currentActionId).toBe(emptyAction.id);
      expect(store.getState().currentFrameId).toBeNull();
      expect(store.getState().currentLayerId).toBeNull();
    });
  });

  describe('setCurrentFrame', () => {
    it('should set current frame and update layer id', () => {
      const store = createStore();
      const secondFrameId = store.getState().character.actions[0].frames[1].id;
      store.getState().setCurrentFrame(secondFrameId);
      expect(store.getState().currentFrameId).toBe(secondFrameId);
      expect(store.getState().currentLayerId).toBeDefined();
    });

    it('should handle frame with no layers', () => {
      const store = createStore();
      const char = store.getState().character;
      const noLayerFrame: Frame = { id: generateId(), name: 'NoLayers', layers: [], delay: 100 };
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a, i) => i === 0 ? { ...a, frames: [...a.frames, noLayerFrame] } : a),
        },
      });
      store.getState().setCurrentFrame(noLayerFrame.id);
      expect(store.getState().currentFrameId).toBe(noLayerFrame.id);
      expect(store.getState().currentLayerId).toBeNull();
    });
  });

  describe('setCurrentLayer', () => {
    it('should set current layer id', () => {
      const store = createStore();
      store.getState().setCurrentLayer('new-layer-id');
      expect(store.getState().currentLayerId).toBe('new-layer-id');
    });
  });

  describe('addAction', () => {
    it('should add a new action and select it', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions.length;
      store.getState().addAction('attack');
      expect(store.getState().character.actions.length).toBe(beforeCount + 1);
      const newAction = store.getState().character.actions[store.getState().character.actions.length - 1];
      expect(newAction.name).toBe('attack');
      expect(newAction.frames.length).toBe(1);
      expect(newAction.loop).toBe(true);
      expect(store.getState().currentActionId).toBe(newAction.id);
      expect(store.getState().currentFrameId).toBe(newAction.frames[0].id);
    });
  });

  describe('deleteAction', () => {
    it('should delete action and select first remaining if current was deleted', () => {
      const store = createStore();
      const currentId = store.getState().currentActionId;
      store.getState().deleteAction(currentId);
      expect(store.getState().character.actions.find(a => a.id === currentId)).toBeUndefined();
      expect(store.getState().currentActionId).toBe(store.getState().character.actions[0]?.id || null);
    });

    it('should keep currentActionId if deleting another action', () => {
      const store = createStore();
      const firstId = store.getState().character.actions[0].id;
      const secondId = store.getState().character.actions[1].id;
      store.getState().setCurrentAction(firstId);
      store.getState().deleteAction(secondId);
      expect(store.getState().currentActionId).toBe(firstId);
    });

    it('should handle deleting last action', () => {
      const store = createStore();
      const char = store.getState().character;
      store.setState({ character: { ...char, actions: [char.actions[0]] } });
      store.getState().deleteAction(char.actions[0].id);
      expect(store.getState().character.actions.length).toBe(0);
      expect(store.getState().currentActionId).toBeNull();
      expect(store.getState().currentFrameId).toBeNull();
    });
  });

  describe('renameAction', () => {
    it('should rename action', () => {
      const store = createStore();
      const id = store.getState().character.actions[0].id;
      store.getState().renameAction(id, 'NewName');
      expect(store.getState().character.actions[0].name).toBe('NewName');
    });
  });

  describe('duplicateAction', () => {
    it('should duplicate action with _copy suffix', () => {
      const store = createStore();
      const id = store.getState().character.actions[0].id;
      const beforeCount = store.getState().character.actions.length;
      store.getState().duplicateAction(id);
      expect(store.getState().character.actions.length).toBe(beforeCount + 1);
      const dup = store.getState().character.actions[store.getState().character.actions.length - 1];
      expect(dup.name).toMatch(/_copy$/);
      expect(dup.frames.length).toBe(store.getState().character.actions[0].frames.length);
    });

    it('should not duplicate nonexistent action', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions.length;
      store.getState().duplicateAction('nonexistent');
      expect(store.getState().character.actions.length).toBe(beforeCount);
    });
  });

  describe('setActionLoop', () => {
    it('should set action loop to false', () => {
      const store = createStore();
      const id = store.getState().character.actions[0].id;
      store.getState().setActionLoop(id, false);
      expect(store.getState().character.actions[0].loop).toBe(false);
    });

    it('should set action loop to true', () => {
      const store = createStore();
      const id = store.getState().character.actions[0].id;
      store.getState().setActionLoop(id, true);
      expect(store.getState().character.actions[0].loop).toBe(true);
    });
  });

  describe('addFrame', () => {
    it('should add frame after current frame', () => {
      const store = createStore();
      const actionId = store.getState().character.actions[0].id;
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().addFrame(actionId);
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount + 1);
      expect(store.getState().currentFrameId).toBeDefined();
    });

    it('should add frame to end if no current frame in action', () => {
      const store = createStore();
      const actionId = store.getState().character.actions[1].id;
      const beforeCount = store.getState().character.actions[1].frames.length;
      store.getState().addFrame(actionId);
      expect(store.getState().character.actions[1].frames.length).toBe(beforeCount + 1);
    });

    it('should not add frame if action not found', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().addFrame('nonexistent');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });
  });

  describe('deleteFrame', () => {
    it('should delete current frame and select adjacent', () => {
      const store = createStore();
      const char = store.getState().character;
      const frameToDelete = char.actions[0].frames[0].id;
      store.getState().deleteFrame(frameToDelete);
      expect(store.getState().character.actions[0].frames.find(f => f.id === frameToDelete)).toBeUndefined();
    });

    it('should not delete if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().deleteFrame('any');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });

    it('should not delete if action not found', () => {
      const store = createStore();
      const id = store.getState().character.actions[0].id;
      store.setState({ currentActionId: 'nonexistent' });
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().deleteFrame('any');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });

    it('should not delete nonexistent frame', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().deleteFrame('nonexistent');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });
  });

  describe('duplicateFrame', () => {
    it('should duplicate frame', () => {
      const store = createStore();
      const frameId = store.getState().character.actions[0].frames[0].id;
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().duplicateFrame(frameId);
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount + 1);
    });

    it('should not duplicate with no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().duplicateFrame('any');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });

    it('should not duplicate nonexistent frame', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().duplicateFrame('nonexistent');
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });
  });

  describe('renameFrame', () => {
    it('should rename frame', () => {
      const store = createStore();
      const frameId = store.getState().character.actions[0].frames[0].id;
      store.getState().renameFrame(frameId, 'RenamedFrame');
      expect(store.getState().character.actions[0].frames[0].name).toBe('RenamedFrame');
    });

    it('should not rename with no currentActionId', () => {
      const store = createStore();
      const frameId = store.getState().character.actions[0].frames[0].id;
      store.setState({ currentActionId: null });
      store.getState().renameFrame(frameId, 'ShouldNotChange');
      expect(store.getState().character.actions[0].frames[0].name).not.toBe('ShouldNotChange');
    });
  });

  describe('moveFrame', () => {
    it('should move frame to different index', () => {
      const store = createStore();
      const firstFrameId = store.getState().character.actions[0].frames[0].id;
      store.getState().moveFrame(0, 1);
      expect(store.getState().character.actions[0].frames[1].id).toBe(firstFrameId);
    });

    it('should not move with no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      expect(() => store.getState().moveFrame(0, 1)).not.toThrow();
    });
  });

  describe('setFrameDelay', () => {
    it('should set frame delay', () => {
      const store = createStore();
      const frameId = store.getState().character.actions[0].frames[0].id;
      store.getState().setFrameDelay(frameId, 500);
      expect(store.getState().character.actions[0].frames[0].delay).toBe(500);
    });

    it('should not set delay with no currentActionId', () => {
      const store = createStore();
      const frameId = store.getState().character.actions[0].frames[0].id;
      store.setState({ currentActionId: null });
      store.getState().setFrameDelay(frameId, 500);
      expect(store.getState().character.actions[0].frames[0].delay).not.toBe(500);
    });
  });

  describe('frame selection', () => {
    it('setSelectedFrameIds should replace ids', () => {
      const store = createStore();
      store.getState().setSelectedFrameIds(['a', 'b']);
      expect(store.getState().selectedFrameIds).toEqual(['a', 'b']);
    });

    it('toggleFrameSelection should add if not present', () => {
      const store = createStore();
      store.getState().toggleFrameSelection('f1');
      expect(store.getState().selectedFrameIds).toContain('f1');
    });

    it('toggleFrameSelection should remove if present', () => {
      const store = createStore();
      store.setState({ selectedFrameIds: ['f1', 'f2'] });
      store.getState().toggleFrameSelection('f1');
      expect(store.getState().selectedFrameIds).toEqual(['f2']);
    });

    it('clearFrameSelection should empty list', () => {
      const store = createStore();
      store.setState({ selectedFrameIds: ['a', 'b'] });
      store.getState().clearFrameSelection();
      expect(store.getState().selectedFrameIds).toEqual([]);
    });
  });

  describe('batch frame operations', () => {
    it('batchRenameFrames should rename multiple frames', () => {
      const store = createStore();
      const frameIds = store.getState().character.actions[0].frames.map(f => f.id);
      store.setState({ selectedFrameIds: frameIds });
      store.getState().batchRenameFrames('test', 1);
      const names = store.getState().character.actions[0].frames.map(f => f.name);
      expect(names).toContain('test_001');
      expect(names).toContain('test_002');
    });

    it('batchRenameFrames should do nothing with no selection', () => {
      const store = createStore();
      const namesBefore = store.getState().character.actions[0].frames.map(f => f.name);
      store.getState().batchRenameFrames('x', 1);
      const namesAfter = store.getState().character.actions[0].frames.map(f => f.name);
      expect(namesAfter).toEqual(namesBefore);
    });

    it('batchDuplicateFrames should duplicate multiple frames', () => {
      const store = createStore();
      const frameIds = [store.getState().character.actions[0].frames[0].id];
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().batchDuplicateFrames(frameIds);
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount + 1);
      expect(store.getState().selectedFrameIds.length).toBe(1);
    });

    it('batchDuplicateFrames should handle nonexistent ids', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions[0].frames.length;
      store.getState().batchDuplicateFrames(['fake1', 'fake2']);
      expect(store.getState().character.actions[0].frames.length).toBe(beforeCount);
    });

    it('batchDeleteFrames should delete multiple frames', () => {
      const store = createStore();
      const char = store.getState().character;
      const frameIds = char.actions[0].frames.map(f => f.id);
      const beforeCount = char.actions[0].frames.length;
      store.getState().batchDeleteFrames(frameIds);
      expect(store.getState().character.actions[0].frames.length).toBe(0);
      expect(store.getState().selectedFrameIds).toEqual([]);
    });

    it('batchDeleteFrames should handle deleting current frame', () => {
      const store = createStore();
      const currentId = store.getState().currentFrameId;
      store.getState().batchDeleteFrames([currentId]);
      expect(store.getState().currentFrameId).not.toBe(currentId);
    });

    it('batch operations should do nothing with no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      expect(() => {
        store.getState().batchRenameFrames('x', 1);
        store.getState().batchDuplicateFrames(['a']);
        store.getState().batchDeleteFrames(['a']);
      }).not.toThrow();
    });
  });

  describe('layer operations', () => {
    it('addLayer should add new layer', () => {
      const store = createStore();
      const beforeCount = store.getState().character.actions[0].frames[0].layers.length;
      store.getState().addLayer();
      expect(store.getState().character.actions[0].frames[0].layers.length).toBe(beforeCount + 1);
    });

    it('deleteLayer should delete layer', () => {
      const store = createStore();
      const char = store.getState().character;
      const actionId = char.actions[0].id;
      const frameId = char.actions[0].frames[0].id;
      const newStore = create<any>((set, get, api) => ({
        ...createCharacterSlice(set, get, api),
        character: {
          ...char,
          actions: char.actions.map(a => a.id === actionId ? {
            ...a,
            frames: a.frames.map(f => f.id === frameId ? {
              ...f,
              layers: [...f.layers, { id: generateId(), name: 'L2', pixels: [], visible: true, locked: false, opacity: 1 }],
            } : f),
          } : a),
        },
        currentActionId: actionId,
        currentFrameId: frameId,
        currentLayerId: char.actions[0].frames[0].layers[0].id,
      }));
      const layerId = newStore.getState().character.actions[0].frames[0].layers[0].id;
      const beforeCount = newStore.getState().character.actions[0].frames[0].layers.length;
      newStore.getState().deleteLayer(layerId);
      expect(newStore.getState().character.actions[0].frames[0].layers.length).toBe(beforeCount - 1);
    });

    it('deleteLayer should not delete the only layer', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().deleteLayer(layerId);
      expect(store.getState().character.actions[0].frames[0].layers.length).toBe(1);
    });

    it('duplicateLayer should duplicate layer', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      const beforeCount = store.getState().character.actions[0].frames[0].layers.length;
      store.getState().duplicateLayer(layerId);
      expect(store.getState().character.actions[0].frames[0].layers.length).toBe(beforeCount + 1);
    });

    it('renameLayer should rename layer', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().renameLayer(layerId, 'NewLayerName');
      expect(store.getState().character.actions[0].frames[0].layers[0].name).toBe('NewLayerName');
    });

    it('moveLayer should move layer', () => {
      const store = createStore();
      const char = store.getState().character;
      const actionId = char.actions[0].id;
      const frameId = char.actions[0].frames[0].id;
      const newStore = create<any>((set, get, api) => ({
        ...createCharacterSlice(set, get, api),
        character: {
          ...char,
          actions: char.actions.map(a => a.id === actionId ? {
            ...a,
            frames: a.frames.map(f => f.id === frameId ? {
              ...f,
              layers: [
                ...f.layers,
                { id: generateId(), name: 'L2', pixels: [], visible: true, locked: false, opacity: 1 },
              ],
            } : f),
          } : a),
        },
        currentActionId: actionId,
        currentFrameId: frameId,
        currentLayerId: char.actions[0].frames[0].layers[0].id,
      }));
      expect(() => newStore.getState().moveLayer(0, 1)).not.toThrow();
    });

    it('setLayerVisible should set visibility', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().setLayerVisible(layerId, false);
      expect(store.getState().character.actions[0].frames[0].layers[0].visible).toBe(false);
    });

    it('setLayerLocked should set locked', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().setLayerLocked(layerId, true);
      expect(store.getState().character.actions[0].frames[0].layers[0].locked).toBe(true);
    });

    it('setLayerOpacity should clamp between 0 and 1', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().setLayerOpacity(layerId, 0.5);
      expect(store.getState().character.actions[0].frames[0].layers[0].opacity).toBe(0.5);
      store.getState().setLayerOpacity(layerId, -1);
      expect(store.getState().character.actions[0].frames[0].layers[0].opacity).toBe(0);
      store.getState().setLayerOpacity(layerId, 2);
      expect(store.getState().character.actions[0].frames[0].layers[0].opacity).toBe(1);
    });

    it('layer operations should do nothing with null ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null, currentFrameId: null });
      expect(() => {
        store.getState().addLayer();
        store.getState().deleteLayer('x');
        store.getState().duplicateLayer('x');
        store.getState().renameLayer('x', 'y');
        store.getState().moveLayer(0, 1);
        store.getState().setLayerVisible('x', true);
        store.getState().setLayerLocked('x', true);
        store.getState().setLayerOpacity('x', 0.5);
      }).not.toThrow();
    });
  });

  describe('getters', () => {
    it('getCurrentAction should return current action', () => {
      const store = createStore();
      const action = store.getState().getCurrentAction();
      expect(action).not.toBeNull();
      expect(action!.id).toBe(store.getState().currentActionId);
    });

    it('getCurrentAction should return null if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      expect(store.getState().getCurrentAction()).toBeNull();
    });

    it('getCurrentFrame should return current frame', () => {
      const store = createStore();
      const frame = store.getState().getCurrentFrame();
      expect(frame).not.toBeNull();
    });

    it('getCurrentLayer should return current layer', () => {
      const store = createStore();
      const layer = store.getState().getCurrentLayer();
      expect(layer).not.toBeNull();
    });

    it('getCurrentLayer should return null with missing ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      expect(store.getState().getCurrentLayer()).toBeNull();
    });

    it('getFrameMergedPixels should merge layer pixels', () => {
      const store = createStore();
      const frame = store.getState().character.actions[0].frames[0];
      const merged = store.getState().getFrameMergedPixels(frame);
      expect(merged.length).toBe(4);
      expect(merged[0].length).toBe(4);
    });
  });

  describe('generateSpriteSheet', () => {
    beforeEach(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: () => ctx,
            width: 0,
            height: 0,
          } as any;
        }
        return document.createElement(tag);
      });
    });

    it('should return null for action with no frames', () => {
      const store = createStore();
      const emptyAction: Action = { id: 'empty', name: 'Empty', frames: [], loop: true };
      store.setState({
        character: { ...store.getState().character, actions: [...store.getState().character.actions, emptyAction] },
      });
      expect(store.getState().generateSpriteSheet('empty')).toBeNull();
    });

    it('should return null for nonexistent action', () => {
      const store = createStore();
      expect(store.getState().generateSpriteSheet('nonexistent')).toBeNull();
    });

    it('should return null when ctx is not available', () => {
      vi.restoreAllMocks();
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return { getContext: () => null } as any;
        }
        return document.createElement(tag);
      });
      const store = createStore();
      expect(store.getState().generateSpriteSheet(store.getState().character.actions[0].id)).toBeNull();
    });
  });

  describe('setCharacterSize', () => {
    it('should increase character size preserving pixels', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 2);
      store.getState().setCharacterSize(8, 8);
      expect(store.getState().character.width).toBe(8);
      expect(store.getState().character.height).toBe(8);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(2);
      expect(layer.pixels.length).toBe(8);
    });

    it('should decrease character size cropping pixels', () => {
      const store = createStore();
      store.getState().setCharacterSize(2, 2);
      expect(store.getState().character.width).toBe(2);
      expect(store.getState().character.height).toBe(2);
    });
  });

  describe('clipboard operations', () => {
    it('setSelection should set selection', () => {
      const store = createStore();
      store.getState().setSelection({ x: 0, y: 0, width: 2, height: 2 });
      expect(store.getState().selection).toEqual({ x: 0, y: 0, width: 2, height: 2 });
    });

    it('setSelection should accept null', () => {
      const store = createStore();
      store.setState({ selection: { x: 0, y: 0, width: 1, height: 1 } });
      store.getState().setSelection(null);
      expect(store.getState().selection).toBeNull();
    });

    it('setClipboardPixels should set clipboard', () => {
      const store = createStore();
      const pixels = [[1, 2], [3, 4]];
      store.getState().setClipboardPixels(pixels);
      expect(store.getState().clipboardPixels).toEqual(pixels);
    });

    it('copySelection should copy selected area', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 5);
      store.getState().setPixel(1, 0, 6);
      store.getState().setSelection({ x: 0, y: 0, width: 2, height: 1 });
      store.getState().copySelection();
      expect(store.getState().clipboardPixels).toEqual([[5, 6]]);
    });

    it('copySelection should handle out-of-bounds selection', () => {
      const store = createStore();
      store.getState().setSelection({ x: -1, y: -1, width: 3, height: 3 });
      store.getState().copySelection();
      expect(store.getState().clipboardPixels).not.toBeNull();
    });

    it('copySelection should do nothing with null ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null, selection: { x: 0, y: 0, width: 1, height: 1 } });
      store.getState().copySelection();
      expect(store.getState().clipboardPixels).toBeNull();
    });

    it('copySelection should do nothing with no selection', () => {
      const store = createStore();
      store.getState().copySelection();
      expect(store.getState().clipboardPixels).toBeNull();
    });

    it('cutSelection should copy and delete selection', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 3);
      store.getState().setSelection({ x: 0, y: 0, width: 1, height: 1 });
      store.getState().cutSelection();
      expect(store.getState().clipboardPixels).toEqual([[3]]);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(-1);
    });

    it('pasteClipboard should paste pixels', () => {
      const store = createStore();
      store.getState().setClipboardPixels([[9]]);
      store.getState().pasteClipboard(0, 0);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(9);
    });

    it('pasteClipboard should not paste transparent pixels (-1)', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 5);
      store.getState().setClipboardPixels([[-1]]);
      store.getState().pasteClipboard(0, 0);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(5);
    });

    it('pasteClipboard should handle out of bounds coordinates', () => {
      const store = createStore();
      store.getState().setClipboardPixels([[1, 2], [3, 4]]);
      expect(() => store.getState().pasteClipboard(-10, -10)).not.toThrow();
      expect(() => store.getState().pasteClipboard(100, 100)).not.toThrow();
    });

    it('pasteClipboard should do nothing with null ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null, clipboardPixels: [[1]] });
      const charBefore = store.getState().character;
      store.getState().pasteClipboard(0, 0);
      expect(store.getState().character).toBe(charBefore);
    });

    it('pasteClipboard should skip locked layers', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map(a => ({
            ...a,
            frames: a.frames.map(f => ({
              ...f,
              layers: f.layers.map(l => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
        clipboardPixels: [[9]],
      });
      store.getState().pasteClipboard(0, 0);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).not.toBe(9);
    });

    it('deleteSelection should clear selected pixels', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 7);
      store.getState().setSelection({ x: 0, y: 0, width: 1, height: 1 });
      store.getState().deleteSelection();
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(-1);
      expect(store.getState().selection).toBeNull();
    });

    it('deleteSelection should handle out of bounds', () => {
      const store = createStore();
      store.getState().setSelection({ x: 100, y: 100, width: 10, height: 10 });
      expect(() => store.getState().deleteSelection()).not.toThrow();
    });

    it('deleteSelection should do nothing with null ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null, selection: { x: 0, y: 0, width: 1, height: 1 } });
      expect(() => store.getState().deleteSelection()).not.toThrow();
    });

    it('deleteSelection should skip locked layers', () => {
      const store = createStore();
      const layerId = store.getState().character.actions[0].frames[0].layers[0].id;
      store.getState().setPixel(0, 0, 8);
      const currentChar = store.getState().character;
      store.setState({
        character: {
          ...currentChar,
          actions: currentChar.actions.map(a => ({
            ...a,
            frames: a.frames.map(f => ({
              ...f,
              layers: f.layers.map(l => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
        selection: { x: 0, y: 0, width: 1, height: 1 },
      });
      store.getState().deleteSelection();
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(8);
    });
  });
});
