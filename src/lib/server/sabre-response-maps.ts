import type {
  FlightResult,
  PNR,
  Passenger,
  Segment,
  Seat,
  SeatMap,
  QueueBucket,
  QueueItem,
  SabreMutationResult,
  SabreCapability,
  SabreCommandResponse
} from '@/lib/types';

function dig(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function toStr(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

function toNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

export function mapFlightResults(parsed: Record<string, unknown>): FlightResult[] {
  const response = dig(parsed, 'OTA_AirLowFareSearchRS') as Record<string, unknown> | undefined;
  if (!response) return [];

  const itineraries = toArray(dig(response, 'PricedItineraries', 'PricedItinerary') as unknown[]);
  const results: FlightResult[] = [];

  for (const itin of itineraries) {
    const itinObj = itin as Record<string, unknown>;
    const airItin = itinObj['AirItinerary'] as Record<string, unknown> | undefined;
    const odOptions = toArray(dig(airItin, 'OriginDestinationOptions', 'OriginDestinationOption') as unknown[]);

    for (const od of odOptions) {
      const segments = toArray(dig(od as Record<string, unknown>, 'FlightSegment') as unknown[]);
      if (segments.length === 0) continue;

      const firstSeg = segments[0] as Record<string, unknown>;
      const lastSeg = segments[segments.length - 1] as Record<string, unknown>;
      const marketing = firstSeg['MarketingAirline'] as Record<string, unknown> | undefined;

      const pricing = dig(itinObj, 'AirItineraryPricingInfo', 'ItinTotalFare', 'TotalFare') as Record<string, unknown> | undefined;

      results.push({
        id: `${toStr(marketing?.['@_Code'])}${toStr(firstSeg['@_FlightNumber'])}-${results.length}`,
        airline: toStr(marketing?.['@_Code']),
        flightNumber: `${toStr(marketing?.['@_Code'])}${toStr(firstSeg['@_FlightNumber'])}`,
        origin: toStr(dig(firstSeg, 'DepartureAirport', '@_LocationCode')),
        destination: toStr(dig(lastSeg, 'ArrivalAirport', '@_LocationCode')),
        departure: toStr(firstSeg['@_DepartureDateTime']),
        arrival: toStr(lastSeg['@_ArrivalDateTime']),
        durationMinutes: toNum(firstSeg['@_ElapsedTime']),
        stops: segments.length - 1,
        fareBasis: toStr(dig(itinObj, 'AirItineraryPricingInfo', 'FareBreakdown', 'FareBasis', '@_Code')),
        price: toNum(pricing?.['@_Amount']),
        currency: toStr(pricing?.['@_CurrencyCode'] ?? 'USD'),
        baggageAllowance: '23kg',
        refundable: false,
        fareRulesSummary: 'Non-refundable',
        contentType: 'ATPCO',
        contentSource: 'CLASSIC_GDS',
        bookingSupported: true,
        aircraft: toStr(dig(firstSeg, 'Equipment', '@_AirEquipType')),
        tripType: 'one-way'
      });
    }
  }

  return results;
}

export function mapPnr(parsed: Record<string, unknown>): PNR {
  const res = (dig(parsed, 'GetReservationRS') ?? dig(parsed, 'Reservation')) as Record<string, unknown> | undefined;
  if (!res) throw new Error('Could not parse reservation response');

  const locator = toStr(dig(res, 'Reservation', 'BookingDetails', 'RecordLocator') ?? dig(res, '@_Locator'));

  const travelers = toArray(dig(res, 'Reservation', 'PassengerReservation', 'Passengers', 'Passenger') as unknown[]);
  const passengers: Passenger[] = travelers.map((t) => {
    const p = t as Record<string, unknown>;
    return {
      title: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_NamePrefix')),
      firstName: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_GivenName')),
      lastName: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_Surname')),
      dob: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      issuingCountry: ''
    };
  });

  const segs = toArray(dig(res, 'Reservation', 'PassengerReservation', 'Segments', 'Segment') as unknown[]);
  const segments: Segment[] = segs.map((s) => {
    const seg = s as Record<string, unknown>;
    const air = (seg['Air'] ?? seg) as Record<string, unknown>;
    return {
      id: toStr(air['@_Id'] ?? air['@_SegmentNumber'] ?? '1'),
      from: toStr(dig(air, 'DepartureAirport') ?? air['@_DepartureAirport']),
      to: toStr(dig(air, 'ArrivalAirport') ?? air['@_ArrivalAirport']),
      carrier: toStr(dig(air, 'MarketingAirline', '@_Code') ?? air['@_MarketingAirlineCode']),
      flightNumber: toStr(air['@_FlightNumber']),
      departure: toStr(air['@_DepartureDateTime']),
      arrival: toStr(air['@_ArrivalDateTime']),
      durationMinutes: toNum(air['@_ElapsedTime']),
      stops: 0,
      cabin: 'Economy' as const,
      fareType: 'ATPCO' as const,
      contentSource: 'CLASSIC_GDS' as const,
      deadlineAt: ''
    };
  });

  const passengerName = passengers.length > 0
    ? `${passengers[0].lastName}/${passengers[0].firstName}`
    : 'UNKNOWN';

  const route = segments.length > 0
    ? `${segments[0].from}-${segments[segments.length - 1].to}`
    : '';

  return {
    locator,
    status: 'Booked',
    contentSource: 'CLASSIC_GDS',
    passengerName,
    route,
    createdAt: new Date().toISOString(),
    departureDate: segments[0]?.departure ?? '',
    segments,
    passengers,
    contact: { phone: '', email: '', agencyIata: '' },
    pricing: { total: 0, taxes: 0, fees: 0, currency: 'USD' },
    ttlMinutes: 60,
    history: [],
    queue: ''
  };
}

export function mapPnrList(parsed: Record<string, unknown>): PNR[] {
  try {
    return [mapPnr(parsed)];
  } catch {
    return [];
  }
}

export function mapSeatMap(parsed: Record<string, unknown>): SeatMap {
  const response = dig(parsed, 'EnhancedSeatMapRS') as Record<string, unknown> | undefined;
  const seatMapDetail = dig(response, 'SeatMap') as Record<string, unknown> | undefined;
  const cabinRows = toArray(dig(seatMapDetail, 'Cabin', 'Row') as unknown[]);

  const rows: Seat[][] = [];
  const premiumRows: number[] = [];

  for (const row of cabinRows) {
    const rowObj = row as Record<string, unknown>;
    const rowNumber = toNum(rowObj['@_RowNumber']);
    const columns = toArray(rowObj['Column'] as unknown[]);

    const seats: Seat[] = columns.map((col) => {
      const c = col as Record<string, unknown>;
      const isOccupied = toStr(c['@_Occupied']) === 'true';
      const hasFee = toNum(dig(c, 'Charge', '@_Amount')) > 0;
      const isExit = toStr(c['@_ExitRow']) === 'true';

      let status: Seat['status'] = 'available';
      if (isOccupied) status = 'occupied';
      else if (isExit) status = 'exit';
      else if (hasFee) status = 'fee';

      return {
        row: rowNumber,
        col: toStr(c['@_Column']),
        status,
        fee: hasFee ? toNum(dig(c, 'Charge', '@_Amount')) : undefined
      };
    });

    rows.push(seats);
  }

  return {
    segmentId: '1',
    rows,
    premiumRows
  };
}

export function mapQueueBuckets(parsedCount: Record<string, unknown>, parsedAccess: Record<string, Record<string, unknown>>): QueueBucket[] {
  const countResponse = dig(parsedCount, 'QueueCountRS') as Record<string, unknown> | undefined;
  const queues = toArray(dig(countResponse, 'QueueCount') as unknown[]);

  const buckets: QueueBucket[] = [];

  for (const q of queues) {
    const qObj = q as Record<string, unknown>;
    const queueCode = toStr(qObj['@_Number'] ?? qObj['@_QueueNumber']);

    const items: QueueItem[] = [];

    const accessData = parsedAccess[queueCode];
    if (accessData) {
      const accessItems = toArray(dig(accessData, 'QueueAccessRS', 'Item') as unknown[]);
      for (const item of accessItems) {
        const itemObj = item as Record<string, unknown>;
        items.push({
          locator: toStr(itemObj['@_RecordLocator'] ?? itemObj['@_ID']),
          passengerName: toStr(itemObj['@_PassengerName'] ?? ''),
          departureDate: toStr(itemObj['@_DepartureDate'] ?? ''),
          route: toStr(itemObj['@_Route'] ?? ''),
          deadlineAt: toStr(itemObj['@_Deadline'] ?? ''),
          segmentsCount: toNum(itemObj['@_SegmentCount'], 1),
          status: 'Booked',
          agent: toStr(itemObj['@_Agent'] ?? '')
        });
      }
    }

    buckets.push({ queueCode, items });
  }

  return buckets;
}

export function mapMutationResult(parsed: Record<string, unknown>, locator: string): SabreMutationResult {
  const warnings: string[] = [];

  const msgNodes = toArray(dig(parsed, 'ApplicationResults', 'Warning') as unknown[]);
  for (const msg of msgNodes) {
    const m = msg as Record<string, unknown>;
    const text = toStr(dig(m, 'SystemSpecificResults', 'Message') ?? m['#text'] ?? '');
    if (text) warnings.push(text);
  }

  return {
    locator,
    status: 'Booked',
    warnings,
    sabreRequestId: toStr(dig(parsed, '@_RequestId') ?? ''),
    statefulFollowUpRequired: false
  };
}

export function mapCapabilities(healthy: boolean): SabreCapability[] {
  const now = new Date().toISOString();
  return [
    { key: 'air-search', label: 'Air Shopping', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Connected to Sabre cert' : 'Connection failed', lastCheckedAt: now },
    { key: 'pnr-create', label: 'PNR Creation', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'ticketing', label: 'Ticketing', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'queues', label: 'Queue Management', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'seatmap', label: 'Seat Maps', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'terminal', label: 'Terminal / Cryptic', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now }
  ];
}

export function mapCommandResponse(parsed: Record<string, unknown>): SabreCommandResponse {
  const response = dig(parsed, 'SabreCommandLLSRS') as Record<string, unknown> | undefined;
  const output = toStr(dig(response, 'Response') ?? dig(response, 'Response', '#text') ?? '');
  return { output, warnings: [] };
}
