'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface Props {
  value?: Date | null;
  onChange: (date?: Date) => void;
  label?: string;
}

export function DateRangePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {label ? <div className="text-[12px] text-[#334155] mb-1">{label}</div> : null}
      <input
        readOnly
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        value={value ? value.toISOString().slice(0, 10) : ''}
        onChange={() => undefined}
        className="h-8 w-36 rounded border border-[#CBD5E1] px-2 text-[13px]"
      />
      {open && (
        <div className="absolute z-20 bg-white border border-[#CBD5E1] p-2 rounded shadow">
          <DayPicker
            mode="single"
            selected={value || undefined}
            onSelect={(selected: Date | undefined) => {
              if (!selected) return;
              onChange(selected);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
