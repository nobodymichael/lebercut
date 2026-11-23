export type Material = 'furniture' | 'osb' | 'custom';
export type EdgeFlags = { top: boolean; right: boolean; bottom: boolean; left: boolean };
export type Part = { id: string; name: string; length: number; width: number; quantity: number; edges: EdgeFlags };
export type BoardSpec = { name: string; width: number; height: number; trim: number };
export type PlacedPart = { part: Part; x: number; y: number; boardIndex: number; rotated: false };
export type BoardLayout = { index: number; width: number; height: number; parts: PlacedPart[]; usedArea: number };
export type CutPlan = { boards: BoardLayout[]; unplaced: Part[]; totalParts: number; placedParts: number; wastePercent: number };
