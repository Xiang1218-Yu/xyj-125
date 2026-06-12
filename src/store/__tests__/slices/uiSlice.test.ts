import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createUiSlice } from '../../slices/uiSlice';
import { createTestCharacter, createDefaultPalette } from '../testHelpers';
import type { TweenMode } from '@/types/animation';
import { defaultColors } from '../../initialData';

describe('store/slices/uiSlice', () => {
  const createStore = () => {
    const character = createTestCharacter(4, 4);
    const store = create<any>((set, get, api) => ({
      ...createUiSlice(set, get, api),
      character,
      pixelColors: [...defaultColors],
      palettes: [createDefaultPalette()],
      activePaletteId: 'default',
    }));
    return store;
  };

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = createStore().getState();
      expect(state.gridSize).toBe(20);
      expect(state.showGrid).toBe(true);
      expect(state.isPlaying).toBe(false);
      expect(state.fps).toBe(8);
      expect(state.onionSkinEnabled).toBe(false);
      expect(state.onionSkinPrevFrames).toBe(1);
      expect(state.onionSkinNextFrames).toBe(1);
      expect(state.onionSkinOpacity).toBe(0.3);
      expect(state.tweenEnabled).toBe(false);
      expect(state.tweenMode).toBe('linear');
      expect(state.tweenSteps).toBe(3);
      expect(state.tweenFrameIds).toEqual([]);
      expect(state.referenceImage).toBeNull();
      expect(state.referenceImageOpacity).toBe(0.5);
      expect(state.referenceImageEnabled).toBe(false);
    });
  });

  describe('setGridSize', () => {
    it('should set grid size', () => {
      const store = createStore();
      store.getState().setGridSize(30);
      expect(store.getState().gridSize).toBe(30);
    });

    it('should handle zero', () => {
      const store = createStore();
      store.getState().setGridSize(0);
      expect(store.getState().gridSize).toBe(0);
    });
  });

  describe('setShowGrid', () => {
    it('should toggle showGrid true -> false', () => {
      const store = createStore();
      store.getState().setShowGrid(false);
      expect(store.getState().showGrid).toBe(false);
    });

    it('should toggle showGrid false -> true', () => {
      const store = createStore();
      store.setState({ showGrid: false });
      store.getState().setShowGrid(true);
      expect(store.getState().showGrid).toBe(true);
    });
  });

  describe('setFps', () => {
    it('should set fps', () => {
      const store = createStore();
      store.getState().setFps(24);
      expect(store.getState().fps).toBe(24);
    });

    it('should handle 0 fps', () => {
      const store = createStore();
      store.getState().setFps(0);
      expect(store.getState().fps).toBe(0);
    });

    it('should handle negative fps', () => {
      const store = createStore();
      store.getState().setFps(-5);
      expect(store.getState().fps).toBe(-5);
    });
  });

  describe('setIsPlaying', () => {
    it('should set playing state', () => {
      const store = createStore();
      store.getState().setIsPlaying(true);
      expect(store.getState().isPlaying).toBe(true);
    });
  });

  describe('onion skin controls', () => {
    it('setOnionSkinEnabled should work', () => {
      const store = createStore();
      store.getState().setOnionSkinEnabled(true);
      expect(store.getState().onionSkinEnabled).toBe(true);
    });

    it('setOnionSkinPrevFrames should clamp to >= 0', () => {
      const store = createStore();
      store.getState().setOnionSkinPrevFrames(5);
      expect(store.getState().onionSkinPrevFrames).toBe(5);
      store.getState().setOnionSkinPrevFrames(-1);
      expect(store.getState().onionSkinPrevFrames).toBe(0);
    });

    it('setOnionSkinNextFrames should clamp to >= 0', () => {
      const store = createStore();
      store.getState().setOnionSkinNextFrames(5);
      expect(store.getState().onionSkinNextFrames).toBe(5);
      store.getState().setOnionSkinNextFrames(-10);
      expect(store.getState().onionSkinNextFrames).toBe(0);
    });

    it('setOnionSkinOpacity should clamp between 0.1 and 0.9', () => {
      const store = createStore();
      store.getState().setOnionSkinOpacity(0.5);
      expect(store.getState().onionSkinOpacity).toBe(0.5);
      store.getState().setOnionSkinOpacity(0);
      expect(store.getState().onionSkinOpacity).toBe(0.1);
      store.getState().setOnionSkinOpacity(1);
      expect(store.getState().onionSkinOpacity).toBe(0.9);
      store.getState().setOnionSkinOpacity(-5);
      expect(store.getState().onionSkinOpacity).toBe(0.1);
      store.getState().setOnionSkinOpacity(10);
      expect(store.getState().onionSkinOpacity).toBe(0.9);
    });
  });

  describe('tween controls', () => {
    it('setTweenEnabled should work', () => {
      const store = createStore();
      store.getState().setTweenEnabled(true);
      expect(store.getState().tweenEnabled).toBe(true);
    });

    it('setTweenMode should set mode', () => {
      const store = createStore();
      const modes: TweenMode[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'];
      for (const mode of modes) {
        store.getState().setTweenMode(mode);
        expect(store.getState().tweenMode).toBe(mode);
      }
    });

    it('setTweenSteps should clamp between 1 and 20', () => {
      const store = createStore();
      store.getState().setTweenSteps(10);
      expect(store.getState().tweenSteps).toBe(10);
      store.getState().setTweenSteps(0);
      expect(store.getState().tweenSteps).toBe(1);
      store.getState().setTweenSteps(30);
      expect(store.getState().tweenSteps).toBe(20);
      store.getState().setTweenSteps(-5);
      expect(store.getState().tweenSteps).toBe(1);
    });

    it('toggleTweenFrame should add frame id if not present', () => {
      const store = createStore();
      store.getState().toggleTweenFrame('frame1');
      expect(store.getState().tweenFrameIds).toContain('frame1');
    });

    it('toggleTweenFrame should remove frame id if present', () => {
      const store = createStore();
      store.setState({ tweenFrameIds: ['frame1', 'frame2'] });
      store.getState().toggleTweenFrame('frame1');
      expect(store.getState().tweenFrameIds).toEqual(['frame2']);
    });

    it('setTweenFrameIds should replace all ids', () => {
      const store = createStore();
      store.getState().setTweenFrameIds(['a', 'b', 'c']);
      expect(store.getState().tweenFrameIds).toEqual(['a', 'b', 'c']);
    });

    it('clearTweenFrames should empty the list', () => {
      const store = createStore();
      store.setState({ tweenFrameIds: ['a', 'b'] });
      store.getState().clearTweenFrames();
      expect(store.getState().tweenFrameIds).toEqual([]);
    });

    it('getTweenFrames should return original frames when less than 2', () => {
      const store = createStore();
      const char = store.getState().character;
      const actionId = char.actions[0].id;
      const singleFrameAction = {
        ...char.actions[0],
        frames: [char.actions[0].frames[0]],
      };
      store.setState({
        character: {
          ...char,
          actions: [singleFrameAction, ...char.actions.slice(1)],
        },
      });
      const frames = store.getState().getTweenFrames(actionId);
      expect(frames.length).toBe(1);
    });

    it('getTweenFrames should return action frames when action not found', () => {
      const store = createStore();
      expect(store.getState().getTweenFrames('nonexistent')).toEqual([]);
    });
  });

  describe('reference image controls', () => {
    it('setReferenceImage should set image data', () => {
      const store = createStore();
      store.getState().setReferenceImage('data:image/png;base64,xxx');
      expect(store.getState().referenceImage).toBe('data:image/png;base64,xxx');
    });

    it('setReferenceImage should accept null', () => {
      const store = createStore();
      store.setState({ referenceImage: 'something' });
      store.getState().setReferenceImage(null);
      expect(store.getState().referenceImage).toBeNull();
    });

    it('setReferenceImageOpacity should clamp between 0.1 and 1', () => {
      const store = createStore();
      store.getState().setReferenceImageOpacity(0.7);
      expect(store.getState().referenceImageOpacity).toBe(0.7);
      store.getState().setReferenceImageOpacity(0);
      expect(store.getState().referenceImageOpacity).toBe(0.1);
      store.getState().setReferenceImageOpacity(2);
      expect(store.getState().referenceImageOpacity).toBe(1);
    });

    it('setReferenceImageEnabled should work', () => {
      const store = createStore();
      store.getState().setReferenceImageEnabled(true);
      expect(store.getState().referenceImageEnabled).toBe(true);
    });
  });
});
