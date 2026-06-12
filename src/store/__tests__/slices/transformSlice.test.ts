import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTransformSlice } from '../../slices/transformSlice';
import { createTestCharacter } from '../testHelpers';
import { generateId } from '../../utils';
import type { Character, Frame, Layer } from '@/types/animation';

const createPixelGrid = (w: number, h: number, value = -1): number[][] =>
  Array.from({ length: h }, () => Array(w).fill(value));

describe('store/slices/transformSlice', () => {
  const createTestCharacterWithPixels = (): Character => {
    const w = 4;
    const h = 4;
    const pixels = createPixelGrid(w, h);
    pixels[0][0] = 1;
    pixels[1][2] = 2;
    pixels[3][3] = 3;

    const layer: Layer = {
      id: generateId(),
      name: 'L1',
      pixels,
      visible: true,
      locked: false,
      opacity: 1,
    };

    const frame: Frame = {
      id: generateId(),
      name: 'F1',
      layers: [layer],
      delay: 200,
    };

    return {
      id: generateId(),
      name: 'TransformTest',
      width: w,
      height: h,
      actions: [
        { id: generateId(), name: 'idle', frames: [frame], loop: true },
      ],
    };
  };

  const createStore = () => {
    const character = createTestCharacterWithPixels();
    const store = create<any>((set, get, api) => ({
      ...createTransformSlice(set, get, api),
      character,
      currentActionId: character.actions[0].id,
      currentFrameId: character.actions[0].frames[0].id,
    }));
    return store;
  };

  describe('flipFrameHorizontal', () => {
    it('should flip frame horizontally', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().flipFrameHorizontal(frameId);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][3]).toBe(1);
      expect(layer.pixels[1][1]).toBe(2);
      expect(layer.pixels[3][0]).toBe(3);
    });

    it('should not flip if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().flipFrameHorizontal('any');
      expect(store.getState().character).toBe(charBefore);
    });

    it('should skip locked layers', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a) => ({
            ...a,
            frames: a.frames.map((f) => ({
              ...f,
              layers: f.layers.map((l) => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
      });
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().flipFrameHorizontal(store.getState().currentFrameId);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('flipFrameVertical', () => {
    it('should flip frame vertically', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().flipFrameVertical(frameId);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[3][0]).toBe(1);
      expect(layer.pixels[2][2]).toBe(2);
      expect(layer.pixels[0][3]).toBe(3);
    });

    it('should not flip if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().flipFrameVertical('any');
      expect(store.getState().character).toBe(charBefore);
    });

    it('should skip locked layers', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a) => ({
            ...a,
            frames: a.frames.map((f) => ({
              ...f,
              layers: f.layers.map((l) => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
      });
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().flipFrameVertical(store.getState().currentFrameId);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('rotateFrame', () => {
    it('should not rotate if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().rotateFrame('any', 90);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should rotate frame 180 degrees', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().rotateFrame(frameId, 180);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[3][3]).toBe(1);
      expect(layer.pixels[2][1]).toBe(2);
      expect(layer.pixels[0][0]).toBe(3);
    });

    it('should skip locked layers when rotating', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a) => ({
            ...a,
            frames: a.frames.map((f) => ({
              ...f,
              layers: f.layers.map((l) => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
      });
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().rotateFrame(store.getState().currentFrameId, 90);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('shiftFrame', () => {
    it('should shift frame right by default amount 1', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().shiftFrame(frameId, 'right');
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][1]).toBe(1);
      expect(layer.pixels[0][0]).toBe(-1);
    });

    it('should shift frame left', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().shiftFrame(frameId, 'left');
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[1][1]).toBe(2);
    });

    it('should shift frame up', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().shiftFrame(frameId, 'up');
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][2]).toBe(2);
    });

    it('should shift frame down', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().shiftFrame(frameId, 'down');
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[1][0]).toBe(1);
    });

    it('should shift with custom amount', () => {
      const store = createStore();
      const frameId = store.getState().currentFrameId;
      store.getState().shiftFrame(frameId, 'right', 2);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][2]).toBe(1);
    });

    it('should not shift if no currentActionId', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().shiftFrame('any', 'right');
      expect(store.getState().character).toBe(charBefore);
    });

    it('should skip locked layers when shifting', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a) => ({
            ...a,
            frames: a.frames.map((f) => ({
              ...f,
              layers: f.layers.map((l) => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
      });
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().shiftFrame(store.getState().currentFrameId, 'right');
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('batch operations', () => {
    const createStoreWithTwoFrames = () => {
      const character = createTestCharacter(4, 4);
      const store = create<any>((set, get, api) => ({
        ...createTransformSlice(set, get, api),
        character,
        currentActionId: character.actions[0].id,
        currentFrameId: character.actions[0].frames[0].id,
      }));
      return store;
    };

    it('batchFlipFramesHorizontal should flip multiple frames', () => {
      const store = createStoreWithTwoFrames();

      store.setState((state: any) => {
        const frame = state.character.actions[0].frames[0];
        const pixels = frame.layers[0].pixels.map((r: number[]) => [...r]);
        pixels[0][0] = 5;
        pixels[0][3] = 8;
        return {
          character: {
            ...state.character,
            actions: state.character.actions.map((a: any, ai: number) =>
              ai === 0
                ? {
                    ...a,
                    frames: a.frames.map((f: any, fi: number) =>
                      fi === 0
                        ? {
                            ...f,
                            layers: f.layers.map((l: any, li: number) =>
                              li === 0 ? { ...l, pixels } : l
                            ),
                          }
                        : f
                    ),
                  }
                : a
            ),
          },
        };
      });

      const frameIds = store.getState().character.actions[0].frames.map((f: Frame) => f.id);
      store.getState().batchFlipFramesHorizontal(frameIds);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(8);
      expect(layer.pixels[0][3]).toBe(5);
      expect(store.getState().character.actions[0].frames.length).toBe(2);
    });

    it('batchFlipFramesVertical should flip multiple frames', () => {
      const store = createStoreWithTwoFrames();
      const frameIds = store.getState().character.actions[0].frames.map((f: Frame) => f.id);
      store.getState().batchFlipFramesVertical(frameIds);
      expect(store.getState().character.actions[0].frames.length).toBe(2);
    });

    it('batchRotateFrames should rotate multiple frames', () => {
      const store = createStoreWithTwoFrames();
      const frameIds = store.getState().character.actions[0].frames.map((f: Frame) => f.id);
      store.getState().batchRotateFrames(frameIds, 180);
      expect(store.getState().character.actions[0].frames.length).toBe(2);
    });

    it('batchShiftFrames should shift multiple frames', () => {
      const store = createStoreWithTwoFrames();
      const frameIds = store.getState().character.actions[0].frames.map((f: Frame) => f.id);
      store.getState().batchShiftFrames(frameIds, 'right', 1);
      expect(store.getState().character.actions[0].frames.length).toBe(2);
    });

    it('batch operations should do nothing with empty frameIds', () => {
      const store = createStoreWithTwoFrames();
      const charBefore = store.getState().character;
      store.getState().batchFlipFramesHorizontal([]);
      store.getState().batchFlipFramesVertical([]);
      store.getState().batchRotateFrames([], 90);
      store.getState().batchShiftFrames([], 'left');
      expect(store.getState().character).toBe(charBefore);
    });

    it('batch operations should skip when no currentActionId', () => {
      const store = createStoreWithTwoFrames();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().batchFlipFramesHorizontal(['a', 'b']);
      expect(store.getState().character).toBe(charBefore);
    });

    it('batch operations should skip nonexistent frames', () => {
      const store = createStoreWithTwoFrames();
      expect(() => store.getState().batchFlipFramesHorizontal(['nonexistent1', 'nonexistent2'])).not.toThrow();
    });

    it('batch operations should skip locked layers', () => {
      const store = createStore();
      const char = store.getState().character;
      const layerId = char.actions[0].frames[0].layers[0].id;
      store.setState({
        character: {
          ...char,
          actions: char.actions.map((a) => ({
            ...a,
            frames: a.frames.map((f) => ({
              ...f,
              layers: f.layers.map((l) => l.id === layerId ? { ...l, locked: true } : l),
            })),
          })),
        },
      });
      const frameId = store.getState().currentFrameId;
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().batchFlipFramesHorizontal([frameId]);
      store.getState().batchFlipFramesVertical([frameId]);
      store.getState().batchRotateFrames([frameId], 90);
      store.getState().batchShiftFrames([frameId], 'right');
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });
});
