'use client';

import { mcColors } from './tokens';

function slaColor(sla: number): string {
  if (sla >= 85) return mcColors.good;
  if (sla >= 65) return mcColors.warn;
  return mcColors.danger;
}

export function SLARing({ sla, size = 56 }: { sla: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, sla / 100));
  const color = slaColor(sla);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 300ms' }}
      />
    </svg>
  );
}

export { slaColor };
