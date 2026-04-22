import type { PNR } from '@/lib/types';

const match = (xml: string, tag: string): string | undefined => {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const m = xml.match(re);
  return m?.[1];
};

const matchAll = (xml: string, tag: string): string[] => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  return [...xml.matchAll(re)].map((m) => m[1]);
};

export const mapReservationXmlToPnr = (xml: string, locator: string): PNR => {
  const paxBlocks = matchAll(xml, 'Passenger');
  const firstPaxName = (() => {
    const p = paxBlocks[0] ?? '';
    const first = match(p, 'FirstName') ?? '';
    const last = match(p, 'LastName') ?? '';
    return `${last.toUpperCase()}/${first.toUpperCase()}`;
  })();
  const segmentBlocks = matchAll(xml, 'Segment');
  const segments = segmentBlocks.map((block, idx) => ({
    id: `${idx + 1}`,
    from: match(block, 'DepartureAirport') ?? '',
    to: match(block, 'ArrivalAirport') ?? '',
    carrier: match(block, 'MarketingAirline') ?? '',
    flightNumber: match(block, 'FlightNumber') ?? '',
    departure: match(block, 'DepartureDateTime') ?? '',
    arrival: match(block, 'ArrivalDateTime') ?? '',
    durationMinutes: 0,
    stops: 0,
    cabin: 'Economy' as const,
    fareType: 'ATPCO' as const,
    deadlineAt: match(block, 'TicketingTimeLimit') ?? ''
  }));
  const route = segments.length > 0 ? `${segments[0].from}-${segments[segments.length - 1].to}` : '';
  return {
    locator,
    status: 'Booked',
    passengerName: firstPaxName,
    route,
    createdAt: new Date().toISOString(),
    departureDate: segments[0]?.departure ?? '',
    segments,
    passengers: paxBlocks.map((p) => ({
      title: match(p, 'Title') ?? 'MR',
      firstName: match(p, 'FirstName') ?? '',
      lastName: match(p, 'LastName') ?? '',
      dob: match(p, 'DateOfBirth') ?? '',
      nationality: match(p, 'Nationality') ?? '',
      passportNumber: '',
      passportExpiry: '',
      issuingCountry: match(p, 'Nationality') ?? ''
    })),
    contact: {
      phone: match(xml, 'PhoneNumber') ?? '',
      email: match(xml, 'EmailAddress') ?? '',
      agencyIata: ''
    },
    pricing: { total: 0, taxes: 0, fees: 0, currency: 'USD' },
    ttlMinutes: 0,
    history: [],
    queue: match(xml, 'QueueNumber') ?? ''
  };
};
