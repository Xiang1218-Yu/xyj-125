import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createDrawingSlice } from '../../slices/drawingSlice';
import { createTestCharacter } from '../testHelpers';
import type { Character } from '@/types/animation';

describe('store/slices/drawingSlice', () => {
  const createStore = () => {
    const character: Character = createTestCharacter(4, 4);
    character.actions[0].frames[0].layers[0].locked = false;
    const store = create<any>((set, get, api) => ({
      ...createDrawingSlice(set, get, api),
      character,
      currentActionId: character.actions[0].id,
      currentFrameId: character.actions[0].frames[0].id,
      currentLayerId: character.actions[0].frames[0].layers[0].id,
    }));
    return store;
  };

  describe('initial state', () => {
    it('should have pencil as default tool', () => {
      expect(createStore().getState().selectedTool).toBe('pencil');
    });

    it('should have black as default color', () => {
      expect(createStore().getState().currentColor).toBe('#000000');
    });
  });

  describe('setCurrentColor', () => {
    it('should update current color', () => {
      const store = createStore();
      store.getState().setCurrentColor('#ff0000');
      expect(store.getState().currentColor).toBe('#ff0000');
    });
  });

  describe('setSelectedTool', () => {
    it('should update selected tool', () => {
      const store = createStore();
      store.getState().setSelectedTool('eraser');
      expect(store.getState().selectedTool).toBe('eraser');
      store.getState().setSelectedTool('bucket');
      expect(store.getState().selectedTool).toBe('bucket');
      store.getState().setSelectedTool('pencil');
      expect(store.getState().selectedTool).toBe('pencil');
    });
  });

  describe('setPixel', () => {
    it('should set pixel with pencil tool', () => {
      const store = createStore();
      store.getState().setPixel(1, 1, 5);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[1][1]).toBe(5);
    });

    it('should set pixel to -1 with eraser tool', () => {
      const store = createStore();
      store.getState().setPixel(2, 2, 3);
      store.setState({ selectedTool: 'eraser' });
      store.getState().setPixel(2, 2, 3);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[2][2]).toBe(-1);
    });

    it('should fill connected area with bucket tool', () => {
      const store = createStore();
      store.setState({ selectedTool: 'bucket' });
      store.getState().setPixel(0, 0, 2);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      const allSame = layer.pixels.every(row => row.every(p => p === 2));
      expect(allSame).toBe(true);
    });

    it('should not fill if target color is same as fill color (bucket)', () => {
      const store = createStore();
      store.getState().setPixel(0, 0, 1);
      store.setState({ selectedTool: 'bucket' });
      store.getState().setPixel(0, 0, 1);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(1);
      expect(layer.pixels[1][1]).toBe(-1);
    });

    it('should ignore coordinates out of bounds', () => {
      const store = createStore();
      expect(() => store.getState().setPixel(-1, 0, 1)).not.toThrow();
      expect(() => store.getState().setPixel(100, 0, 1)).not.toThrow();
      expect(() => store.getState().setPixel(0, -1, 1)).not.toThrow();
      expect(() => store.getState().setPixel(0, 100, 1)).not.toThrow();
    });

    it('should not set pixel when no current ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().setPixel(0, 0, 1);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should not set pixel when layer is locked', () => {
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
      store.getState().setPixel(0, 0, 5);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('drawLine', () => {
    it('should draw a horizontal line', () => {
      const store = createStore();
      store.getState().drawLine(0, 1, 3, 1, 2);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[1][0]).toBe(2);
      expect(layer.pixels[1][1]).toBe(2);
      expect(layer.pixels[1][2]).toBe(2);
      expect(layer.pixels[1][3]).toBe(2);
    });

    it('should draw a vertical line', () => {
      const store = createStore();
      store.getState().drawLine(2, 0, 2, 3, 3);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][2]).toBe(3);
      expect(layer.pixels[1][2]).toBe(3);
      expect(layer.pixels[2][2]).toBe(3);
      expect(layer.pixels[3][2]).toBe(3);
    });

    it('should draw a diagonal line', () => {
      const store = createStore();
      store.getState().drawLine(0, 0, 3, 3, 4);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(4);
      expect(layer.pixels[3][3]).toBe(4);
    });

    it('should draw with eraser (-1 value)', () => {
      const store = createStore();
      store.getState().drawLine(0, 2, 3, 2, 1);
      store.setState({ selectedTool: 'eraser' });
      store.getState().drawLine(0, 2, 3, 2, 1);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[2][0]).toBe(-1);
      expect(layer.pixels[2][3]).toBe(-1);
    });

    it('should handle out of bounds coordinates gracefully', () => {
      const store = createStore();
      expect(() => store.getState().drawLine(-10, -10, 10, 10, 1)).not.toThrow();
    });

    it('should not draw when no current ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().drawLine(0, 0, 2, 2, 1);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should not draw when layer is locked', () => {
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
      store.getState().drawLine(0, 0, 2, 2, 1);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('drawRectangle', () => {
    it('should draw rectangle outline', () => {
      const store = createStore();
      store.getState().drawRectangle(0, 0, 3, 3, 2, false);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(2);
      expect(layer.pixels[0][3]).toBe(2);
      expect(layer.pixels[3][0]).toBe(2);
      expect(layer.pixels[3][3]).toBe(2);
      expect(layer.pixels[1][1]).toBe(-1);
    });

    it('should draw filled rectangle', () => {
      const store = createStore();
      store.getState().drawRectangle(0, 0, 3, 3, 3, true);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          expect(layer.pixels[y][x]).toBe(3);
        }
      }
    });

    it('should draw with reversed coordinates', () => {
      const store = createStore();
      store.getState().drawRectangle(3, 3, 0, 0, 2, true);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[0][0]).toBe(2);
      expect(layer.pixels[3][3]).toBe(2);
    });

    it('should erase rectangle', () => {
      const store = createStore();
      store.getState().drawRectangle(0, 0, 3, 3, 1, true);
      store.setState({ selectedTool: 'eraser' });
      store.getState().drawRectangle(1, 1, 2, 2, 1, true);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      expect(layer.pixels[1][1]).toBe(-1);
      expect(layer.pixels[0][0]).toBe(1);
    });

    it('should not draw when no current ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().drawRectangle(0, 0, 2, 2, 1);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should not draw when layer is locked', () => {
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
      store.getState().drawRectangle(0, 0, 2, 2, 1);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });

  describe('drawEllipse', () => {
    it('should draw ellipse outline', () => {
      const store = createStore();
      store.getState().drawEllipse(0, 0, 3, 3, 2, false);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      let hasPainted = false;
      for (const row of layer.pixels) {
        for (const p of row) {
          if (p === 2) hasPainted = true;
        }
      }
      expect(hasPainted).toBe(true);
    });

    it('should draw filled ellipse', () => {
      const store = createStore();
      store.getState().drawEllipse(0, 0, 3, 3, 3, true);
      const layer = store.getState().character.actions[0].frames[0].layers[0];
      const filledPixels = layer.pixels.flat().filter(p => p === 3).length;
      expect(filledPixels).toBeGreaterThan(0);
    });

    it('should handle very small ellipse (zero radius)', () => {
      const store = createStore();
      const pixelsBefore = store.getState().character.actions[0].frames[0].layers[0].pixels.map(r => [...r]);
      store.getState().drawEllipse(1, 1, 1, 1, 1);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });

    it('should not draw when no current ids', () => {
      const store = createStore();
      store.setState({ currentActionId: null });
      const charBefore = store.getState().character;
      store.getState().drawEllipse(0, 0, 2, 2, 1);
      expect(store.getState().character).toBe(charBefore);
    });

    it('should not draw when layer is locked', () => {
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
      store.getState().drawEllipse(0, 0, 2, 2, 1);
      const pixelsAfter = store.getState().character.actions[0].frames[0].layers[0].pixels;
      expect(pixelsAfter).toEqual(pixelsBefore);
    });
  });
});
