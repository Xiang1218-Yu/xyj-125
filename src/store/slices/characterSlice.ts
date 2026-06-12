import type { StateCreator } from 'zustand';
import type { Character, Action, Frame, Layer, PixelEditorState, PixelEditorActions } from '@/types/animation';
import { characterTemplates } from '@/data/characterTemplates';
import {
  generateId,
  createEmptyPixels,
  createDefaultLayer,
  cloneCharacter,
  cloneFrame,
  immutableUpdateCharacter,
  immutableUpdateAction,
  immutableUpdateFrame,
  immutableArrayInsert,
  immutableArrayRemove,
  immutableArrayMove,
} from '../utils';

export type CharacterSlice = Pick<
  PixelEditorState,
  'character' | 'currentActionId' | 'currentFrameId' | 'currentLayerId' | 'selectedFrameIds' | 'selection' | 'clipboardPixels'
> &
  Pick<
    PixelEditorActions,
    | 'applyTemplate'
    | 'setCharacter'
    | 'setCurrentAction'
    | 'setCurrentFrame'
    | 'setCurrentLayer'
    | 'addAction'
    | 'deleteAction'
    | 'renameAction'
    | 'duplicateAction'
    | 'setActionLoop'
    | 'addFrame'
    | 'deleteFrame'
    | 'duplicateFrame'
    | 'renameFrame'
    | 'moveFrame'
    | 'setFrameDelay'
    | 'setSelectedFrameIds'
    | 'toggleFrameSelection'
    | 'clearFrameSelection'
    | 'batchRenameFrames'
    | 'batchDuplicateFrames'
    | 'batchDeleteFrames'
    | 'addLayer'
    | 'deleteLayer'
    | 'duplicateLayer'
    | 'renameLayer'
    | 'moveLayer'
    | 'setLayerVisible'
    | 'setLayerLocked'
    | 'setLayerOpacity'
    | 'getCurrentAction'
    | 'getCurrentFrame'
    | 'getCurrentLayer'
    | 'getFrameMergedPixels'
    | 'generateSpriteSheet'
    | 'setCharacterSize'
    | 'resetCharacter'
    | 'setSelection'
    | 'setClipboardPixels'
    | 'copySelection'
    | 'cutSelection'
    | 'pasteClipboard'
    | 'deleteSelection'
  >;

export type CharacterSliceCreator = StateCreator<
  any,
  [],
  [],
  CharacterSlice
>;

