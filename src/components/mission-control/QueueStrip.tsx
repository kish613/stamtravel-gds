'use client';

import { useMemo, useState } from 'react';
import type { QueueBucket } from '@/lib/types';
import { useAppStore } from '@/stores/app-store';
import { McCard, McCardContent, McCardHeader, McCardTitle } from './Card';
import { Sparkline } from './Sparkline';
import { SLARing, slaColor } from './SLARing';
import { mcColors, fontDisplay } from './tokens';

interface QueueMeta {
  code: string;
  label: string;
  count: number;
  oldest: string;
  sla: number;
  owner: string;
  trend: number[];
}

const QUEUE_LABELS: Record<string, string> = {
  Q0: 'Ticketing',
  Q1: 'Hold',
  Q2: 'Waitlist',
  Q3: 'Exchange',
  Q4: 'Refund',
  Q5: 'Misc',
  Q6: 'Seat',
  Q7: 'Schedule',
  Q8: 'Group',
  Q9: 'Manual',
  Q10: 'Irrops',
  Q11: 'Corp',
  Q12: 'Leisure',
  Q13: 'Agency',
  Q14: 'NDC',
  Q15: 'Card Fail',
  Q16: 'Fraud',
  Q17: 'Revalid.',
  Q18: 'Endorse',
  Q19: 'Supplier',
  Q20: 'Audit'
};

const OWNERS = ['JE', 'MR', 'KP'];

function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveMeta(bucket: QueueBucket, now: number): QueueMeta {
  const code = bucket.queueCode;
  const count = bucket.items.length;
  const rand = seededRand(code);
  const ownerIdx = Math.floor(rand() * OWNERS.length);
  const trend: number[] = [];
  let v = Math.max(0, count - Math.floor(rand() * 4));
  for (let i = 0; i < 6; i++) {
    v = Math.max(0, v + Math.floor(rand() * 3) - 1);
    trend.push(v);
  }
  trend.push(count);

  // oldest derived from items' deadlineAt (if any); otherwise mock
  let oldestMs = 0;
  for (const item of bucket.items) {
    const t = new Date(item.deadlineAt).getTime();
    if (Number.isFinite(t)) {
      const age = Math.max(0, now - t);
      if (age > oldestMs) oldestMs = age;
    }
  }
  if (!oldestMs && count > 0) {
    oldestMs = count * 8 * 60 * 1000; // fallback: 8m per item
  }
  const hrs = Math.floor(oldestMs / (60 * 60 * 1000));
  const mins = Math.floor((oldestMs % (60 * 60 * 1000)) / (60 * 1000));
  const oldest = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  const sla = Math.max(30, Math.min(99, 100 - count * 2));

  return {
    code,
    label: QUEUE_LABELS[code] || code,
    count,
    oldest,
    sla,
    owner: OWNERS[ownerIdx],
    trend
  };
}

