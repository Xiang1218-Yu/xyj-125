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
    colors.push(0x000000);
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

class LZWCompressor {
  private minCodeSize: number;
  private clearCode: number;
  private eofCode: number;
  private codeBits: number;
  private maxCode: number;
  private nextCode: number;
  private codeTable: Int32Array;
  private hashTable: Int32Array;
  private output: number[] = [];
  private accumulator = 0;
  private bitsInAccum = 0;
  private static readonly MAX_BITS = 12;
  private static readonly TABLE_SIZE = 5021;

  constructor(minCodeSize: number) {
    this.minCodeSize = minCodeSize;
    this.clearCode = 1 << minCodeSize;
    this.eofCode = this.clearCode + 1;
    this.codeTable = new Int32Array(LZWCompressor.TABLE_SIZE);
    this.hashTable = new Int32Array(LZWCompressor.TABLE_SIZE);
    this.reset();
  }

  private reset(): void {
    this.codeTable.fill(-1);
    this.hashTable.fill(-1);
    this.nextCode = this.clearCode + 2;
    this.codeBits = this.minCodeSize + 1;
    this.maxCode = (1 << this.codeBits) - 1;
  }

  private writeCode(code: number): void {
    this.accumulator |= code << this.bitsInAccum;
    this.bitsInAccum += this.codeBits;
    while (this.bitsInAccum >= 8) {
      this.output.push(this.accumulator & 0xff);
      this.accumulator >>= 8;
      this.bitsInAccum -= 8;
    }
  }

  private findHash(prefix: number, suffix: number): number {
    const key = (suffix << LZWCompressor.MAX_BITS) + prefix;
    let hash = (suffix << 3) ^ prefix;
    if (hash < 0) hash += LZWCompressor.TABLE_SIZE;
    const probe = LZWCompressor.TABLE_SIZE - hash;

    while (true) {
      if (this.hashTable[hash] === key) {
        return this.codeTable[hash];
      }
      if (this.hashTable[hash] < 0) {
        return -1;
      }
      hash -= probe;
      if (hash < 0) hash += LZWCompressor.TABLE_SIZE;
    }
  }

  private addHash(prefix: number, suffix: number, code: number): void {
    const key = (suffix << LZWCompressor.MAX_BITS) + prefix;
    let hash = (suffix << 3) ^ prefix;
    if (hash < 0) hash += LZWCompressor.TABLE_SIZE;
    const probe = LZWCompressor.TABLE_SIZE - hash;

    while (true) {
      if (this.hashTable[hash] < 0) {
        this.hashTable[hash] = key;
        this.codeTable[hash] = code;
        return;
      }
      hash -= probe;
      if (hash < 0) hash += LZWCompressor.TABLE_SIZE;
    }
  }

  compress(indices: Uint8Array): number[] {
    this.output = [];
    this.accumulator = 0;
    this.bitsInAccum = 0;
    this.reset();

    this.writeCode(this.clearCode);

    if (indices.length === 0) {
      this.writeCode(this.eofCode);
      if (this.bitsInAccum > 0) {
        this.output.push(this.accumulator & 0xff);
      }
      return this.output;
    }

    let current = indices[0];

    for (let i = 1; i < indices.length; i++) {
      const c = indices[i];
      const found = this.findHash(current, c);

      if (found !== -1) {
        current = found;
      } else {
        this.writeCode(current);

        if (this.nextCode < 4096) {
          this.addHash(current, c, this.nextCode);
          this.nextCode++;
          if (this.nextCode > this.maxCode && this.codeBits < LZWCompressor.MAX_BITS) {
            this.codeBits++;
            this.maxCode = (1 << this.codeBits) - 1;
          }
        } else {
          this.writeCode(this.clearCode);
          this.reset();
        }

        current = c;
      }
    }

    this.writeCode(current);
    this.writeCode(this.eofCode);

    if (this.bitsInAccum > 0) {
      this.output.push(this.accumulator & 0xff);
    }

    return this.output;
  }
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

  const { palette, transparentIndex, hasTransparency, paletteSizeBits, allIndices } =
    buildPaletteAndIndices(frames, width, height);

  const output: number[] = [];

  output.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  writeShort(output, width);
  writeShort(output, height);

  output.push(0x80 | (paletteSizeBits - 1));
  output.push(0);
  output.push(0);

  for (let i = 0; i < palette.length; i++) {
    output.push(palette[i]);
  }

  output.push(0x21, 0xff, 11);
  output.push(0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30);
  output.push(3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, paletteSizeBits);
  const compressor = new LZWCompressor(minCodeSize);

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const indices = allIndices[frameIdx];

    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    const useTransparent = transparent && hasTransparency;
    const disposal = useTransparent ? 0x04 : 0x02;
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
    writeShort(output, width);
    writeShort(output, height);
    output.push(0);

    output.push(minCodeSize);

    const compressed = compressor.compress(indices);
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

  const { palette, transparentIndex, hasTransparency, paletteSizeBits, allIndices } =
    buildPaletteAndIndices(frames, width, height);

  const output: number[] = [];

  output.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  writeShort(output, width);
  writeShort(output, height);

  output.push(0x80 | (paletteSizeBits - 1));
  output.push(0);
  output.push(0);

  for (let i = 0; i < palette.length; i++) {
    output.push(palette[i]);
  }

  output.push(0x21, 0xff, 11);
  output.push(0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30);
  output.push(3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, paletteSizeBits);
  const compressor = new LZWCompressor(minCodeSize);

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const indices = allIndices[frameIdx];

    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    const useTransparent = transparent && hasTransparency;
    const disposal = useTransparent ? 0x04 : 0x02;
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
    writeShort(output, width);
    writeShort(output, height);
    output.push(0);

    output.push(minCodeSize);

    const compressed = compressor.compress(indices);
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
