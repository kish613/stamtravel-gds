// Pure functions that turn simulator state into the cryptic text output a
// real Sabre terminal produces.  Every function returns an array of lines —
// the terminal overlay writes each line individually so output behaves like
// the streaming, line-by-line host responses agents are used to.

import type {
  MockPNR,
  AvailabilityResult,
  MockPriceQuote,
  ActiveQueue,
} from './types';

function padR(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
}

function padL(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : ' '.repeat(w - s.length) + s;
}

// -----------------------------------------------------------------------------
// PNR display (*R, *I, *N, *P, *H, *PQ, *T)
// -----------------------------------------------------------------------------

type PnrMode = 'R' | 'A' | 'I' | 'N' | 'P' | 'H' | 'PQ' | 'T' | 'B';

function paxStatusLine(pnr: MockPNR): string[] {
  // Real Sabre shows "1.2SMITH/JOHN MR/JANE MRS" meaning name line 1, 2 names.
  // We collapse passengers sharing a surname into one line when adjacent.
  const groups: { surname: string; names: string[] }[] = [];
  pnr.passengers.forEach((p) => {
    const last = groups[groups.length - 1];
    if (last && last.surname === p.lastName) {
      last.names.push(`${p.firstName} ${p.title}`);
    } else {
      groups.push({ surname: p.lastName, names: [`${p.firstName} ${p.title}`] });
    }
  });
  return groups.map((g, i) => `${i + 1}.${g.names.length}${g.surname}/${g.names.join('/')}`);
}

function segmentLines(pnr: MockPNR): string[] {
  return pnr.segments.map((s, i) => {
    const lineNo = String(i + 1).padStart(1, ' ');
    const flight = `${s.carrier}${String(s.flightNumber).padStart(4)}`;
    const cls = s.bookingClass;
    const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date().getDay()]; // approximate
    const route = `${s.from}${s.to}`;
    const status = `${s.status}${s.paxCount}`;
    const arrMarker = s.arrDayOffset > 0 ? ` +${s.arrDayOffset}` : '';
    return `${lineNo} ${flight}${cls} ${s.depDate} ${dayOfWeek} ${route} ${status}  ${s.depTime}  ${s.arrTime}${arrMarker}  /E`;
  });
}

function ticketTimeLimitLines(pnr: MockPNR): string[] {
  if (!pnr.ticketTimeLimit) return [];
  return ['TKT/TIME LIMIT', `  1.${pnr.ticketTimeLimit}`];
}

function phoneLines(pnr: MockPNR): string[] {
  if (pnr.phones.length === 0) return [];
  const lines = ['PHONES'];
  pnr.phones.forEach((p, i) => {
    lines.push(`  ${i + 1}.${p.city}${p.number}-${p.type}`);
  });
  return lines;
}

function ssrLines(pnr: MockPNR): string[] {
  if (pnr.ssrs.length === 0) return [];
  const lines = ['GENERAL FACTS'];
  pnr.ssrs.forEach((s, i) => {
    lines.push(`  ${i + 1}.SSR ${s.code} ${s.airline} ${s.text}-${s.paxRef}`);
  });
  return lines;
}

function remarkLines(pnr: MockPNR): string[] {
  if (pnr.remarks.length === 0) return [];
  const lines = ['REMARKS'];
  pnr.remarks.forEach((r, i) => lines.push(`  ${i + 1}.${r.text}`));
  return lines;
}

function footerLines(pnr: MockPNR): string[] {
  return [
    `RECEIVED FROM - ${pnr.receivedFrom}`,
    `${pnr.pcc}.${pnr.pcc}*${pnr.agentSign} ${pnr.createdAt}  ${pnr.locator}`,
  ];
}

export function formatPnr(pnr: MockPNR, mode: PnrMode): string[] {
  const out: string[] = [];
  if (mode === 'R' || mode === 'A' || mode === 'N') out.push(...paxStatusLine(pnr));
  if (mode === 'R' || mode === 'A' || mode === 'I') out.push(...segmentLines(pnr));
  if (mode === 'R' || mode === 'A' || mode === 'T') out.push(...ticketTimeLimitLines(pnr));
  if (mode === 'R' || mode === 'A' || mode === 'P') out.push(...phoneLines(pnr));
  if (mode === 'R' || mode === 'A') out.push(...ssrLines(pnr));
  if (mode === 'R' || mode === 'A') out.push(...remarkLines(pnr));

  if (mode === 'H') {
    out.push('PNR HISTORY');
    pnr.history.forEach((h, i) => {
      out.push(`  ${i + 1}.${h.timestamp}  ${h.event}  ${h.actor}`);
    });
  }

  if (mode === 'PQ') {
    if (!pnr.priceQuote) {
      out.push('NO PRICE QUOTE STORED');
    } else {
      out.push(...formatPriceQuote(pnr, pnr.priceQuote, { retained: true }));
    }
  }

  if (mode === 'B') {
    out.push('RESERVED SEATS');
    pnr.segments.forEach((s, i) => {
      out.push(`  SEG ${i + 1} ${s.carrier}${s.flightNumber} - NO SEATS SELECTED`);
    });
  }

  if (mode === 'R' || mode === 'A') out.push(...footerLines(pnr));
  return out;
}

