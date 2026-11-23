import { describe, expect, it } from 'vitest';
import { optimizeCut } from './optimizer';
import type { Part } from './types';
const p = (id: string, length: number, width: number, quantity = 1): Part => ({ id, name: id, length, width, quantity, edges: { top:false, right:false, bottom:false, left:false } });
describe('optimizeCut', () => {
  it('does not rotate parts and places multiple parts on a board', () => {
    const plan = optimizeCut([p('a', 1000, 500, 2)], { name:'test', width:2100, height:600, trim:0 }, 3.2);
    expect(plan.placedParts).toBe(2);
    expect(plan.boards).toHaveLength(1);
    expect(plan.boards[0].parts[1].x).toBeGreaterThan(1000);
  });
  it('reports a part that exceeds board dimensions as unplaced', () => {
    const plan = optimizeCut([p('large', 2200, 400)], { name:'test', width:2000, height:1000, trim:0 });
    expect(plan.unplaced).toHaveLength(1);
  });
});
