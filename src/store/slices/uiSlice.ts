import type { StateCreator } from 'zustand';
import type { PixelEditorState, PixelEditorActions, TweenMode, Frame } from '@/types/animation';
import { buildTweenPlaybackFrames } from '@/utils/frameTweener';

export type UiSlice = Pick<
  PixelEditorState,
  | 'gridSize'
  | 'showGrid'
  | 'isPlaying'
  | 'fps'
  | 'onionSkinEnabled'
  | 'onionSkinPrevFrames'
  | 'onionSkinNextFrames'
  | 'onionSkinOpacity'
  | 'tweenEnabled'
  | 'tweenMode'
  | 'tweenSteps'
  | 'tweenFrameIds'
  | 'referenceImage'
  | 'referenceImageOpacity'
  | 'referenceImageEnabled'
> &
  Pick<
    PixelEditorActions,
    | 'setGridSize'
    | 'setShowGrid'
    | 'setFps'
    | 'setIsPlaying'
    | 'setOnionSkinEnabled'
    | 'setOnionSkinPrevFrames'
    | 'setOnionSkinNextFrames'
    | 'setOnionSkinOpacity'
    | 'setTweenEnabled'
    | 'setTweenMode'
    | 'setTweenSteps'
    | 'toggleTweenFrame'
    | 'setTweenFrameIds'
    | 'clearTweenFrames'
    | 'getTweenFrames'
    | 'setReferenceImage'
    | 'setReferenceImageOpacity'
    | 'setReferenceImageEnabled'
  >;

export type UiSliceCreator = StateCreator<
  any,
  [],
  [],
  UiSlice
>;

export const createUiSlice: UiSliceCreator = (set, get) => ({
  gridSize: 20,
  showGrid: true,
  isPlaying: false,
  fps: 8,
  onionSkinEnabled: false,
  onionSkinPrevFrames: 1,
  onionSkinNextFrames: 1,
  onionSkinOpacity: 0.3,
  tweenEnabled: false,
  tweenMode: 'linear',
  tweenSteps: 3,
  tweenFrameIds: [],
  referenceImage: null,
  referenceImageOpacity: 0.5,
  referenceImageEnabled: false,

  setGridSize: (size: number): void => set({ gridSize: size }),

  setShowGrid: (show: boolean): void => set({ showGrid: show }),

  setFps: (fps: number): void => set({ fps }),

  setIsPlaying: (playing: boolean): void => set({ isPlaying: playing }),

  setOnionSkinEnabled: (enabled: boolean): void => set({ onionSkinEnabled: enabled }),

  setOnionSkinPrevFrames: (count: number): void => set({ onionSkinPrevFrames: Math.max(0, count) }),

  setOnionSkinNextFrames: (count: number): void => set({ onionSkinNextFrames: Math.max(0, count) }),

  setOnionSkinOpacity: (opacity: number): void => set({ onionSkinOpacity: Math.max(0.1, Math.min(0.9, opacity)) }),

  setTweenEnabled: (enabled: boolean): void => set({ tweenEnabled: enabled }),

  setTweenMode: (mode: TweenMode): void => set({ tweenMode: mode }),

  setTweenSteps: (steps: number): void => set({ tweenSteps: Math.max(1, Math.min(20, steps)) }),

  toggleTweenFrame: (frameId: string): void => {
    const { tweenFrameIds } = get();
    if (tweenFrameIds.includes(frameId)) {
      set({ tweenFrameIds: tweenFrameIds.filter((id) => id !== frameId) });
    } else {
      set({ tweenFrameIds: [...tweenFrameIds, frameId] });
    }
  },

  setTweenFrameIds: (frameIds: string[]): void => set({ tweenFrameIds: frameIds }),

  clearTweenFrames: (): void => set({ tweenFrameIds: [] }),

  getTweenFrames: (actionId: string): Frame[] => {
    const { character, tweenFrameIds, tweenSteps, tweenMode, pixelColors } = get() as any;
    const action = character.actions.find((a: any) => a.id === actionId);
    if (!action || action.frames.length < 2) return action?.frames || [];

    const { frames } = buildTweenPlaybackFrames(
      action.frames,
      tweenFrameIds,
      tweenSteps,
      tweenMode,
      pixelColors,
      character.width,
      character.height
    );
    return frames;
  },

  setReferenceImage: (imageData: string | null): void => set({ referenceImage: imageData }),

  setReferenceImageOpacity: (opacity: number): void => set({ referenceImageOpacity: Math.max(0.1, Math.min(1, opacity)) }),

  setReferenceImageEnabled: (enabled: boolean): void => set({ referenceImageEnabled: enabled }),
});
