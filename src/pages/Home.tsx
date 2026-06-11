import { useState } from 'react';
import PixelCanvas from '@/components/PixelCanvas';
import ColorPalette from '@/components/ColorPalette';
import ActionPanel from '@/components/ActionPanel';
import FrameList from '@/components/FrameList';
import AnimationPreview from '@/components/AnimationPreview';
import SpriteSheetGenerator from '@/components/SpriteSheetGenerator';
import CharacterSettings from '@/components/CharacterSettings';
import { Palette, Layers, Film, Settings, Grid3X3 } from 'lucide-react';

type TabType = 'preview' | 'spritesheet' | 'settings';

const Home = () => {
  const [rightTab, setRightTab] = useState<TabType>('preview');

  const rightTabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'preview', label: '预览', icon: Film },
    { id: 'spritesheet', label: 'SpriteSheet', icon: Grid3X3 },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#1a1a2e] text-gray-200 overflow-hidden">
      <header className="flex-shrink-0 bg-[#16213e] border-b border-[#0f3460] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#e94560] rounded flex items-center justify-center">
            <Palette size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white pixel-font">Pixel Animator</h1>
            <p className="text-xs text-gray-500">像素动画帧管理工具</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">
            <span className="text-[#e94560]">●</span> 独立游戏开发者专用
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 flex-shrink-0 bg-[#16213e] border-r border-[#0f3460] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#0f3460]">
            <CharacterSettings />
          </div>
          <div className="p-3 border-b border-[#0f3460]">
            <ActionPanel />
          </div>
          <div className="p-3 flex-1 overflow-hidden">
            <ColorPalette />
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-hidden">
            <PixelCanvas />
          </div>
          <div className="h-48 flex-shrink-0 border-t border-[#0f3460] p-3 overflow-hidden">
            <FrameList />
          </div>
        </main>

        <aside className="w-72 flex-shrink-0 bg-[#16213e] border-l border-[#0f3460] flex flex-col overflow-hidden">
          <div className="flex border-b border-[#0f3460]">
            {rightTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  rightTab === tab.id
                    ? 'text-[#e94560] border-b-2 border-[#e94560] bg-[#e94560]/5'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-[#0f3460]/50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'preview' && <AnimationPreview />}
            {rightTab === 'spritesheet' && <SpriteSheetGenerator />}
            {rightTab === 'settings' && (
              <div className="space-y-3">
                <div className="bg-[#1a1a2e] rounded-lg border border-[#0f3460] p-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 pixel-font text-xs">快捷键</h3>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">B</kbd> 画笔工具</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">E</kbd> 橡皮擦</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">G</kbd> 填充工具</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Space</kbd> 播放/暂停</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">[</kbd> 上一帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">]</kbd> 下一帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">N</kbd> 新建帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">D</kbd> 复制帧</p>
                    <p><kbd className="px-1.5 py-0.5 bg-[#0f3460] rounded text-gray-400">Delete</kbd> 删除帧</p>
                  </div>
                </div>
                <div className="bg-[#1a1a2e] rounded-lg border border-[#0f3460] p-3">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 pixel-font text-xs">使用说明</h3>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <p>1. 在左侧创建角色和动作</p>
                    <p>2. 使用画布编辑像素帧</p>
                    <p>3. 添加/复制/重排帧序列</p>
                    <p>4. 预览动画效果</p>
                    <p>5. 导出 SpriteSheet</p>
                    <p className="pt-1 text-[#e94560]/80">提示: 按住 Shift 点击可多选帧进行批量操作</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;
