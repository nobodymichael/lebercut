# LEBERCUT

LEBERCUT is a Polish-language workshop helper for panel cutting layouts and equal-length cuts.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Current scope (0.1.0)

- Separate panel-layout and equal-cut modules.
- Furniture board preset: 2800 × 2070 mm.
- OSB usable area: 2460 × 1210 mm (20 mm trim on each edge from 2500 × 1250 mm stock).
- Default saw kerf: 3.2 mm.
- Fixed grain direction: parts are never rotated.
- Edge-banding flags on all four edges for furniture-board parts.
- Local project save/load and JSON export.
- Print-friendly layout sheet.

## Important algorithm note

The current layout engine is a first-fit decreasing shelf/guillotine-style heuristic. It is deterministic and accounts for kerf between parts and shelves, but it is **not a globally optimal nesting solver** and does not yet output a verified machine-ready cutting sequence. Treat the plan as a draft for workshop review.

## Next engineering milestones

1. Replace shelf placement with a tested guillotine cut-tree optimizer and explicit cut sequence.
2. Add material-specific edge/trim settings and validation for saw/fence constraints.
3. Add test fixtures for kerf, grain direction, OSB trimming, edge labels and multi-board layouts.
4. Add project persistence/versioning and PDF export.
