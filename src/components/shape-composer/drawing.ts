import { ComposerPiece, PieceType } from './types';
import { CX, CY } from './constants';

export function drawPieceShape(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  r: number,
) {
  ctx.beginPath();
  switch (type) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = r * Math.cos(a);
        const py = r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        const px = rad * Math.cos(a);
        const py = rad * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'rect':
    default:
      ctx.rect(-r, -r, r * 2, r * 2);
      break;
  }
}

export function drawPieceOnComposer(
  ctx: CanvasRenderingContext2D,
  piece: ComposerPiece,
  selected: boolean,
) {
  const r = piece.size / 2;
  ctx.save();
  ctx.translate(CX + piece.x, CY + piece.y);
  ctx.rotate((piece.rotation * Math.PI) / 180);

  ctx.fillStyle = `${piece.color}55`;
  ctx.strokeStyle = selected ? '#ffffff' : piece.color;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  if (selected) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  drawPieceShape(ctx, piece.type, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (selected) {
    const pad = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-r - pad, -r - pad, (r + pad) * 2, (r + pad) * 2);
    ctx.setLineDash([]);

    const handleSize = 6;
    for (const hx of [-r - pad, r + pad]) {
      for (const hy of [-r - pad, r + pad]) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      }
    }

    const rotHandleY = -r - pad - 18;
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r - pad);
    ctx.lineTo(0, rotHandleY + 6);
    ctx.stroke();
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(0, rotHandleY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function hitTestPiece(piece: ComposerPiece, mx: number, my: number): boolean {
  const dx = mx - (CX + piece.x);
  const dy = my - (CY + piece.y);
  return Math.sqrt(dx * dx + dy * dy) <= piece.size / 2 + 6;
}

export function computeColliderRadius(pieces: ComposerPiece[]): number {
  let maxRadius = 0;
  for (const p of pieces) {
    const distance = Math.sqrt(p.x * p.x + p.y * p.y) + p.size / 2;
    if (distance > maxRadius) maxRadius = distance;
  }
  return Math.max(maxRadius, 10);
}

export function generateThumbnail(pieces: ComposerPiece[]): string {
  const size = 80;
  const tc = document.createElement('canvas');
  tc.width = size;
  tc.height = size;
  const tx = tc.getContext('2d');
  if (!tx) return '';

  tx.fillStyle = '#0a0a14';
  tx.fillRect(0, 0, size, size);

  if (pieces.length === 0) {
    return tc.toDataURL();
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of pieces) {
    const r = p.size / 2;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }

  const width = (maxX - minX) || 1;
  const height = (maxY - minY) || 1;
  const scale = Math.min((size - 12) / width, (size - 12) / height, 1.5);
  const offsetX = size / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = size / 2 - ((minY + maxY) / 2) * scale;

  for (const p of pieces) {
    const r = (p.size / 2) * scale;
    tx.save();
    tx.translate(offsetX + p.x * scale, offsetY + p.y * scale);
    tx.rotate((p.rotation * Math.PI) / 180);
    tx.fillStyle = `${p.color}88`;
    tx.strokeStyle = p.color;
    tx.lineWidth = 1.5;
    drawPieceShape(tx, p.type, r);
    tx.fill();
    tx.stroke();
    tx.restore();
  }

  return tc.toDataURL();
}
