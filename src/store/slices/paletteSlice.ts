import type { StateCreator } from 'zustand';
import type { PixelEditorState, PixelEditorActions, PaletteGroup } from '@/types/animation';
import { findPresetPalette } from '@/data/palettes';
import { generateId } from '../utils';
import { defaultColors } from '../initialData';

const PALETTES_STORAGE_KEY = 'pixel_animator_palettes';

export const persistPalettes = (palettes: PaletteGroup[], activePaletteId: string | null): void => {
  try {
    localStorage.setItem(PALETTES_STORAGE_KEY, JSON.stringify({ palettes, activePaletteId }));
  } catch {
    console.error('Failed to persist palettes');
  }
};

export const loadPersistedPalettes = (): { palettes: PaletteGroup[]; activePaletteId: string | null } | null => {
  try {
    const raw = localStorage.getItem(PALETTES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.palettes)) {
      return { palettes: parsed.palettes, activePaletteId: parsed.activePaletteId || null };
    }
    return null;
  } catch {
    return null;
  }
};

export type PaletteSlice = Pick<
  PixelEditorState,
  'pixelColors' | 'palettes' | 'activePaletteId'
> &
  Pick<
    PixelEditorActions,
    | 'addColor'
    | 'removeColor'
    | 'addPalette'
    | 'removePalette'
    | 'renamePalette'
    | 'setActivePalette'
    | 'importPresetPalette'
    | 'updatePaletteColors'
    | 'addColorToPalette'
    | 'removeColorFromPalette'
    | 'switchToPalette'
  >;

export type PaletteSliceCreator = StateCreator<
  any,
  [],
  [],
  PaletteSlice
>;

const persisted = loadPersistedPalettes();

export const createPaletteSlice: PaletteSliceCreator = (set, get) => ({
  pixelColors: persisted
    ? (persisted.palettes.find((p) => p.id === persisted.activePaletteId)?.colors || [...defaultColors])
    : [...defaultColors],
  palettes: persisted?.palettes || [{
    id: 'default',
    name: '默认调色板',
    colors: [...defaultColors],
    isPreset: false,
  }],
  activePaletteId: persisted?.activePaletteId || 'default',

  addColor: (color: string): void => {
    const { pixelColors, palettes, activePaletteId } = get();
    const newColors = [...pixelColors, color];
    const updatedPalettes = activePaletteId
      ? palettes.map((p) => (p.id === activePaletteId ? { ...p, colors: newColors } : p))
      : palettes;
    set({ pixelColors: newColors, palettes: updatedPalettes });
  },

  removeColor: (index: number): void => {
    const { pixelColors, palettes, activePaletteId } = get();
    if (pixelColors.length <= 2) return;
    const newColors = pixelColors.filter((_, i) => i !== index);
    const updatedPalettes = activePaletteId
      ? palettes.map((p) => (p.id === activePaletteId ? { ...p, colors: newColors } : p))
      : palettes;
    set({ pixelColors: newColors, palettes: updatedPalettes });
  },

  addPalette: (palette: Omit<PaletteGroup, 'id'>): void => {
    const id = generateId();
    const newPalette: PaletteGroup = { ...palette, id };
    set({ palettes: [...get().palettes, newPalette] });
  },

  removePalette: (paletteId: string): void => {
    const { palettes, activePaletteId, pixelColors } = get();
    if (palettes.length <= 1) return;
    const remaining = palettes.filter((p) => p.id !== paletteId);
    let newActiveId = activePaletteId;
    if (activePaletteId === paletteId) {
      newActiveId = remaining[0]?.id || null;
      if (newActiveId) {
        const activePalette = remaining.find((p) => p.id === newActiveId);
        set({
          palettes: remaining,
          activePaletteId: newActiveId,
          pixelColors: activePalette ? [...activePalette.colors] : pixelColors,
        });
      }
    } else {
      set({ palettes: remaining });
    }
  },

  renamePalette: (paletteId: string, name: string): void => {
    const { palettes } = get();
    set({
      palettes: palettes.map((p) => (p.id === paletteId ? { ...p, name } : p)),
    });
  },

  setActivePalette: (paletteId: string | null): void => {
    const { palettes } = get();
    const palette = palettes.find((p) => p.id === paletteId);
    if (palette) {
      set({ activePaletteId: paletteId, pixelColors: [...palette.colors] });
    }
  },

  importPresetPalette: (presetId: string): void => {
    const preset = findPresetPalette(presetId);
    if (!preset) return;
    const { palettes } = get();
    const exists = palettes.find((p) => p.presetId === presetId);
    if (exists) {
      set({ activePaletteId: exists.id, pixelColors: [...exists.colors] });
      return;
    }
    const id = generateId();
    const newPalette: PaletteGroup = {
      id,
      name: preset.name,
      colors: [...preset.colors],
      isPreset: true,
      presetId: preset.id,
    };
    set({
      palettes: [...palettes, newPalette],
      activePaletteId: id,
      pixelColors: [...preset.colors],
    });
  },

  updatePaletteColors: (paletteId: string, colors: string[]): void => {
    const { palettes, activePaletteId } = get();
    const updated = palettes.map((p) => (p.id === paletteId ? { ...p, colors } : p));
    const stateUpdate: Partial<PaletteSlice> = { palettes: updated };
    if (activePaletteId === paletteId) {
      stateUpdate.pixelColors = [...colors];
    }
    set(stateUpdate);
  },

  addColorToPalette: (paletteId: string, color: string): void => {
    const { palettes, activePaletteId } = get();
    const palette = palettes.find((p) => p.id === paletteId);
    if (!palette || palette.colors.includes(color)) return;
    const updated = palettes.map((p) =>
      p.id === paletteId ? { ...p, colors: [...p.colors, color] } : p
    );
    const stateUpdate: Partial<PaletteSlice> = { palettes: updated };
    if (activePaletteId === paletteId) {
      stateUpdate.pixelColors = [...palette.colors, color];
    }
    set(stateUpdate);
  },

  removeColorFromPalette: (paletteId: string, colorIndex: number): void => {
    const { palettes, activePaletteId } = get();
    const palette = palettes.find((p) => p.id === paletteId);
    if (!palette || palette.colors.length <= 2) return;
    const newColors = palette.colors.filter((_, i) => i !== colorIndex);
    const updated = palettes.map((p) =>
      p.id === paletteId ? { ...p, colors: newColors } : p
    );
    const stateUpdate: Partial<PaletteSlice> = { palettes: updated };
    if (activePaletteId === paletteId) {
      stateUpdate.pixelColors = [...newColors];
    }
    set(stateUpdate);
  },

  switchToPalette: (paletteId: string): void => {
    const { palettes } = get();
    const palette = palettes.find((p) => p.id === paletteId);
    if (!palette) return;
    set({ activePaletteId: paletteId, pixelColors: [...palette.colors] });
  },
});