export const createCharacterSlice: CharacterSliceCreator = (set, get) => ({
  character: {} as Character,
  currentActionId: null,
  currentFrameId: null,
  currentLayerId: null,
  selectedFrameIds: [],
  selection: null,
  clipboardPixels: null,

  applyTemplate: (templateId: string): boolean => {
    const template = characterTemplates.find((t) => t.id === templateId);
    if (!template) return false;
    const newCharacter = template.buildCharacter();
    const firstAction = newCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    set({
      character: newCharacter,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
      selectedFrameIds: [],
    });
    return true;
  },

  setCharacter: (character: Character): void => set({ character }),

  setCurrentAction: (actionId: string): void => {
    const { character } = get();
    const action = character.actions.find((a) => a.id === actionId);
    const firstFrame = action?.frames[0];
    set({
      currentActionId: actionId,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
  },

  setCurrentFrame: (frameId: string): void => {
    const { character, currentActionId } = get();
    const action = character.actions.find((a) => a.id === currentActionId);
    const frame = action?.frames.find((f) => f.id === frameId);
    set({
      currentFrameId: frameId,
      currentLayerId: frame?.layers[0]?.id || null,
    });
  },

  setCurrentLayer: (layerId: string): void => set({ currentLayerId: layerId }),

  addAction: (name: string): void => {
    const { character } = get();
    const framePixels = createEmptyPixels(character.width, character.height);
    const layer = createDefaultLayer(character.width, character.height);
    layer.pixels = framePixels;
    const newAction: Action = {
      id: generateId(),
      name,
      frames: [
        {
          id: generateId(),
          name: `${name}_001`,
          layers: [layer],
          delay: 200,
        },
      ],
      loop: true,
    };
    set({
      character: { ...character, actions: [...character.actions, newAction] },
      currentActionId: newAction.id,
      currentFrameId: newAction.frames[0].id,
      currentLayerId: newAction.frames[0].layers[0].id,
    });
  },

  deleteAction: (actionId: string): void => {
    const { character, currentActionId } = get();
    const newActions = character.actions.filter((a) => a.id !== actionId);
    const newCurrentId = currentActionId === actionId
      ? newActions[0]?.id || null
      : currentActionId;
    const currentAction = newActions.find((a) => a.id === newCurrentId);
    const firstFrame = currentAction?.frames[0];
    set({
      character: { ...character, actions: newActions },
      currentActionId: newCurrentId,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    });
  },

  renameAction: (actionId: string, name: string): void => {
    const { character } = get();
    const newCharacter = immutableUpdateAction(character, actionId, (a) => {
      a.name = name;
    });
    set({ character: newCharacter });
  },

  duplicateAction: (actionId: string): void => {
    const { character } = get();
    const action = character.actions.find((a) => a.id === actionId);
    if (!action) return;

    const newAction: Action = {
      id: generateId(),
      name: `${action.name}_copy`,
      loop: action.loop,
      frames: action.frames.map((f) => cloneFrame(f)),
    };

    set({
      character: { ...character, actions: [...character.actions, newAction] },
    });
  },

  setActionLoop: (actionId: string, loop: boolean): void => {
    const { character } = get();
    const newCharacter = immutableUpdateAction(character, actionId, (a) => {
      a.loop = loop;
    });
    set({ character: newCharacter });
  },

  addFrame: (actionId: string): void => {
    const { character, currentFrameId } = get();
    const action = character.actions.find((a) => a.id === actionId);
    if (!action) return;

    const baseFrame = action.frames.find((f) => f.id === currentFrameId) || action.frames[action.frames.length - 1];
    const newFrame: Frame = {
      id: generateId(),
      name: `${action.name}_${String(action.frames.length + 1).padStart(3, '0')}`,
      layers: baseFrame
        ? baseFrame.layers.map((l) => ({
            ...l,
            id: generateId(),
            pixels: l.pixels.map((row) => [...row]),
          }))
        : [createDefaultLayer(character.width, character.height)],
      delay: baseFrame?.delay || 200,
    };

    const currentIndex = action.frames.findIndex((f) => f.id === currentFrameId);
    const newFrames = currentIndex >= 0
      ? immutableArrayInsert<Frame>(action.frames, currentIndex + 1, newFrame)
      : [...action.frames, newFrame];

    const newCharacter = immutableUpdateAction(character, actionId, (a) => {
      a.frames = newFrames;
    });

    set({
      character: newCharacter,
      currentFrameId: newFrame.id,
      currentLayerId: newFrame.layers[0]?.id || null,
    });
  },

  deleteFrame: (frameId: string): void => {
    const { character, currentActionId, currentFrameId, currentLayerId } = get();
    if (!currentActionId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const index = action.frames.findIndex((f) => f.id === frameId);
    if (index === -1) return;

    const newFrames = immutableArrayRemove<Frame>(action.frames, index);
    let newFrameId: string | null = currentFrameId;
    let newLayerId: string | null = currentLayerId;

    if (newFrames.length > 0 && currentFrameId === frameId) {
      const newIndex = Math.min(index, newFrames.length - 1);
      const newFrame = newFrames[newIndex];
      newFrameId = newFrame.id;
      newLayerId = newFrame.layers[0]?.id || null;
    }

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      a.frames = newFrames;
    });

    set({
      character: newCharacter,
      currentFrameId: newFrameId,
      currentLayerId: newLayerId,
    });
  },

  duplicateFrame: (frameId: string): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frameIndex = action.frames.findIndex((f) => f.id === frameId);
    if (frameIndex === -1) return;

    const frame = action.frames[frameIndex];
    const newFrame: Frame = cloneFrame(frame);
    newFrame.id = generateId();
    newFrame.name = `${frame.name}_copy`;

    const newFrames = immutableArrayInsert<Frame>(action.frames, frameIndex + 1, newFrame);
    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      a.frames = newFrames;
    });

    set({
      character: newCharacter,
      currentFrameId: newFrame.id,
      currentLayerId: newFrame.layers[0]?.id || null,
    });
  },

  renameFrame: (frameId: string, name: string): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, frameId, (f) => {
      f.name = name;
    });
    set({ character: newCharacter });
  },

  moveFrame: (fromIndex: number, toIndex: number): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const newFrames = immutableArrayMove<Frame>(action.frames, fromIndex, toIndex);
    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      a.frames = newFrames;
    });

    set({ character: newCharacter });
  },

  setFrameDelay: (frameId: string, delay: number): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const newCharacter: Character = {
      ...character,
      actions: character.actions.map((a) => {
        if (a.id !== currentActionId) return a;
        return {
          ...a,
          frames: a.frames.map((f) =>
            f.id === frameId ? { ...f, delay } : f
          ),
        };
      }),
    };

    set({ character: newCharacter });
  },

  setSelectedFrameIds: (ids: string[]): void => set({ selectedFrameIds: ids }),

  toggleFrameSelection: (frameId: string): void => {
    const { selectedFrameIds } = get();
    if (selectedFrameIds.includes(frameId)) {
      set({ selectedFrameIds: selectedFrameIds.filter((id) => id !== frameId) });
    } else {
      set({ selectedFrameIds: [...selectedFrameIds, frameId] });
    }
  },

  clearFrameSelection: (): void => set({ selectedFrameIds: [] }),

  batchRenameFrames: (prefix: string, startIndex: number): void => {
    const { character, currentActionId, selectedFrameIds } = get();
    if (!currentActionId || selectedFrameIds.length === 0) return;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      let idx = startIndex;
      for (const frameId of selectedFrameIds) {
        const frame = a.frames.find((f) => f.id === frameId);
        if (frame) {
          frame.name = `${prefix}_${String(idx).padStart(3, '0')}`;
          idx++;
        }
      }
    });

    set({ character: newCharacter });
  },

  batchDuplicateFrames: (frameIds: string[]): void => {
    const { character, currentActionId } = get();
    if (!currentActionId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const newFrameIds: string[] = [];
    let offset = 0;

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      for (const frameId of frameIds) {
        const frameIndex = a.frames.findIndex((f) => f.id === frameId);
        if (frameIndex === -1) continue;

        const frame = a.frames[frameIndex];
        const newFrame: Frame = cloneFrame(frame);
        newFrame.id = generateId();
        newFrame.name = `${frame.name}_copy`;

        const insertIndex = frameIndex + 1 + offset;
        a.frames = immutableArrayInsert<Frame>(a.frames, insertIndex, newFrame);
        newFrameIds.push(newFrame.id);
        offset++;
      }
    });

    set({ character: newCharacter, selectedFrameIds: newFrameIds });
  },

  batchDeleteFrames: (frameIds: string[]): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const newFrames = action.frames.filter((f) => !frameIds.includes(f.id));
    let newCurrentId: string | null = currentFrameId;
    let newLayerId: string | null = get().currentLayerId;

    if (currentFrameId && frameIds.includes(currentFrameId)) {
      const firstFrame = newFrames[0];
      newCurrentId = firstFrame?.id || null;
      newLayerId = firstFrame?.layers[0]?.id || null;
    }

    const newCharacter = immutableUpdateAction(character, currentActionId, (a) => {
      a.frames = newFrames;
    });

    set({
      character: newCharacter,
      currentFrameId: newCurrentId,
      currentLayerId: newLayerId,
      selectedFrameIds: [],
    });
  },

  addLayer: (): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const newLayer = createDefaultLayer(
        character.width,
        character.height,
        `Layer ${f.layers.length + 1}`
      );
      f.layers.push(newLayer);
      set({ currentLayerId: newLayer.id });
    });

    set({ character: newCharacter });
  },

  deleteLayer: (layerId: string): void => {
    const { character, currentActionId, currentFrameId, currentLayerId } = get();
    if (!currentActionId || !currentFrameId) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame || frame.layers.length <= 1) return;

    const index = frame.layers.findIndex((l) => l.id === layerId);
    if (index === -1) return;

    const newLayers = immutableArrayRemove<Layer>(frame.layers, index);
    let newLayerId = currentLayerId;

    if (currentLayerId === layerId) {
      const newIndex = Math.min(index, newLayers.length - 1);
      newLayerId = newLayers[newIndex]?.id || null;
    }

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      f.layers = newLayers;
    });

    set({
      character: newCharacter,
      currentLayerId: newLayerId,
    });
  },

  duplicateLayer: (layerId: string): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const frame = character.actions
      .find((a) => a.id === currentActionId)
      ?.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layerIndex = frame.layers.findIndex((l) => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = frame.layers[layerIndex];
    const newLayer: Layer = {
      id: generateId(),
      name: `${layer.name}_copy`,
      pixels: layer.pixels.map((row) => [...row]),
      visible: layer.visible,
      locked: false,
      opacity: layer.opacity,
    };

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      f.layers = immutableArrayInsert<Layer>(f.layers, layerIndex + 1, newLayer);
    });

    set({
      character: newCharacter,
      currentLayerId: newLayer.id,
    });
  },

  renameLayer: (layerId: string, name: string): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === layerId);
      if (layer) layer.name = name;
    });

    set({ character: newCharacter });
  },

  moveLayer: (fromIndex: number, toIndex: number): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const frame = character.actions
      .find((a) => a.id === currentActionId)
      ?.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const newLayers = immutableArrayMove<Layer>(frame.layers, fromIndex, toIndex);
    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      f.layers = newLayers;
    });

    set({ character: newCharacter });
  },

  setLayerVisible: (layerId: string, visible: boolean): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === layerId);
      if (layer) layer.visible = visible;
    });

    set({ character: newCharacter });
  },

  setLayerLocked: (layerId: string, locked: boolean): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === layerId);
      if (layer) layer.locked = locked;
    });

    set({ character: newCharacter });
  },

  setLayerOpacity: (layerId: string, opacity: number): void => {
    const { character, currentActionId, currentFrameId } = get();
    if (!currentActionId || !currentFrameId) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === layerId);
      if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
    });

    set({ character: newCharacter });
  },

  getCurrentAction: (): Action | null => {
    const { character, currentActionId } = get();
    return character.actions.find((a) => a.id === currentActionId) || null;
  },

  getCurrentFrame: (): Frame | null => {
    const action = get().getCurrentAction();
    return action?.frames.find((f) => f.id === get().currentFrameId) || null;
  },

  getCurrentLayer: (): Layer | null => {
    const state = get();
    const action = state.character.actions.find((a) => a.id === state.currentActionId);
    const frame = action?.frames.find((f) => f.id === state.currentFrameId);
    return frame?.layers.find((l) => l.id === state.currentLayerId) || null;
  },

  getFrameMergedPixels: (frame: Frame): number[][] => {
    const { character } = get();
    const merged = createEmptyPixels(character.width, character.height);
    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      const { opacity } = layer;
      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = layer.pixels[y]?.[x] ?? -1;
          if (colorIndex >= 0) {
            if (opacity >= 1) {
              merged[y][x] = colorIndex;
            } else if (opacity > 0 && (merged[y][x] === -1 || Math.random() < opacity)) {
              merged[y][x] = colorIndex;
            }
          }
        }
      }
    }
    return merged;
  },

  generateSpriteSheet: (actionId: string): HTMLCanvasElement | null => {
    const { character, pixelColors } = get() as any;
    const action = character.actions.find((a) => a.id === actionId);
    if (!action || action.frames.length === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = character.width * action.frames.length;
    canvas.height = character.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < action.frames.length; i++) {
      const frame = action.frames[i];
      const offsetX = i * character.width;
      const mergedPixels = get().getFrameMergedPixels(frame);

      for (let y = 0; y < character.height; y++) {
        for (let x = 0; x < character.width; x++) {
          const colorIndex = mergedPixels[y][x];
          if (colorIndex >= 0 && colorIndex < pixelColors.length) {
            ctx.fillStyle = pixelColors[colorIndex];
            ctx.fillRect(offsetX + x, y, 1, 1);
          }
        }
      }
    }

    return canvas;
  },

  setCharacterSize: (width: number, height: number): void => {
    const { character } = get();
    const oldWidth = character.width;
    const oldHeight = character.height;

    const newCharacter = immutableUpdateCharacter(character, (c) => {
      c.width = width;
      c.height = height;

      for (const action of c.actions) {
        for (const frame of action.frames) {
          for (const layer of frame.layers) {
            const newPixels = createEmptyPixels(width, height);
            const minW = Math.min(width, oldWidth);
            const minH = Math.min(height, oldHeight);
            for (let y = 0; y < minH; y++) {
              for (let x = 0; x < minW; x++) {
                newPixels[y][x] = layer.pixels[y][x];
              }
            }
            layer.pixels = newPixels;
          }
        }
      }
    });

    set({ character: newCharacter });
  },

  resetCharacter: (): void => {},

  setSelection: (selection: { x: number; y: number; width: number; height: number } | null): void =>
    set({ selection }),

  setClipboardPixels: (pixels: number[][] | null): void => set({ clipboardPixels: pixels }),

  copySelection: (): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selection } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId || !selection) return;

    const action = character.actions.find((a) => a.id === currentActionId);
    if (!action) return;

    const frame = action.frames.find((f) => f.id === currentFrameId);
    if (!frame) return;

    const layer = frame.layers.find((l) => l.id === currentLayerId);
    if (!layer) return;

    const { x, y, width, height } = selection;
    const copied: number[][] = [];

    for (let py = 0; py < height; py++) {
      const row: number[] = [];
      for (let px = 0; px < width; px++) {
        const srcX = x + px;
        const srcY = y + py;
        if (srcX >= 0 && srcX < character.width && srcY >= 0 && srcY < character.height) {
          row.push(layer.pixels[srcY][srcX]);
        } else {
          row.push(-1);
        }
      }
      copied.push(row);
    }

    set({ clipboardPixels: copied });
  },

  cutSelection: (): void => {
    const { copySelection, deleteSelection } = get();
    copySelection();
    deleteSelection();
  },

  pasteClipboard: (x: number, y: number): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, clipboardPixels } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId || !clipboardPixels) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === currentLayerId);
      if (!layer || layer.locked) return;

      const h = clipboardPixels.length;
      const w = clipboardPixels[0]?.length || 0;

      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const dstX = x + px;
          const dstY = y + py;
          if (dstX >= 0 && dstX < character.width && dstY >= 0 && dstY < character.height) {
            const color = clipboardPixels[py][px];
            if (color !== -1) {
              layer.pixels[dstY][dstX] = color;
            }
          }
        }
      }
    });

    set({ character: newCharacter });
  },

  deleteSelection: (): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selection } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId || !selection) return;

    const newCharacter = immutableUpdateFrame(character, currentActionId, currentFrameId, (f) => {
      const layer = f.layers.find((l) => l.id === currentLayerId);
      if (!layer || layer.locked) return;

      const { x, y, width, height } = selection;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const dstX = x + px;
          const dstY = y + py;
          if (dstX >= 0 && dstX < character.width && dstY >= 0 && dstY < character.height) {
            layer.pixels[dstY][dstX] = -1;
          }
        }
      }
    });

    set({ character: newCharacter, selection: null });
  },
});
