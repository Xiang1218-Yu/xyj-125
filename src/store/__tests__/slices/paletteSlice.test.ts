import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createPaletteSlice, persistPalettes, loadPersistedPalettes } from '../../slices/paletteSlice';
import { defaultColors } from '../../initialData';
import type { PaletteGroup } from '@/types/animation';

describe('store/slices/paletteSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  const createStore = () => {
    const store = create<any>((set, get, api) => ({
      ...createPaletteSlice(set, get, api),
    }));
    return store;
  };

  describe('persistPalettes / loadPersistedPalettes', () => {
    it('should persist and load palettes from localStorage', () => {
      const palettes: PaletteGroup[] = [
        { id: 'p1', name: 'Test', colors: ['#fff', '#000'], isPreset: false },
      ];
      persistPalettes(palettes, 'p1');
      const loaded = loadPersistedPalettes();
      expect(loaded).not.toBeNull();
      expect(loaded!.palettes).toEqual(palettes);
      expect(loaded!.activePaletteId).toBe('p1');
    });

    it('loadPersistedPalettes should return null if nothing stored', () => {
      expect(loadPersistedPalettes()).toBeNull();
    });

    it('loadPersistedPalettes should return null for invalid JSON', () => {
      localStorage.setItem('pixel_animator_palettes', 'not valid json');
      expect(loadPersistedPalettes()).toBeNull();
    });

    it('loadPersistedPalettes should return null if palettes not array', () => {
      localStorage.setItem('pixel_animator_palettes', JSON.stringify({ palettes: 'not-array' }));
      expect(loadPersistedPalettes()).toBeNull();
    });

    it('persistPalettes should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('fail'); };
      expect(() => persistPalettes([], 'x')).not.toThrow();
      localStorage.setItem = originalSetItem;
    });
  });

  describe('initial state', () => {
    it('should use persisted data when available', async () => {
      const palettes: PaletteGroup[] = [
        { id: 'stored', name: 'Stored', colors: ['#aaa'], isPreset: false },
      ];
      persistPalettes(palettes, 'stored');
      const { createPaletteSlice: reloadedCreatePaletteSlice } = await import('../../slices/paletteSlice');
      const store = create<any>((set, get, api) => reloadedCreatePaletteSlice(set, get, api));
      expect(store.getState().palettes.length).toBe(1);
      expect(store.getState().activePaletteId).toBe('stored');
      expect(store.getState().pixelColors).toEqual(['#aaa']);
    });

    it('should fall back to defaults when stored palette not found', async () => {
      const palettes: PaletteGroup[] = [
        { id: 'p1', name: 'Test', colors: ['#fff'], isPreset: false },
      ];
      persistPalettes(palettes, 'nonexistent');
      const { createPaletteSlice: reloadedCreatePaletteSlice } = await import('../../slices/paletteSlice');
      const store = create<any>((set, get, api) => reloadedCreatePaletteSlice(set, get, api));
      expect(store.getState().pixelColors).toEqual([...defaultColors]);
    });

    it('should have default palette when nothing persisted', () => {
      const store = createStore();
      expect(store.getState().palettes.length).toBe(1);
      expect(store.getState().palettes[0].name).toBe('默认调色板');
      expect(store.getState().activePaletteId).toBe('default');
      expect(store.getState().pixelColors).toEqual([...defaultColors]);
    });
  });

  describe('addColor', () => {
    it('should add a color to pixelColors and active palette', () => {
      const store = createStore();
      store.getState().addColor('#ff0000');
      expect(store.getState().pixelColors).toContain('#ff0000');
      const activePalette = store.getState().palettes.find((p: PaletteGroup) => p.id === store.getState().activePaletteId);
      expect(activePalette.colors).toContain('#ff0000');
    });
  });

  describe('removeColor', () => {
    it('should remove color by index', () => {
      const store = createStore();
      const beforeLen = store.getState().pixelColors.length;
      store.getState().removeColor(0);
      expect(store.getState().pixelColors.length).toBe(beforeLen - 1);
    });

    it('should not remove when only 2 colors remain', () => {
      const store = createStore();
      store.setState({
        pixelColors: ['#000', '#fff'],
        palettes: [{ id: 'default', name: 'Default', colors: ['#000', '#fff'], isPreset: false }],
      });
      store.getState().removeColor(0);
      expect(store.getState().pixelColors.length).toBe(2);
    });
  });

  describe('addPalette', () => {
    it('should add new palette with generated id', () => {
      const store = createStore();
      const beforeCount = store.getState().palettes.length;
      store.getState().addPalette({ name: 'NewPalette', colors: ['#aaa'], isPreset: false });
      expect(store.getState().palettes.length).toBe(beforeCount + 1);
      const newPalette = store.getState().palettes.find((p: PaletteGroup) => p.name === 'NewPalette');
      expect(newPalette).toBeDefined();
      expect(newPalette.id).toBeDefined();
    });
  });

  describe('removePalette', () => {
    it('should remove palette by id', () => {
      const store = createStore();
      store.getState().addPalette({ name: 'ToRemove', colors: ['#aaa'], isPreset: false });
      const toRemove = store.getState().palettes.find((p: PaletteGroup) => p.name === 'ToRemove');
      const beforeCount = store.getState().palettes.length;
      store.getState().removePalette(toRemove.id);
      expect(store.getState().palettes.length).toBe(beforeCount - 1);
    });

    it('should not remove when only 1 palette exists', () => {
      const store = createStore();
      expect(store.getState().palettes.length).toBe(1);
      store.getState().removePalette(store.getState().palettes[0].id);
      expect(store.getState().palettes.length).toBe(1);
    });

    it('should switch active palette when removing active one', () => {
      const store = createStore();
      store.getState().addPalette({ name: 'Second', colors: ['#aaa'], isPreset: false });
      const palettes = store.getState().palettes;
      const activeId = store.getState().activePaletteId;
      store.getState().removePalette(activeId);
      expect(store.getState().activePaletteId).not.toBe(activeId);
      expect(store.getState().palettes.length).toBe(palettes.length - 1);
    });
  });

  describe('renamePalette', () => {
    it('should rename palette', () => {
      const store = createStore();
      const id = store.getState().palettes[0].id;
      store.getState().renamePalette(id, 'NewName');
      expect(store.getState().palettes[0].name).toBe('NewName');
    });
  });

  describe('setActivePalette', () => {
    it('should set active palette and update pixelColors', () => {
      const store = createStore();
      store.getState().addPalette({ name: 'Active', colors: ['#abc', '#def'], isPreset: false });
      const newPalette = store.getState().palettes.find((p: PaletteGroup) => p.name === 'Active');
      store.getState().setActivePalette(newPalette.id);
      expect(store.getState().activePaletteId).toBe(newPalette.id);
      expect(store.getState().pixelColors).toEqual(['#abc', '#def']);
    });

    it('should not change for nonexistent palette', () => {
      const store = createStore();
      const beforeId = store.getState().activePaletteId;
      store.getState().setActivePalette('nonexistent');
      expect(store.getState().activePaletteId).toBe(beforeId);
    });

    it('should handle null paletteId', () => {
      const store = createStore();
      const beforeColors = store.getState().pixelColors;
      store.getState().setActivePalette(null);
      expect(store.getState().pixelColors).toEqual(beforeColors);
    });
  });

  describe('importPresetPalette', () => {
    it('should import pico-8 preset palette', () => {
      const store = createStore();
      store.getState().importPresetPalette('pico-8');
      const imported = store.getState().palettes.find((p: PaletteGroup) => p.presetId === 'pico-8');
      expect(imported).toBeDefined();
      expect(imported.isPreset).toBe(true);
      expect(store.getState().activePaletteId).toBe(imported.id);
    });

    it('should not import nonexistent preset', () => {
      const store = createStore();
      const beforeCount = store.getState().palettes.length;
      store.getState().importPresetPalette('nonexistent-preset');
      expect(store.getState().palettes.length).toBe(beforeCount);
    });

    it('should switch to existing preset instead of duplicating', () => {
      const store = createStore();
      store.getState().importPresetPalette('pico-8');
      const countAfterFirst = store.getState().palettes.length;
      store.getState().importPresetPalette('pico-8');
      expect(store.getState().palettes.length).toBe(countAfterFirst);
    });
  });

  describe('updatePaletteColors', () => {
    it('should update palette colors', () => {
      const store = createStore();
      const id = store.getState().palettes[0].id;
      store.getState().updatePaletteColors(id, ['#aaa', '#bbb']);
      expect(store.getState().palettes[0].colors).toEqual(['#aaa', '#bbb']);
      expect(store.getState().pixelColors).toEqual(['#aaa', '#bbb']);
    });

    it('should not update pixelColors if not active palette', () => {
      const store = createStore();
      store.getState().addPalette({ name: 'Other', colors: ['#000'], isPreset: false });
      const otherPalette = store.getState().palettes.find((p: PaletteGroup) => p.name === 'Other');
      const beforeColors = [...store.getState().pixelColors];
      store.getState().updatePaletteColors(otherPalette.id, ['#111', '#222']);
      expect(store.getState().pixelColors).toEqual(beforeColors);
    });
  });

  describe('addColorToPalette', () => {
    it('should add color to palette', () => {
      const store = createStore();
      const id = store.getState().palettes[0].id;
      const beforeCount = store.getState().palettes[0].colors.length;
      store.getState().addColorToPalette(id, '#ff0000');
      expect(store.getState().palettes[0].colors.length).toBe(beforeCount + 1);
    });

    it('should not add duplicate color', () => {
      const store = createStore();
      const id = store.getState().palettes[0].id;
      const color = store.getState().palettes[0].colors[0];
      const beforeCount = store.getState().palettes[0].colors.length;
      store.getState().addColorToPalette(id, color);
      expect(store.getState().palettes[0].colors.length).toBe(beforeCount);
    });

    it('should not add if palette not found', () => {
      const store = createStore();
      const beforeCount = store.getState().palettes.length;
      store.getState().addColorToPalette('nonexistent', '#fff');
      expect(store.getState().palettes.length).toBe(beforeCount);
    });
  });

  describe('removeColorFromPalette', () => {
    it('should remove color from palette', () => {
      const store = createStore();
      const id = store.getState().palettes[0].id;
      const beforeCount = store.getState().palettes[0].colors.length;
      store.getState().removeColorFromPalette(id, 0);
      expect(store.getState().palettes[0].colors.length).toBe(beforeCount - 1);
    });

    it('should not remove if palette has <= 2 colors', () => {
      const store = createStore();
      store.setState({
        palettes: [{ id: 'small', name: 'Small', colors: ['#000', '#fff'], isPreset: false }],
        activePaletteId: 'small',
        pixelColors: ['#000', '#fff'],
      });
      store.getState().removeColorFromPalette('small', 0);
      expect(store.getState().palettes[0].colors.length).toBe(2);
    });

    it('should not remove if palette not found', () => {
      const store = createStore();
      expect(() => store.getState().removeColorFromPalette('nonexistent', 0)).not.toThrow();
    });
  });

  describe('switchToPalette', () => {
    it('should switch active palette and update pixelColors', () => {
      const store = createStore();
      store.getState().addPalette({ name: 'Target', colors: ['#aaa', '#bbb'], isPreset: false });
      const target = store.getState().palettes.find((p: PaletteGroup) => p.name === 'Target');
      store.getState().switchToPalette(target.id);
      expect(store.getState().activePaletteId).toBe(target.id);
      expect(store.getState().pixelColors).toEqual(['#aaa', '#bbb']);
    });

    it('should not change for nonexistent palette', () => {
      const store = createStore();
      const beforeId = store.getState().activePaletteId;
      store.getState().switchToPalette('nonexistent');
      expect(store.getState().activePaletteId).toBe(beforeId);
    });
  });
});
