// Availability (`1<DDMMM><ORG><DES>`) and flight-detail (`VA*N`) handlers.

import { generateAvailability } from '../fixtures/routes';
import { formatAvailability } from '../formatters';
import type { TerminalSession } from '../types';

// Input like "130JUNLHRJFK" or "130JUNLHRJFK-Y" or "130JUNLHRJFK‡BA".
// We tolerate a trailing carrier/class filter but don't do much with it — the
// grid is still the full deterministic set.
const AVAIL_RE = /^1(\d{2}[A-Z]{3})([A-Z]{3})([A-Z]{3})(?:[-‡¥#][A-Z0-9]+)?$/;

export function handleAvailability(input: string, session: TerminalSession): string[] {
  const m = AVAIL_RE.exec(input.toUpperCase());
  if (!m) return ['INVALID AVAILABILITY FORMAT - TRY 130JUNLHRJFK'];
  const [, date, origin, destination] = m;
  const result = generateAvailability(origin, destination, date);
  if (!result) return [`NO SERVICE ${origin}-${destination}`];
  session.availability = result;
  return formatAvailability(result);
}

// VA*1 -> flight details from availability line 1.
export function handleFlightDetails(lineNum: string, session: TerminalSession): string[] {
  if (!session.availability) return ['NO AVAILABILITY DISPLAY - MUST SEARCH FIRST'];
  const idx = parseInt(lineNum, 10) - 1;
  const line = session.availability.lines[idx];
  if (!line) return [`LINE ${lineNum} NOT FOUND`];
  return [
    `${line.carrier}${line.flightNumber}  ${session.availability.date}  ${line.from}-${line.to}`,
    `  DEP ${line.depTime}  ARR ${line.arrTime}${line.arrDayOffset ? ` +${line.arrDayOffset}` : ''}  EQP ${line.equipment}  ELAPSED ${line.elapsed}`,
    `  MEAL: MEAL FOR PURCHASE / COMPLIMENTARY SNACK`,
    `  SEATS: AISLE/WINDOW/EXTRA LEG ROOM AVAILABLE`,
    `  ON TIME: 82% LAST 30 DAYS`,
  ];
}
