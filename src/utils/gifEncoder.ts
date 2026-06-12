class GifEncoder {
  private width: number;
  private height: number;
  private frames: { pixels: Uint8ClampedArray; delay: number }[] = [];
  private colorTable: number[] = [];
  private colorMap: Map<string, number> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addFrame(pixels: Uint8ClampedArray, delay: number) {
    this.frames.push({ pixels, delay });
    this.buildColorTable(pixels);
  }

  private buildColorTable(pixels: Uint8ClampedArray) {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      if (a < 128) continue;
      
      const key = `${r},${g},${b}`;
      if (!this.colorMap.has(key)) {
        this.colorMap.set(key, this.colorTable.length);
        this.colorTable.push(r, g, b);
      }
    }
  }

  private getColorIndex(r: number, g: number, b: number, a: number): number {
    if (a < 128) return this.getTransparentIndex();
    const key = `${r},${g},${b}`;
    const idx = this.colorMap.get(key);
    if (idx !== undefined) return idx;
    
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < this.colorTable.length; i += 3) {
      const dr = this.colorTable[i] - r;
      const dg = this.colorTable[i + 1] - g;
      const db = this.colorTable[i + 2] - b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i / 3;
      }
    }
    return closestIdx;
  }

  private getTransparentIndex(): number {
    return 0;
  }

  private getColorTableSize(): number {
    const actualColors = Math.max(2, this.colorTable.length / 3 + 1);
    let size = 1;
    while (Math.pow(2, size) < actualColors) size++;
    return Math.min(size, 8);
  }

  private lzwEncode(indices: number[], minCodeSize: number): number[] {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    
    const dict: Map<string, number> = new Map();
    for (let i = 0; i < clearCode; i++) {
      dict.set(String(i), i);
    }
    
    const output: number[] = [];
    let currentCode = 0;
    let currentBits = 0;
    
    const writeCode = (code: number) => {
      currentCode |= code << currentBits;
      currentBits += codeSize;
      while (currentBits >= 8) {
        output.push(currentCode & 0xff);
        currentCode >>= 8;
        currentBits -= 8;
      }
    };
    
    writeCode(clearCode);
    
    let w = String(indices[0]);
    
    for (let i = 1; i < indices.length; i++) {
      const c = String(indices[i]);
      const wc = w + ',' + c;
      
      if (dict.has(wc)) {
        w = wc;
      } else {
        writeCode(dict.get(w)!);
        if (nextCode < 4096) {
          dict.set(wc, nextCode++);
          if (nextCode === (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          writeCode(clearCode);
          dict.clear();
          for (let j = 0; j < clearCode; j++) {
            dict.set(String(j), j);
          }
          nextCode = eoiCode + 1;
          codeSize = minCodeSize + 1;
        }
        w = c;
      }
    }
    
    writeCode(dict.get(w)!);
    writeCode(eoiCode);
    
    if (currentBits > 0) {
      output.push(currentCode & 0xff);
    }
    
    return output;
  }

  render(): Uint8Array {
    const colorTableSize = this.getColorTableSize();
    const actualColorTableSize = 1 << colorTableSize;
    
    const parts: number[][] = [];
    
    const header: number[] = [];
    for (let i = 0; i < 6; i++) {
      header.push('GIF89a'.charCodeAt(i));
    }
    parts.push(header);
    
    const lsd: number[] = [];
    lsd.push(this.width & 0xff);
    lsd.push((this.width >> 8) & 0xff);
    lsd.push(this.height & 0xff);
    lsd.push((this.height >> 8) & 0xff);
    lsd.push(0x80 | (colorTableSize - 1));
    lsd.push(0);
    lsd.push(0);
    parts.push(lsd);
    
    const gct: number[] = [];
    for (let i = 0; i < actualColorTableSize; i++) {
      const idx = i * 3;
      if (idx < this.colorTable.length) {
        gct.push(this.colorTable[idx]);
        gct.push(this.colorTable[idx + 1]);
        gct.push(this.colorTable[idx + 2]);
      } else {
        gct.push(0, 0, 0);
      }
    }
    parts.push(gct);
    
    const appExt: number[] = [];
    appExt.push(0x21);
    appExt.push(0xff);
    appExt.push(11);
    for (let i = 0; i < 11; i++) {
      appExt.push('NETSCAPE2.0'.charCodeAt(i));
    }
    appExt.push(3);
    appExt.push(1);
    appExt.push(0);
    appExt.push(0);
    appExt.push(0);
    parts.push(appExt);
    
    for (const frame of this.frames) {
      const indices: number[] = [];
      for (let i = 0; i < frame.pixels.length; i += 4) {
        const idx = this.getColorIndex(
          frame.pixels[i],
          frame.pixels[i + 1],
          frame.pixels[i + 2],
          frame.pixels[i + 3]
        );
        indices.push(idx);
      }
      
      const gce: number[] = [];
      gce.push(0x21);
      gce.push(0xf9);
      gce.push(4);
      gce.push(0x09);
      gce.push(frame.delay & 0xff);
      gce.push((frame.delay >> 8) & 0xff);
      gce.push(this.getTransparentIndex());
      gce.push(0);
      parts.push(gce);
      
      const id: number[] = [];
      id.push(0x2c);
      id.push(0);
      id.push(0);
      id.push(0);
      id.push(0);
      id.push(this.width & 0xff);
      id.push((this.width >> 8) & 0xff);
      id.push(this.height & 0xff);
      id.push((this.height >> 8) & 0xff);
      id.push(0);
      parts.push(id);
      
      const minCodeSize = Math.max(2, colorTableSize);
      const lzwData = this.lzwEncode(indices, minCodeSize);
      
      const imageData: number[] = [];
      imageData.push(minCodeSize);
      
      let pos = 0;
      while (pos < lzwData.length) {
        const blockSize = Math.min(255, lzwData.length - pos);
        imageData.push(blockSize);
        for (let i = 0; i < blockSize; i++) {
          imageData.push(lzwData[pos + i]);
        }
        pos += blockSize;
      }
      imageData.push(0);
      parts.push(imageData);
    }
    
    parts.push([0x3b]);
    
    let totalLength = 0;
    for (const part of parts) {
      totalLength += part.length;
    }
    
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    
    return result;
  }
}

export interface GifFrame {
  imageData: ImageData;
  delay: number;
}

export const encodeGif = (width: number, height: number, frames: GifFrame[]): Blob => {
  const encoder = new GifEncoder(width, height);
  
  for (const frame of frames) {
    const delay = Math.max(2, Math.round(frame.delay / 10));
    encoder.addFrame(frame.imageData.data, delay);
  }
  
  const data = encoder.render();
  return new Blob([data], { type: 'image/gif' });
};
