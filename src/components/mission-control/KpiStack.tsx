'use client';

import type { PNR, QueueBucket } from '@/lib/types';
import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { mcColors, fontDisplay } from './tokens';

type Tone = 'good' | 'warn' | 'danger' | 'neutral';

const toneBorder: Record<Tone, string> = {
  good: mcColors.good,
  warn: mcColors.warn,
  danger: mcColors.danger,
  neutral: mcColors.teal500
};

const toneBg: Record<Tone, string> = {
  good: mcColors.goodBg,
  warn: mcColors.warnBg,
  danger: mcColors.dangerBg,
  neutral: mcColors.teal100
};

const toneFg: Record<Tone, string> = {
  good: '#087A52',
  warn: '#9E6612',
  danger: '#A51F2D',
  neutral: mcColors.navy800
};

interface Kpi {
  label: string;
  value: string;
  delta: string;
  sub: string;
  tone: Tone;
}

function fmtUsd(n: number) {
  return '$' + n.toLocaleString('en-US');
}

export function buildKpis(pnrs: PNR[], queues: QueueBucket[], now: number): Kpi[] {
  const openWork = queues.reduce((a, q) => a + q.items.length, 0);
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const todaysPnrs = pnrs.filter((p) => p.departureDate === todayKey);
  const revenueToday = todaysPnrs.reduce((a, p) => a + (p.pricing?.total || 0), 0);

  const segmentsNext12h = pnrs.reduce((acc, pnr) => {
    const within = pnr.segments.filter((s) => {
      const t = new Date(s.departure).getTime();
      return t >= now && t <= now + 12 * 60 * 60 * 1000;
    });
    return acc + within.length;
  }, 0);

  // SLA breaches: Awaiting Ticket or Booked AND created > 4h ago
  const slaBreaches = pnrs.filter((p) => {
    if (p.status !== 'Awaiting Ticket' && p.status !== 'Booked') return false;
    const created = new Date(p.createdAt).getTime();
    return now - created >= 4 * 60 * 60 * 1000;
  }).length;

  return [
    {
      label: 'OPEN WORK',
      value: String(openWork),
      delta: openWork > 50 ? 'HIGH' : openWork > 20 ? 'STEADY' : 'LOW',
      tone: openWork > 50 ? 'warn' : 'neutral',
      sub: 'queue items'
    },
    {
      label: 'REVENUE TODAY',
      value: fmtUsd(revenueToday),
      delta: revenueToday > 0 ? '+LIVE' : 'IDLE',
      tone: 'good',
      sub: 'vs yesterday'
    },
    {
      label: 'SEGMENTS',
      value: String(segmentsNext12h),
      delta: segmentsNext12h > 0 ? 'NEXT 12H' : 'CLEAR',
      tone: 'good',
      sub: 'departing next 12h'
    },
    {
      label: 'SLA BREACHES',
      value: String(slaBreaches),
      delta: slaBreaches === 0 ? 'OK' : 'review',
      tone: slaBreaches === 0 ? 'good' : 'danger',
      sub: '>4h untouched'
    }
  ];
}

export function KpiStack({ kpis }: { kpis: Kpi[] }) {
  return (
    <McCard accent={mcColors.teal500}>
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ Ops telemetry"
          meta={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: mcColors.good,
                fontFamily: 'var(--font-jetbrains)'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: mcColors.good,
                  boxShadow: '0 0 6px rgba(14,159,110,0.6)'
                }}
              />
              LIVE
            </span>
          }
        >
          Today at a glance
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              background: mcColors.neutral50,
              border: '1px solid ' + mcColors.neutral150,
              borderRadius: 12,
              borderLeft: '3px solid ' + toneBorder[k.tone]
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: mcColors.neutral400,
                  fontFamily: 'var(--font-jetbrains)'
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: fontDisplay,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: mcColors.navy800,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {k.value}
              </div>
              <div style={{ fontSize: 11, color: mcColors.neutral300, marginTop: 2 }}>
                {k.sub}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-jetbrains)',
                padding: '4px 8px',
                borderRadius: 6,
                background: toneBg[k.tone],
                color: toneFg[k.tone]
              }}
            >
              {k.delta}
            </div>
          </div>
        ))}
      </McCardContent>
    </McCard>
  );
}
