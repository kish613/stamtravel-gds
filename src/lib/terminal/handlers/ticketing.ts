// Ticket issuance.  Real Sabre builds a TST (Transitional Stored Ticket),
// sends a ticket request to the airline's ATPCO interface, gets back an
// e-ticket number, and marks the PNR as ticketed.  We fake the number and
// flip the status.

import { formatTicketIssued } from '../formatters';
import type { TerminalSession } from '../types';

const TKT_RE = /^W[‡¥#](.+)$/;

// Generate a pseudo-random but deterministic e-ticket number per passenger.
function generateTicketNumbers(pnrLocator: string, count: number): string[] {
  let seed = 0;
  for (let i = 0; i < pnrLocator.length; i++) seed = (seed * 31 + pnrLocator.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    seed = (seed * 9301 + 49297) % 2147483647;
    // 125 is a placeholder "stock" code; rest is 10 digits.
    const tail = String(seed + i * 7919).padStart(10, '0').slice(-10);
    return `125${tail}`;
  });
}

export function handleTicketing(input: string, session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  const pnr = session.currentPnr;

  const m = TKT_RE.exec(input.toUpperCase().replace(/#/g, '‡'));
  if (!m) return ['INVALID TICKETING FORMAT - TRY W‡APK‡FCASH‡KP0'];

  if (!pnr.priceQuote) return ['NO PRICE QUOTE - PRICE FIRST WITH WP'];

  // Parse qualifiers (we don't enforce them all, just report back).
  const qualifiers = m[1].split(/[‡¥]/).filter(Boolean);
  const fop = qualifiers.find((q) => q.startsWith('F')) ?? 'FCASH';
  const validating = qualifiers.find((q) => q.startsWith('A'));
  const commission = qualifiers.find((q) => q.startsWith('KP')) ?? 'KP0';

  const ticketNumbers = generateTicketNumbers(pnr.locator, pnr.passengers.length);
  pnr.tickets = ticketNumbers;
  pnr.status = 'Ticketed';
  pnr.history.push({
    timestamp: `${session.officeDate}/${session.officeTime}`,
    actor: `${session.pcc}.${session.pcc}*${session.agentSign}`,
    event: `TICKETED ${fop} ${commission}${validating ? ' ' + validating : ''}`,
  });

  return formatTicketIssued(pnr, ticketNumbers);
}