export function QueueStrip({ queues, now }: { queues: QueueBucket[]; now: number }) {
  const metas = useMemo(() => queues.map((q) => deriveMeta(q, now)), [queues, now]);
  const openTerminalWithCommand = useAppStore((s) => s.openTerminalWithCommand);

  const initialActive = useMemo(() => {
    const breach = metas.find((m) => m.sla < 65);
    if (breach) return breach.code;
    return metas.find((m) => m.code === 'Q7')?.code || metas[0]?.code || 'Q0';
  }, [metas]);
  const [activeCode, setActiveCode] = useState(initialActive);

  const active = metas.find((m) => m.code === activeCode) || metas[0];
  if (!active) return null;

  const totalItems = metas.reduce((a, q) => a + q.count, 0);
  const breachCount = metas.filter((q) => q.sla < 65).length;
  const maxCount = Math.max(1, ...metas.map((q) => q.count));

  return (
    <McCard accent={mcColors.teal500} className="mc-queuestrip">
      <McCardHeader>
        <McCardTitle
          eyebrow="◦ Sabre queues"
          meta={
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 10,
                  color: mcColors.neutral400,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  paddingRight: 10,
                  borderRight: '1px solid ' + mcColors.neutral150
                }}
              >
                <span>
                  <span style={{ color: mcColors.navy800, fontWeight: 800 }}>{totalItems}</span> TOTAL
                </span>
                <span>
                  <span style={{ color: mcColors.danger, fontWeight: 800 }}>{breachCount}</span> BREACH
                </span>
              </div>
              <button
                onClick={() => openTerminalWithCommand('QC/')}
                style={{
                  height: 28,
                  padding: '0 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid ' + mcColors.neutral150,
                  color: mcColors.navy800,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)'
                }}
              >
                QC/ in terminal
              </button>
            </div>
          }
        >
          Workload by queue
        </McCardTitle>
      </McCardHeader>
      <McCardContent style={{ padding: 0 }}>
        <div className="mc-qs-inner">
          {/* Focus panel */}
          <div
            style={{
              padding: '18px 20px',
              background: mcColors.gradientTerminal,
              color: '#F5C56B',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)'
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    color: 'rgba(245,197,107,0.55)',
                    fontWeight: 700
                  }}
                >
                  FOCUS QUEUE
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#F5C56B',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {active.code}
                  </span>
                  <span
                    style={{
                      fontFamily: fontDisplay,
                      fontSize: 15,
                      color: '#fff',
                      fontWeight: 600
                    }}
                  >
                    {active.label}
                  </span>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <SLARing sla={active.sla} size={56} />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    lineHeight: 1
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: 13,
                      fontWeight: 800,
                      color: slaColor(active.sla)
                    }}
                  >
                    {active.sla}
                  </span>
                  <span
                    style={{
                      fontSize: 7,
                      color: 'rgba(255,255,255,0.5)',
                      letterSpacing: '0.12em',
                      marginTop: 2
                    }}
                  >
                    SLA
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid rgba(245,197,107,0.15)'
              }}
            >
              {[
                { k: 'OPEN', v: active.count, big: true },
                { k: 'OLDEST', v: active.oldest + 'h', big: false },
                { k: 'OWNER', v: active.owner, big: false }
              ].map(({ k, v, big }) => (
                <div key={k}>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'rgba(245,197,107,0.5)',
                      fontWeight: 700
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-jetbrains)',
                      fontSize: big ? 22 : 15,
                      fontWeight: 800,
                      color: '#fff',
                      marginTop: 4,
                      letterSpacing: '0.02em',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                gap: 6,
                marginTop: 'auto'
              }}
            >
              <button
                onClick={() =>
                  openTerminalWithCommand('QP/' + active.code.replace(/^Q/i, ''))
                }
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(245,197,107,0.12)',
                  color: '#F5C56B',
                  border: '1px solid rgba(245,197,107,0.3)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em'
                }}
              >
                QP/{active.code.replace(/^Q/i, '')}
              </button>
              <button
                onClick={() =>
                  openTerminalWithCommand('Q/' + active.code.replace(/^Q/i, ''))
                }
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                Work next
              </button>
            </div>
          </div>

          {/* Queue rail */}
          <div
            className="mc-qs-rail"
            style={{
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gridAutoRows: 'minmax(82px, auto)',
              gap: 8,
              alignContent: 'start',
              background: mcColors.neutral25,
              borderLeft: '1px solid ' + mcColors.neutral150,
              maxHeight: 360,
              overflowY: 'auto'
            }}
          >
            {metas.map((q) => {
              const isActive = q.code === activeCode;
              const breach = q.sla < 65;
              const ratio = q.count / maxCount;
              return (
                <button
                  key={q.code}
                  onClick={() => setActiveCode(q.code)}
                  style={{
                    position: 'relative',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: isActive ? mcColors.navy800 : '#fff',
                    border: '1px solid ' + (isActive ? mcColors.navy800 : mcColors.neutral150),
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 180ms',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    overflow: 'hidden',
                    color: isActive ? '#fff' : mcColors.navy800,
                    fontFamily: 'inherit'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: 2,
                      width: ratio * 100 + '%',
                      background: slaColor(q.sla),
                      opacity: isActive ? 1 : 0.55
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-jetbrains)',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: isActive ? '#F5C56B' : mcColors.neutral400
                      }}
                    >
                      {q.code}
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: slaColor(q.sla),
                        boxShadow: breach ? `0 0 6px ${slaColor(q.sla)}` : 'none',
                        animation: breach ? 'mcPulse 1.4s ease-in-out infinite' : 'none'
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fontDisplay,
                        fontSize: 22,
                        fontWeight: 800,
                        letterSpacing: '-0.025em',
                        lineHeight: 1,
                        color: isActive ? '#fff' : mcColors.navy800,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {q.count}
                    </span>
                    <div style={{ opacity: 0.9 }}>
                      <Sparkline
                        data={q.trend}
                        color={isActive ? '#F5C56B' : slaColor(q.sla)}
                        width={56}
                        height={18}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: isActive ? 'rgba(255,255,255,0.75)' : mcColors.neutral500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {q.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-jetbrains)',
                        fontSize: 9,
                        fontWeight: 700,
                        color: isActive ? 'rgba(245,197,107,0.8)' : mcColors.neutral300,
                        letterSpacing: '0.04em'
                      }}
                    >
                      {q.oldest}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </McCardContent>
    </McCard>
  );
}
