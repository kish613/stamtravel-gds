'use client';

import { useEffect, useState } from 'react';
import type { FidsRow } from '@/lib/types';
import { FlapText } from './SplitFlap';
import { mcColors } from './tokens';

export type FidsMode = 'DEPARTURES' | 'ARRIVALS' | 'MY PNRS';

const STATUS_COLOR: Record<string, string> = {
  BOARDING: '#5EE1A3',
  'ON TIME': '#F5C56B',
  DELAYED: '#FF8A3D',
  DEPARTED: '#7CD3DB',
  ARRIVED: '#7CD3DB',
  SCHED: '#F5C56B',
  'GATE CHG': '#FF8A3D',
  CANCELLED: '#FF5469',
  'CHECK-IN': '#F5C56B'
};

function FIDSRow({ flight, idx }: { flight: FidsRow; idx: number }) {
  const color = STATUS_COLOR[flight.status] || '#F5C56B';
  const animate = flight.status === 'BOARDING' || flight.status === 'DELAYED';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '62px 82px 1fr 64px 52px 118px',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        borderBottom: '1px solid rgba(255, 180, 60, 0.08)',
        background: idx % 2 === 0 ? 'rgba(255, 180, 60, 0.015)' : 'transparent',
        fontFamily: 'var(--font-jetbrains)',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '0.02em'
      }}
    >
      <div style={{ color: '#F5C56B', fontWeight: 600 }}>
        <FlapText text={flight.time} delayBase={idx * 40} />
      </div>
      <div style={{ color: '#fff', fontWeight: 500 }}>
        <FlapText text={flight.flightNo} delayBase={idx * 40 + 80} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 600 }}>
          <FlapText text={flight.city} delayBase={idx * 40 + 120} color="#fff" />
        </div>
        <div
          style={{
            color: 'rgba(245, 197, 107, 0.55)',
            fontSize: 11,
            marginTop: 2,
            fontFamily: 'var(--font-inter)',
            fontWeight: 500,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {flight.pax} · {flight.locator}
        </div>
      </div>
      <div style={{ color: mcColors.teal500, fontWeight: 700, textAlign: 'center' }}>
        <FlapText text={flight.gate} delayBase={idx * 40 + 200} color={mcColors.teal500} />
      </div>
      <div style={{ color: 'rgba(245, 197, 107, 0.7)', textAlign: 'center' }}>{flight.term}</div>
      <div
        style={{
          color,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: animate ? 'mcPulse 1.2s ease-in-out infinite' : 'none'
          }}
        />
        <FlapText text={flight.status} delayBase={idx * 40 + 280} color={color} />
      </div>
    </div>
  );
}

export function FIDSBoard({
  departures,
  arrivals,
  myPnrs,
  mode,
  onModeChange,
  loading
}: {
  departures: FidsRow[];
  arrivals: FidsRow[];
  myPnrs: FidsRow[];
  mode: FidsMode;
  onModeChange: (mode: FidsMode) => void;
  loading?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const flights =
    mode === 'ARRIVALS' ? arrivals : mode === 'MY PNRS' ? myPnrs : departures;

  const hh = now ? String(now.getHours()).padStart(2, '0') : '--';
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--';
  const ss = now ? String(now.getSeconds()).padStart(2, '0') : '--';
  const colonOn = now ? now.getMilliseconds() > 500 : true;

  return (
    <div
      style={{
        background: mcColors.gradientFids,
        borderRadius: 20,
        border: '1px solid rgba(245, 197, 107, 0.18)',
        overflow: 'hidden',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        fontFamily: 'var(--font-jetbrains)',
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
          zIndex: 1
        }}
      />
      {/* Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(245, 197, 107, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: 'linear-gradient(180deg, rgba(10,37,64,0.35) 0%, transparent 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(245, 197, 107, 0.1)',
              border: '1px solid rgba(245, 197, 107, 0.3)'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FF5469',
                boxShadow: '0 0 10px #FF5469',
                animation: 'mcPulse 1.8s ease-in-out infinite'
              }}
            />
            <span
              style={{
                color: '#F5C56B',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em'
              }}
            >
              LIVE · SABRE FEED
            </span>
          </div>
          <div
            style={{
              color: 'rgba(245, 197, 107, 0.55)',
              fontSize: 11,
              letterSpacing: '0.18em',
              fontWeight: 600
            }}
          >
            GDSIMPLE · FLIGHT INFORMATION DISPLAY
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 3,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(245, 197, 107, 0.18)'
          }}
        >
          {(['DEPARTURES', 'ARRIVALS', 'MY PNRS'] as FidsMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                fontFamily: 'var(--font-jetbrains)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                background: mode === m ? '#F5C56B' : 'transparent',
                color: mode === m ? '#0A0D14' : 'rgba(245,197,107,0.7)',
                transition: 'all 180ms'
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--font-jetbrains)' }}>
          <span
            style={{
              color: 'rgba(245,197,107,0.55)',
              fontSize: 10,
              letterSpacing: '0.18em',
              fontWeight: 700
            }}
          >
            LOCAL
          </span>
          <span
            style={{
              color: '#F5C56B',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {hh}
            <span style={{ opacity: colonOn ? 1 : 0.3, transition: 'opacity 200ms' }}>:</span>
            {mm}
            <span style={{ color: 'rgba(245,197,107,0.5)', fontSize: 14 }}>:{ss}</span>
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: '62px 82px 1fr 64px 52px 118px',
          gap: 12,
          padding: '9px 16px',
          background: 'rgba(245, 197, 107, 0.06)',
          borderBottom: '1px solid rgba(245, 197, 107, 0.2)',
          color: 'rgba(245, 197, 107, 0.55)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase'
        }}
      >
        <div>TIME</div>
        <div>FLIGHT</div>
        <div>{mode === 'ARRIVALS' ? 'FROM · PAX' : 'TO · PAX'}</div>
        <div style={{ textAlign: 'center' }}>GATE</div>
        <div style={{ textAlign: 'center' }}>TERM</div>
        <div style={{ textAlign: 'right' }}>STATUS</div>
      </div>

      {/* Rows */}
      <div style={{ position: 'relative', zIndex: 2, minHeight: 120 }}>
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(245,197,107,0.55)', fontSize: 11, letterSpacing: '0.15em' }}>
            LOADING FEED…
          </div>
        ) : flights.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(245,197,107,0.55)', fontSize: 11, letterSpacing: '0.15em' }}>
            NO FLIGHTS IN VIEW
          </div>
        ) : (
          flights.map((f, i) => <FIDSRow key={f.flightNo + i} flight={f} idx={i} />)
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '10px 18px',
          borderTop: '1px solid rgba(245, 197, 107, 0.15)',
          background: 'rgba(0,0,0,0.4)',
          fontSize: 10,
          letterSpacing: '0.15em',
          fontWeight: 600,
          color: 'rgba(245,197,107,0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div>SHOWING {flights.length} FLIGHTS · NEXT REFRESH 00:12</div>
        <div>SRC: SABRE GDS · AGENT 901-JE</div>
      </div>
    </div>
  );
}
