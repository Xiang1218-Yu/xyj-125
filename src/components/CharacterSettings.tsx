import { useState } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { Settings, Edit3, Check, X } from 'lucide-react';

const CharacterSettings = () => {
  const { character, setCharacterSize, setCharacter } = usePixelEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(character.name);
  const [tempWidth, setTempWidth] = useState(character.width);
  const [tempHeight, setTempHeight] = useState(character.height);

  const handleStartEdit = () => {
    setTempName(character.name);
    setTempWidth(character.width);
    setTempHeight(character.height);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempName.trim()) {
      setCharacter({ ...character, name: tempName.trim() });
    }
    if (tempWidth > 0 && tempHeight > 0) {
      setCharacterSize(Math.min(64, Math.max(8, tempWidth)), Math.min(64, Math.max(8, tempHeight)));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const totalFrames = character.actions.reduce((sum, a) => sum + a.frames.length, 0);

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">角色设置</h3>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="p-1 text-gray-400 hover:text-[#3498db] transition-colors"
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">角色名称</label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">宽度 (px)</label>
              <input
                type="number"
                value={tempWidth}
                onChange={(e) => setTempWidth(parseInt(e.target.value) || 16)}
                min={8}
                max={64}
                className="w-full px-2 py-1 text-sm bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">高度 (px)</label>
              <input
                type="number"
                value={tempHeight}
                onChange={(e) => setTempHeight(parseInt(e.target.value) || 16)}
                min={8}
                max={64}
                className="w-full px-2 py-1 text-sm bg-[#1a1a2e] border border-[#0f3460] rounded text-gray-200 focus:outline-none focus:border-[#e94560]"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 py-1.5 bg-[#2ecc71] text-white rounded text-sm hover:bg-[#27ae60] transition-colors flex items-center justify-center gap-1"
            >
              <Check size={14} /> 保存
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 py-1.5 bg-[#e74c3c] text-white rounded text-sm hover:bg-[#c0392b] transition-colors flex items-center justify-center gap-1"
            >
              <X size={14} /> 取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">名称:</span>
            <span className="text-gray-200 font-medium">{character.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">尺寸:</span>
            <span className="text-gray-200">{character.width} × {character.height} px</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">动作数:</span>
            <span className="text-gray-200">{character.actions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">总帧数:</span>
            <span className="text-gray-200">{totalFrames}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterSettings;
