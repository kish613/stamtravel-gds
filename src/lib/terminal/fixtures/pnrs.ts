// Deterministic PNR generator.  Real Sabre has millions of PNRs indexed by
// record locator; we only need enough variation to make the terminal feel
// alive.  A hashed seed derived from the locator means "AAC00" always resolves
// to the same PNR between page reloads — critical for training scenarios where
// the user wants to practice a specific locator multiple times.

import queuesData from '@/fixtures/queues.json';
import type { QueueBucket } from '@/lib/types';
import type { MockPNR, MockPassenger, MockSegment, MockSSR, MockPhone } from '../types';

const QUEUES = queuesData as QueueBucket[];

// A tiny seeded RNG.  Output is deterministic for a given seed.
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashLocator(locator: string): number {
  let h = 0;
  for (let i = 0; i < locator.length; i++) {
    h = (h * 31 + locator.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Name pools big enough that repeat locators rarely collide to the same pax.
const FIRST_NAMES_M = ['JOHN', 'FRED', 'DAVID', 'MICHAEL', 'JAMES', 'ROBERT', 'WILLIAM', 'CHARLES', 'THOMAS', 'HENRY', 'GEORGE', 'EDWARD', 'PAUL', 'KEVIN', 'DANIEL'];
const FIRST_NAMES_F = ['JUNE', 'HANA', 'MARY', 'SARAH', 'LINDA', 'PATRICIA', 'JENNIFER', 'ELIZABETH', 'SUSAN', 'JESSICA', 'KAREN', 'LISA', 'NANCY', 'BETTY', 'MARGARET'];
const LAST_NAMES = ['MURRAY', 'SMITH', 'JONES', 'BROWN', 'TAYLOR', 'WILSON', 'DAVIES', 'EVANS', 'THOMAS', 'ROBERTS', 'JOHNSON', 'WILLIAMS', 'ANDERSON', 'THOMPSON', 'MARTIN', 'GARCIA', 'MILLER', 'WALKER'];

const CARRIERS_FOR_ROUTE: Record<string, { code: string; flight: number; equipment: string; dur: number }[]> = {
  'LHR-JFK': [
    { code: 'BA', flight: 117, equipment: '777', dur: 420 },
    { code: 'AA', flight: 101, equipment: '77W', dur: 425 },
    { code: 'VS', flight: 3, equipment: 'A35', dur: 425 },
    { code: 'BA', flight: 175, equipment: '789', dur: 430 },
    { code: 'DL', flight: 3, equipment: '333', dur: 440 },
  ],
  'LAX-MIA': [
    { code: 'AA', flight: 268, equipment: '738', dur: 300 },
    { code: 'DL', flight: 1342, equipment: '739', dur: 295 },
    { code: 'UA', flight: 1516, equipment: '752', dur: 305 },
  ],
  'JFK-EWR': [
    { code: 'UA', flight: 701, equipment: 'E75', dur: 80 },
    { code: 'DL', flight: 9834, equipment: 'CR9', dur: 75 },
  ],
};

const COUNTRY_BY_AIRPORT: Record<string, { country: string; nationality: string }> = {
  LHR: { country: 'GB', nationality: 'GBR' },
  JFK: { country: 'US', nationality: 'USA' },
  LAX: { country: 'US', nationality: 'USA' },
  MIA: { country: 'US', nationality: 'USA' },
  EWR: { country: 'US', nationality: 'USA' },
};

const CABIN_CLASS = ['Y', 'Y', 'Y', 'Y', 'B', 'J', 'C', 'F']; // weighted toward economy

function padFlight(n: number): string {
  return String(n).padStart(4, ' ');
}

// Convert a random 0-1 to a HHMM military-time string with reasonable
// departure windows (0600-2300).
function randTime(rng: () => number): string {
  const hr = 6 + Math.floor(rng() * 17);
  const min = Math.floor(rng() * 12) * 5;
  return `${String(hr).padStart(2, '0')}${String(min).padStart(2, '0')}`;
}

function addMinutes(hhmm: string, mins: number): { time: string; dayOffset: number } {
  const hh = parseInt(hhmm.slice(0, 2), 10);
  const mm = parseInt(hhmm.slice(2, 4), 10);
  const total = hh * 60 + mm + mins;
  const dayOffset = Math.floor(total / (24 * 60));
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nhh = Math.floor(wrapped / 60);
  const nmm = wrapped % 60;
  return {
    time: `${String(nhh).padStart(2, '0')}${String(nmm).padStart(2, '0')}`,
    dayOffset,
  };
}

function isoToDDMMM(iso: string): string {
  const d = new Date(iso);
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()];
  return `${String(d.getUTCDate()).padStart(2, '0')}${mon}`;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildPassenger(rng: () => number, origin: string, paxIndex: number): MockPassenger {
  const isFemale = rng() > 0.5;
  const firstName = isFemale ? pick(rng, FIRST_NAMES_F) : pick(rng, FIRST_NAMES_M);
  const lastName = pick(rng, LAST_NAMES);
  const title = isFemale ? (rng() > 0.5 ? 'MS' : 'MRS') : 'MR';
  const nationality = COUNTRY_BY_AIRPORT[origin]?.nationality ?? 'GBR';
  const dobYear = 1960 + Math.floor(rng() * 45);
  const dobMonth = 1 + Math.floor(rng() * 12);
  const dobDay = 1 + Math.floor(rng() * 28);
  const pExpYear = 2027 + Math.floor(rng() * 5);
  const passportSerial = String(Math.floor(rng() * 90000000) + 10000000);
  return {
    title,
    firstName,
    lastName,
    dob: `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
    nationality,
    passportNumber: `P${passportSerial}`,
    passportExpiry: `${pExpYear}-${String(1 + Math.floor(rng() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rng() * 28)).padStart(2, '0')}`,
    gender: isFemale ? 'F' : 'M',
    paxType: paxIndex === 0 || rng() > 0.2 ? 'ADT' : 'CNN',
  };
}

function buildSegment(
  rng: () => number,
  from: string,
  to: string,
  depDate: string,
  paxCount: number,
  bookingClass: string,
  forceCarrier?: { code: string; flight: number; equipment: string; dur: number }
): MockSegment {
  const routeKey = `${from}-${to}`;
  const options = CARRIERS_FOR_ROUTE[routeKey] ?? CARRIERS_FOR_ROUTE['LHR-JFK'];
  const carrier = forceCarrier ?? pick(rng, options);
  const dep = randTime(rng);
  const arr = addMinutes(dep, carrier.dur);
  const elapsedH = Math.floor(carrier.dur / 60);
  const elapsedM = carrier.dur % 60;
  return {
    carrier: carrier.code,
    flightNumber: carrier.flight,
    bookingClass,
    from,
    to,
    depDate,
    depTime: dep,
    arrTime: arr.time,
    arrDayOffset: arr.dayOffset,
    status: 'HK',
    paxCount,
    equipment: carrier.equipment,
    elapsed: `${elapsedH}:${String(elapsedM).padStart(2, '0')}`,
  };
}

function buildSSRs(
  rng: () => number,
  passengers: MockPassenger[],
  segments: MockSegment[]
): MockSSR[] {
  const ssrs: MockSSR[] = [];
  const firstCarrier = segments[0]?.carrier ?? 'BA';

  passengers.forEach((pax, i) => {
    const paxRef = `${1}.${i + 1}`; // name line 1, position i+1
    const expiry = isoToDDMMM(pax.passportExpiry);
    const dob = isoToDDMMM(pax.dob);
    ssrs.push({
      code: 'DOCS',
      airline: firstCarrier,
      status: 'HK',
      paxRef,
      text: `HK1/P/${pax.nationality}/${pax.passportNumber}/${pax.nationality}/${dob}/${pax.gender}/${expiry}/${pax.lastName}/${pax.firstName}`,
    });
  });

  // Occasional meal / assistance SSR
  if (rng() > 0.6) {
    ssrs.push({
      code: 'VGML',
      airline: firstCarrier,
      status: 'HK',
      paxRef: '1.1',
      text: `HK1/S${segments.map((_, i) => i + 1).join('-')}`,
    });
  }
  if (rng() > 0.8) {
    ssrs.push({
      code: 'WCHR',
      airline: firstCarrier,
      status: 'KK',
      paxRef: '1.1',
      text: `KK1/S${segments.map((_, i) => i + 1).join('-')}`,
    });
  }
  return ssrs;
}

function buildPhones(rng: () => number, origin: string): MockPhone[] {
  const cityMap: Record<string, string> = { LHR: 'LON', JFK: 'NYC', LAX: 'LAX', MIA: 'MIA', EWR: 'NYC' };
  const city = cityMap[origin] ?? 'LON';
  const num = `${Math.floor(rng() * 900 + 100)}-${Math.floor(rng() * 900 + 100)}-${Math.floor(rng() * 9000 + 1000)}`;
  return [{ type: 'A', city, number: num }];
}

// Public API — look up or build a PNR on demand.
const cache = new Map<string, MockPNR>();

export function getPnrByLocator(locator: string): MockPNR | null {
  const upper = locator.toUpperCase();
  if (cache.has(upper)) return cache.get(upper)!;

  // Find the queue item matching this locator (if any) to pull route/date.
  let meta: { route: string; departureDate: string; status: string; queueCode: string; agent: string } | null = null;
  for (const bucket of QUEUES) {
    const hit = bucket.items.find((i) => i.locator === upper);
    if (hit) {
      meta = {
        route: hit.route,
        departureDate: hit.departureDate,
        status: hit.status,
        queueCode: bucket.queueCode,
        agent: hit.agent,
      };
      break;
    }
  }
  if (!meta) return null;

  const rng = makeRng(hashLocator(upper));
  const [origin, destination, onward] = meta.route.split('-');
  const paxCount = 1 + Math.floor(rng() * 3); // 1-3 passengers
  const passengers: MockPassenger[] = Array.from({ length: paxCount }, (_, i) => buildPassenger(rng, origin, i));
  const bookingClass = pick(rng, CABIN_CLASS);
  const depDate = isoToDDMMM(meta.departureDate);

  const segments: MockSegment[] = [];
  segments.push(buildSegment(rng, origin, destination, depDate, paxCount, bookingClass));
  if (onward) {
    const connectorDate = depDate; // same calendar day for short turnaround
    segments.push(buildSegment(rng, destination, onward, connectorDate, paxCount, bookingClass));
  }

  const ssrs = buildSSRs(rng, passengers, segments);
  const phones = buildPhones(rng, origin);
  const email = `${passengers[0].firstName.toLowerCase()}.${passengers[0].lastName.toLowerCase()}@example.com`;

  const status: MockPNR['status'] = meta.status as MockPNR['status'];
  const createdAt = '16APR/1054';
  const ticketTimeLimit = status === 'Awaiting Ticket' ? `TAW${depDate}/` : status === 'Ticketed' ? undefined : `TAW${depDate}/`;

  const pnr: MockPNR = {
    locator: upper,
    createdAt,
    status,
    passengers,
    segments,
    phones,
    email,
    ssrs,
    remarks: [
      { text: `CORPORATE ACCT ${Math.floor(rng() * 90000) + 10000}` },
      { text: `QUEUE-${meta.queueCode.toUpperCase()}` },
    ],
    ticketTimeLimit,
    receivedFrom: 'PAX',
    agentSign: meta.agent.replace(/[^A-Z0-9]/gi, '').slice(-3) || 'ASC',
    pcc: 'A0UC',
    history: [
      { timestamp: createdAt, actor: `A0UC.A0UC*${meta.agent}`, event: 'PNR CREATED' },
      { timestamp: createdAt, actor: `A0UC.A0UC*${meta.agent}`, event: `PLACED ON ${meta.queueCode.toUpperCase()}` },
    ],
    tickets: status === 'Ticketed' ? [`125${Math.floor(rng() * 9000000000) + 1000000000}`] : undefined,
    dirty: false,
  };
  cache.set(upper, pnr);
  return pnr;
}

export function findPnrsBySurname(surname: string): MockPNR[] {
  const results: MockPNR[] = [];
  for (const bucket of QUEUES) {
    for (const item of bucket.items) {
      const pnr = getPnrByLocator(item.locator);
      if (pnr && pnr.passengers.some((p) => p.lastName === surname.toUpperCase())) {
        results.push(pnr);
      }
    }
  }
  return results;
}

export function listAllLocators(): string[] {
  const s = new Set<string>();
  QUEUES.forEach((b) => b.items.forEach((i) => s.add(i.locator)));
  return Array.from(s);
}
