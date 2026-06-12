export interface GifFrame {
  imageData: ImageData;
  delay: number;
}

const MAX_COLORS = 256;

function buildPaletteAndIndices(
  frames: GifFrame[],
  width: number,
  height: number
): {
  palette: number[];
  transparentIndex: number;
  hasTransparency: boolean;
  paletteSizeBits: number;
  allIndices: Uint8Array[];
} {
  const colorMap = new Map<number, number>();
  const colors: number[] = [];
  let hasTransparency = false;
  const pixelCount = width * height;

  const addColor = (r: number, g: number, b: number): number => {
    const key = (r << 16) | (g << 8) | b;
    let idx = colorMap.get(key);
    if (idx === undefined) {
      if (colors.length >= MAX_COLORS - 1) {
        return findClosestColor(r, g, b, colors);
      }
      idx = colors.length;
      colorMap.set(key, idx);
      colors.push(key);
    }
    return idx;
  };

  const allIndices: Uint8Array[] = [];

  for (const frame of frames) {
    const data = frame.imageData.data;
    const indices = new Uint8Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const a = data[offset + 3];

      if (a < 128) {
        hasTransparency = true;
        indices[i] = 0;
      } else {
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        indices[i] = addColor(r, g, b) + 1;
      }
    }

    allIndices.push(indices);
  }

  if (colors.length === 0) {
    colors.push(0x1a1a2e);
  }

  let paletteSizeBits = 1;
  const totalColors = colors.length + 1;
  while ((1 << paletteSizeBits) < totalColors) {
    paletteSizeBits++;
  }
  paletteSizeBits = Math.max(2, Math.min(8, paletteSizeBits));
  const actualSize = 1 << paletteSizeBits;

  const palette: number[] = [];
  palette.push(0, 0, 0);
  for (const c of colors) {
    palette.push((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
  }
  while (palette.length < actualSize * 3) {
    palette.push(0, 0, 0);
  }

  return {
    palette,
    transparentIndex: 0,
    hasTransparency,
    paletteSizeBits,
    allIndices,
  };
}

function findClosestColor(r: number, g: number, b: number, colors: number[]): number {
  let minDist = Infinity;
  let best = 0;

  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    const cr = (c >> 16) & 0xff;
    const cg = (c >> 8) & 0xff;
    const cb = c & 0xff;
    const dr = cr - r;
    const dg = cg - g;
    const db = cb - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      best = i;
      if (dist === 0) break;
    }
  }
  return best;
}

function lzwCompress(indices: Uint8Array, minCodeSize: number): number[] {
  const output: number[] = [];
  const clearCode = 1 << minCodeSize;
  const eofCode = clearCode + 1;
  const initialCodeSize = minCodeSize + 1;
  let codeSize = initialCodeSize;
  let nextCode = eofCode + 1;
  let maxCode = (1 << codeSize) - 1;

  const dict: Map<number, number> = new Map();
  const dictReset = () => {
    dict.clear();
    for (let i = 0; i < clearCode; i++) dict.set(i, i);
    nextCode = eofCode + 1;
    codeSize = initialCodeSize;
    maxCode = (1 << codeSize) - 1;
  };
  dictReset();

  let bitBuf = 0;
  let bitCount = 0;
  const writeBits = (code: number) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuf & 0xff);
      bitBuf >>>= 8;
      bitCount -= 8;
    }
  };

  writeBits(clearCode);

  const len = indices.length;
  if (len === 0) {
    writeBits(eofCode);
    if (bitCount > 0) output.push(bitBuf & 0xff);
    return output;
  }

  let w = indices[0] | 0;

  for (let i = 1; i < len; i++) {
    const k = indices[i] | 0;
    const key = (w << 12) | k;
    const v = dict.get(key);
    if (v !== undefined) {
      w = v;
    } else {
      writeBits(w);
      if (nextCode < 4096) {
        dict.set(key, nextCode);
        nextCode++;
        if ((nextCode - 1) > maxCode && codeSize < 12) {
          codeSize++;
          maxCode = (1 << codeSize) - 1;
        }
      } else {
        writeBits(clearCode);
        dictReset();
      }
      w = k;
    }
  }

  writeBits(w);
  writeBits(eofCode);

  if (bitCount > 0) output.push(bitBuf & 0xff);

  return output;
}

