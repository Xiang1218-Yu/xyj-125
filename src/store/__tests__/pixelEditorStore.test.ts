import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePixelEditorStore } from '../pixelEditorStore';
import { generateParticleFrames } from '@/utils/particleEngine';
import type { ParticleFrame } from '@/types/particle';

vi.mock('@/utils/particleEngine', () => ({
  generateParticleFrames: vi.fn(),
}));

describe('store/pixelEditorStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    const initState = usePixelEditorStore.getInitialState();
    const firstAction = initState.character.actions[0];
    const firstFrame = firstAction.frames[0];
    usePixelEditorStore.setState({
      ...initState,
      currentActionId: firstAction.id,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    }, true);
  });

  describe('initial store setup', () => {
    it('should have initial character with 3 actions', () => {
      const state = usePixelEditorStore.getState();
      expect(state.character).toBeDefined();
      expect(state.character.actions.length).toBe(3);
      expect(state.character.width).toBe(16);
      expect(state.character.height).toBe(16);
    });

    it('should have currentActionId, currentFrameId, currentLayerId initialized', () => {
      const state = usePixelEditorStore.getState();
      expect(state.currentActionId).toBeDefined();
      expect(state.currentFrameId).toBeDefined();
      expect(state.currentLayerId).toBeDefined();
    });

    it('should have initial history with one entry', () => {
      const state = usePixelEditorStore.getState();
      expect(state.history.length).toBe(1);
      expect(state.historyIndex).toBe(0);
    });
  });

  describe('resetCharacter', () => {
    it('should reset character to sample character', () => {
      const state = usePixelEditorStore.getState();
      const originalCharName = state.character.name;
      const actionId = state.character.actions[0].id;
      state.renameAction(actionId, 'ModifiedAction');
      expect(usePixelEditorStore.getState().character.actions[0].name).toBe('ModifiedAction');
      state.resetCharacter();
      const newState = usePixelEditorStore.getState();
      expect(newState.character.actions[0].name).not.toBe('ModifiedAction');
      expect(newState.character.name).toBe(originalCharName);
    });

    it('should reset history', () => {
      const state = usePixelEditorStore.getState();
      state.addAction('test');
      state.pushHistory();
      expect(usePixelEditorStore.getState().history.length).toBeGreaterThan(1);
      state.resetCharacter();
      expect(usePixelEditorStore.getState().history.length).toBe(1);
      expect(usePixelEditorStore.getState().historyIndex).toBe(0);
    });

    it('should reset save state', () => {
      const state = usePixelEditorStore.getState();
      usePixelEditorStore.setState({
        currentSaveName: 'testSave',
        lastSavedTime: Date.now(),
      });
      state.resetCharacter();
      const newState = usePixelEditorStore.getState();
      expect(newState.currentSaveName).toBeNull();
      expect(newState.lastSavedTime).toBeNull();
    });

    it('should reset selected frame ids', () => {
      const state = usePixelEditorStore.getState();
      usePixelEditorStore.setState({ selectedFrameIds: ['a', 'b'] });
      state.resetCharacter();
      expect(usePixelEditorStore.getState().selectedFrameIds).toEqual([]);
    });

    it('should reset palettes to default', () => {
      const state = usePixelEditorStore.getState();
      state.addColor('#ff0000');
      const colorsBeforeReset = [...usePixelEditorStore.getState().pixelColors];
      state.resetCharacter();
      const newState = usePixelEditorStore.getState();
      expect(newState.pixelColors.length).toBeLessThan(colorsBeforeReset.length);
      expect(newState.activePaletteId).toBe('default');
    });
  });

  describe('generateParticleAnimation', () => {
    it('should return false for unknown particle type', () => {
      const state = usePixelEditorStore.getState();
      const result = state.generateParticleAnimation({ type: 'unknown_type', frameCount: 5 });
      expect(result).toBe(false);
    });

    it('should return false when generateParticleFrames returns empty', () => {
      (generateParticleFrames as any).mockReturnValue([]);
      const state = usePixelEditorStore.getState();
      const result = state.generateParticleAnimation({ type: 'explosion', frameCount: 5 });
      expect(result).toBe(false);
    });

    it('should create a new action with particle frames (insertMode: newAction)', () => {
      const mockFrames: ParticleFrame[] = [
        { pixels: Array(16).fill(null).map(() => Array(16).fill(0)) },
        { pixels: Array(16).fill(null).map(() => Array(16).fill(1)) },
      ];
      (generateParticleFrames as any).mockReturnValue(mockFrames);
      const state = usePixelEditorStore.getState();
      const actionCountBefore = state.character.actions.length;
      const result = state.generateParticleAnimation({
        type: 'fire',
        frameCount: 2,
        actionName: 'FireEffect',
        insertMode: 'newAction',
      });
      expect(result).toBe(true);
      const newState = usePixelEditorStore.getState();
      expect(newState.character.actions.length).toBe(actionCountBefore + 1);
      const newAction = newState.character.actions[newState.character.actions.length - 1];
      expect(newAction.name).toBe('FireEffect');
      expect(newAction.frames.length).toBe(2);
    });

    it('should use type as default action name when actionName not provided', () => {
      const mockFrames: ParticleFrame[] = [
        { pixels: Array(16).fill(null).map(() => Array(16).fill(0)) },
      ];
      (generateParticleFrames as any).mockReturnValue(mockFrames);
      const state = usePixelEditorStore.getState();
      state.generateParticleAnimation({ type: 'magic', frameCount: 1 });
      const newState = usePixelEditorStore.getState();
      const newAction = newState.character.actions[newState.character.actions.length - 1];
      expect(newAction.name).toBe('magic');
    });

    it('should insert frames into current action (insertMode: currentAction)', () => {
      const mockFrames: ParticleFrame[] = [
        { pixels: Array(16).fill(null).map(() => Array(16).fill(0)) },
        { pixels: Array(16).fill(null).map(() => Array(16).fill(0)) },
      ];
      (generateParticleFrames as any).mockReturnValue(mockFrames);
      const state = usePixelEditorStore.getState();
      const currentAction = state.getCurrentAction();
      const frameCountBefore = currentAction!.frames.length;
      const result = state.generateParticleAnimation({
        type: 'sparkle',
        frameCount: 2,
        insertMode: 'currentAction',
      });
      expect(result).toBe(true);
      const newState = usePixelEditorStore.getState();
      const updatedAction = newState.getCurrentAction();
      expect(updatedAction!.frames.length).toBe(frameCountBefore + 2);
    });
  });

  describe('history wrapping', () => {
    it('addAction should trigger history push', async () => {
      vi.useFakeTimers();
      const state = usePixelEditorStore.getState();
      const historyLengthBefore = state.history.length;
      state.addAction('historyTest');
      vi.runAllTimers();
      const newState = usePixelEditorStore.getState();
      expect(newState.history.length).toBeGreaterThan(historyLengthBefore);
      vi.useRealTimers();
    });

    it('deleteAction should trigger history push', async () => {
      vi.useFakeTimers();
      const state = usePixelEditorStore.getState();
      const historyLengthBefore = state.history.length;
      if (state.character.actions.length > 1) {
        state.deleteAction(state.character.actions[1].id);
      }
      vi.runAllTimers();
      const newState = usePixelEditorStore.getState();
      expect(newState.history.length).toBeGreaterThan(historyLengthBefore);
      vi.useRealTimers();
    });

    it('flipFrameHorizontal should trigger history push', async () => {
      vi.useFakeTimers();
      const state = usePixelEditorStore.getState();
      const historyLengthBefore = state.history.length;
      const frameId = state.character.actions[0].frames[0].id;
      state.flipFrameHorizontal(frameId);
      vi.runAllTimers();
      const newState = usePixelEditorStore.getState();
      expect(newState.history.length).toBeGreaterThan(historyLengthBefore);
      vi.useRealTimers();
    });

    it('pasteClipboard should trigger history push', async () => {
      vi.useFakeTimers();
      const state = usePixelEditorStore.getState();
      state.setClipboardPixels([[1]]);
      const historyLengthBefore = state.history.length;
      state.pasteClipboard(0, 0);
      vi.runAllTimers();
      const newState = usePixelEditorStore.getState();
      expect(newState.history.length).toBeGreaterThan(historyLengthBefore);
      vi.useRealTimers();
    });

    it('generateParticleAnimation should trigger history push', async () => {
      vi.useFakeTimers();
      const mockFrames: ParticleFrame[] = [
        { pixels: Array(16).fill(null).map(() => Array(16).fill(0)) },
      ];
      (generateParticleFrames as any).mockReturnValue(mockFrames);
      const state = usePixelEditorStore.getState();
      const historyLengthBefore = state.history.length;
      state.generateParticleAnimation({ type: 'rain', frameCount: 1 });
      vi.runAllTimers();
      const newState = usePixelEditorStore.getState();
      expect(newState.history.length).toBeGreaterThan(historyLengthBefore);
      vi.useRealTimers();
    });
  });

  describe('palette persistence subscription', () => {
    it('should persist palettes when changed', () => {
      const state = usePixelEditorStore.getState();
      state.addPalette({ name: 'PersistedTest', colors: ['#aaa'], isPreset: false });
      const stored = localStorage.getItem('pixel_animator_palettes');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      const hasPersistedTest = parsed.palettes.some((p: any) => p.name === 'PersistedTest');
      expect(hasPersistedTest).toBe(true);
    });

    it('should not persist when no change', () => {
      localStorage.clear();
      const state = usePixelEditorStore.getState();
      const palettesBefore = state.palettes;
      usePixelEditorStore.setState({ palettes: [...palettesBefore] });
      const stored = localStorage.getItem('pixel_animator_palettes');
      expect(stored).toBeNull();
    });
  });
});
