// Pricing handlers.  Real pricing runs against ATPCO filed fares; we fake a
// plausible quote by multiplying a per-segment base by the number of
// passengers, then tacking on taxes that look realistic.

import { formatPriceQuote } from '../formatters';
import type { MockPriceQuote, TerminalSession } from '../types';

function priceFor(session: TerminalSession, opts: { store: boolean }): { quote: MockPriceQuote; segments: number; paxCount: number } | null {
  const pnr = session.currentPnr;
  if (!pnr) return null;
  const paxCount = Math.max(1, pnr.passengers.length);
  const segCount = pnr.segments.length;

  // Base fare correlates with class-of-service.
  const classMultiplier: Record<string, number> = {
    F: 3200, A: 3200, J: 2100, C: 2100, D: 2100, I: 1900,
    Y: 870, B: 910, H: 780, K: 720, M: 680,
    L: 610, V: 580, S: 550, N: 520, Q: 490, O: 460, G: 430,
  };
  const firstCls = pnr.segments[0]?.bookingClass ?? 'Y';
  const baseFare = (classMultiplier[firstCls] ?? 870) * segCount;

  const taxes = [
    { code: 'YQ', amount: 56.0 * segCount },
    { code: 'US', amount: 30.2 },
    { code: 'YC', amount: 5.0 },
    { code: 'XY', amount: 7.0 },
    { code: 'XA', amount: 5.0 },
    { code: 'AY', amount: 2.5 },
    { code: 'BR', amount: 36.0 },
    { code: 'XF', amount: 4.5 },
  ];
  const totalTax = taxes.reduce((acc, t) => acc + t.amount, 0);

  const fareBasisByClass: Record<string, string> = {
    Y: 'YLOWUS', B: 'BLWUS', H: 'HLOWUS', K: 'KLOWUS', M: 'MLOWUS',
    L: 'LOWUS', V: 'VLOWUS', S: 'SLOWUS', N: 'NLOWUS', Q: 'QLOWUS', O: 'OLOWUS', G: 'GLOWUS',
    F: 'F1', A: 'A1', J: 'J1', C: 'C1', D: 'D1', I: 'I1',
  };

  const fareCalc = pnr.segments
    .map((s) => `${s.from} ${s.carrier} ${s.to} ${(baseFare / segCount).toFixed(2)}${fareBasisByClass[firstCls] ?? 'YLOWUS'}`)
    .join(' ');
  const nuc = baseFare;

  const quote: MockPriceQuote = {
    paxType: 'ADT',
    baseFare,
    taxes,
    total: baseFare + totalTax,
    currency: 'USD',
    fareBasis: fareBasisByClass[firstCls] ?? 'YLOWUS',
    fareCalc: `${fareCalc} NUC${nuc.toFixed(2)}END ROE1.0`,
    lastPurchaseDate: '20JUN',
    restrictions: ['NONREF/PENALTY APPLIES', 'CHANGES PERMITTED WITH FEE'],
    nuc,
    roe: 1.0,
  };

  if (opts.store) {
    pnr.priceQuote = quote;
  }
  return { quote, segments: segCount, paxCount };
}

// WP -> price and store
export function handleWp(session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  const r = priceFor(session, { store: true });
  if (!r) return ['PRICING FAILED'];
  return formatPriceQuote(session.currentPnr, r.quote, { retained: true });
}

// WPNC -> price but do NOT store
export function handleWpnc(session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  const r = priceFor(session, { store: false });
  if (!r) return ['PRICING FAILED'];
  return formatPriceQuote(session.currentPnr, r.quote, { retained: false });
}

// WP* -> redisplay last stored
export function handleWpRedisplay(session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  if (!session.currentPnr.priceQuote) return ['NO PRICE QUOTE STORED - USE WP TO PRICE'];
  return formatPriceQuote(session.currentPnr, session.currentPnr.priceQuote, { retained: true });
}
