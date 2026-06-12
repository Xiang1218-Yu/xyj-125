export interface GifFrame {
  imageData: ImageData;
  delay: number;
}

class ColorTable {
  private map: Map<string, number> = new Map();
  private colors: { r: number; g: number; b: number }[] = [];
  transparentIndex: number = 0;

  addColor(r: number, g: number, b: number): number {
    if (this.colors.length >= 256) {
      return this.findClosest(r, g, b);
    }
    const key = `${r},${g},${b}`;
    if (!this.map.has(key)) {
      this.map.set(key, this.colors.length);
      this.colors.push({ r, g, b });
    }
    return this.map.get(key)!;
  }

  findClosest(r: number, g: number, b: number): number {
    let minDist = Infinity;
    let best = 0;
    for (let i = 0; i < this.colors.length; i++) {
      const c = this.colors[i];
      const dr = c.r - r;
      const dg = c.g - g;
      const db = c.b - b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        best = i;
      }
    }
    return best;
  }

  finalize(): void {
    while (this.colors.length < 2) {
      this.colors.push({ r: 0, g: 0, b: 0 });
    }

    let blackIdx = -1;
    for (let i = 0; i < this.colors.length; i++) {
      const c = this.colors[i];
      if (c.r === 0 && c.g === 0 && c.b === 0) {
        blackIdx = i;
        break;
      }
    }

    if (blackIdx === -1) {
      this.transparentIndex = this.colors.length;
      this.colors.push({ r: 0, g: 0, b: 0 });
    } else {
      const last = this.colors.length - 1;
      const lastColor = this.colors[last];
      this.colors[blackIdx] = lastColor;
      const lastKey = `${lastColor.r},${lastColor.g},${lastColor.b}`;
      this.map.set(lastKey, blackIdx);
      this.colors[last] = { r: 0, g: 0, b: 0 };
      this.transparentIndex = last;
    }
  }

  size(): number {
    let s = 1;
    while (Math.pow(2, s) < this.colors.length) s++;
    return Math.max(2, s);
  }

  paletteSize(): number {
    return 1 << this.size();
  }

  getPaletteData(): number[] {
    const result: number[] = [];
    const pSize = this.paletteSize();
    for (let i = 0; i < pSize; i++) {
      if (i < this.colors.length) {
        result.push(this.colors[i].r, this.colors[i].g, this.colors[i].b);
      } else {
        result.push(0, 0, 0);
      }
    }
    return result;
  }

  getIndex(r: number, g: number, b: number, a: number): number {
    if (a < 128) return this.transparentIndex;
    const key = `${r},${g},${b}`;
    if (this.map.has(key)) return this.map.get(key)!;
    return this.findClosest(r, g, b);
  }
}

class BitWriter {
  private buffer: number[] = [];
  private accum = 0;
  private bits = 0;

  write(code: number, numBits: number): void {
    this.accum |= code << this.bits;
    this.bits += numBits;
    while (this.bits >= 8) {
      this.buffer.push(this.accum & 0xff);
      this.accum >>= 8;
      this.bits -= 8;
    }
  }

  flush(): void {
    if (this.bits > 0) {
      this.buffer.push(this.accum & 0xff);
      this.accum = 0;
      this.bits = 0;
    }
  }

  getBlocks(): number[] {
    this.flush();
    const blocks: number[] = [];
    let i = 0;
    while (i < this.buffer.length) {
      const blockSize = Math.min(255, this.buffer.length - i);
      blocks.push(blockSize);
      for (let j = 0; j < blockSize; j++) {
        blocks.push(this.buffer[i + j]);
      }
      i += blockSize;
    }
    blocks.push(0);
    return blocks;
  }
}

