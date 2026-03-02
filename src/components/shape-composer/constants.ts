import React from 'react';
import { Square, Circle, Triangle, Diamond, Hexagon, Star } from 'lucide-react';
import { PieceType } from './types';

export const COMP_W = 480;
export const COMP_H = 480;
export const CX = COMP_W / 2;
export const CY = COMP_H / 2;

export const PIECE_TYPES: { type: PieceType; icon: React.FC<any>; label: string }[] = [
  { type: 'circle',   icon: Circle,   label: 'Circle' },
  { type: 'rect',     icon: Square,   label: 'Rect' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'diamond',  icon: Diamond,  label: 'Diamond' },
  { type: 'hexagon',  icon: Hexagon,  label: 'Hexagon' },
  { type: 'star',     icon: Star,     label: 'Star' },
];
