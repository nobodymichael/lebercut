import type { BoardSpec, Material } from './types';

export const DEFAULT_KERF = 3.2;

export const BOARD_PRESETS: Record<Exclude<Material, 'custom'>, BoardSpec> = {
  furniture: { name: 'Płyta meblowa', width: 2760, height: 2030, trim: 20 },
  osb: { name: 'OSB', width: 2500, height: 1250, trim: 0 },
};

export function getBoardSpec(material: Material, custom?: BoardSpec): BoardSpec {
  return material === 'custom'
    ? (custom ?? { name: 'Własny format', width: 2800, height: 2070, trim: 0 })
    : BOARD_PRESETS[material];
}
