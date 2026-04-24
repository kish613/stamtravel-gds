'use client';

import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { mcColors } from './tokens';

const SERVICES = [
  { label: 'PNR Service', ms: 48, state: 'ok' as const },
  { label: 'Air Shopping', ms: 112, state: 'ok' as const },
  { label: 'NDC Orders (AF/BA)', ms: 216, state: 'warn' as const },
  { label: 'Ticketing', ms: 71, state: 'ok' as const },
  { label: 'Queue Service', ms: 39, state: 'ok' as const }
];

export function IntegrationsPanel() {
  const okCount = SERVICES.filter((s) => s.state === 'ok').length;
  return (
    <McCard accent={mcColors.good}>
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ Integrations"
          meta={
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: mcColors.good,
                fontFamily: 'var(--font-jetbrains)'
              }}
            >
              {okCount}/{SERVICES.length} NOMINAL
            </span>
          }
        >
          Sabre API status
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SERVICES.map((s) => {
          const c = s.state === 'ok' ? mcColors.good : mcColors.warn;
          return (
            <div
              key={s.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: mcColors.neutral50,
                border: '1px solid ' + mcColors.neutral150,
                borderRadius: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: c,
                    boxShadow: `0 0 8px ${c}80`
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: mcColors.navy800 }}>
                  {s.label}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: c,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {s.ms}ms
              </span>
            </div>
          );
        })}
      </McCardContent>
    </McCard>
  );
}