function lzwEncode(indices: number[], minCodeSize: number): number[] {
  const MAX_BITS = 12;
  const TABLE_SIZE = 5021;

  const codeTable = new Int32Array(TABLE_SIZE);
  const prefixTable = new Int32Array(TABLE_SIZE);
  codeTable.fill(-1);

  const clearCode = 1 << minCodeSize;
  const eofCode = clearCode + 1;
  let nextCode = clearCode + 2;
  let codeBits = minCodeSize + 1;
  let maxCode = (1 << codeBits) - 1;

  const writer = new BitWriter();
  writer.write(clearCode, codeBits);

  if (indices.length === 0) {
    writer.write(eofCode, codeBits);
    return writer.getBlocks();
  }

  let workingCode = indices[0];

  for (let idx = 1; idx < indices.length; idx++) {
    const currentCode = indices[idx];

    let hashKey = (currentCode << MAX_BITS) + workingCode;
    let hashIdx = (currentCode << 3) ^ workingCode;
    if (hashIdx < 0) hashIdx += TABLE_SIZE;

    const probe = TABLE_SIZE - hashIdx;

    let found = false;
    while (true) {
      if (codeTable[hashIdx] === hashKey) {
        workingCode = prefixTable[hashIdx];
        found = true;
        break;
      }
      if (codeTable[hashIdx] < 0) break;
      hashIdx -= probe;
      if (hashIdx < 0) hashIdx += TABLE_SIZE;
    }

    if (found) continue;

    writer.write(workingCode, codeBits);

    if (nextCode < (1 << MAX_BITS)) {
      codeTable[hashIdx] = hashKey;
      prefixTable[hashIdx] = nextCode++;
      if (nextCode > maxCode && codeBits < MAX_BITS) {
        codeBits++;
        maxCode = (1 << codeBits) - 1;
      }
    } else {
      codeTable.fill(-1);
      nextCode = clearCode + 2;
      writer.write(clearCode, codeBits);
      codeBits = minCodeSize + 1;
      maxCode = (1 << codeBits) - 1;
    }

    workingCode = currentCode;
  }

  writer.write(workingCode, codeBits);
  writer.write(eofCode, codeBits);
  return writer.getBlocks();
}

function writeShort(output: number[], value: number): void {
  output.push(value & 0xff, (value >> 8) & 0xff);
}

function writeString(output: number[], s: string): void {
  for (let i = 0; i < s.length; i++) {
    output.push(s.charCodeAt(i));
  }
}

export function encodeGif(
  width: number,
  height: number,
  frames: GifFrame[],
  transparent: boolean = false
): Blob {
  if (!frames || frames.length === 0) {
    throw new Error('No frames to encode');
  }

  const colorTable = new ColorTable();

  for (const frame of frames) {
    const data = frame.imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      colorTable.addColor(data[i], data[i + 1], data[i + 2]);
    }
  }

  colorTable.finalize();

  const output: number[] = [];

  writeString(output, 'GIF89a');
  writeShort(output, width);
  writeShort(output, height);

  const paletteSizeBits = colorTable.size();
  output.push(0x80 | (paletteSizeBits - 1));
  output.push(0);
  output.push(0);

  output.push(...colorTable.getPaletteData());

  output.push(0x21, 0xff, 11);
  writeString(output, 'NETSCAPE2.0');
  output.push(3, 1, 0, 0, 0);

  const minCodeSize = Math.max(2, paletteSizeBits);

  for (const frame of frames) {
    const imageData = frame.imageData;
    const data = imageData.data;
    const pixelCount = width * height;

    const indices = new Array<number>(pixelCount);
    let pIdx = 0;
    for (let i = 0; i < data.length; i += 4) {
      indices[pIdx++] = colorTable.getIndex(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3]
      );
    }

    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    const disposal = transparent ? 0x04 : 0x02;
    const transpFlag = transparent ? 1 : 0;
    const packedField = (disposal << 2) | transpFlag;

    output.push(0x21, 0xf9, 4);
    output.push(packedField);
    writeShort(output, delayCs);
    output.push(colorTable.transparentIndex);
    output.push(0);

    output.push(0x2c);
    writeShort(output, 0);
    writeShort(output, 0);
    writeShort(output, width);
    writeShort(output, height);
    output.push(0);

    output.push(minCodeSize);
    output.push(...lzwEncode(indices, minCodeSize));
  }

  output.push(0x3b);

  return new Blob([new Uint8Array(output)], { type: 'image/gif' });
}
