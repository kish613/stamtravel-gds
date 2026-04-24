'use client';

import { ReactNode, CSSProperties } from 'react';

export function McCard({
  children,
  accent,
  style,
  className
}: {
  children: ReactNode;
  accent?: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid #E8EDF3',
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(10,37,64,0.04), 0 0 0 1px rgba(255,255,255,0.6) inset',
        overflow: 'hidden',
        ...style
      }}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: accent,
            opacity: 0.9
          }}
        />
      )}
      {children}
    </div>
  );
}

export function McCardHeader({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '16px 18px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap'
      }}
    >
      {children}
    </div>
  );
}

export function McCardTitle({
  eyebrow,
  children,
  meta
}: {
  eyebrow?: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        width: '100%',
        flexWrap: 'wrap'
      }}
    >
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: '#94A3B8',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-jetbrains)',
              marginBottom: 4
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#0A2540',
            letterSpacing: '-0.01em'
          }}
        >
          {children}
        </div>
      </div>
      {meta && <div>{meta}</div>}
    </div>
  );
}

export function McCardContent({
  children,
  style
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ padding: '6px 18px 18px', ...style }}>{children}</div>;
}
