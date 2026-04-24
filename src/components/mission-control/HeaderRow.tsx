'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus } from 'lucide-react';
import { mcColors, fontDisplay } from './tokens';

export function HeaderRow() {
  const [now, setNow] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dateStamp = now
    ? now
        .toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        .toUpperCase()
    : '\u00A0';

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <span
            className="text-[11px] font-bold tracking-[0.16em]"
            style={{ color: mcColors.teal500 }}
          >
            OPERATIONS
          </span>
          <span
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: mcColors.neutral200 }}
          />
          <span
            className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 font-mono"
          >
            {dateStamp}
          </span>
        </div>
        <h1
          className="m-0 text-[32px] font-black tracking-[-0.025em]"
          style={{ color: mcColors.navy800, fontFamily: fontDisplay }}
        >
          Mission Control
        </h1>
        <p className="mt-1.5 mb-0 text-[14px] font-medium text-slate-500 max-w-[560px]">
          Live Sabre feed · active PNRs in motion · next SLA window in 38 minutes
        </p>
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={() => queryClient.invalidateQueries()}
          className="inline-flex items-center gap-2 h-9 px-4 text-[14px] font-semibold rounded-[10px] border bg-white text-slate-900 hover:bg-slate-50 transition-colors"
          style={{ borderColor: mcColors.neutral150 }}
        >
          <RefreshCw className="w-[14px] h-[14px]" />
          Resync Sabre
        </button>
        <Link
          href="/search/air"
          className="inline-flex items-center gap-2 h-9 px-4 text-[14px] font-semibold rounded-[10px] text-white"
          style={{
            background: mcColors.gradientBrand,
            boxShadow: '0 10px 24px -10px rgba(37,165,180,.45)'
          }}
        >
          <Plus className="w-[14px] h-[14px]" />
          New booking
        </Link>
      </div>
    </div>
  );
}
