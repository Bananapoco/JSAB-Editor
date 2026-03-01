export type PieceType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface ComposerPiece {
  id: number;
  /** Pixel offset from composition center */
  x: number;
  y: number;
  size: number;
  rotation: number;
  /** Non-uniform visual scale (used for corner-drag distort/squish) */
  scaleX?: number;
  scaleY?: number;
  color: string;
  type: PieceType;
  /** Opacity 0–100 (defaults to 100). Pieces below 100 have no hitbox. */
  opacity?: number;
}

export interface CustomShapeDef {
  id: string;
  name: string;
  pieces: ComposerPiece[];
  /** Auto-computed bounding circle radius */
  colliderRadius: number;
  /** Base-64 PNG thumbnail */
  thumbnail: string;
}

export interface ShapeComposerProps {
  onClose: () => void;
  onSave: (shape: CustomShapeDef) => void;
  onDelete: (id: string) => void;
  existingShapes: CustomShapeDef[];
  defaultColor: string;
}
