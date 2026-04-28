'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type LayoutItem as RGLLayoutItem,
  type ResponsiveLayouts
} from 'react-grid-layout';
import { useAppStore } from '@/stores/app-store';
import {
  BREAKPOINT_PX,
  COLS,
  DEFAULT_LAYOUTS,
  LAYOUT_VERSION,
  ROW_HEIGHT,
  TILE_CONSTRAINTS,
  TILE_IDS,
  type Breakpoint,
  type LayoutItem,
  type Layouts,
  type PersistedLayout,
  type TileId
} from '@/lib/dashboard-layout';
import { TileChrome } from './TileChrome';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

type TileMap = Partial<Record<TileId, { label: string; node: React.ReactNode }>>;

interface DashboardGridProps {
  tiles: TileMap;
}

const toRGLItem = (item: LayoutItem): RGLLayoutItem => {
  const c = TILE_CONSTRAINTS[item.i];
  return {
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: c.minW,
    minH: c.minH,
    maxW: c.maxW,
    maxH: c.maxH
  };
};

const fromRGLItems = (items: Layout): LayoutItem[] => {
  const out: LayoutItem[] = [];
  for (const it of items) {
    if (!(TILE_IDS as readonly string[]).includes(it.i)) continue;
    out.push({ i: it.i as TileId, x: it.x, y: it.y, w: it.w, h: it.h });
  }
  return out;
};

const toRGLLayouts = (layouts: Layouts): ResponsiveLayouts<Breakpoint> => ({
  lg: layouts.lg.map(toRGLItem),
  md: layouts.md.map(toRGLItem),
  sm: layouts.sm.map(toRGLItem)
});

export function DashboardGrid({ tiles }: DashboardGridProps) {
  const layouts = useAppStore((s) => s.dashboardLayouts);
  const editing = useAppStore((s) => s.isEditingLayout);
  const setLayouts = useAppStore((s) => s.setDashboardLayouts);

  const { width, containerRef, mounted } = useContainerWidth();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveLayoutsRef = useRef<ResponsiveLayouts<Breakpoint> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard-layout')
      .then((r) => (r.ok ? (r.json() as Promise<PersistedLayout>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setLayouts(data.layouts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setLayouts]);

  const persist = (next: Layouts) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch('/api/dashboard-layout', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: LAYOUT_VERSION, layouts: next })
      }).catch(() => {});
    }, 400);
  };

  const handleLayoutChange = (_current: Layout, all: ResponsiveLayouts<Breakpoint>) => {
    liveLayoutsRef.current = all;
  };

  const commit = () => {
    if (!editing) return;
    const all = liveLayoutsRef.current;
    if (!all) return;
    const next: Layouts = {
      lg: fromRGLItems(all.lg ?? layouts.lg.map(toRGLItem)),
      md: fromRGLItems(all.md ?? layouts.md.map(toRGLItem)),
      sm: fromRGLItems(all.sm ?? layouts.sm.map(toRGLItem))
    };
    setLayouts(next);
    persist(next);
  };

  const rglLayouts = useMemo(() => toRGLLayouts(layouts), [layouts]);

  const tileOrder: TileId[] = useMemo(() => {
    const seen = new Set<TileId>();
    const ordered: TileId[] = [];
    for (const item of layouts.lg) {
      if (tiles[item.i] && !seen.has(item.i)) {
        ordered.push(item.i);
        seen.add(item.i);
      }
    }
    for (const def of DEFAULT_LAYOUTS.lg) {
      if (tiles[def.i] && !seen.has(def.i)) {
        ordered.push(def.i);
        seen.add(def.i);
      }
    }
    return ordered;
  }, [layouts.lg, tiles]);

  return (
    <div
      ref={containerRef}
      data-mc-dashboard-grid
      data-editing={editing ? 'true' : 'false'}
      style={{ position: 'relative' }}
    >
      {editing && (
        <style jsx global>{`
          [data-mc-dashboard-grid][data-editing='true'] .react-grid-placeholder {
            background: rgba(37, 165, 180, 0.18) !important;
            border: 1px dashed rgba(37, 165, 180, 0.6);
            border-radius: 14px;
          }
        `}</style>
      )}
      {mounted && (
      <ResponsiveGridLayout
        width={width}
        layouts={rglLayouts}
        breakpoints={{ lg: BREAKPOINT_PX.lg, md: BREAKPOINT_PX.md, sm: BREAKPOINT_PX.sm }}
        cols={{ lg: COLS.lg, md: COLS.md, sm: COLS.sm }}
        rowHeight={ROW_HEIGHT}
        margin={[20, 20]}
        containerPadding={[0, 0]}
        compactor={verticalCompactor}
        dragConfig={{ enabled: editing, bounded: false, threshold: 3, handle: '[data-mc-drag-handle]' }}
        resizeConfig={{ enabled: editing, handles: ['se'] }}
        onLayoutChange={handleLayoutChange}
        onDragStop={commit}
        onResizeStop={commit}
      >
        {tileOrder.map((id) => {
          const tile = tiles[id];
          if (!tile) return null;
          return (
            <div key={id}>
              <TileChrome editing={editing} label={tile.label}>
                {tile.node}
              </TileChrome>
            </div>
          );
        })}
      </ResponsiveGridLayout>
      )}
    </div>
  );
}
