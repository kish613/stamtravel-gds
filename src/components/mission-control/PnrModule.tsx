'use client';

import { useState } from 'react';
import type { PNR, Segment, Passenger } from '@/lib/types';
import { useAppStore } from '@/stores/app-store';
import pnrDetail from '@/fixtures/pnr-detail.json';
import { mcColors, fontDisplay } from './tokens';
import { TerminalSquare } from 'lucide-react';

type PnrDetailEnrichment = {
  meta: {
    pcc: string;
    fop: string;
    ttl: string;
    ttlTone: 'ok' | 'warn';
    fqtv: string;
    channel: string;
  };
  segmentsDetail: Array<{
    class: string;
    eqp: string;
    statusTone: 'confirmed' | 'warning' | 'danger' | 'neutral';
    statusCode: string;
  }>;
  fareRules: string;
  remarks: Array<{ code: string; text: string }>;
};

const DETAIL_MAP = pnrDetail as Record<string, PnrDetailEnrichment>;

function statusTone(status: string): 'confirmed' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Ticketed') return 'confirmed';
  if (status === 'Awaiting Ticket' || status === 'Booked') return 'warning';
  if (status === 'Void' || status === 'Canceled') return 'danger';
  return 'neutral';
}

function toneColor(tone: 'confirmed' | 'warning' | 'danger' | 'neutral') {
  switch (tone) {
    case 'confirmed': return { fg: '#087A52', bg: mcColors.goodBg, dot: mcColors.good };
    case 'warning': return { fg: '#9E6612', bg: mcColors.warnBg, dot: mcColors.warn };
    case 'danger': return { fg: '#A51F2D', bg: mcColors.dangerBg, dot: mcColors.danger };
    default: return { fg: mcColors.neutral500, bg: mcColors.neutral100, dot: mcColors.neutral400 };
  }
}

function Badge({
  tone,
  children,
  dot
}: {
  tone: 'confirmed' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
  dot?: boolean;
}) {
  const t = toneColor(tone);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        border: '1px solid ' + t.dot + '33',
        fontFamily: 'var(--font-jetbrains)'
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot }} />}
      {children}
    </span>
  );
}

function DataField({
  label,
  value,
  color,
  mono
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: mcColors.neutral300,
          textTransform: 'uppercase',
          marginBottom: 4
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: color || mcColors.navy800,
          fontFamily: mono ? 'var(--font-jetbrains)' : 'var(--font-inter)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SegmentRow({
  seg,
  detail,
  idx
}: {
  seg: Segment;
  detail?: PnrDetailEnrichment['segmentsDetail'][number];
  idx: number;
}) {
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
  const duration = `${Math.floor(seg.durationMinutes / 60)}h ${String(seg.durationMinutes % 60).padStart(2, '0')}m`;
  const cls = detail?.class || seg.cabin[0];
  const eqp = detail?.eqp || '—';
  const statusCode = detail?.statusCode || (seg.stops === 0 ? 'HK1' : 'HK' + (seg.stops + 1));
  const tone = detail?.statusTone || 'confirmed';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        background: mcColors.neutral25,
        border: '1px solid ' + mcColors.neutral150,
        borderRadius: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: mcColors.teal100,
            color: mcColors.navy800,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-jetbrains)'
          }}
        >
          {idx + 1}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains)',
              fontWeight: 700,
              fontSize: 13,
              color: mcColors.navy800
            }}
          >
            {seg.flightNumber}
          </span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 3,
              background: mcColors.navy800,
              color: '#F5C56B',
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              flexShrink: 0
            }}
          >
            {cls}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 11,
              color: mcColors.neutral400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {seg.carrier} · {fmtDate(seg.departure)} · {eqp}
          </span>
        </div>
        <Badge tone={tone} dot>
          {statusCode}
        </Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 32 }}>
        <div style={{ flexShrink: 0, minWidth: 52 }}>
          <div
            style={{
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 18,
              color: mcColors.navy800,
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}
          >
            {seg.from}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 11,
              color: mcColors.neutral400,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 4
            }}
          >
            {fmtTime(seg.departure)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 30,
            height: 1,
            background:
              'repeating-linear-gradient(to right, #94A3B8 0, #94A3B8 2px, transparent 2px, transparent 5px)',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10,
              color: mcColors.neutral300,
              background: mcColors.neutral25,
              padding: '0 6px',
              fontFamily: 'var(--font-jetbrains)',
              whiteSpace: 'nowrap'
            }}
          >
            {duration}
          </div>
        </div>
        <div style={{ flexShrink: 0, minWidth: 52, textAlign: 'right' }}>
          <div
            style={{
              fontFamily: fontDisplay,
              fontWeight: 800,
              fontSize: 18,
              color: mcColors.navy800,
              letterSpacing: '-0.02em',
              lineHeight: 1
            }}
          >
            {seg.to}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 11,
              color: mcColors.neutral400,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 4
            }}
          >
            {fmtTime(seg.arrival)}
          </div>
        </div>
      </div>
    </div>
  );
}

