'use client';

import { useMemo, useState } from 'react';
import { useAirports } from '@/lib/query';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function AirportAutocomplete({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const { data } = useAirports();

  const filtered = useMemo(() => {
    if (!query) return data?.slice(0, 12) || [];
    const q = query.toLowerCase();
    return (
      data
        ?.filter(
          (item) =>
            item.code.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.city.toLowerCase().includes(q)
        )
        .slice(0, 12) || []
    );
  }, [query, data]);

  return (
    <div className="relative">
      <label className="mb-1 block text-[12px] text-[#334155]">{label}</label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <input
        type="hidden"
        value={value}
        readOnly
        onChange={() => undefined}
        aria-hidden
      />
      {open && (
        <Card className="absolute left-0 right-0 z-20 max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-[#64748B]">No airport match.</div>
          ) : (
            <ul>
              {filtered.map((a) => (
                <li key={a.code}>
                  <button
                    type="button"
                    className="w-full px-2 py-1 text-left text-[12px] hover:bg-[#E2E8F0]"
                    onMouseDown={() => {
                      setQuery(`${a.code} · ${a.city}`);
                      onChange(a.code);
                      setOpen(false);
                    }}
                  >
                    <div className="font-medium">{a.code} · {a.city}</div>
                    <div className="text-[11px] text-[#64748B]">{a.name}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
