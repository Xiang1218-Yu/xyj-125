import { useState, useRef, useEffect } from 'react';
import { usePixelEditorStore } from '@/store/pixelEditorStore';
import { characterTemplates, templateCategories, type CharacterTemplate } from '@/data/characterTemplates';
import { Sparkles, Sword, Wand2, User, Skull, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';

interface CharacterTemplatesProps {
  onRequestApply: (templateId: string, templateName: string) => void;
}

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

const CharacterTemplates = ({ onRequestApply }: CharacterTemplatesProps) => {
  const [expanded, setExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState<typeof templateCategories[number]['id']>('all');

  const filteredTemplates = activeCategory === 'all'
    ? characterTemplates
    : characterTemplates.filter((t) => t.category === activeCategory);

  return (
    <div className="bg-[#16213e] rounded-lg border border-[#0f3460] flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer transition-colors hover:bg-[#0f3460]/50 flex-shrink-0"
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
        <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-3">
          <div className="flex flex-wrap gap-1 flex-shrink-0 sticky top-0 bg-[#16213e] pt-2 pb-2 z-10">
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
                  <button
                    onClick={() => onRequestApply(template.id, template.name)}
                    className="w-full py-1 px-2 bg-[#e94560] text-white rounded text-[10px] hover:bg-[#d63d55] transition-colors opacity-80 group-hover:opacity-100"
                  >
                    应用模板
                  </button>
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
