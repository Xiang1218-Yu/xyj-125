# 像素系统 Canvas 绘制逻辑与性能分析

## 一、Canvas 绘制调用链总览

### 1.1 核心绘制组件分布图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        pixelEditorStore                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ 状态管理    │  │ 像素操作    │  │ generateSpriteSheet()    │   │
│  │ setPixel()  │  │ drawLine()  │  │ getFrameMergedPixels()   │   │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬──────────────┘   │
└─────────┼────────────────┼───────────────────────┼──────────────────┘
          │                │                       │
┌─────────▼────────┬───────▼────────┬──────────────▼───────────────┐
│  PixelCanvas     │ AnimationPreview│ SpriteSheetGenerator        │
│  (主画布)        │  (动画预览)    │  (精灵图/GIF导出)           │
└─────────┬────────┴────────┬───────┴──────────────┬───────────────┘
          │                 │                      │
┌─────────▼────────┬────────▼───────┬──────────────▼───────────────┐
│ ParticleGenerator │ FrameTweener  │ Timeline                     │
│  (粒子预览)      │ (缩略图)       │  (帧缩略图)                  │
└──────────────────┴────────────────┴──────────────────────────────┘
```

### 1.2 主要绘制入口文件

| 组件 | 文件路径 | 核心绘制函数 |
|------|---------|-------------|
| 主画布 | [PixelCanvas.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx) | `drawCanvas()` |
| 动画预览 | [AnimationPreview.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/AnimationPreview.tsx) | `drawFrame()`, `animate()` |
| 精灵图生成 | [SpriteSheetGenerator.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/SpriteSheetGenerator.tsx) | `generateFullSpriteSheet()`, `drawFrameToCanvas()` |
| 粒子生成器 | [ParticleGenerator.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/ParticleGenerator.tsx) | `drawFrame()`, `animate()` |
| 帧过渡器 | [FrameTweener.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/FrameTweener.tsx) | `TweenFrameThumbnail` (组件内绘制) |
| 时间轴 | [Timeline.tsx](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/Timeline.tsx) | `FrameThumbnail` (组件内绘制) |
| 状态管理 | [pixelEditorStore.ts](file:///Users/tog/Desktop/code/solo/xyj-125/src/store/pixelEditorStore.ts) | `generateSpriteSheet()` |
| 粒子引擎 | [particleEngine.ts](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/particleEngine.ts) | `drawParticle()`, `generateParticleFrames()` |
| GIF编码 | [gifEncoder.ts](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/gifEncoder.ts) | `encodeGif()`, `encodeGifAsync()` |
| 帧补间 | [frameTweener.ts](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/frameTweener.ts) | `interpolatePixels()`, `generateTweenFrames()` |

---

## 二、各模块 Canvas 绘制调用链详解

### 2.1 PixelCanvas - 主画布绘制流程

**核心函数：[drawCanvas()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L246-L339)**

```
drawCanvas()
    ├─► 获取 canvas 和 ctx
    ├─► 设置 canvas 尺寸 (width * gridSize)
    ├─► ctx.imageSmoothingEnabled = false
    ├─► 清除画布
    ├─► 绘制棋盘格背景 [L263-L272]
    │   └─► 双重循环逐像素 fillRect
    ├─► 绘制参考图 [L274-L297]
    │   └─► ctx.drawImage()
    ├─► 洋葱皮绘制（如启用）[L299-L311]
    │   ├─► getAdjacentFrames() 获取前后帧
    │   └─► drawFrameLayersWithOpacity() 逐帧绘制
    │       └─► 双重循环逐像素 fillRect [L138-L169]
    ├─► 绘制当前帧 [L313-L315]
    │   └─► drawFrameLayersWithOpacity(ctx, frame, 1)
    │       └─► 遍历所有图层 → 遍历所有像素 → fillRect
    ├─► 绘制网格线（如启用）[L317-L332]
    │   ├─► 垂直线循环：beginPath → moveTo → lineTo → stroke
    │   └─► 水平线循环：beginPath → moveTo → lineTo → stroke
    ├─► 绘制选区边框 [L334]
    │   └─► drawSelectionOutline() → strokeRect
    └─► 绘制形状预览（拖拽中）[L336-L338]
        └─► drawShapePreview() → 直线/矩形/椭圆绘制
