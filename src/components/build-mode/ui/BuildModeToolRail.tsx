import React from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Layers, MousePointer2, Settings, Zap } from 'lucide-react';
import { ActivePanel } from '../types';

interface BuildModeToolRailProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  isSelectMode: boolean;
  onEnterSelectMode: () => void;
}

const panelTabs: { id: ActivePanel; icon: React.FC<any>; title: string }[] = [
  { id: 'tools', icon: Zap, title: 'Tools & Animation' },
  { id: 'shapes', icon: Hexagon, title: 'Shapes' },
  { id: 'settings', icon: Settings, title: 'Settings' },
  { id: 'compose', icon: Layers, title: 'Shape Composer' },
];

export const BuildModeToolRail: React.FC<BuildModeToolRailProps> = ({
  activePanel,
  onPanelChange,
  isSelectMode,
  onEnterSelectMode,
}) => {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-20 bg-[#0c0c14] border-r border-[#1a1a2e] flex flex-col items-center py-4 gap-2 shrink-0"
    >
      {/* Select mode button */}
      <button
        onClick={onEnterSelectMode}
        title="Select (S)"
        className={`p-3 rounded-xl transition-all tool-btn ${
          isSelectMode
            ? 'bg-[#1a1a2e] text-white'
            : 'bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540]'
        }`}
      >
        <MousePointer2 size={20} />
      </button>

      <div className="w-8 border-t border-[#1a1a2e] my-1" />

      <div className="flex flex-col gap-1 mb-4">
        {panelTabs.map(({ id, icon: Icon, title }) => (
          <button
            key={id}
            onClick={() => onPanelChange(id)}
            title={title}
            className={`p-3 rounded-xl transition-all tool-btn ${
              activePanel === id
                ? id === 'compose'
                  ? 'bg-[#9966FF] text-white shadow-lg shadow-[#9966FF44]'
                  : 'bg-[#FF0099] text-white shadow-lg shadow-[#FF009944]'
                : 'bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540]'
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>


    </motion.div>
  );
};
