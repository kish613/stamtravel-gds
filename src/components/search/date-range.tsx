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
      {label ? <div className="text-[12px] text-muted-foreground mb-1">{label}</div> : null}
      <input
        readOnly
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        value={value ? value.toISOString().slice(0, 10) : ''}
        onChange={() => undefined}
        className="h-8 w-36 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {open && (
        <div className="absolute z-20 bg-popover border border-border p-2 rounded-md shadow-card-md">
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
