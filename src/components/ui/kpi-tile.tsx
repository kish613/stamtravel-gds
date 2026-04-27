import * as React from 'react';
import { cn } from '@/lib/utils';

export type KpiTone = 'good' | 'warn' | 'danger' | 'info' | 'brand' | 'neutral';

const toneRail: Record<KpiTone, string> = {
  good: 'var(--color-status-good)',
  warn: 'var(--color-status-warn)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  brand: 'var(--brand-teal-500)',
  neutral: 'var(--brand-teal-500)'
};

const toneDeltaBg: Record<KpiTone, string> = {
  good: '#E7F7EF',
  warn: '#FDF5E6',
  danger: '#FCECEE',
  info: '#E6F1FA',
  brand: 'var(--brand-teal-100)',
  neutral: '#EEF2F7'
};

const toneDeltaFg: Record<KpiTone, string> = {
  good: '#087A52',
  warn: '#9E6612',
  danger: '#A51F2D',
  info: '#1B5A8E',
  brand: 'var(--brand-navy-800)',
  neutral: 'var(--color-muted-foreground)'
};

interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: KpiTone;
  className?: string;
}

export const KpiTile = ({
  label,
  value,
  delta,
  sub,
  tone = 'neutral',
  className
}: KpiTileProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 rounded-[12px] border bg-[#F6F8FB] px-3.5 py-3',
      className
    )}
    style={{
      borderColor: '#E2E8F0',
      borderLeft: `3px solid ${toneRail[tone]}`
    }}
  >
    <div className="min-w-0">
      <div
        className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: '#64748B' }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-display font-extrabold tabular-nums"
        style={{
          fontSize: 22,
          letterSpacing: '-0.02em',
          color: 'var(--brand-navy-800)'
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px]" style={{ color: '#94A3B8' }}>
          {sub}
        </div>
      )}
    </div>
    {delta && (
      <div
        className="rounded-[6px] px-2 py-1 font-mono text-[11px] font-bold"
        style={{ background: toneDeltaBg[tone], color: toneDeltaFg[tone] }}
      >
        {delta}
      </div>
    )}
  </div>
);
