import { describe, it, expect } from 'vitest';
import {
  generateId,
  createEmptyPixels,
  deepClone,
  clonePixels,
  cloneLayer,
  cloneFrame,
  cloneAction,
  cloneCharacter,
  createDefaultLayer,
  createFrameWithPixels,
  migrateFramePixelsToLayers,
  getFrameMergedPixels,
  immutableUpdateCharacter,
  immutableUpdateAction,
  immutableUpdateFrame,
  immutableUpdateLayer,
  immutableUpdateCurrentLayer,
  immutableArrayInsert,
  immutableArrayRemove,
  immutableArrayMove,
  countFrames,
} from '../utils';
import type { Character, Action, Frame, Layer } from '@/types/animation';

describe('store/utils', () => {
  describe('generateId', () => {
    it('should return a string', () => {
      expect(typeof generateId()).toBe('string');
    });

    it('should return unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should have length between 2 and 10 characters', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThanOrEqual(2);
      expect(id.length).toBeLessThanOrEqual(10);
    });
  });

  describe('createEmptyPixels', () => {
    it('should create pixels with correct dimensions', () => {
      const pixels = createEmptyPixels(4, 3);
      expect(pixels.length).toBe(3);
      expect(pixels[0].length).toBe(4);
    });

    it('should fill with -1', () => {
      const pixels = createEmptyPixels(2, 2);
      expect(pixels).toEqual([[-1, -1], [-1, -1]]);
    });

    it('should handle zero dimensions', () => {
      const pixels = createEmptyPixels(0, 0);
      expect(pixels).toEqual([]);
    });
  });

  describe('deepClone', () => {
    it('should clone a simple object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone an array', () => {
      const arr = [[1, 2], [3, 4]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[0]).not.toBe(arr[0]);
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBeNull();
    });
  });

  describe('clonePixels', () => {
    it('should clone pixel array', () => {
      const pixels = [[1, 2], [3, 4]];
      const cloned = clonePixels(pixels);
      expect(cloned).toEqual(pixels);
      expect(cloned).not.toBe(pixels);
      expect(cloned[0]).not.toBe(pixels[0]);
    });

    it('should handle empty array', () => {
      expect(clonePixels([])).toEqual([]);
    });
  });

  const createTestLayer = (name = 'Layer 1'): Layer => ({
    id: generateId(),
    name,
    pixels: [[1, 2], [3, 4]],
    visible: true,
    locked: false,
    opacity: 1,
  });

  const createTestFrame = (name = 'Frame 1'): Frame => ({
    id: generateId(),
    name,
    layers: [createTestLayer('L1'), createTestLayer('L2')],
    delay: 200,
  });

  const createTestAction = (name = 'Action 1'): Action => ({
    id: generateId(),
    name,
    frames: [createTestFrame('F1'), createTestFrame('F2')],
    loop: true,
  });

  const createTestCharacter = (): Character => ({
    id: generateId(),
    name: 'TestChar',
    width: 16,
    height: 16,
    actions: [createTestAction('A1'), createTestAction('A2')],
  });

  describe('cloneLayer', () => {
    it('should clone layer with deep pixels', () => {
      const layer = createTestLayer();
      const cloned = cloneLayer(layer);
      expect(cloned).toEqual(layer);
      expect(cloned).not.toBe(layer);
      expect(cloned.pixels).not.toBe(layer.pixels);
    });
  });

  describe('cloneFrame', () => {
    it('should clone frame with deep layers', () => {
      const frame = createTestFrame();
      const cloned = cloneFrame(frame);
      expect(cloned).toEqual(frame);
      expect(cloned).not.toBe(frame);
      expect(cloned.layers).not.toBe(frame.layers);
      expect(cloned.layers[0]).not.toBe(frame.layers[0]);
    });
  });

  describe('cloneAction', () => {
    it('should clone action with deep frames', () => {
      const action = createTestAction();
      const cloned = cloneAction(action);
      expect(cloned).toEqual(action);
      expect(cloned).not.toBe(action);
      expect(cloned.frames).not.toBe(action.frames);
    });
  });

  describe('cloneCharacter', () => {
    it('should clone character with deep actions', () => {
      const character = createTestCharacter();
      const cloned = cloneCharacter(character);
      expect(cloned).toEqual(character);
      expect(cloned).not.toBe(character);
      expect(cloned.actions).not.toBe(character.actions);
    });
  });

  describe('createDefaultLayer', () => {
    it('should create layer with correct properties', () => {
      const layer = createDefaultLayer(8, 6, 'MyLayer');
      expect(layer.name).toBe('MyLayer');
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
      expect(layer.opacity).toBe(1);
      expect(layer.pixels.length).toBe(6);
      expect(layer.pixels[0].length).toBe(8);
    });

    it('should use default name when not provided', () => {
      const layer = createDefaultLayer(4, 4);
      expect(layer.name).toBe('Layer 1');
    });
  });

  describe('createFrameWithPixels', () => {
    it('should create frame with given pixels', () => {
      const pixels = [[1, 2], [3, 4]];
      const frame = createFrameWithPixels(2, 2, pixels, 'TestFrame', 150);
      expect(frame.name).toBe('TestFrame');
      expect(frame.delay).toBe(150);
      expect(frame.layers.length).toBe(1);
      expect(frame.layers[0].pixels).toEqual(pixels);
    });

    it('should deep clone pixels', () => {
      const pixels = [[1]];
      const frame = createFrameWithPixels(1, 1, pixels, 'F', 100);
      frame.layers[0].pixels[0][0] = 99;
      expect(pixels[0][0]).toBe(1);
    });
  });

  describe('migrateFramePixelsToLayers', () => {
    it('should return frame as-is if it already has layers', () => {
      const frame = createTestFrame();
      const result = migrateFramePixelsToLayers(frame, 2, 2);
      expect(result).toBe(frame);
    });

    it('should migrate old format with pixels to layers', () => {
      const oldFrame: any = {
        id: 'old',
        name: 'Old',
        pixels: [[1, 2], [3, 4]],
        delay: 100,
      };
      const result = migrateFramePixelsToLayers(oldFrame, 2, 2);
      expect(result.layers).toBeDefined();
      expect(result.layers.length).toBe(1);
      expect(result.layers[0].pixels).toEqual([[1, 2], [3, 4]]);
      expect(result.name).toBe('Old');
      expect(result.delay).toBe(100);
    });

    it('should create empty pixels if not provided', () => {
      const oldFrame: any = { id: 'x', name: 'X' };
      const result = migrateFramePixelsToLayers(oldFrame, 2, 2);
      expect(result.layers[0].pixels).toEqual([[-1, -1], [-1, -1]]);
    });

    it('should use defaults for missing name and delay', () => {
      const oldFrame: any = { id: 'x', pixels: [[1]] };
      const result = migrateFramePixelsToLayers(oldFrame, 1, 1);
      expect(result.name).toBe('frame');
      expect(result.delay).toBe(200);
    });
  });

  describe('getFrameMergedPixels', () => {
    it('should merge single layer pixels', () => {
      const frame: Frame = {
        id: 'f',
        name: 'f',
        delay: 100,
        layers: [
          { id: 'l', name: 'l', pixels: [[1, 2], [3, 4]], visible: true, locked: false, opacity: 1 },
        ],
      };
      const merged = getFrameMergedPixels(frame, 2, 2);
      expect(merged).toEqual([[1, 2], [3, 4]]);
    });

    it('should skip invisible layers', () => {
      const frame: Frame = {
        id: 'f',
        name: 'f',
        delay: 100,
        layers: [
          { id: 'l1', name: 'l1', pixels: [[1, 1], [1, 1]], visible: true, locked: false, opacity: 1 },
          { id: 'l2', name: 'l2', pixels: [[2, 2], [2, 2]], visible: false, locked: false, opacity: 1 },
        ],
      };
      const merged = getFrameMergedPixels(frame, 2, 2);
      expect(merged).toEqual([[1, 1], [1, 1]]);
    });

    it('should overlay layers in order', () => {
      const frame: Frame = {
        id: 'f',
        name: 'f',
        delay: 100,
        layers: [
          { id: 'l1', name: 'l1', pixels: [[1, -1], [-1, 1]], visible: true, locked: false, opacity: 1 },
          { id: 'l2', name: 'l2', pixels: [[-1, 2], [2, -1]], visible: true, locked: false, opacity: 1 },
        ],
      };
      const merged = getFrameMergedPixels(frame, 2, 2);
      expect(merged).toEqual([[1, 2], [2, 1]]);
    });

    it('should handle empty frame', () => {
      const frame: Frame = { id: 'f', name: 'f', delay: 100, layers: [] };
      const merged = getFrameMergedPixels(frame, 2, 2);
      expect(merged).toEqual([[-1, -1], [-1, -1]]);
    });
  });

  describe('immutableUpdateCharacter', () => {
    it('should update character immutably', () => {
      const character = createTestCharacter();
      const updated = immutableUpdateCharacter(character, (c) => {
        c.name = 'Updated';
      });
      expect(updated).not.toBe(character);
      expect(updated.name).toBe('Updated');
      expect(character.name).toBe('TestChar');
    });

    it('should deep clone before updating', () => {
      const character = createTestCharacter();
      const updated = immutableUpdateCharacter(character, (c) => {
        c.actions[0].name = 'Changed';
      });
      expect(character.actions[0].name).toBe('A1');
      expect(updated.actions[0].name).toBe('Changed');
    });
  });

  describe('immutableUpdateAction', () => {
    it('should update specified action', () => {
      const character = createTestCharacter();
      const actionId = character.actions[0].id;
      const updated = immutableUpdateAction(character, actionId, (a) => {
        a.name = 'UpdatedAction';
      });
      expect(updated.actions.find((a) => a.id === actionId)!.name).toBe('UpdatedAction');
      expect(character.actions.find((a) => a.id === actionId)!.name).toBe('A1');
    });

    it('should not change anything if action not found', () => {
      const character = createTestCharacter();
      const updated = immutableUpdateAction(character, 'nonexistent', (a) => {
        a.name = 'ShouldNotAppear';
      });
      expect(updated.actions[0].name).toBe('A1');
    });
  });

  describe('immutableUpdateFrame', () => {
    it('should update specified frame', () => {
      const character = createTestCharacter();
      const actionId = character.actions[0].id;
      const frameId = character.actions[0].frames[0].id;
      const updated = immutableUpdateFrame(character, actionId, frameId, (f) => {
        f.name = 'UpdatedFrame';
      });
      expect(updated.actions[0].frames[0].name).toBe('UpdatedFrame');
      expect(character.actions[0].frames[0].name).toBe('F1');
    });
  });

  describe('immutableUpdateLayer', () => {
    it('should update specified layer', () => {
      const character = createTestCharacter();
      const actionId = character.actions[0].id;
      const frameId = character.actions[0].frames[0].id;
      const layerId = character.actions[0].frames[0].layers[0].id;
      const updated = immutableUpdateLayer(character, actionId, frameId, layerId, (l) => {
        l.name = 'UpdatedLayer';
        l.opacity = 0.5;
      });
      expect(updated.actions[0].frames[0].layers[0].name).toBe('UpdatedLayer');
      expect(updated.actions[0].frames[0].layers[0].opacity).toBe(0.5);
    });
  });

  describe('immutableUpdateCurrentLayer', () => {
    it('should update layer when all ids provided', () => {
      const character = createTestCharacter();
      const actionId = character.actions[0].id;
      const frameId = character.actions[0].frames[0].id;
      const layerId = character.actions[0].frames[0].layers[0].id;
      const updated = immutableUpdateCurrentLayer(character, actionId, frameId, layerId, (l) => {
        l.name = 'CurrentLayer';
      });
      expect(updated).not.toBeNull();
      expect(updated!.actions[0].frames[0].layers[0].name).toBe('CurrentLayer');
    });

    it('should return null when actionId is null', () => {
      const character = createTestCharacter();
      const result = immutableUpdateCurrentLayer(character, null, 'f', 'l', () => {});
      expect(result).toBeNull();
    });

    it('should return null when frameId is null', () => {
      const character = createTestCharacter();
      const result = immutableUpdateCurrentLayer(character, 'a', null, 'l', () => {});
      expect(result).toBeNull();
    });

    it('should return null when layerId is null', () => {
      const character = createTestCharacter();
      const result = immutableUpdateCurrentLayer(character, 'a', 'f', null, () => {});
      expect(result).toBeNull();
    });
  });

  describe('immutableArrayInsert', () => {
    it('should insert item at index', () => {
      const arr = [1, 2, 3];
      const result = immutableArrayInsert(arr, 1, 99);
      expect(result).toEqual([1, 99, 2, 3]);
      expect(arr).toEqual([1, 2, 3]);
    });

    it('should insert at beginning', () => {
      expect(immutableArrayInsert([1, 2], 0, 0)).toEqual([0, 1, 2]);
    });

    it('should insert at end', () => {
      expect(immutableArrayInsert([1, 2], 2, 3)).toEqual([1, 2, 3]);
    });
  });

  describe('immutableArrayRemove', () => {
    it('should remove item at index', () => {
      const arr = [1, 2, 3];
      const result = immutableArrayRemove(arr, 1);
      expect(result).toEqual([1, 3]);
      expect(arr).toEqual([1, 2, 3]);
    });

    it('should remove first element', () => {
      expect(immutableArrayRemove([1, 2, 3], 0)).toEqual([2, 3]);
    });

    it('should remove last element', () => {
      expect(immutableArrayRemove([1, 2, 3], 2)).toEqual([1, 2]);
    });
  });

  describe('immutableArrayMove', () => {
    it('should move item forward', () => {
      expect(immutableArrayMove([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    });

    it('should move item backward', () => {
      expect(immutableArrayMove([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3];
      immutableArrayMove(arr, 0, 2);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe('countFrames', () => {
    it('should count all frames across actions', () => {
      const character = createTestCharacter();
      expect(countFrames(character)).toBe(4);
    });

    it('should return 0 for character with no actions', () => {
      const character: Character = {
        id: 'x',
        name: 'Empty',
        width: 8,
        height: 8,
        actions: [],
      };
      expect(countFrames(character)).toBe(0);
    });

    it('should handle mixed action frame counts', () => {
      const character: Character = {
        id: 'x',
        name: 'Mixed',
        width: 8,
        height: 8,
        actions: [
          { id: 'a1', name: 'A1', frames: [createTestFrame()], loop: true },
          { id: 'a2', name: 'A2', frames: [createTestFrame(), createTestFrame(), createTestFrame()], loop: true },
        ],
      };
      expect(countFrames(character)).toBe(4);
    });
  });
});