// -----------------------------------------------------------------------------
// Availability grid (1DDMMMORGDES)
// -----------------------------------------------------------------------------

export function formatAvailability(result: AvailabilityResult): string[] {
  const out: string[] = [];
  out.push(`${result.date} ${result.weekday}   ${result.origin}/${result.destination}`);
  out.push('');
  for (const line of result.lines) {
    const firstRow = line.classes.slice(0, 12);
    const secondRow = line.classes.slice(12);

    const firstRowStr = firstRow
      .map((c) => `${c.code}${c.seats === 'L' ? 'L' : c.seats}`)
      .join(' ');
    const route = `${line.from}${line.to}`;
    const dayMarker = line.arrDayOffset > 0 ? ` +${line.arrDayOffset}` : '    ';
    const head =
      `${padL(String(line.lineNumber), 2)}  ${padR(line.carrier, 2)}${padL(String(line.flightNumber), 4)}  ` +
      `${firstRowStr}  ${route}  ${line.depTime}  ${line.arrTime}${dayMarker}  ${line.equipment}  ${line.elapsed}`;
    out.push(head);

    const secondRowStr = secondRow
      .map((c) => `${c.code}${c.seats === 'L' ? 'L' : c.seats}`)
      .join(' ');
    // Indent the second row roughly under the class columns.
    out.push(`               ${secondRowStr}`);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Queue count + queue entry
// -----------------------------------------------------------------------------

export function formatQueueCount(
  pcc: string,
  officeDate: string,
  rows: { queue: string; items: number; name: string }[]
): string[] {
  const out: string[] = [];
  out.push(`QUEUE  PCC-${pcc}   DATE-${officeDate}`);
  out.push('  QUEUE  ITEMS  NAME');
  let total = 0;
  for (const r of rows) {
    total += r.items;
    out.push(`   ${padL(r.queue, 3)}    ${padL(String(r.items), 3)}    ${r.name}`);
  }
  out.push(`TOTAL      ${padL(String(total), 3)}`);
  return out;
}

export function formatQueueEntry(q: ActiveQueue, pcc: string): string[] {
  const out: string[] = [];
  out.push(`QUEUE ${q.code} - ${q.name}    PCC-${pcc}     ${q.entries.length} ITEMS`);
  return out;
}

// -----------------------------------------------------------------------------
// Pricing (WP / WPNC / WP*)
// -----------------------------------------------------------------------------

export function formatPriceQuote(
  pnr: MockPNR,
  q: MockPriceQuote,
  opts: { retained?: boolean } = {}
): string[] {
  const out: string[] = [];
  out.push(opts.retained ? 'PRICE QUOTE RECORD - RETAINED' : 'PRICE QUOTE - NOT STORED');
  out.push('BASE FARE                 TAXES/FEES/CHARGES         TOTAL');
  const totalTax = q.taxes.reduce((acc, t) => acc + t.amount, 0);
  out.push(
    `  ${q.currency}   ${q.baseFare.toFixed(2).padStart(8)}              ${totalTax.toFixed(2).padStart(6)}XT           ` +
      `${q.currency}  ${q.total.toFixed(2).padStart(8)}${q.paxType}`
  );

  // XT breakdown — wrap to ~4 taxes per line.
  let xtLine = '    XT';
  q.taxes.forEach((t, i) => {
    xtLine += `   ${t.amount.toFixed(2).padStart(5)}${t.code}`;
    if ((i + 1) % 4 === 0 && i !== q.taxes.length - 1) {
      out.push(xtLine);
      xtLine = '        ';
    }
  });
  if (xtLine.trim() !== 'XT') out.push(xtLine);

  out.push(`${q.paxType}-01  ${q.fareBasis}`);
  out.push(`  ${q.fareCalc}`);
  out.push(`FARE BASIS     ${q.fareBasis}`);
  out.push('NOT VALID BEFORE/AFTER');
  out.push(`LAST DAY TO PURCHASE ${q.lastPurchaseDate}`);
  for (const r of q.restrictions) out.push(r);

  // Touch `pnr` so the field is used by the summary footer.
  out.push(`ITINERARY - ${pnr.segments.length} SEGMENT(S)`);
  return out;
}

// -----------------------------------------------------------------------------
// Ticketing
// -----------------------------------------------------------------------------

export function formatTicketIssued(pnr: MockPNR, ticketNumbers: string[]): string[] {
  const out: string[] = [];
  out.push('OK 0016 ETKT');
  out.push('TKT/TIME LIMIT');
  ticketNumbers.forEach((tn, i) => {
    const pax = pnr.passengers[i] ?? pnr.passengers[0];
    out.push(`  ${i + 1}.TE ${tn}-AT ${pax.lastName}/${pax.firstName} ${pax.title}   ${pnr.createdAt.split('/')[0]}/${pnr.pcc}*${pnr.agentSign}`);
  });
  return out;
}
