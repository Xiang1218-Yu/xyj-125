import type { StateCreator } from 'zustand';
import type { Character, PixelEditorState, PixelEditorActions } from '@/types/animation';
import { cloneCharacter } from '../utils';

const MAX_HISTORY = 50;

export type HistorySlice = Pick<
  PixelEditorState,
  'history' | 'historyIndex'
> &
  Pick<
    PixelEditorActions,
    'pushHistory' | 'undo' | 'redo' | 'canUndo' | 'canRedo'
  >;

export type HistorySliceCreator = StateCreator<
  any,
  [],
  [],
  HistorySlice
>;

export const createHistorySlice: HistorySliceCreator = (set, get) => ({
  history: [],
  historyIndex: -1,

  pushHistory: (): void => {
    const { character, history, historyIndex } = get();
    const newHistory = historyIndex < history.length - 1
      ? history.slice(0, historyIndex + 1)
      : [...history];

    newHistory.push(cloneCharacter(character));

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: (): void => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const restoredCharacter = cloneCharacter(history[newIndex]);

    const firstAction = restoredCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    } as Partial<PixelEditorState>);
  },

  redo: (): void => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const restoredCharacter = cloneCharacter(history[newIndex]);

    const firstAction = restoredCharacter.actions[0];
    const firstFrame = firstAction?.frames[0];
    set({
      character: restoredCharacter,
      historyIndex: newIndex,
      currentActionId: firstAction?.id || null,
      currentFrameId: firstFrame?.id || null,
      currentLayerId: firstFrame?.layers[0]?.id || null,
    } as Partial<PixelEditorState>);
  },

  canUndo: (): boolean => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: (): boolean => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
});
