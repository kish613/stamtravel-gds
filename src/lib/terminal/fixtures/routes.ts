// Deterministic availability generator.  Typing `130JUNLHRJFK` on a real
// Sabre terminal triggers a GDS search against live inventory; we fake this
// with a seeded RNG so the same query always produces the same grid.

import type { AvailabilityLine, AvailabilityResult } from '../types';

const ROUTES: Record<string, { carrier: string; baseFlight: number; equipment: string; durMin: number }[]> = {
  'LHR-JFK': [
    { carrier: 'BA', baseFlight: 117, equipment: '777', durMin: 420 },
    { carrier: 'AA', baseFlight: 101, equipment: '77W', durMin: 425 },
    { carrier: 'VS', baseFlight: 3, equipment: 'A35', durMin: 425 },
    { carrier: 'UA', baseFlight: 14, equipment: '772', durMin: 430 },
    { carrier: 'BA', baseFlight: 175, equipment: '789', durMin: 425 },
    { carrier: 'DL', baseFlight: 3, equipment: '333', durMin: 440 },
    { carrier: 'AA', baseFlight: 107, equipment: '772', durMin: 440 },
  ],
  'JFK-LHR': [
    { carrier: 'BA', baseFlight: 114, equipment: '777', durMin: 420 },
    { carrier: 'AA', baseFlight: 106, equipment: '77W', durMin: 410 },
    { carrier: 'VS', baseFlight: 4, equipment: 'A35', durMin: 415 },
    { carrier: 'DL', baseFlight: 2, equipment: '339', durMin: 420 },
  ],
  'LAX-MIA': [
    { carrier: 'AA', baseFlight: 268, equipment: '738', durMin: 300 },
    { carrier: 'DL', baseFlight: 1342, equipment: '739', durMin: 295 },
    { carrier: 'UA', baseFlight: 1516, equipment: '752', durMin: 305 },
    { carrier: 'AS', baseFlight: 632, equipment: '73H', durMin: 310 },
  ],
  'MIA-LAX': [
    { carrier: 'AA', baseFlight: 269, equipment: '738', durMin: 330 },
    { carrier: 'DL', baseFlight: 1743, equipment: '739', durMin: 335 },
  ],
  'LHR-CDG': [
    { carrier: 'BA', baseFlight: 304, equipment: '320', durMin: 80 },
    { carrier: 'AF', baseFlight: 1381, equipment: '318', durMin: 75 },
  ],
  'JFK-LAX': [
    { carrier: 'AA', baseFlight: 1, equipment: '32B', durMin: 370 },
    { carrier: 'DL', baseFlight: 426, equipment: '339', durMin: 375 },
    { carrier: 'B6', baseFlight: 1523, equipment: '32A', durMin: 380 },
  ],
};

const CLASSES_FIRST_ROW = ['F', 'A', 'J', 'C', 'D', 'R', 'I', 'Y', 'B', 'H', 'K', 'M'];
const CLASSES_SECOND_ROW = ['L', 'V', 'S', 'N', 'Q', 'O', 'G'];

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h || 1;
}

function rng(seedValue: number) {
  let s = seedValue;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function addMinutes(hhmm: string, mins: number): { time: string; dayOffset: number } {
  const hh = parseInt(hhmm.slice(0, 2), 10);
  const mm = parseInt(hhmm.slice(2, 4), 10);
  const total = hh * 60 + mm + mins;
  const dayOffset = Math.floor(total / (24 * 60));
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    time: `${String(Math.floor(wrapped / 60)).padStart(2, '0')}${String(wrapped % 60).padStart(2, '0')}`,
    dayOffset,
  };
}

// Parse a DDMMM string (e.g., 30JUN) into a best-guess date in the current
// year (rolls into next year if the date has passed).  Good enough for
// weekday computation.
function parseDDMMM(ddmmm: string, today: Date = new Date()): Date {
  const day = parseInt(ddmmm.slice(0, 2), 10);
  const monStr = ddmmm.slice(2);
  const monthIdx = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(monStr);
  if (monthIdx < 0 || isNaN(day)) return today;
  const year = today.getFullYear();
  const candidate = new Date(Date.UTC(year, monthIdx, day));
  if (candidate.getTime() < today.getTime() - 86_400_000) {
    return new Date(Date.UTC(year + 1, monthIdx, day));
  }
  return candidate;
}

export function generateAvailability(origin: string, destination: string, dateDDMMM: string): AvailabilityResult | null {
  const key = `${origin}-${destination}`;
  const routes = ROUTES[key];
  if (!routes) return null;

  const r = rng(seed(`${key}|${dateDDMMM}`));
  const date = parseDDMMM(dateDDMMM);
  const weekday = WEEKDAYS[date.getUTCDay()];

  // Sample flights in a morning-through-evening spread.
  const lines: AvailabilityLine[] = routes.map((flight, idx) => {
    const depHour = 6 + Math.floor(r() * 16);
    const depMin = Math.floor(r() * 12) * 5;
    const depTime = `${String(depHour).padStart(2, '0')}${String(depMin).padStart(2, '0')}`;
    const arr = addMinutes(depTime, flight.durMin);
    const elapsedH = Math.floor(flight.durMin / 60);
    const elapsedM = flight.durMin % 60;

    // Build 12-class + 7-class secondary row with inventory counts.
    const classes = [...CLASSES_FIRST_ROW, ...CLASSES_SECOND_ROW].map((c) => {
      const roll = r();
      const seats: number | 'L' = roll > 0.85 ? 0 : roll > 0.7 ? Math.min(7, Math.floor(roll * 10)) : 9;
      return { code: c, seats };
    });

    return {
      lineNumber: idx + 1,
      carrier: flight.carrier,
      flightNumber: flight.baseFlight,
      classes,
      from: origin,
      to: destination,
      depTime,
      arrTime: arr.time,
      arrDayOffset: arr.dayOffset,
      equipment: flight.equipment,
      elapsed: `${elapsedH}:${String(elapsedM).padStart(2, '0')}`,
    };
  });

  // Sort by departure time so the grid looks chronological.
  lines.sort((a, b) => a.depTime.localeCompare(b.depTime));
  lines.forEach((l, i) => (l.lineNumber = i + 1));

  return { origin, destination, date: dateDDMMM, weekday, lines };
}

export function isValidAirport(code: string): boolean {
  const valid = new Set<string>();
  Object.keys(ROUTES).forEach((k) => {
    const [a, b] = k.split('-');
    valid.add(a);
    valid.add(b);
  });
  return valid.has(code.toUpperCase());
}
