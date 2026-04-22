import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface BfmQuery {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  cabin?: 'Y' | 'S' | 'C' | 'F';
}

export interface BfmResponse {
  OTA_AirLowFareSearchRS?: {
    PricedItineraries?: {
      PricedItinerary?: unknown[];
    };
    Errors?: { Error?: { ErrorMessage?: string }[] };
  };
}

const buildRequest = (q: BfmQuery, pcc: string) => {
  const OriginDestinationInformation = [
    {
      RPH: '1',
      DepartureDateTime: `${q.departDate}T00:00:00`,
      OriginLocation: { LocationCode: q.origin },
      DestinationLocation: { LocationCode: q.destination }
    }
  ];
  if (q.returnDate) {
    OriginDestinationInformation.push({
      RPH: '2',
      DepartureDateTime: `${q.returnDate}T00:00:00`,
      OriginLocation: { LocationCode: q.destination },
      DestinationLocation: { LocationCode: q.origin }
    });
  }
  return {
    OTA_AirLowFareSearchRQ: {
      Target: 'Production',
      POS: { Source: [{ PseudoCityCode: pcc, RequestorID: { Type: '1', ID: '1', CompanyName: { Code: 'TN' } } }] },
      OriginDestinationInformation,
      TravelPreferences: {
        TPA_Extensions: { NumTrips: { Number: 50 } },
        CabinPref: q.cabin ? [{ Cabin: q.cabin, PreferLevel: 'Preferred' }] : undefined
      },
      TravelerInfoSummary: {
        SeatsRequested: [q.adults],
        AirTravelerAvail: [{ PassengerTypeQuantity: [{ Code: 'ADT', Quantity: q.adults }] }]
      },
      TPA_Extensions: {
        IntelliSellTransaction: { RequestType: { Name: '50ITINS' } }
      }
    }
  };
};

export const runBfmShop = async (
  resolved: ResolvedCredentials,
  q: BfmQuery,
  orgId?: string
): Promise<BfmResponse> =>
  sabreRestCall<BfmResponse>(resolved, {
    op: 'shop',
    orgId,
    path: '/v5/offers/shop',
    method: 'POST',
    body: buildRequest(q, resolved.creds.pcc)
  });
