import type { BoardLayout, BoardSpec, CutPlan, Part, PlacedPart } from './types';

/**
 * First-fit decreasing guillotine/shelf heuristic. Grain direction is fixed:
 * part.length always runs along board.width; rotation is intentionally disabled.
 * A kerf is reserved between neighbouring parts and between shelves.
 * This is a practical heuristic, not a proof of globally optimal nesting.
 */
export function optimizeCut(parts: Part[], board: BoardSpec, kerf = 3.2): CutPlan {
  const expanded = parts.flatMap(part => Array.from({ length: Math.max(0, Math.floor(part.quantity)) }, (_, i) => ({
    ...part, id: `${part.id}-${i}`, quantity: 1,
  })));
  const ordered = [...expanded].sort((a, b) => b.width - a.width || b.length - a.length);
  const boards: BoardLayout[] = [];
  const unplaced: Part[] = [];

  for (const part of ordered) {
    if (![part.length, part.width].every(Number.isFinite) || part.length <= 0 || part.width <= 0 || part.length > board.width || part.width > board.height) {
      unplaced.push(part); continue;
    }
    let placed = false;
    for (const layout of boards) {
      const result = tryPlace(layout, part, kerf);
      if (result) { layout.parts.push(result); layout.usedArea += part.length * part.width; placed = true; break; }
    }
    if (!placed) {
      const layout: BoardLayout = { index: boards.length + 1, width: board.width, height: board.height, parts: [], usedArea: 0 };
      const result = tryPlace(layout, part, kerf);
      if (result) { layout.parts.push(result); layout.usedArea = part.length * part.width; boards.push(layout); }
      else unplaced.push(part);
    }
  }
  const totalArea = boards.length * board.width * board.height;
  const usedArea = boards.reduce((sum, b) => sum + b.usedArea, 0);
  const totalParts = expanded.length;
  return { boards, unplaced, totalParts, placedParts: totalParts - unplaced.length, wastePercent: totalArea ? Math.max(0, (totalArea - usedArea) / totalArea * 100) : 0 };
}

type Shelf = { y: number; height: number; nextX: number };
const shelves = new WeakMap<BoardLayout, Shelf[]>();
function tryPlace(layout: BoardLayout, part: Part, kerf: number): PlacedPart | null {
  let rows = shelves.get(layout);
  if (!rows) { rows = []; shelves.set(layout, rows); }
  for (const row of rows) {
    if (part.width <= row.height && row.nextX + part.length <= layout.width) {
      const x = row.nextX;
      row.nextX += part.length + kerf;
      return { part, x, y: row.y, boardIndex: layout.index, rotated: false };
    }
  }
  const y = rows.length ? Math.max(...rows.map(r => r.y + r.height)) + kerf : 0;
  if (y + part.width > layout.height) return null;
  rows.push({ y, height: part.width, nextX: part.length + kerf });
  return { part, x: 0, y, boardIndex: layout.index, rotated: false };
}
