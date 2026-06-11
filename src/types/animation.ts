export interface Frame {
  id: string;
  name: string;
  pixels: number[][];
  delay: number;
}

export interface Action {
  id: string;
  name: string;
  frames: Frame[];
  loop: boolean;
}

export interface Character {
  id: string;
  name: string;
  width: number;
  height: number;
  actions: Action[];
}

export interface PixelEditorState {
  character: Character;
  currentActionId: string | null;
  currentFrameId: string | null;
  selectedTool: 'pencil' | 'eraser' | 'bucket';
  currentColor: string;
  gridSize: number;
  showGrid: boolean;
  isPlaying: boolean;
  fps: number;
  selectedFrameIds: string[];
  pixelColors: string[];
  history: Character[];
  historyIndex: number;
  lastSavedTime: number | null;
}

export interface PixelEditorActions {
  setCharacter: (character: Character) => void;
  setCurrentAction: (actionId: string) => void;
  setCurrentFrame: (frameId: string) => void;
  setPixel: (x: number, y: number, colorIndex: number) => void;
  setCurrentColor: (color: string) => void;
  setSelectedTool: (tool: 'pencil' | 'eraser' | 'bucket') => void;
  setGridSize: (size: number) => void;
  setShowGrid: (show: boolean) => void;
  setFps: (fps: number) => void;
  setIsPlaying: (playing: boolean) => void;
  addAction: (name: string) => void;
  deleteAction: (actionId: string) => void;
  renameAction: (actionId: string, name: string) => void;
  duplicateAction: (actionId: string) => void;
  addFrame: (actionId: string) => void;
  deleteFrame: (frameId: string) => void;
  duplicateFrame: (frameId: string) => void;
  renameFrame: (frameId: string, name: string) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  setFrameDelay: (frameId: string, delay: number) => void;
  setSelectedFrameIds: (ids: string[]) => void;
  toggleFrameSelection: (frameId: string) => void;
  clearFrameSelection: () => void;
  batchRenameFrames: (prefix: string, startIndex: number) => void;
  batchDuplicateFrames: (frameIds: string[]) => void;
  batchDeleteFrames: (frameIds: string[]) => void;
  generateSpriteSheet: (actionId: string) => HTMLCanvasElement | null;
  getCurrentAction: () => Action | null;
  getCurrentFrame: () => Frame | null;
  addColor: (color: string) => void;
  removeColor: (index: number) => void;
  setCharacterSize: (width: number, height: number) => void;
  setActionLoop: (actionId: string, loop: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToLocal: () => void;
  loadFromLocal: () => boolean;
  resetCharacter: () => void;
}
