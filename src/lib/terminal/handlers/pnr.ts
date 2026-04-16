// PNR retrieval and display commands.

import { getPnrByLocator, findPnrsBySurname } from '../fixtures/pnrs';
import { formatPnr } from '../formatters';
import type { TerminalSession } from '../types';

// *ABCD12 -> retrieve PNR by locator
export function handleRetrieveLocator(locator: string, session: TerminalSession): string[] {
  const pnr = getPnrByLocator(locator);
  if (!pnr) return [`PNR NOT FOUND - ${locator}`];
  session.currentPnr = pnr;
  return formatPnr(pnr, 'R');
}

// *-SMITH -> retrieve by surname.  Real Sabre shows a name list when more
// than one PNR matches; we emulate with a simple numbered list.
export function handleRetrieveSurname(surname: string, session: TerminalSession): string[] {
  const matches = findPnrsBySurname(surname);
  if (matches.length === 0) return [`NO PNR FOUND FOR NAME - ${surname.toUpperCase()}`];
  if (matches.length === 1) {
    session.currentPnr = matches[0];
    return formatPnr(matches[0], 'R');
  }
  const out = [`${matches.length} PNR MATCHES FOR ${surname.toUpperCase()} - SELECT BY *<N>`];
  matches.slice(0, 10).forEach((p, i) => {
    const pax = p.passengers[0];
    const first = p.segments[0];
    out.push(
      `  ${i + 1}. ${p.locator}  ${pax.lastName}/${pax.firstName} ${pax.title}   ${first?.from ?? ''}-${first?.to ?? ''}  ${first?.depDate ?? ''}`
    );
  });
  return out;
}

// *R / *A / *I / *N / *P / *H / *PQ / *T / *B
export function handleDisplay(mode: string, session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  switch (mode.toUpperCase()) {
    case 'R':
    case 'A':
    case 'I':
    case 'N':
    case 'P':
    case 'H':
    case 'PQ':
    case 'T':
    case 'B':
      return formatPnr(session.currentPnr, mode.toUpperCase() as 'R' | 'A' | 'I' | 'N' | 'P' | 'H' | 'PQ' | 'T' | 'B');
    case 'FF':
      return ['FREQUENT FLYER', '  NONE PRESENT'];
    default:
      return [`UNKNOWN DISPLAY MODE *${mode}`];
  }
}
