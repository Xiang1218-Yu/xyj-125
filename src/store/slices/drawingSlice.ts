import type { StateCreator } from 'zustand';
import type { PixelEditorState, PixelEditorActions } from '@/types/animation';
import {
  immutableUpdateCurrentLayer,
} from '../utils';

export type DrawingSlice = Pick<
  PixelEditorState,
  'selectedTool' | 'currentColor'
> &
  Pick<
    PixelEditorActions,
    | 'setPixel'
    | 'setCurrentColor'
    | 'setSelectedTool'
    | 'drawLine'
    | 'drawRectangle'
    | 'drawEllipse'
  >;

export type DrawingSliceCreator = StateCreator<
  any,
  [],
  [],
  DrawingSlice
>;

export const createDrawingSlice: DrawingSliceCreator = (set, get) => ({
  selectedTool: 'pencil',
  currentColor: '#000000',

  setPixel: (x: number, y: number, colorIndex: number): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selectedTool } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId) return;

    if (x < 0 || x >= character.width || y < 0 || y >= character.height) return;

    const newCharacter = immutableUpdateCurrentLayer(
      character,
      currentActionId,
      currentFrameId,
      currentLayerId,
      (layer) => {
        if (layer.locked) return;

        if (selectedTool === 'pencil') {
          layer.pixels[y][x] = colorIndex;
        } else if (selectedTool === 'eraser') {
          layer.pixels[y][x] = -1;
        } else if (selectedTool === 'bucket') {
          const targetIndex = layer.pixels[y][x];
          if (targetIndex === colorIndex) return;

          const stack: [number, number][] = [[x, y]];
          const visited = new Set<string>();

          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            if (cx < 0 || cx >= character.width || cy < 0 || cy >= character.height) continue;
            if (layer.pixels[cy][cx] !== targetIndex) continue;

            visited.add(key);
            layer.pixels[cy][cx] = colorIndex;

            stack.push(
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            );
          }
        }
      }
    );

    if (newCharacter) {
      set({ character: newCharacter });
    }
  },

  setCurrentColor: (color: string): void => set({ currentColor: color }),

  setSelectedTool: (tool: PixelEditorState['selectedTool']): void => set({ selectedTool: tool }),

  drawLine: (x1: number, y1: number, x2: number, y2: number, colorIndex: number): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selectedTool } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId) return;

    const newCharacter = immutableUpdateCurrentLayer(
      character,
      currentActionId,
      currentFrameId,
      currentLayerId,
      (layer) => {
        if (layer.locked) return;

        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        let x = x1;
        let y = y1;
        const value = selectedTool === 'eraser' ? -1 : colorIndex;

        while (true) {
          if (x >= 0 && x < character.width && y >= 0 && y < character.height) {
            layer.pixels[y][x] = value;
          }
          if (x === x2 && y === y2) break;
          const e2 = 2 * err;
          if (e2 > -dy) {
            err -= dy;
            x += sx;
          }
          if (e2 < dx) {
            err += dx;
            y += sy;
          }
        }
      }
    );

    if (newCharacter) {
      set({ character: newCharacter });
    }
  },

  drawRectangle: (x1: number, y1: number, x2: number, y2: number, colorIndex: number, fill = false): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selectedTool } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId) return;

    const newCharacter = immutableUpdateCurrentLayer(
      character,
      currentActionId,
      currentFrameId,
      currentLayerId,
      (layer) => {
        if (layer.locked) return;

        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(character.width - 1, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(character.height - 1, Math.max(y1, y2));
        const value = selectedTool === 'eraser' ? -1 : colorIndex;

        if (fill) {
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              layer.pixels[y][x] = value;
            }
          }
        } else {
          for (let x = minX; x <= maxX; x++) {
            layer.pixels[minY][x] = value;
            layer.pixels[maxY][x] = value;
          }
          for (let y = minY; y <= maxY; y++) {
            layer.pixels[y][minX] = value;
            layer.pixels[y][maxX] = value;
          }
        }
      }
    );

    if (newCharacter) {
      set({ character: newCharacter });
    }
  },

  drawEllipse: (x1: number, y1: number, x2: number, y2: number, colorIndex: number, fill = false): void => {
    const { character, currentActionId, currentFrameId, currentLayerId, selectedTool } = get();
    if (!currentActionId || !currentFrameId || !currentLayerId) return;

    const newCharacter = immutableUpdateCurrentLayer(
      character,
      currentActionId,
      currentFrameId,
      currentLayerId,
      (layer) => {
        if (layer.locked) return;

        const centerX = Math.round((x1 + x2) / 2);
        const centerY = Math.round((y1 + y2) / 2);
        const rx = Math.abs(Math.round((x2 - x1) / 2));
        const ry = Math.abs(Math.round((y2 - y1) / 2));

        if (rx <= 0 || ry <= 0) return;

        const value = selectedTool === 'eraser' ? -1 : colorIndex;

        const setPixel = (x: number, y: number) => {
          if (x >= 0 && x < character.width && y >= 0 && y < character.height) {
            layer.pixels[y][x] = value;
          }
        };

        if (fill) {
          for (let y = -ry; y <= ry; y++) {
            for (let x = -rx; x <= rx; x++) {
              if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
                setPixel(centerX + x, centerY + y);
              }
            }
          }
        } else {
          let x = 0;
          let y = ry;
          let d1 = ry * ry - rx * rx * ry + 0.25 * rx * rx;
          let dx = 2 * ry * ry * x;
          let dy = 2 * rx * rx * y;

          while (dx < dy) {
            setPixel(centerX + x, centerY + y);
            setPixel(centerX - x, centerY + y);
            setPixel(centerX + x, centerY - y);
            setPixel(centerX - x, centerY - y);

            if (d1 < 0) {
              x++;
              dx = 2 * ry * ry * x;
              d1 = d1 + dx + ry * ry;
            } else {
              x++;
              y--;
              dx = 2 * ry * ry * x;
              dy = 2 * rx * rx * y;
              d1 = d1 + dx - dy + ry * ry;
            }
          }

          let d2 = ry * ry * (x + 0.5) * (x + 0.5) + rx * rx * (y - 1) * (y - 1) - rx * rx * ry * ry;

          while (y >= 0) {
            setPixel(centerX + x, centerY + y);
            setPixel(centerX - x, centerY + y);
            setPixel(centerX + x, centerY - y);
            setPixel(centerX - x, centerY - y);

            if (d2 > 0) {
              y--;
              dy = 2 * rx * rx * y;
              d2 = d2 + rx * rx - dy;
            } else {
              y--;
              x++;
              dx = 2 * ry * ry * x;
              dy = 2 * rx * rx * y;
              d2 = d2 + dx - dy + rx * rx;
            }
          }
        }
      }
    );

    if (newCharacter) {
      set({ character: newCharacter });
    }
  },
});
