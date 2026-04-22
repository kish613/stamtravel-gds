import type { ContentType, FareClass, FlightResult } from '@/lib/types';
import type { BfmResponse } from '../air/bfm';

interface PricedItinerary {
  SequenceNumber?: number;
  AirItinerary?: {
    OriginDestinationOptions?: {
      OriginDestinationOption?: Array<{
        ElapsedTime?: number;
        FlightSegment?: Array<{
          DepartureDateTime?: string;
          ArrivalDateTime?: string;
          StopQuantity?: number;
          FlightNumber?: string;
          DepartureAirport?: { LocationCode?: string };
          ArrivalAirport?: { LocationCode?: string };
          Equipment?: { AirEquipType?: string };
          MarketingAirline?: { Code?: string };
          ResBookDesigCode?: string;
        }>;
      }>;
    };
  };
  AirItineraryPricingInfo?: Array<{
    ItinTotalFare?: { TotalFare?: { Amount?: number; CurrencyCode?: string } };
    FareInfos?: { FareInfo?: Array<{ FareReference?: string }> };
  }>;
  TPA_Extensions?: {
    ContentSource?: { Source?: string };
  };
}

const cabinFromRbd = (rbd?: string): FareClass => {
  if (!rbd) return 'Economy';
  if ('FAP'.includes(rbd)) return 'First';
  if ('JCDIZ'.includes(rbd)) return 'Business';
  if ('W'.includes(rbd)) return 'Premium Economy';
  return 'Economy';
};

const contentTypeFromSource = (source?: string): ContentType => {
  if (!source) return 'ATPCO';
  if (source.includes('NDC')) return 'NDC';
  if (source.includes('LCC') || source.includes('ATPCO_LCC')) return 'LCC';
  return 'ATPCO';
};

export const mapBfmToFlightResults = (res: BfmResponse): FlightResult[] => {
  const itins = (res.OTA_AirLowFareSearchRS?.PricedItineraries?.PricedItinerary ?? []) as PricedItinerary[];
  return itins.flatMap((itin, idx) => {
    const od = itin.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.[0];
    const segs = od?.FlightSegment ?? [];
    if (segs.length === 0) return [];
    const first = segs[0];
    const last = segs[segs.length - 1];
    const pricing = itin.AirItineraryPricingInfo?.[0]?.ItinTotalFare?.TotalFare;
    const rbd = first.ResBookDesigCode;
    const returnTripOd =
      (itin.AirItinerary?.OriginDestinationOptions?.OriginDestinationOption?.length ?? 0) > 1;
    return [
      {
        id: `${itin.SequenceNumber ?? idx}`,
        airline: first.MarketingAirline?.Code ?? '',
        flightNumber: `${first.MarketingAirline?.Code ?? ''}${first.FlightNumber ?? ''}`,
        origin: first.DepartureAirport?.LocationCode ?? '',
        destination: last.ArrivalAirport?.LocationCode ?? '',
        departure: first.DepartureDateTime ?? '',
        arrival: last.ArrivalDateTime ?? '',
        durationMinutes: od?.ElapsedTime ?? 0,
        stops: (segs.length - 1) + (segs.reduce((n, s) => n + (s.StopQuantity ?? 0), 0)),
        fareBasis: itin.AirItineraryPricingInfo?.[0]?.FareInfos?.FareInfo?.[0]?.FareReference ?? '',
        price: pricing?.Amount ?? 0,
        currency: pricing?.CurrencyCode ?? 'USD',
        baggageAllowance: '',
        refundable: false,
        fareRulesSummary: '',
        contentType: contentTypeFromSource(itin.TPA_Extensions?.ContentSource?.Source),
        aircraft: first.Equipment?.AirEquipType ?? '',
        tripType: returnTripOd ? 'return' : 'one-way',
        ...(cabinFromRbd(rbd) ? {} : {})
      }
    ];
  });
};
