'use client';

import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

export function TileChrome({
  children,
  editing,
  label
}: {
  children: ReactNode;
  editing: boolean;
  label: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        outline: editing ? '1px dashed rgba(37,165,180,0.55)' : 'none',
        outlineOffset: editing ? 2 : 0,
        borderRadius: 14,
        transition: 'outline-color 120ms ease'
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        {children}
      </div>
      {editing && (
        <button
          type="button"
          aria-label={`Drag ${label}`}
          data-mc-drag-handle
          className="mc-drag-handle"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid #E2E8F0',
            color: '#475569',
            cursor: 'grab',
            boxShadow: '0 1px 2px rgba(10,37,64,0.12)',
            zIndex: 5
          }}
        >
          <GripVertical size={14} />
        </button>
      )}
    </div>
  );
}
