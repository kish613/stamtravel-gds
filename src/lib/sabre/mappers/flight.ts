import type { ContentType, FareClass, FlightResult } from '@/lib/types';
import type {
  BfmItinerary,
  BfmLegDesc,
  BfmPricingInfo,
  BfmResponse,
  BfmSchedule
} from '../air/bfm';

const cabinFromCode = (code?: string): FareClass => {
  switch (code) {
    case 'F':
    case 'P':
      return 'First';
    case 'J':
    case 'C':
    case 'D':
    case 'I':
    case 'Z':
      return 'Business';
    case 'W':
    case 'S':
      return 'Premium Economy';
    default:
      return 'Economy';
  }
};

const contentTypeFromPricing = (p?: BfmPricingInfo): ContentType => {
  const model = p?.distributionModel;
  if (model === 'NDC') return 'NDC';
  if (model === 'LCC') return 'LCC';
  if (p?.pricingSubsource && /lcc/i.test(p.pricingSubsource)) return 'LCC';
  return 'ATPCO';
};

const indexById = <T extends { id: number }>(arr: T[] | undefined): Map<number, T> =>
  new Map((arr ?? []).map((item) => [item.id, item]));

const combineDateTime = (baseDate: string, time: string | undefined): string => {
  if (!time) return '';
  const timeMatch = time.match(/^(\d{2}:\d{2}:\d{2})([+-]\d{2}:\d{2})?$/);
  if (!timeMatch) return time;
  const [, hms, tz] = timeMatch;
  return `${baseDate}T${hms}${tz ?? 'Z'}`;
};

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const mapBfmToFlightResults = (
  res: BfmResponse,
  baseDate: string
): FlightResult[] => {
  const root = res.groupedItineraryResponse;
  if (!root) return [];
  const schedules = indexById<BfmSchedule>(root.scheduleDescs);
  const legs = indexById<BfmLegDesc>(root.legDescs);
  const itineraries = (root.itineraryGroups ?? []).flatMap<BfmItinerary>(
    (g) => g.itineraries ?? []
  );

  return itineraries.flatMap<FlightResult>((itin) => {
    const legRefs = itin.legs?.map((l) => legs.get(l.ref)) ?? [];
    if (legRefs.length === 0) return [];
    const firstLeg = legRefs[0];
    const firstSchedRef = firstLeg?.schedules?.[0];
    const firstSched = firstSchedRef ? schedules.get(firstSchedRef.ref) : undefined;
    const firstDateAdjust = firstSchedRef?.departureDateAdjustment ?? 0;
    const lastLeg = legRefs[legRefs.length - 1];
    const lastSchedRef = lastLeg?.schedules?.[lastLeg.schedules.length - 1];
    const lastSched = lastSchedRef ? schedules.get(lastSchedRef.ref) : undefined;
    const lastDateAdjust = lastSchedRef?.departureDateAdjustment ?? 0;
    if (!firstSched || !lastSched) return [];

    const depDate = addDays(baseDate, firstDateAdjust);
    const arrDate = addDays(baseDate, lastDateAdjust);

    const pricing = itin.pricingInformation?.[0];
    const totalFare = pricing?.fare?.passengerInfoList?.[0]?.passengerInfo?.passengerTotalFare;
    const firstFareSeg =
      pricing?.fare?.passengerInfoList?.[0]?.passengerInfo?.fareComponents?.[0]?.segments?.[0]
        ?.segment;
    const stopsWithin = legRefs.reduce(
      (acc, l) => acc + ((l?.schedules?.length ?? 1) - 1),
      0
    );
    const durationMinutes = legRefs.reduce((acc, l) => acc + (l?.elapsedTime ?? 0), 0);

    return [
      {
        id: `${itin.id}`,
        airline: firstSched.carrier?.marketing ?? '',
        flightNumber: `${firstSched.carrier?.marketing ?? ''}${firstSched.carrier?.marketingFlightNumber ?? ''}`,
        origin: firstSched.departure?.airport ?? '',
        destination: lastSched.arrival?.airport ?? '',
        departure: combineDateTime(depDate, firstSched.departure?.time),
        arrival: combineDateTime(arrDate, lastSched.arrival?.time),
        durationMinutes,
        stops: stopsWithin,
        fareBasis: pricing?.fare?.offerItemId ?? '',
        price: totalFare?.totalFare ?? 0,
        currency: totalFare?.currency ?? 'USD',
        baggageAllowance: '',
        refundable: false,
        fareRulesSummary: '',
        contentType: contentTypeFromPricing(pricing),
        aircraft: firstSched.carrier?.equipment?.code ?? '',
        tripType: legRefs.length > 1 ? 'return' : 'one-way',
        cabin: cabinFromCode(firstFareSeg?.cabinCode) as FareClass
      } as FlightResult
    ];
  });
};
