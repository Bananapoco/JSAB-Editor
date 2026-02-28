import React from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Layers, Settings, Zap } from 'lucide-react';
import { TOOLS } from '../constants';
import { ActivePanel, Tool } from '../types';

interface BuildModeToolRailProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  activeTool: Tool;
  isPlacementMode: boolean;
  onSelectTool: (tool: Tool) => void;
}

const panelTabs: { id: ActivePanel; icon: React.FC<any>; title: string }[] = [
  { id: 'tools', icon: Zap, title: 'Tools' },
  { id: 'shapes', icon: Hexagon, title: 'Shapes' },
  { id: 'settings', icon: Settings, title: 'Settings' },
  { id: 'compose', icon: Layers, title: 'Shape Composer' },
];

export const BuildModeToolRail: React.FC<BuildModeToolRailProps> = ({
  activePanel,
  onPanelChange,
  activeTool,
  isPlacementMode,
  onSelectTool,
}) => {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-20 bg-[#0c0c14] border-r border-[#1a1a2e] flex flex-col items-center py-4 gap-2 shrink-0"
    >
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

      <div className="w-10 h-px bg-[#1a1a2e]" />

      {(Object.entries(TOOLS) as [Tool, (typeof TOOLS)[Tool]][]).map(([key, { icon: Icon, color }]) => {
        const isActive = isPlacementMode && activeTool === key;
        return (
          <motion.button
            key={key}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectTool(key)}
            className={`p-3 rounded-xl transition-all tool-btn relative ${
              isActive ? 'text-white' : 'text-[#555] hover:text-white'
            }`}
            style={{
              backgroundColor: isActive ? `${color}30` : '#1a1a2e',
              boxShadow: isActive ? `0 0 20px ${color}40` : 'none',
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: isActive ? color : 'transparent',
            }}
          >
            <Icon size={20} style={{ color: isActive ? color : undefined }} />
          </motion.button>
        );
      })}
    </motion.div>
  );
};
