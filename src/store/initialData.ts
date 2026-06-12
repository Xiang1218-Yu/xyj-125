import { createFrameWithPixels, createEmptyPixels, generateId } from './utils';
import type { Character, Frame, Action } from '@/types/animation';

export const defaultColors: string[] = [
  '#000000',
  '#ffffff',
  '#e94560',
  '#0f3460',
  '#16213e',
  '#f39c12',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e67e22',
  '#1abc9c',
  '#e74c3c',
  '#95a5a6',
  '#34495e',
  '#f1c40f',
  '#2c3e50',
];

const createIdleFramePixels = (width: number, height: number): number[][] => {
  const pixels = createEmptyPixels(width, height);
  for (let y = 3; y < 6; y++) {
    for (let x = 5; x < 11; x++) {
      pixels[y][x] = 1;
    }
  }
  for (let y = 2; y < 7; y++) {
    pixels[y][4] = 0;
    pixels[y][11] = 0;
  }
  for (let x = 4; x < 12; x++) {
    pixels[2][x] = 0;
    pixels[6][x] = 0;
  }
  pixels[4][6] = 0;
  pixels[4][9] = 0;
  for (let y = 6; y < 12; y++) {
    for (let x = 5; x < 11; x++) {
      pixels[y][x] = 3;
    }
  }
  for (let y = 6; y < 12; y++) {
    pixels[y][4] = 0;
    pixels[y][11] = 0;
  }
  pixels[12][4] = 0;
  pixels[12][11] = 0;
  pixels[12][5] = 0;
  pixels[12][10] = 0;
  for (let y = 12; y < 15; y++) {
    pixels[y][6] = 0;
    pixels[y][7] = 3;
    pixels[y][8] = 3;
    pixels[y][9] = 0;
  }
  pixels[15][6] = 0;
  pixels[15][7] = 0;
  pixels[15][8] = 0;
  pixels[15][9] = 0;
  pixels[7][3] = 0;
  pixels[8][3] = 3;
  pixels[9][3] = 3;
  pixels[10][3] = 0;
  pixels[7][12] = 0;
  pixels[8][12] = 3;
  pixels[9][12] = 3;
  pixels[10][12] = 0;
  return pixels;
};

const createWalkFrame1Pixels = (width: number, height: number): number[][] => {
  const pixels = createIdleFramePixels(width, height);
  for (let y = 12; y < 15; y++) {
    pixels[y][6] = -1;
    pixels[y][7] = -1;
  }
  pixels[13][5] = 0;
  pixels[14][5] = 0;
  pixels[13][6] = 3;
  pixels[14][6] = 3;
  return pixels;
};

const createWalkFrame2Pixels = (width: number, height: number): number[][] => {
  const pixels = createIdleFramePixels(width, height);
  for (let y = 12; y < 15; y++) {
    pixels[y][8] = -1;
    pixels[y][9] = -1;
  }
  pixels[13][9] = 0;
  pixels[14][9] = 0;
  pixels[13][10] = 0;
  pixels[14][10] = 0;
  pixels[13][8] = 3;
  pixels[14][8] = 3;
  return pixels;
};

export const createSampleCharacter = (): Character => {
  const width = 16;
  const height = 16;

  const idleFrame = createFrameWithPixels(width, height, createIdleFramePixels(width, height), 'idle_001', 200);
  const walkFrame1 = createFrameWithPixels(width, height, createWalkFrame1Pixels(width, height), 'walk_001', 150);
  const walkFrame2 = createFrameWithPixels(width, height, createWalkFrame2Pixels(width, height), 'walk_002', 150);
  const jumpFrame = createFrameWithPixels(width, height, createIdleFramePixels(width, height), 'jump_001', 300);

  const idleAction: Action = {
    id: generateId(),
    name: 'idle',
    frames: [idleFrame],
    loop: true,
  };

  const walkAction: Action = {
    id: generateId(),
    name: 'walk',
    frames: [walkFrame1, walkFrame2],
    loop: true,
  };

  const jumpAction: Action = {
    id: generateId(),
    name: 'jump',
    frames: [jumpFrame],
    loop: false,
  };

  return {
    id: generateId(),
    name: 'Player',
    width,
    height,
    actions: [idleAction, walkAction, jumpAction],
  };
};
