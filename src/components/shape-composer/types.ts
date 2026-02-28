export type PieceType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface ComposerPiece {
  id: number;
  /** Pixel offset from composition center */
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  type: PieceType;
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