```

**重绘触发条件 [L341-L343]**：
- `currentFrameId`, `currentActionId`, `currentLayerId` 变化
- `character` 状态变化（任何像素修改）
- `gridSize`, `showGrid`, `pixelColors` 变化
- `selectedTool` 变化
- 洋葱皮相关状态变化
- 参考图相关状态变化
- `selection` 变化

### 2.2 AnimationPreview - 动画预览流程

**核心函数：[animate()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/AnimationPreview.tsx#L113-L146) 和 [drawFrame()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/AnimationPreview.tsx#L56-L87)**

```
播放循环：
isPlaying = true
    └─► useEffect 启动 requestAnimationFrame(animate)
        └─► animate(timestamp)
            ├─► 计算 deltaTime
            ├─► 累加 elapsedRef
            ├─► 达到 frameDelay (1000/fps) 时
            │   └─► setCurrentFrameIndex(prev + 1)
            │       └─► 触发 React 重渲染
            │           └─► useEffect 监听 currentFrameIndex
            │               └─► drawFrameAtIndex(index)
            │                   ├─► 设置 canvas 尺寸
            │                   ├─► ctx.imageSmoothingEnabled = false
            │                   └─► drawFrame(frame, scale, ctx, w, h)
            │                       ├─► clearRect
            │                       ├─► 绘制棋盘格背景（双重循环）
            │                       └─► 绘制图层（三重循环：图层 × 高 × 宽）
            │                           └─► ctx.fillRect()
            └─► requestAnimationFrame(animate) 继续循环
```

**补间帧处理 [L35-L51]**：
- `tweenEnabled` 为 true 时，调用 `buildTweenPlaybackFrames()` 生成补间帧
- 播放时使用补间后的帧序列

### 2.3 SpriteSheetGenerator - 精灵图与 GIF 导出

**精灵图生成 [generateFullSpriteSheet()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/SpriteSheetGenerator.tsx#L34-L90)**：
```
generateFullSpriteSheet(scaleFactor, useAllActions, cols)
    ├─► 收集所有帧
    ├─► 创建离屏 canvas
    ├─► ctx.imageSmoothingEnabled = false
    └─► 遍历所有帧
        ├─► 计算 offsetX, offsetY
        └─► 遍历所有图层
            └─► 遍历所有像素 (y × x)
                └─► colorIndex >= 0 时 ctx.fillRect()
```

**GIF 导出流程 [handleExportGIF()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/SpriteSheetGenerator.tsx#L294-L360)**：
```
handleExportGIF()
    ├─► getPlaybackFramesForAction() 获取播放帧（含补间）
    ├─► 遍历所有帧
    │   └─► drawFrameToCanvas(frame, scaleFactor, withTransparency)
    │       ├─► 创建 ImageData (width * scale × height * scale)
    │       ├─► 初始化背景（透明或纯色）
    │       └─► 遍历图层 → 遍历像素 (y × x) → 遍历缩放 (sy × sx)
    │           └─► 设置 imageData.data[offset] = RGBA
    ├─► encodeGifAsync(width, height, gifFrames, transparent, onProgress)
    │   ├─► buildPaletteAndIndices() 构建全局调色板
    │   ├─► 写入 GIF 头和全局色表
    │   └─► 遍历帧
    │       ├─► lzwCompress() LZW 压缩
    │       ├─► writeBlocks() 分块写入
    │       └─► onProgress() 回调
    └─► 下载 Blob
