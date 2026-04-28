'use client';

import { Check, RotateCcw } from 'lucide-react';
import { mcColors } from './tokens';

export function LayoutEditToolbar({
  onDone,
  onReset
}: {
  onDone: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        gap: 8,
        padding: 8,
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        boxShadow: '0 12px 32px -12px rgba(10,37,64,0.32)',
        zIndex: 50
      }}
    >
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-semibold rounded-[10px] border bg-white text-slate-700 hover:bg-slate-50"
        style={{ borderColor: '#E2E8F0' }}
      >
        <RotateCcw className="w-[14px] h-[14px]" />
        Reset
      </button>
      <button
        type="button"
        onClick={onDone}
        className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-semibold rounded-[10px] text-white"
        style={{
          background: mcColors.gradientBrand,
          boxShadow: '0 10px 24px -10px rgba(37,165,180,.45)'
        }}
      >
        <Check className="w-[14px] h-[14px]" />
        Done
      </button>
    </div>
  );
}
