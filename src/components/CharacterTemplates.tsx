import { useState, useRef, useEffect } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { characterTemplates, templateCategories, type CharacterTemplate } from '@/data/characterTemplates';
import { Sparkles, Sword, Wand2, User, Skull, LayoutGrid, ChevronDown, ChevronUp, Check } from 'lucide-react';

const TemplatePreview = ({ template, size = 4 }: { template: CharacterTemplate; size?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelColors = usePixelEditorStore((state) => state.pixelColors);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = template.width * size;
    canvas.height = template.height * size;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < template.height; y++) {
      for (let x = 0; x < template.width; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#1a1a2e';
        } else {
          ctx.fillStyle = '#16213e';
        }
        ctx.fillRect(x * size, y * size, size, size);
      }
    }

    for (let y = 0; y < template.height; y++) {
      for (let x = 0; x < template.width; x++) {
        const colorIndex = template.previewPixels[y]?.[x] ?? -1;
        if (colorIndex >= 0 && colorIndex < pixelColors.length) {
          ctx.fillStyle = pixelColors[colorIndex];
          ctx.fillRect(x * size, y * size, size, size);
        }
      }
    }
  }, [template, pixelColors, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded"
      style={{ imageRendering: 'pixelated', width: template.width * size, height: template.height * size }}
    />
  );
};

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'sword': return Sword;
    case 'wand': return Wand2;
    case 'user': return User;
    case 'skull': return Skull;
    default: return LayoutGrid;
  }
};

const CharacterTemplates = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<typeof templateCategories[number]['id']>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const applyTemplate = usePixelEditorStore((state) => state.applyTemplate);

  const filteredTemplates = activeCategory === 'all'
    ? characterTemplates
    : characterTemplates.filter((t) => t.category === activeCategory);

  const handleApplyClick = (templateId: string) => {
    setConfirmingId(templateId);
  };

  const handleConfirmApply = (templateId: string) => {
    const success = applyTemplate(templateId);
    if (success) {
      setConfirmingId(null);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmingId(null);
  };

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460]">
      <div
        className="flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-[#0f3460]/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#f39c12]" />
          <h3 className="text-sm font-medium text-gray-300 pixel-font text-xs">角色模板</h3>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="flex flex-wrap gap-1">
            {templateCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.icon);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#e94560] text-white'
                      : 'bg-[#0f3460] text-gray-400 hover:bg-[#1a1a2e] hover:text-gray-300'
                  }`}
                >
                  <Icon size={10} />
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-[#1a1a2e] rounded border border-[#0f3460] p-2 hover:border-[#e94560]/50 transition-colors group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-[#0f3460] rounded p-1">
                    <TemplatePreview template={template} size={3} />
                  </div>
                  <div className="w-full text-center">
                    <p className="text-xs font-medium text-gray-200 truncate">{template.name}</p>
                    <p className="text-[9px] text-gray-500 truncate">{template.description}</p>
                  </div>
                  {confirmingId === template.id ? (
                    <div className="flex gap-1 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmApply(template.id);
                        }}
                        className="flex-1 py-1 px-2 bg-[#2ecc71] text-white rounded text-[10px] hover:bg-[#27ae60] transition-colors flex items-center justify-center gap-1"
                      >
                        <Check size={10} /> 确认
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelConfirm();
                        }}
                        className="flex-1 py-1 px-2 bg-[#e74c3c] text-white rounded text-[10px] hover:bg-[#c0392b] transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyClick(template.id);
                      }}
                      className="w-full py-1 px-2 bg-[#e94560] text-white rounded text-[10px] hover:bg-[#d63d55] transition-colors opacity-80 group-hover:opacity-100"
                    >
                      应用模板
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-gray-500 text-center pt-1 border-t border-[#0f3460]">
            应用模板将覆盖当前角色，可在此基础上继续编辑
          </p>
        </div>
      )}
    </div>
  );
};

export default CharacterTemplates;
