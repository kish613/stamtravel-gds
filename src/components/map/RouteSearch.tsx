'use client';

import { Input } from '@/components/ui/input';
import { Eyebrow } from '@/components/ui/section-eyebrow';

export type RouteFilterMode = 'today' | 'upcoming' | 'locator' | 'passenger';

interface RouteSearchProps {
  mode: RouteFilterMode;
  onModeChange: (mode: RouteFilterMode) => void;
  locator: string;
  onLocatorChange: (v: string) => void;
  passenger: string;
  onPassengerChange: (v: string) => void;
  total: number;
  filtered: number;
}

const TABS: { value: RouteFilterMode; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'All upcoming' },
  { value: 'locator', label: 'By locator' },
  { value: 'passenger', label: 'By passenger' }
];

export function RouteSearch({
  mode,
  onModeChange,
  locator,
  onLocatorChange,
  passenger,
  onPassengerChange,
  total,
  filtered
}: RouteSearchProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 bg-muted rounded-[10px] p-1 border border-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onModeChange(t.value)}
              className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                mode === t.value
                  ? 'bg-white text-[var(--brand-navy-800)] shadow-card'
                  : 'text-muted-foreground hover:text-[var(--brand-navy-800)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          {filtered} of {total}
        </span>
      </div>

      {mode === 'locator' && (
        <div>
          <Eyebrow as="div" className="mb-1">
            Locator
          </Eyebrow>
          <Input
            value={locator}
            onChange={(e) => onLocatorChange(e.target.value.toUpperCase())}
            placeholder="Search locator (e.g. ABCD12)"
            className="w-64"
          />
        </div>
      )}

      {mode === 'passenger' && (
        <div>
          <Eyebrow as="div" className="mb-1">
            Passenger surname
          </Eyebrow>
          <Input
            value={passenger}
            onChange={(e) => onPassengerChange(e.target.value)}
            placeholder="Search passenger"
            className="w-64"
          />
        </div>
      )}
    </div>
  );
}
