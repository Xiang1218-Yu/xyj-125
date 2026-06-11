export interface Layer {
  id: string;
  name: string;
  pixels: number[][];
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
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

export interface SaveData {
  character: Character;
  pixelColors: string[];
  fps: number;
  gridSize: number;
}

export interface SaveMeta {
  name: string;
  createdAt: number;
  updatedAt: number;
  actionCount: number;
  frameCount: number;
}

export interface SaveEntry {
  meta: SaveMeta;
  data: SaveData;
}

export interface PixelEditorState {
  character: Character;
  currentActionId: string | null;
  currentFrameId: string | null;
  currentLayerId: string | null;
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
  currentSaveName: string | null;
  autoSave: boolean;
  autoSaveInterval: number;
  onionSkinEnabled: boolean;
  onionSkinPrevFrames: number;
  onionSkinNextFrames: number;
  onionSkinOpacity: number;
}

export interface PixelEditorActions {
  applyTemplate: (templateId: string) => boolean;
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
  saveAs: (name: string) => boolean;
  save: () => boolean;
  loadSave: (name: string) => boolean;
  deleteSave: (name: string) => boolean;
  listSaves: () => SaveMeta[];
  hasSave: (name: string) => boolean;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveInterval: (minutes: number) => void;
  resetCharacter: () => void;
  setOnionSkinEnabled: (enabled: boolean) => void;
  setOnionSkinPrevFrames: (count: number) => void;
  setOnionSkinNextFrames: (count: number) => void;
  setOnionSkinOpacity: (opacity: number) => void;
  setCurrentLayer: (layerId: string) => void;
  addLayer: () => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerVisible: (layerId: string, visible: boolean) => void;
  setLayerLocked: (layerId: string, locked: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  getCurrentLayer: () => Layer | null;
  getFrameMergedPixels: (frame: Frame) => number[][];
  generateParticleAnimation: (config: {
    type: string;
    frameCount: number;
    actionName?: string;
    insertMode?: 'newAction' | 'currentAction';
    particleCount?: number;
    colors?: number[];
    emitX?: number;
    emitY?: number;
    emitRadius?: number;
    minSpeed?: number;
    maxSpeed?: number;
    minLife?: number;
    maxLife?: number;
    minSize?: number;
    maxSize?: number;
    gravity?: number;
    friction?: number;
    direction?: number;
    spread?: number;
    emissionRate?: number;
  }) => boolean;
}