```

### 2.4 ParticleGenerator - 粒子预览

**核心流程 [drawFrame()](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/ParticleGenerator.tsx#L133-L166)**：
```
previewFrames = useMemo(() => generateParticleFrames(config))
    └─► generateParticleFrames(config) [particleEngine.ts:L74-L108]
        ├─► 循环 frameCount 次
        │   ├─► 创建空像素数组
        │   ├─► 发射新粒子
        │   └─► 遍历所有粒子
        │       ├─► drawParticle(pixels, particle) 写入像素数组
        │       └─► updateParticle(particle) 更新物理状态
        └─► 返回 frames 数组

drawFrame(frameIndex)
    ├─► 设置 canvas 尺寸
    ├─► ctx.imageSmoothingEnabled = false
    ├─► 填充背景色
    └─► 遍历像素 (y × x)
        └─► colorIndex >= 0 时 ctx.fillRect()
```

### 2.5 缩略图绘制（Timeline & FrameTweener）

**[FrameThumbnail](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/Timeline.tsx#L31-L87) 和 [TweenFrameThumbnail](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/FrameTweener.tsx#L7-L55)**：

每个帧缩略图都是独立的 Canvas 元素：
```
useEffect(() => {
    ├─► 获取 canvas 和 ctx
    ├─► 查找对应 frame
    ├─► 计算 scale = min(size/width, size/height)
    ├─► 设置 canvas 尺寸
    ├─► ctx.imageSmoothingEnabled = false
    ├─► clearRect
    └─► 遍历图层 → 遍历像素 → ctx.fillRect()
}, [frameId, character, currentActionId, pixelColors, size])
```

**问题**：N 个帧就有 N 个独立 Canvas，每个都有独立的绘制逻辑和 useEffect。

### 2.6 pixelEditorStore 中的绘制相关

**[generateSpriteSheet()](file:///Users/tog/Desktop/code/solo/xyj-125/src/store/pixelEditorStore.ts#L910-L940)**：
```
generateSpriteSheet(actionId)
    ├─► 创建离屏 canvas
    ├─► ctx.imageSmoothingEnabled = false
    └─► 遍历帧
        ├─► getFrameMergedPixelsImpl(frame) 合并图层
        │   └─► 遍历图层 → 遍历像素 → 合并到 merged 数组
        └─► 遍历像素 (y × x)
            └─► colorIndex >= 0 时 ctx.fillRect(offsetX + x, y, 1, 1)
```

---

## 三、渲染性能瓶颈分析

### 3.1 严重性能问题（高优先级）

#### 瓶颈 1：逐像素 fillRect 调用（所有绘制场景）

**位置**：
- [PixelCanvas.tsx:L138-L169](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L138-L169) `drawFrameLayersWithOpacity()`
- [AnimationPreview.tsx:L56-L87](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/AnimationPreview.tsx#L56-L87) `drawFrame()`
- [SpriteSheetGenerator.tsx:L34-L90](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/SpriteSheetGenerator.tsx#L34-L90) `generateFullSpriteSheet()`
- [Timeline.tsx:L64-L77](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/Timeline.tsx#L64-L77) `FrameThumbnail`
- [FrameTweener.tsx:L32-L45](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/FrameTweener.tsx#L32-L45) `TweenFrameThumbnail`
- [ParticleGenerator.tsx:L155-L163](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/ParticleGenerator.tsx#L155-L163) `drawFrame()`

**问题描述**：
每个像素调用一次 `ctx.fillRect()`，这是 Canvas API 中最慢的操作之一。
- 对于 32×32 画布 × 3 图层 = 3072 次 fillRect 调用
- 对于 64×64 画布 × 5 图层 = 20480 次 fillRect 调用
- 每次调用都有 JS → Canvas 上下文切换开销

**性能影响**：★★★★★  
**优化方案**：使用 `ImageData` 批量处理像素，或预渲染到离屏 Canvas 后一次性 `drawImage`

---

#### 瓶颈 2：PixelCanvas 过度重绘

**位置**：[PixelCanvas.tsx:L341-L343](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L341-L343)

**问题描述**：
useEffect 依赖了 17 个状态变量，任何一个变化都会触发完整的 `drawCanvas()` 重绘：
```javascript
useEffect(() => {
  drawCanvas();
}, [drawCanvas, currentFrameId, currentActionId, currentLayerId, 
    character, gridSize, showGrid, pixelColors, selectedTool, 
    onionSkinEnabled, onionSkinPrevFrames, onionSkinNextFrames, 
    onionSkinOpacity, referenceImageEnabled, referenceImageLoaded, 
    referenceImageOpacity, selection]);
