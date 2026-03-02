import React from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Layers, MousePointer2, Settings, Zap } from 'lucide-react';
import { ActivePanel } from '../types';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface BuildModeToolRailProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  isSelectMode: boolean;
  onEnterSelectMode: () => void;
}

const PANEL_TABS: { id: ActivePanel; icon: React.FC<any>; title: string; accent: string }[] = [
  { id: 'tools',    icon: Zap,      title: 'Behaviors',      accent: 'accent' },
  { id: 'shapes',   icon: Hexagon,  title: 'Shapes',         accent: 'accent' },
  { id: 'settings', icon: Settings, title: 'Settings',       accent: 'accent' },
  { id: 'compose',  icon: Layers,   title: 'Shape Composer', accent: 'violet' },
] as const;

export const BuildModeToolRail: React.FC<BuildModeToolRailProps> = ({
  activePanel,
  onPanelChange,
  isSelectMode,
  onEnterSelectMode,
}) => (
  <TooltipProvider delayDuration={300}>
    <motion.div
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.05, duration: 0.2 }}
      className="w-12 flex flex-col items-center pt-3 pb-4 gap-1 shrink-0 border-r"
      style={{ background: THEME.panel, borderColor: THEME.border }}
    >
      {/* Select */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onEnterSelectMode}
            className={`w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer relative ${
              isSelectMode ? 'ui-btn-active' : 'ui-btn'
            }`}
          >
            <MousePointer2 size={17} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Select <span style={{ color: THEME.textMuted }} className="ml-1">S</span>
        </TooltipContent>
      </Tooltip>

      {/* Divider */}
      <div className="w-5 h-px my-2" style={{ background: THEME.border }} />

      {/* Panel tabs */}
      {PANEL_TABS.map(({ id, icon: Icon, title, accent }) => {
        const isActive = activePanel === id;
        const accentColor = THEME[accent as keyof typeof THEME] as string;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => onPanelChange(id)}
                whileTap={{ scale: 0.88 }}
                className="w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer relative"
                style={
                  isActive
                    ? {
                        color: accentColor,
                        background: alpha(accentColor, 0.1),
                      }
                    : undefined
                }
                data-active={isActive || undefined}
              >
                <span className={isActive ? '' : 'ui-btn w-full h-full flex items-center justify-center rounded-md'}>
                  <Icon size={17} />
                </span>

                {/* Side indicator */}
                {isActive && (
                  <motion.div
                    layoutId="rail-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: accentColor }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right">{title}</TooltipContent>
          </Tooltip>
        );
      })}
    </motion.div>
  </TooltipProvider>
);
