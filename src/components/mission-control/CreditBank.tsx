'use client';

import type { PNR } from '@/lib/types';
import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { mcColors, fontDisplay } from './tokens';

interface CreditRow {
  id: string;
  locator: string;
  passenger: string;
  route: string;
  amount: number;
  daysToExpiry: number;
  status: 'Open' | 'Used' | 'Expired';
}

function fmtUsd(n: number) {
  return '$' + n.toLocaleString('en-US');
}

export function collectCredits(pnrs: PNR[], now: number): CreditRow[] {
  const MS = 24 * 60 * 60 * 1000;
  return pnrs.flatMap((pnr) =>
    (pnr.unusedTicketCredits || [])
      .filter((c) => c.status === 'Open')
      .map((c) => ({
        id: c.id,
        locator: pnr.locator,
        passenger: pnr.passengerName,
        route: pnr.route,
        amount: c.amount,
        daysToExpiry: Math.max(
          0,
          Math.ceil((new Date(c.expiresAt).getTime() - now) / MS)
        ),
        status: c.status
      }))
  );
}

export function CreditBank({ credits }: { credits: CreditRow[] }) {
  const total = credits.reduce((a, c) => a + c.amount, 0);
  const expiringSoon = credits.filter((c) => c.daysToExpiry <= 14).length;
  const oldest = credits.length > 0
    ? Math.max(...credits.map((c) => c.daysToExpiry))
    : 0;

  return (
    <McCard accent={mcColors.warn}>
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ Credit bank"
          meta={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                borderRadius: 999,
                background: mcColors.warnBg,
                color: '#9E6612',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                border: '1px solid #F4DBA6'
              }}
            >
              {expiringSoon} expiring
            </span>
          }
        >
          Unused tickets
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: mcColors.gradientBrand,
            color: '#fff'
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.65)'
            }}
          >
            UNUSED CREDITS
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: fontDisplay,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {fmtUsd(total)}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {credits.length} open · oldest {oldest}d
          </div>
        </div>

        {credits.length === 0 && (
          <div
            style={{
              padding: 12,
              textAlign: 'center',
              color: mcColors.neutral400,
              fontSize: 12
            }}
          >
            No open credits on file.
          </div>
        )}

        {credits.slice(0, 3).map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              borderRadius: 8,
              background: c.daysToExpiry <= 14 ? mcColors.warnBg : mcColors.neutral50,
              border:
                '1px solid ' + (c.daysToExpiry <= 14 ? '#F4DBA6' : mcColors.neutral150)
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: mcColors.navy800
                }}
              >
                {c.locator}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: mcColors.neutral400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {c.route} · {c.daysToExpiry}d
              </div>
            </div>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 14,
                color: mcColors.navy800,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {fmtUsd(c.amount)}
            </div>
          </div>
        ))}
      </McCardContent>
    </McCard>
  );
}
