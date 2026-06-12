import { describe, it, expect } from 'vitest';
import { defaultColors, createSampleCharacter } from '../initialData';

describe('store/initialData', () => {
  describe('defaultColors', () => {
    it('should have 16 colors', () => {
      expect(defaultColors.length).toBe(16);
    });

    it('should all be valid hex colors', () => {
      for (const color of defaultColors) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('createSampleCharacter', () => {
    it('should return a character with 16x16 dimensions', () => {
      const character = createSampleCharacter();
      expect(character.width).toBe(16);
      expect(character.height).toBe(16);
    });

    it('should have 3 actions: idle, walk, jump', () => {
      const character = createSampleCharacter();
      expect(character.actions.length).toBe(3);
      expect(character.actions[0].name).toBe('idle');
      expect(character.actions[1].name).toBe('walk');
      expect(character.actions[2].name).toBe('jump');
    });

    it('should have correct frame counts per action', () => {
      const character = createSampleCharacter();
      expect(character.actions[0].frames.length).toBe(1);
      expect(character.actions[1].frames.length).toBe(2);
      expect(character.actions[2].frames.length).toBe(1);
    });

    it('should have idle action looping and jump action not looping', () => {
      const character = createSampleCharacter();
      expect(character.actions[0].loop).toBe(true);
      expect(character.actions[1].loop).toBe(true);
      expect(character.actions[2].loop).toBe(false);
    });

    it('should have frame names with proper format', () => {
      const character = createSampleCharacter();
      expect(character.actions[0].frames[0].name).toMatch(/^idle_\d+$/);
      expect(character.actions[1].frames[0].name).toMatch(/^walk_\d+$/);
    });

    it('each frame should have at least one layer', () => {
      const character = createSampleCharacter();
      for (const action of character.actions) {
        for (const frame of action.frames) {
          expect(frame.layers.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('each layer should have correct dimensions', () => {
      const character = createSampleCharacter();
      for (const action of character.actions) {
        for (const frame of action.frames) {
          for (const layer of frame.layers) {
            expect(layer.pixels.length).toBe(16);
            for (const row of layer.pixels) {
              expect(row.length).toBe(16);
            }
          }
        }
      }
    });

    it('should generate different ids each call', () => {
      const c1 = createSampleCharacter();
      const c2 = createSampleCharacter();
      expect(c1.id).not.toBe(c2.id);
      expect(c1.actions[0].id).not.toBe(c2.actions[0].id);
    });
  });
});
