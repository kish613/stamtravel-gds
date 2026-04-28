import { z } from 'zod';

export const TILE_IDS = [
  'kpi-stack',
  'credit-bank',
  'fids-board',
  'pnr-work-list',
  'ttl-ticker',
  'integrations-panel',
  'queue-strip'
] as const;

export type TileId = (typeof TILE_IDS)[number];

export type Breakpoint = 'lg' | 'md' | 'sm';

export interface LayoutItem {
  i: TileId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Layouts = Record<Breakpoint, LayoutItem[]>;

export interface TileConstraint {
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
}

export const LAYOUT_VERSION = 1;

export const COLS: Record<Breakpoint, number> = { lg: 12, md: 8, sm: 4 };

export const BREAKPOINT_PX: Record<Breakpoint, number> = { lg: 1280, md: 768, sm: 0 };

export const ROW_HEIGHT = 60;

// Per-tile constraints in grid units. Picked so tile content stays usable.
export const TILE_CONSTRAINTS: Record<TileId, TileConstraint> = {
  'kpi-stack': { minW: 2, minH: 3, maxW: 12, maxH: 12 },
  'credit-bank': { minW: 2, minH: 3, maxW: 12, maxH: 12 },
  'fids-board': { minW: 5, minH: 4, maxW: 12, maxH: 16 },
  'pnr-work-list': { minW: 4, minH: 4, maxW: 12, maxH: 20 },
  'ttl-ticker': { minW: 2, minH: 3, maxW: 12, maxH: 16 },
  'integrations-panel': { minW: 2, minH: 3, maxW: 12, maxH: 12 },
  'queue-strip': { minW: 6, minH: 4, maxW: 12, maxH: 16 }
};

const DEFAULT_LG: LayoutItem[] = [
  { i: 'kpi-stack', x: 0, y: 0, w: 3, h: 4 },
  { i: 'credit-bank', x: 0, y: 4, w: 3, h: 4 },
  { i: 'fids-board', x: 3, y: 0, w: 6, h: 5 },
  { i: 'pnr-work-list', x: 3, y: 5, w: 6, h: 5 },
  { i: 'ttl-ticker', x: 9, y: 0, w: 3, h: 5 },
  { i: 'integrations-panel', x: 9, y: 5, w: 3, h: 5 },
  { i: 'queue-strip', x: 0, y: 10, w: 12, h: 5 }
];

const DEFAULT_MD: LayoutItem[] = [
  { i: 'fids-board', x: 0, y: 0, w: 8, h: 5 },
  { i: 'kpi-stack', x: 0, y: 5, w: 4, h: 4 },
  { i: 'credit-bank', x: 4, y: 5, w: 4, h: 4 },
  { i: 'pnr-work-list', x: 0, y: 9, w: 8, h: 5 },
  { i: 'ttl-ticker', x: 0, y: 14, w: 4, h: 5 },
  { i: 'integrations-panel', x: 4, y: 14, w: 4, h: 5 },
  { i: 'queue-strip', x: 0, y: 19, w: 8, h: 5 }
];

const DEFAULT_SM: LayoutItem[] = [
  { i: 'fids-board', x: 0, y: 0, w: 4, h: 5 },
  { i: 'kpi-stack', x: 0, y: 5, w: 4, h: 4 },
  { i: 'credit-bank', x: 0, y: 9, w: 4, h: 4 },
  { i: 'pnr-work-list', x: 0, y: 13, w: 4, h: 5 },
  { i: 'ttl-ticker', x: 0, y: 18, w: 4, h: 5 },
  { i: 'integrations-panel', x: 0, y: 23, w: 4, h: 4 },
  { i: 'queue-strip', x: 0, y: 27, w: 4, h: 5 }
];

export const DEFAULT_LAYOUTS: Layouts = {
  lg: DEFAULT_LG,
  md: DEFAULT_MD,
  sm: DEFAULT_SM
};

const tileIdSchema = z.enum(TILE_IDS);

const layoutItemSchema: z.ZodType<LayoutItem> = z
  .object({
    i: tileIdSchema,
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1)
  })
  .refine(
    (item) => {
      const c = TILE_CONSTRAINTS[item.i];
      return item.w >= c.minW && item.w <= c.maxW && item.h >= c.minH && item.h <= c.maxH;
    },
    { message: 'Layout item violates tile constraints' }
  );

export const layoutsSchema: z.ZodType<Layouts> = z.object({
  lg: z.array(layoutItemSchema),
  md: z.array(layoutItemSchema),
  sm: z.array(layoutItemSchema)
});

export const persistedLayoutSchema = z.object({
  version: z.literal(LAYOUT_VERSION),
  layouts: layoutsSchema
});

export type PersistedLayout = z.infer<typeof persistedLayoutSchema>;

// Forward-compat: if a stored layout is missing a tile (e.g. new tile shipped
// after the user customized), fall back to the default for just that tile.
// Drops items whose `i` is no longer a known TileId.
export function mergeWithDefaults(stored: Layouts | null | undefined): Layouts {
  if (!stored) return DEFAULT_LAYOUTS;
  const out: Layouts = { lg: [], md: [], sm: [] };
  for (const bp of ['lg', 'md', 'sm'] as const) {
    const known = new Set<TileId>();
    for (const item of stored[bp] ?? []) {
      if (!TILE_IDS.includes(item.i as TileId)) continue;
      known.add(item.i);
      out[bp].push(item);
    }
    for (const def of DEFAULT_LAYOUTS[bp]) {
      if (!known.has(def.i)) out[bp].push(def);
    }
  }
  return out;
}
