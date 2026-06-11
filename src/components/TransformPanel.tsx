import { useState } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import {
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  Image,
} from 'lucide-react';

const TransformPanel = () => {
  const {
    currentFrameId,
    selectedFrameIds,
    flipFrameHorizontal,
    flipFrameVertical,
    rotateFrame,
    shiftFrame,
    batchFlipFramesHorizontal,
    batchFlipFramesVertical,
    batchRotateFrames,
    batchShiftFrames,
  } = usePixelEditorStore();

  const [shiftAmount, setShiftAmount] = useState(1);

  const isBatchMode = selectedFrameIds.length > 0;
  const targetCount = isBatchMode ? selectedFrameIds.length : 1;
  const hasTarget = isBatchMode || !!currentFrameId;

  const handleFlipHorizontal = () => {
    if (isBatchMode) {
      batchFlipFramesHorizontal(selectedFrameIds);
    } else if (currentFrameId) {
      flipFrameHorizontal(currentFrameId);
    }
  };

  const handleFlipVertical = () => {
    if (isBatchMode) {
      batchFlipFramesVertical(selectedFrameIds);
    } else if (currentFrameId) {
      flipFrameVertical(currentFrameId);
    }
  };

  const handleRotate90CW = () => {
    if (isBatchMode) {
      batchRotateFrames(selectedFrameIds, 90);
    } else if (currentFrameId) {
      rotateFrame(currentFrameId, 90);
    }
  };

  const handleRotate180 = () => {
    if (isBatchMode) {
      batchRotateFrames(selectedFrameIds, 180);
    } else if (currentFrameId) {
      rotateFrame(currentFrameId, 180);
    }
  };

  const handleRotate270CW = () => {
    if (isBatchMode) {
      batchRotateFrames(selectedFrameIds, 270);
    } else if (currentFrameId) {
      rotateFrame(currentFrameId, 270);
    }
  };

  const handleShift = (direction: 'left' | 'right' | 'up' | 'down') => {
    const amount = Math.max(1, parseInt(String(shiftAmount)) || 1);
    if (isBatchMode) {
      batchShiftFrames(selectedFrameIds, direction, amount);
    } else if (currentFrameId) {
      shiftFrame(currentFrameId, direction, amount);
    }
  };

  const transformBtnBase =
    'p-2 rounded transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">
          帧变换
        </h3>
        <div
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
            isBatchMode
              ? 'bg-[#f39c12]/20 text-[#f39c12]'
              : 'bg-[#3498db]/20 text-[#3498db]'
          }`}
        >
          {isBatchMode ? (
            <Layers size={12} />
          ) : (
            <Image size={12} />
          )}
          <span>
            {isBatchMode ? `批量 ${targetCount}帧` : '单帧模式'}
          </span>
        </div>
      </div>

      {!hasTarget && (
        <div className="text-xs text-gray-500 text-center py-2 mb-2">
          请选择帧进行变换
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">
            镜像翻转
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleFlipHorizontal}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#2ecc71] hover:bg-[#2ecc71]/20`}
              title="水平镜像"
            >
              <FlipHorizontal size={16} />
              <span className="ml-1.5 text-xs">水平</span>
            </button>
            <button
              onClick={handleFlipVertical}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#2ecc71] hover:bg-[#2ecc71]/20`}
              title="垂直镜像"
            >
              <FlipVertical size={16} />
              <span className="ml-1.5 text-xs">垂直</span>
            </button>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">
            旋转
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleRotate270CW}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#3498db] hover:bg-[#3498db]/20`}
              title="逆时针旋转90°"
            >
              <RotateCcw size={16} />
              <span className="ml-1 text-xs">90°</span>
            </button>
            <button
              onClick={handleRotate180}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#3498db] hover:bg-[#3498db]/20`}
              title="旋转180°"
            >
              <RotateCw size={16} />
              <span className="ml-1 text-xs">180°</span>
            </button>
            <button
              onClick={handleRotate90CW}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#3498db] hover:bg-[#3498db]/20`}
              title="顺时针旋转90°"
            >
              <RotateCw size={16} />
              <span className="ml-1 text-xs">90°</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              整体位移
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">步长:</span>
              <input
                type="number"
                value={shiftAmount}
                onChange={(e) =>
                  setShiftAmount(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                max={32}
                className="w-12 px-1.5 py-0.5 text-xs bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560] text-center"
              />
              <span className="text-[10px] text-gray-500">px</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button
              onClick={() => handleShift('up')}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#f39c12] hover:bg-[#f39c12]/20`}
              title="向上位移"
            >
              <ArrowUp size={16} />
            </button>
            <div />
            <button
              onClick={() => handleShift('left')}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#f39c12] hover:bg-[#f39c12]/20`}
              title="向左位移"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center justify-center text-[10px] text-gray-500">
              位移
            </div>
            <button
              onClick={() => handleShift('right')}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#f39c12] hover:bg-[#f39c12]/20`}
              title="向右位移"
            >
              <ArrowRight size={16} />
            </button>
            <div />
            <button
              onClick={() => handleShift('down')}
              disabled={!hasTarget}
              className={`${transformBtnBase} bg-[#0f3460] text-[#f39c12] hover:bg-[#f39c12]/20`}
              title="向下位移"
            >
              <ArrowDown size={16} />
            </button>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransformPanel;
