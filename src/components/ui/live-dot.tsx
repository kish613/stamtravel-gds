import * as React from 'react';
import { cn } from '@/lib/utils';

export type LiveDotTone = 'good' | 'warn' | 'danger' | 'info' | 'brand';

const toneColor: Record<LiveDotTone, string> = {
  good: 'var(--color-status-good)',
  warn: 'var(--color-status-warn)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  brand: 'var(--brand-teal-500)'
};

interface LiveDotProps {
  tone?: LiveDotTone;
  size?: number;
  pulse?: boolean;
  className?: string;
  label?: React.ReactNode;
}

export const LiveDot = ({
  tone = 'good',
  size = 6,
  pulse = true,
  className,
  label
}: LiveDotProps) => {
  const color = toneColor[tone];
  const dot = (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {pulse && (
        <span
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background: color,
            animation: 'gdsPulse 1.4s ease-in-out infinite'
          }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{ width: size, height: size, background: color }}
      />
    </span>
  );

  if (!label) return dot;
  return (
    <span className="inline-flex items-center gap-1.5">
      {dot}
      <span
        className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color }}
      >
        {label}
      </span>
    </span>
  );
};
