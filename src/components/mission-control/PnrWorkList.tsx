'use client';

import { useMemo, useState } from 'react';
import type { PNR } from '@/lib/types';
import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { PnrModule } from './PnrModule';
import { mcColors } from './tokens';

type Filter = 'All' | 'Today' | 'Awaiting' | 'Issues';

export function PnrWorkList({ pnrs, now }: { pnrs: PNR[]; now: number }) {
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = useMemo(() => {
    const todayKey = new Date(now).toISOString().slice(0, 10);
    switch (filter) {
      case 'Today':
        return pnrs.filter((p) => p.departureDate === todayKey);
      case 'Awaiting':
        return pnrs.filter((p) => p.status === 'Awaiting Ticket' || p.status === 'Booked');
      case 'Issues':
        return pnrs.filter(
          (p) =>
            (p.servicingTags && p.servicingTags.length > 0) ||
            p.orderSyncStatus === 'Out Of Sync' ||
            p.orderSyncStatus === 'Needs Review' ||
            p.status === 'Void' ||
            p.status === 'Canceled'
        );
      default:
        return pnrs;
    }
  }, [pnrs, filter, now]);

  return (
    <McCard accent={mcColors.navy800}>
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ PNR Work"
          meta={
            <div style={{ display: 'flex', gap: 6 }}>
              {(['All', 'Today', 'Awaiting', 'Issues'] as Filter[]).map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '5px 10px',
                      border: '1px solid ' + (active ? mcColors.navy800 : mcColors.neutral150),
                      borderRadius: 6,
                      background: active ? mcColors.navy800 : '#fff',
                      color: active ? '#fff' : mcColors.neutral400,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          }
        >
          Active records
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ color: mcColors.neutral400, fontSize: 13, padding: '10px 4px' }}>
            No records match this filter.
          </div>
        ) : (
          filtered.map((p, i) => <PnrModule key={p.locator} pnr={p} defaultOpen={i === 0} />)
        )}
      </McCardContent>
    </McCard>
  );
}