function writeBlocks(data: number[]): number[] {
  const result: number[] = [];
  let offset = 0;
  while (offset < data.length) {
    const blockSize = Math.min(255, data.length - offset);
    result.push(blockSize);
    for (let i = 0; i < blockSize; i++) {
      result.push(data[offset + i]);
    }
    offset += blockSize;
  }
  result.push(0);
  return result;
}

function writeShort(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

export function encodeGif(
  width: number,
  height: number,
  frames: GifFrame[],
  transparent: boolean = false
): Blob {
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided');
  }

  const actualWidth = frames[0].imageData.width;
  const actualHeight = frames[0].imageData.height;

  const { palette, transparentIndex, hasTransparency, paletteSizeBits, allIndices } =
    buildPaletteAndIndices(frames, actualWidth, actualHeight);

  const output: number[] = [];

  output.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  writeShort(output, actualWidth);
  writeShort(output, actualHeight);

  const globalColorTableFlag = 0x80;
  const colorResolution = ((paletteSizeBits - 1) & 0x07) << 4;
  const sortFlag = 0;
  const sizeOfGlobalColorTable = (paletteSizeBits - 1) & 0x07;
  output.push(globalColorTableFlag | colorResolution | sortFlag | sizeOfGlobalColorTable);
  output.push(0);
  output.push(0);

  for (let i = 0; i < palette.length; i++) {
    output.push(palette[i]);
  }

  output.push(0x21, 0xff, 11);
  output.push(0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30);
  output.push(3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, paletteSizeBits);

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const indices = allIndices[frameIdx];

    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    const useTransparent = transparent && hasTransparency;
    const disposal = useTransparent ? 2 : 1;
    const transpFlag = useTransparent ? 0x01 : 0x00;
    const packedField = (disposal << 2) | transpFlag;

    output.push(0x21, 0xf9, 4);
    output.push(packedField);
    writeShort(output, delayCs);
    output.push(transparentIndex);
    output.push(0);

    output.push(0x2c);
    writeShort(output, 0);
    writeShort(output, 0);
    writeShort(output, actualWidth);
    writeShort(output, actualHeight);
    output.push(0);

    output.push(minCodeSize);

    const compressed = lzwCompress(indices, minCodeSize);
    output.push(...writeBlocks(compressed));
  }

  output.push(0x3b);

  return new Blob([new Uint8Array(output)], { type: 'image/gif' });
}

export async function encodeGifAsync(
  width: number,
  height: number,
  frames: GifFrame[],
  transparent: boolean = false,
  onProgress?: (currentFrame: number, totalFrames: number) => void
): Promise<Blob> {
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided');
  }

  const actualWidth = frames[0].imageData.width;
  const actualHeight = frames[0].imageData.height;

  const { palette, transparentIndex, hasTransparency, paletteSizeBits, allIndices } =
    buildPaletteAndIndices(frames, actualWidth, actualHeight);

  const output: number[] = [];

  output.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  writeShort(output, actualWidth);
  writeShort(output, actualHeight);

  const globalColorTableFlag = 0x80;
  const colorResolution = ((paletteSizeBits - 1) & 0x07) << 4;
  const sortFlag = 0;
  const sizeOfGlobalColorTable = (paletteSizeBits - 1) & 0x07;
  output.push(globalColorTableFlag | colorResolution | sortFlag | sizeOfGlobalColorTable);
  output.push(0);
  output.push(0);

  for (let i = 0; i < palette.length; i++) {
    output.push(palette[i]);
  }

  output.push(0x21, 0xff, 11);
  output.push(0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30);
  output.push(3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, paletteSizeBits);

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const indices = allIndices[frameIdx];

    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    const useTransparent = transparent && hasTransparency;
    const disposal = useTransparent ? 2 : 1;
    const transpFlag = useTransparent ? 0x01 : 0x00;
    const packedField = (disposal << 2) | transpFlag;

    output.push(0x21, 0xf9, 4);
    output.push(packedField);
    writeShort(output, delayCs);
    output.push(transparentIndex);
    output.push(0);

    output.push(0x2c);
    writeShort(output, 0);
    writeShort(output, 0);
    writeShort(output, actualWidth);
    writeShort(output, actualHeight);
    output.push(0);

    output.push(minCodeSize);

    const compressed = lzwCompress(indices, minCodeSize);
    output.push(...writeBlocks(compressed));

    if (onProgress) {
      onProgress(frameIdx + 1, frames.length);
    }

    if (frameIdx < frames.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  output.push(0x3b);

  return new Blob([new Uint8Array(output)], { type: 'image/gif' });
}
