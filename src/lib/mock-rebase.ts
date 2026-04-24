// Shifts all date fields inside the bundled PNR / queue fixtures onto a
// rolling window relative to "today", so the mock dashboard never serves
// values that are all in the past.
//
// The fixture's earliest absolute date is pinned to today's UTC midnight
// and every other timestamp is shifted by the same offset.  Pure and
// deterministic per-day.

import type { PNR, QueueBucket } from '@/lib/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const FIXTURE_ANCHOR_ISO = '2026-03-05T00:00:00.000Z';

function computeOffsetMs(): number {
  const anchor = new Date(FIXTURE_ANCHOR_ISO).getTime();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today.getTime() - anchor;
}

function shiftIso(iso: string, offsetMs: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  return new Date(t + offsetMs).toISOString();
}

function shiftDateKey(value: string, offsetMs: number): string {
  // "2026-03-05" style — treat as UTC midnight for shifting
  const t = new Date(value + 'T00:00:00.000Z').getTime();
  if (Number.isNaN(t)) return value;
  return new Date(t + offsetMs).toISOString().slice(0, 10);
}

export function rebasePnrs(raw: PNR[]): PNR[] {
  const offsetMs = computeOffsetMs();
  if (offsetMs === 0) return raw;

  return raw.map((pnr) => ({
    ...pnr,
    createdAt: shiftIso(pnr.createdAt, offsetMs),
    departureDate: shiftDateKey(pnr.departureDate, offsetMs),
    segments: pnr.segments.map((seg) => ({
      ...seg,
      departure: shiftIso(seg.departure, offsetMs),
      arrival: shiftIso(seg.arrival, offsetMs),
      deadlineAt: shiftIso(seg.deadlineAt, offsetMs)
    })),
    history: pnr.history.map((h) => ({
      ...h,
      date: shiftIso(h.date, offsetMs)
    })),
    unusedTicketCredits: pnr.unusedTicketCredits?.map((c) => ({
      ...c,
      issuedAt: shiftIso(c.issuedAt, offsetMs),
      expiresAt: shiftIso(c.expiresAt, offsetMs)
    }))
  }));
}

export function rebaseQueues(raw: QueueBucket[]): QueueBucket[] {
  const offsetMs = computeOffsetMs();
  if (offsetMs === 0) return raw;

  return raw.map((bucket) => ({
    ...bucket,
    items: bucket.items.map((item) => ({
      ...item,
      departureDate: shiftDateKey(item.departureDate, offsetMs),
      deadlineAt: shiftIso(item.deadlineAt, offsetMs)
    }))
  }));
}

export { MS_PER_DAY };
