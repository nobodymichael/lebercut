import { describe, expect, it } from 'vitest';
import { calculateEqualCuts } from './equalCuts';
describe('calculateEqualCuts', () => {
  it('subtracts one kerf per cut, not per piece', () => {
    expect(calculateEqualCuts(2500, 5, 3.2).pieceLength).toBeCloseTo(497.44, 2);
  });
  it('rejects impossible cuts', () => {
    expect(() => calculateEqualCuts(10, 5, 3)).toThrow();
  });
});
