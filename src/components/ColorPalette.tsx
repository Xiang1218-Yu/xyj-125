import { useState } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { PRESET_PALETTES } from '@/data/palettes';
import { Plus, X, ChevronDown, ChevronRight, Download, Trash2, Pencil, Check, BookOpen, Palette } from 'lucide-react';

const ColorPalette = () => {
  const {
    pixelColors,
    currentColor,
    setCurrentColor,
    addColor,
    removeColor,
    palettes,
    activePaletteId,
    addPalette,
    removePalette,
    renamePalette,
    importPresetPalette,
    switchToPalette,
  } = usePixelEditorStore();

  const [showPresets, setShowPresets] = useState(false);
  const [showPaletteList, setShowPaletteList] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [showNewPaletteInput, setShowNewPaletteInput] = useState(false);
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activePalette = palettes.find((p) => p.id === activePaletteId);
  const importedPresetIds = new Set(
    palettes.filter((p) => p.isPreset && p.presetId).map((p) => p.presetId)
  );

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!pixelColors.includes(color)) {
      addColor(color);
    }
    setCurrentColor(color);
  };

  const handleImportPreset = (presetId: string) => {
    importPresetPalette(presetId);
    setShowPresets(false);
  };

  const handleCreatePalette = () => {
    if (!newPaletteName.trim()) return;
    addPalette({
      name: newPaletteName.trim(),
      colors: [...pixelColors],
      isPreset: false,
    });
    setNewPaletteName('');
    setShowNewPaletteInput(false);
  };

  const handleStartRename = (paletteId: string, currentName: string) => {
    setEditingPaletteId(paletteId);
    setEditingName(currentName);
  };

  const handleConfirmRename = () => {
    if (editingPaletteId && editingName.trim()) {
      renamePalette(editingPaletteId, editingName.trim());
    }
    setEditingPaletteId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showNewPaletteInput) {
        handleCreatePalette();
      } else if (editingPaletteId) {
        handleConfirmRename();
      }
    } else if (e.key === 'Escape') {
      setShowNewPaletteInput(false);
      setNewPaletteName('');
      setEditingPaletteId(null);
      setEditingName('');
    }
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs flex items-center gap-1.5">
          <Palette size={12} className="text-[#e94560]" />
          调色板
        </h3>
        <span className="text-[10px] text-gray-500">
          {pixelColors.length} 色
        </span>
      </div>

      {palettes.length > 1 && (
        <div className="mb-2">
          <button
            onClick={() => setShowPaletteList(!showPaletteList)}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-[#0f3460] rounded text-xs text-gray-300 hover:bg-[#1a1a2e] transition-colors"
          >
            <span className="truncate">
              {activePalette?.name || '默认调色板'}
            </span>
            {showPaletteList ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {showPaletteList && (
            <div className="mt-1 bg-[#1a1a2e] border border-[#0f3460] rounded overflow-hidden">
              {palettes.map((palette) => (
                <div
                  key={palette.id}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                    palette.id === activePaletteId
                      ? 'bg-[#e94560]/20 text-[#e94560]'
                      : 'text-gray-400 hover:bg-[#0f3460] hover:text-gray-200'
                  }`}
                  onClick={() => {
                    switchToPalette(palette.id);
                    setShowPaletteList(false);
                  }}
                >
                  <div className="flex gap-0.5 flex-shrink-0">
                    {palette.colors.slice(0, 4).map((c, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="truncate flex-1">
                    {editingPaletteId === palette.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleConfirmRename}
                        className="w-full bg-[#0f3460] text-gray-200 px-1 py-0.5 rounded text-xs outline-none border border-[#e94560]"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      palette.name
                    )}
                  </span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                    {palette.colors.length}
                  </span>
                  {!palette.isPreset && palettes.length > 1 && editingPaletteId !== palette.id && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <button
                        className="p-0.5 hover:text-[#3498db] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(palette.id, palette.name);
                        }}
                        title="重命名"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        className="p-0.5 hover:text-[#e74c3c] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePalette(palette.id);
                        }}
                        title="删除"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t border-[#0f3460] p-1.5">
                {showNewPaletteInput ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newPaletteName}
                      onChange={(e) => setNewPaletteName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="调色板名称"
                      className="flex-1 bg-[#0f3460] text-gray-200 px-1.5 py-1 rounded text-xs outline-none border border-[#e94560] placeholder:text-gray-600"
                      autoFocus
                    />
                    <button
                      onClick={handleCreatePalette}
                      className="p-1 text-[#2ecc71] hover:bg-[#0f3460] rounded transition-colors"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setShowNewPaletteInput(false);
                        setNewPaletteName('');
                      }}
                      className="p-1 text-gray-500 hover:bg-[#0f3460] rounded transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewPaletteInput(true)}
                    className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-[#2ecc71] transition-colors"
                  >
                    <Plus size={10} />
                    新建调色板
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-8 gap-1.5">
        {pixelColors.map((color, index) => (
          <div
            key={index}
            className="relative group aspect-square rounded cursor-pointer transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              outline: currentColor === color ? '2px solid #e94560' : undefined,
              outlineOffset: '2px',
            }}
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

      <div className="mt-3 border-t border-[#0f3460] pt-2">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <BookOpen size={12} />
            经典调色板库
          </span>
          {showPresets ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {showPresets && (
          <div className="mt-1 space-y-1 max-h-[280px] overflow-y-auto">
            {PRESET_PALETTES.map((preset) => {
              const isImported = importedPresetIds.has(preset.id);
              return (
                <div
                  key={preset.id}
                  className="bg-[#1a1a2e] rounded border border-[#0f3460] overflow-hidden"
                >
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs text-gray-300 font-medium">{preset.name}</span>
                        <span className="text-[10px] text-gray-600 ml-1.5">by {preset.author}</span>
                      </div>
                      <span className="text-[10px] text-gray-600">{preset.colors.length} 色</span>
                    </div>
                    <div className="flex flex-wrap gap-[2px] mb-1.5">
                      {preset.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-[1px]"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleImportPreset(preset.id)}
                      className={`w-full flex items-center justify-center gap-1 py-1 rounded text-[10px] transition-colors ${
                        isImported
                          ? 'bg-[#2ecc71]/20 text-[#2ecc71] hover:bg-[#2ecc71]/30'
                          : 'bg-[#0f3460] text-gray-300 hover:bg-[#e94560] hover:text-white'
                      }`}
                    >
                      <Download size={10} />
                      {isImported ? '已导入 (点击切换)' : '导入'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {palettes.length <= 1 && (
        <div className="mt-2">
          <button
            onClick={() => setShowNewPaletteInput(!showNewPaletteInput)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-gray-500 hover:text-[#2ecc71] transition-colors"
          >
            <Plus size={10} />
            新建调色板
          </button>
          {showNewPaletteInput && (
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                value={newPaletteName}
                onChange={(e) => setNewPaletteName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="调色板名称"
                className="flex-1 bg-[#0f3460] text-gray-200 px-1.5 py-1 rounded text-xs outline-none border border-[#e94560] placeholder:text-gray-600"
                autoFocus
              />
              <button
                onClick={handleCreatePalette}
                className="p-1 text-[#2ecc71] hover:bg-[#0f3460] rounded transition-colors"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => {
                  setShowNewPaletteInput(false);
                  setNewPaletteName('');
                }}
                className="p-1 text-gray-500 hover:bg-[#0f3460] rounded transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorPalette;
