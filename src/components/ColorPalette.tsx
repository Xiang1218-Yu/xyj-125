import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Plus, X } from 'lucide-react';

const ColorPalette = () => {
  const { pixelColors, currentColor, setCurrentColor, addColor, removeColor } = usePixelEditorStore();

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!pixelColors.includes(color)) {
      addColor(color);
    }
    setCurrentColor(color);
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2 pixel-font text-xs">调色板</h3>
      <div className="grid grid-cols-8 gap-1.5">
        {pixelColors.map((color, index) => (
          <div
            key={index}
            className={`relative group aspect-square rounded cursor-pointer transition-transform hover:scale-110 ${
              currentColor === color ? 'ring-2 ring-[#e94560] ring-offset-2 ring-offset-[#16213e]' : ''
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setCurrentColor(color)}
            title={`颜色 ${index + 1}: ${color}`}
          >
            {pixelColors.length > 2 && (
              <button
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#e94560] rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  removeColor(index);
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <label className="aspect-square rounded border-2 border-dashed border-[#0f3460] cursor-pointer hover:border-[#e94560] transition-colors flex items-center justify-center text-gray-500 hover:text-[#e94560]">
          <Plus size={16} />
          <input
            type="color"
            className="hidden"
            onChange={handleColorInput}
            value="#ffffff"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded border border-[#0f3460]"
          style={{ backgroundColor: currentColor }}
        />
        <span className="text-xs text-gray-400 font-mono uppercase">{currentColor}</span>
      </div>
    </div>
  );
};

export default ColorPalette;
