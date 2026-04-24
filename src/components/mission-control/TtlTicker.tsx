'use client';

import type { PNR } from '@/lib/types';
import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { mcColors } from './tokens';

function fmtHHMM(minutes: number): string {
  const h = Math.max(0, Math.floor(minutes / 60));
  const m = Math.max(0, minutes % 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function TtlTicker({ pnrs }: { pnrs: PNR[] }) {
  const pending = pnrs
    .filter((p) => p.status !== 'Ticketed' && p.status !== 'Void' && p.status !== 'Canceled')
    .sort((a, b) => a.ttlMinutes - b.ttlMinutes)
    .slice(0, 5);

  return (
    <McCard accent={mcColors.danger}>
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ Countdown"
          meta={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 999,
                background: mcColors.warnBg,
                color: '#9E6612',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                border: '1px solid #F4DBA6',
                fontFamily: 'var(--font-jetbrains)'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: mcColors.warn
                }}
              />
              Live
            </span>
          }
        >
          Ticketing deadlines
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.length === 0 && (
          <div style={{ color: mcColors.neutral400, fontSize: 13 }}>
            No pending ticketing deadlines.
          </div>
        )}
        {pending.map((p) => {
          const minutes = p.ttlMinutes;
          const tone =
            minutes <= 40 ? 'danger' : minutes <= 120 ? 'warning' : 'confirmed';
          const color =
            tone === 'danger' ? mcColors.danger : tone === 'warning' ? mcColors.warn : mcColors.good;
          const widthPct = Math.max(6, Math.min(100, 100 - minutes / 4));
          return (
            <div
              key={p.locator}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: '#fff',
                border: '1px solid ' + mcColors.neutral150,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: mcColors.navy800
                  }}
                >
                  {p.locator}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 13,
                    fontWeight: 700,
                    color,
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {fmtHHMM(minutes)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: mcColors.neutral500 }}>{p.passengerName}</div>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: mcColors.neutral100,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: widthPct + '%',
                    height: '100%',
                    background: color,
                    transition: 'width 260ms'
                  }}
                />
              </div>
            </div>
          );
        })}
      </McCardContent>
    </McCard>
  );
}