```

每次画笔绘制一个像素，`character` 变化就会触发完整重绘（包括背景、洋葱皮、网格等）。

**性能影响**：★★★★★  
**优化方案**：
- 使用脏矩形/脏区域标记，只重绘变化的像素
- 将 `drawCanvas` 拆分为多个独立的绘制函数，按需调用
- 使用 `requestAnimationFrame` 合并多次绘制请求

---

#### 瓶颈 3：动画预览的 React 状态驱动重绘

**位置**：[AnimationPreview.tsx:L113-L170](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/AnimationPreview.tsx#L113-L170)

**问题描述**：
```
animate() → setCurrentFrameIndex() → React重渲染 → useEffect → drawFrameAtIndex()
```
动画帧切换通过 React state 驱动，每帧都要经过：
1. requestAnimationFrame 回调
2. setState 触发 React 调和（reconciliation）
3. useEffect 依赖检测
4. 最终才调用 Canvas 绘制

**性能影响**：★★★★☆  
**优化方案**：直接在 `animate()` 函数中调用绘制逻辑，不经过 React 状态

---

#### 瓶颈 4：深拷贝性能开销

**位置**：[pixelEditorStore.ts:L353](file:///Users/tog/Desktop/code/solo/xyj-125/src/store/pixelEditorStore.ts#L353)

**问题描述**：
```javascript
const newCharacter = JSON.parse(JSON.stringify(character)) as Character;
```
每次 `setPixel()` 调用都会深拷贝整个 `character` 对象：
- 包含所有 actions、frames、layers
- 对于多帧多图层场景，这是巨大的性能开销
- JSON序列化/反序列化本身就很慢

**性能影响**：★★★★☆  
**优化方案**：
- 使用 Immer 进行不可变更新
- 或者只深拷贝当前修改的 frame/layer，而不是整个 character

---

#### 瓶颈 5：GIF 导出时的像素放大循环

**位置**：[SpriteSheetGenerator.tsx:L199-L258](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/SpriteSheetGenerator.tsx#L199-L258)

**问题描述**：
```javascript
for (let sy = 0; sy < scaleFactor; sy++) {
  for (let sx = 0; sx < scaleFactor; sx++) {
    const pixelX = dstX + sx;
    const pixelY = dstY + sy;
    // 设置 imageData 像素...
  }
}
```
每个源像素需要循环 `scaleFactor × scaleFactor` 次来放大：
- scale=4 时，每个源像素循环 16 次
- 32×32 画布 = 1024 × 16 = 16384 次操作/帧
- 60 帧动画 = 983040 次操作

**性能影响**：★★★★☆  
**优化方案**：
- 先绘制 1:1 的 ImageData，再用 `ctx.scale()` + `ctx.putImageData()` 放大
- 或者使用 `createImageBitmap()` 进行缩放

---

### 3.2 中等性能问题（中优先级）

#### 瓶颈 6：洋葱皮多层绘制

**位置**：[PixelCanvas.tsx:L299-L311](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L299-L311)

**问题描述**：
洋葱皮启用时，除了当前帧，还要额外绘制前后 N 帧：
- 前后各 3 帧 × 3 图层 × 32×32 = 6 × 3 × 1024 = 18432 次 fillRect
- 每帧还要做颜色混合（tintColor）

**性能影响**：★★★☆☆  
**优化方案**：
- 预渲染洋葱皮帧到离屏 Canvas
- 使用低透明度的 drawImage 代替逐像素绘制

---

#### 瓶颈 7：帧补间的颜色匹配

**位置**：[frameTweener.ts:L83-L117](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/frameTweener.ts#L83-L117)

**问题描述**：
```javascript
const interpolatedColor = lerpColor(color1, color2, t);
const closestIndex = findClosestColorIndex(interpolatedColor, palette);
```
每个插值像素都要：
1. RGB 线性插值计算
2. 遍历整个调色板（最多 256 色）计算颜色距离
3. 找到最接近的颜色索引

**性能影响**：★★★☆☆  
**优化方案**：
- 建立颜色缓存 Map，避免重复计算
- 使用量化后的颜色空间加速查找

---

#### 瓶颈 8：大量独立 Canvas 缩略图

**位置**：
- [Timeline.tsx:L31-L87](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/Timeline.tsx#L31-L87) `FrameThumbnail`
- [FrameTweener.tsx:L7-L55](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/FrameTweener.tsx#L7-L55) `TweenFrameThumbnail`

**问题描述**：
- 每个帧缩略图都是独立的 `<canvas>` 元素
- 每个都有独立的 useEffect 和绘制逻辑
- 60 帧就有 60 个 Canvas，每个都要走完整绘制流程
- 帧列表变化时所有缩略图都要重绘

**性能影响**：★★★☆☆  
**优化方案**：
- 精灵图方式：多个缩略图绘制到同一个 Canvas
- 虚拟滚动：只渲染可视区域内的缩略图
- 缓存缩略图的 ImageData

---

#### 瓶颈 9：LZW 压缩（GIF 导出）

**位置**：[gifEncoder.ts:L114-L185](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/gifEncoder.ts#L114-L185)

**问题描述**：
- LZW 压缩是 CPU 密集型操作
- 每帧都要完整扫描并建立字典
- 虽然有 `encodeGifAsync`，但仍然在主线程运行
- 长动画导出时会阻塞 UI

**性能影响**：★★★☆☆  
**优化方案**：
- 使用 Web Worker 进行 GIF 编码
- 增量编码，边处理边释放内存

---

### 3.3 轻微性能问题（低优先级）

#### 瓶颈 10：棋盘格背景重复绘制

**位置**：[PixelCanvas.tsx:L263-L272](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L263-L272)

**问题描述**：每次 `drawCanvas()` 都重新绘制棋盘格背景，但背景其实是静态的。

**性能影响**：★★☆☆☆  
**优化方案**：使用 CSS 背景或预渲染到离屏 Canvas

---

#### 瓶颈 11：网格线逐段绘制

**位置**：[PixelCanvas.tsx:L317-L332](file:///Users/tog/Desktop/code/solo/xyj-125/src/components/PixelCanvas.tsx#L317-L332)

**问题描述**：
```javascript
for (let x = 0; x <= width; x++) {
  ctx.beginPath();
  ctx.moveTo(x * gridSize + 0.5, 0);
  ctx.lineTo(x * gridSize + 0.5, height * gridSize);
  ctx.stroke();
}
```
每条线单独 `beginPath()` + `stroke()`，可以合并为一次 path 绘制。

**性能影响**：★★☆☆☆  
**优化方案**：合并所有线段到一个 Path，只调用一次 stroke()

---

#### 瓶颈 12：图层合并时的随机数

**位置**：[pixelEditorStore.ts:L50-L71](file:///Users/tog/Desktop/code/solo/xyj-125/src/store/pixelEditorStore.ts#L50-L71)

**问题描述**：
```javascript
if (layerOpacity > 0) {
  if (merged[y][x] === -1 || Math.random() < layerOpacity) {
    merged[y][x] = colorIndex;
  }
}
```
半透明图层使用 `Math.random()` 来模拟透明度，导致：
- 每次调用结果不一致
- 额外的随机数生成开销

**性能影响**：★☆☆☆☆  
**优化方案**：使用阈值算法或预计算的抖动模式

---

#### 瓶颈 13：粒子绘制的双重循环

**位置**：[particleEngine.ts:L45-L72](file:///Users/tog/Desktop/code/solo/xyj-125/src/utils/particleEngine.ts#L45-L72)

**问题描述**：
```javascript
for (let dy = -size + 1; dy < size; dy++) {
  for (let dx = -size + 1; dx < size; dx++) {
    // 绘制粒子像素...
  }
}
```
每个粒子绘制时的双重循环，size=3 就是 25 次循环/粒子。

**性能影响**：★★☆☆☆  
**优化方案**：预计算粒子形状模板

---

## 四、性能数据估算（基于 32×32 画布）

| 场景 | 单次绘制操作数 | 帧率影响（估算） |
|------|---------------|------------------|
| 主画布（无洋葱皮） | ~3000 次 fillRect | 60 FPS → 45 FPS |
| 主画布（洋葱皮前后各3帧） | ~21000 次 fillRect | 60 FPS → 15 FPS |
| 动画预览播放 | ~3000 次 fillRect/帧 | 60 FPS → 30 FPS |
| GIF导出（scale=4, 60帧） | ~98万次像素操作 | 阻塞主线程 2-5 秒 |
| 时间轴缩略图（30帧） | 30 × ~500 次 fillRect | 滚动时卡顿 |

---

## 五、优化建议优先级

### P0（立即优化）
1. ✅ 将所有逐像素 `fillRect` 改为 `ImageData` 批量处理
2. ✅ 优化 `PixelCanvas` 重绘逻辑，使用脏矩形或 rAF 合并
3. ✅ 动画预览直接在 rAF 回调中绘制，不经过 React state
4. ✅ 优化 `setPixel` 的深拷贝逻辑，使用 Immer 或局部拷贝

### P1（尽快优化）
5. ⏳ GIF 导出的像素放大使用 Canvas 缩放 API
6. ⏳ 洋葱皮预渲染到离屏 Canvas
7. ⏳ 帧补间颜色匹配建立缓存
8. ⏳ 缩略图使用虚拟滚动或精灵图合并

### P2（后续优化）
9. 📋 棋盘格背景和网格使用 CSS 或预渲染
10. 📋 合并网格线绘制为单次 stroke
11. 📋 GIF 编码移到 Web Worker
12. 📋 粒子形状预计算模板

---

## 六、关键代码位置速查表

| 问题 | 文件 | 行号 |
|------|------|------|
| 主绘制函数 | PixelCanvas.tsx | L246-L339 |
| 逐像素fillRect | PixelCanvas.tsx | L138-L169 |
| 重绘触发useEffect | PixelCanvas.tsx | L341-L343 |
| 动画循环 | AnimationPreview.tsx | L113-L146 |
| 动画帧绘制 | AnimationPreview.tsx | L56-L87 |
| 精灵图生成 | SpriteSheetGenerator.tsx | L34-L90 |
| GIF帧绘制（放大循环） | SpriteSheetGenerator.tsx | L199-L258 |
| GIF导出主流程 | SpriteSheetGenerator.tsx | L294-L360 |
| 粒子绘制 | ParticleGenerator.tsx | L133-L166 |
| 粒子引擎drawParticle | particleEngine.ts | L45-L72 |
| 粒子帧生成 | particleEngine.ts | L74-L108 |
| 时间轴缩略图 | Timeline.tsx | L31-L87 |
| 帧过渡缩略图 | FrameTweener.tsx | L7-L55 |
| setPixel深拷贝 | pixelEditorStore.ts | L353 |
| 图层合并（随机数） | pixelEditorStore.ts | L50-L71 |
| generateSpriteSheet | pixelEditorStore.ts | L910-L940 |
| 像素插值 | frameTweener.ts | L83-L117 |
| 颜色匹配 | frameTweener.ts | L33-L47 |
| 生成补间帧 | frameTweener.ts | L132-L170 |
| LZW压缩 | gifEncoder.ts | L114-L185 |
| GIF编码主函数 | gifEncoder.ts | L206-L279 |
| 异步GIF编码 | gifEncoder.ts | L281-L363 |