type TabKey = 'itinerary' | 'passengers' | 'fare rules' | 'remarks' | 'history';

function ActionButton({
  variant = 'secondary',
  onClick,
  children
}: {
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const variants = {
    primary: {
      background: mcColors.gradientBrand,
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: '0 10px 24px -10px rgba(37,165,180,.45)'
    },
    secondary: {
      background: '#fff',
      color: mcColors.navy800,
      border: '1px solid ' + mcColors.neutral150
    },
    ghost: {
      background: 'transparent',
      color: mcColors.navy800,
      border: '1px solid transparent'
    }
  } as const;
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--font-inter)',
        ...v
      }}
    >
      {children}
    </button>
  );
}

export function PnrModule({
  pnr,
  defaultOpen = false
}: {
  pnr: PNR;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<TabKey>('itinerary');
  const openTerminalWithCommand = useAppStore((s) => s.openTerminalWithCommand);

  const enrichment = DETAIL_MAP[pnr.locator];
  const meta = enrichment?.meta || {
    pcc: pnr.contact?.agencyIata || '901',
    fop: 'On file',
    ttl: pnr.status === 'Ticketed' ? 'ISSUED' : 'TAW PENDING',
    ttlTone: (pnr.status === 'Ticketed' ? 'ok' : 'warn') as 'ok' | 'warn',
    fqtv: '—',
    channel: pnr.segments[0]?.fareType === 'NDC' ? 'NDC' : 'ATPCO'
  };

  const tone = statusTone(pnr.status);
  const depDate = new Date(pnr.departureDate + 'T00:00:00.000Z')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  const createdDate = new Date(pnr.createdAt)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  const fareRules =
    enrichment?.fareRules ||
    `${pnr.segments[0]?.carrier?.toUpperCase() || 'CARRIER'} · ${pnr.route}\n  CABIN: ${pnr.segments[0]?.cabin || 'Economy'}\n  FARE TYPE: ${pnr.segments[0]?.fareType || 'ATPCO'}\n  TOTAL: ${pnr.pricing.currency} ${pnr.pricing.total}`;
  const remarks = enrichment?.remarks || [
    { code: 'OSI', text: `${pnr.segments[0]?.carrier?.toUpperCase() || ''} · CORP BOOKING` },
    { code: 'RMK', text: `AGENCY IATA ${pnr.contact?.agencyIata || '—'}` }
  ];

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid ' + (open ? mcColors.teal500 : mcColors.neutral150),
        boxShadow: open
          ? '0 0 0 3px rgba(37,165,180,0.15), 0 8px 20px -10px rgba(10,37,64,0.12)'
          : '0 1px 2px rgba(10,37,64,.04)',
        transition: 'all 180ms cubic-bezier(.22,1,.36,1)',
        overflow: 'hidden'
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 14px',
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px', minWidth: 0 }}>
          <div
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 6,
              background: mcColors.navy800,
              color: '#F5C56B',
              fontFamily: 'var(--font-jetbrains)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.04em'
            }}
          >
            {pnr.locator}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: mcColors.navy800,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {pnr.passengerName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: mcColors.neutral400,
                marginTop: 2,
                fontFamily: 'var(--font-jetbrains)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {pnr.route} · {pnr.segments.length}SEG · {depDate}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, marginLeft: 'auto' }}>
          <Badge tone={tone} dot>
            {pnr.status}
          </Badge>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: fontDisplay,
                fontWeight: 800,
                fontSize: 17,
                color: mcColors.navy800,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1
              }}
            >
              ${pnr.pricing.total.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 9,
                color: mcColors.neutral300,
                fontWeight: 700,
                letterSpacing: '0.14em',
                marginTop: 3
              }}
            >
              {pnr.pricing.currency} · {meta.channel.toUpperCase()}
            </div>
          </div>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mcColors.neutral400,
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 180ms'
            }}
            aria-hidden
          >
            ›
          </div>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #EEF2F7', background: mcColors.neutral50, padding: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px 16px',
              padding: '14px 16px',
              background: '#fff',
              border: '1px solid ' + mcColors.neutral150,
              borderRadius: 10,
              marginBottom: 14
            }}
          >
            <DataField label="Record Creation" value={createdDate} mono />
            <DataField label="PCC" value={meta.pcc} mono />
            <DataField label="Form of Payment" value={meta.fop} />
            <DataField
              label="TTL"
              value={meta.ttl}
              mono
              color={meta.ttlTone === 'warn' ? mcColors.warn : mcColors.navy800}
            />
            <DataField label="FQTV" value={meta.fqtv} mono />
            <DataField label="Booking Channel" value={meta.channel} />
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['itinerary', 'passengers', 'fare rules', 'remarks', 'history'] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  setTab(t);
                }}
                style={{
                  padding: '7px 12px',
                  border: '1px solid ' + (tab === t ? mcColors.navy800 : mcColors.neutral150),
                  borderRadius: 8,
                  background: tab === t ? mcColors.navy800 : '#fff',
                  color: tab === t ? '#fff' : mcColors.neutral500,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'itinerary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pnr.segments.map((s, i) => (
                <SegmentRow key={s.id} seg={s} detail={enrichment?.segmentsDetail?.[i]} idx={i} />
              ))}
            </div>
          )}

          {tab === 'passengers' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10
              }}
            >
              {pnr.passengers.map((p: Passenger, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: '#fff',
                    border: '1px solid ' + mcColors.neutral150,
                    borderRadius: 10
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: mcColors.navy800 }}>
                    {`${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()} ${p.title?.toUpperCase() || ''}`.trim()}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: mcColors.neutral400,
                      marginTop: 2,
                      fontFamily: 'var(--font-jetbrains)'
                    }}
                  >
                    ADT · PP {p.passportNumber} · {p.nationality}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'fare rules' && (
            <div
              style={{
                padding: 14,
                background: '#fff',
                border: '1px solid ' + mcColors.neutral150,
                borderRadius: 10,
                fontFamily: 'var(--font-jetbrains)',
                fontSize: 12,
                color: mcColors.neutral600,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap'
              }}
            >
              {fareRules}
            </div>
          )}

          {tab === 'remarks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {remarks.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    background: '#fff',
                    border: '1px solid ' + mcColors.neutral150,
                    borderRadius: 8,
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 12,
                    color: mcColors.neutral600,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'baseline'
                  }}
                >
                  <span style={{ color: mcColors.teal500, fontWeight: 700, minWidth: 40 }}>
                    {r.code}
                  </span>
                  <span style={{ flex: 1 }}>{r.text}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pnr.history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 120px 1fr',
                    gap: 12,
                    padding: '8px 12px',
                    background: '#fff',
                    border: '1px solid ' + mcColors.neutral150,
                    borderRadius: 8,
                    fontFamily: 'var(--font-jetbrains)',
                    fontSize: 12
                  }}
                >
                  <span style={{ color: mcColors.neutral400 }}>
                    {new Date(h.date).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).toUpperCase()}
                  </span>
                  <span style={{ color: mcColors.teal500, fontWeight: 700 }}>{h.actor}</span>
                  <span style={{ color: mcColors.neutral600 }}>{h.event}</span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid ' + mcColors.neutral150,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap'
            }}
          >
            <ActionButton
              variant="primary"
              onClick={() => openTerminalWithCommand('W#APK#FCASH#KP0')}
            >
              Issue Ticket
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => openTerminalWithCommand('W' + pnr.locator)}
            >
              Retrieve in Sabre
            </ActionButton>
            <ActionButton variant="secondary">Send Itinerary</ActionButton>
            <ActionButton
              variant="ghost"
              onClick={() => openTerminalWithCommand('W' + pnr.locator)}
            >
              <TerminalSquare className="w-[14px] h-[14px]" />
              Open *R in terminal
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
