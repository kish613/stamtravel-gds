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

export interface BfmSchedule {
  id: number;
  departure?: { airport?: string; time?: string };
  arrival?: { airport?: string; time?: string };
  carrier?: {
    marketing?: string;
    marketingFlightNumber?: number;
    equipment?: { code?: string };
  };
  elapsedTime?: number;
  stopCount?: number;
}

export interface BfmLegDesc {
  id: number;
  elapsedTime?: number;
  schedules?: Array<{ ref: number; departureDateAdjustment?: number }>;
}

export interface BfmPricingInfo {
  distributionModel?: 'ATPCO' | 'NDC' | 'LCC';
  pricingSubsource?: string;
  offer?: { offerId?: string };
  fare?: {
    offerItemId?: string;
    passengerInfoList?: Array<{
      passengerInfo?: {
        passengerTotalFare?: { totalFare?: number; currency?: string };
        fareComponents?: Array<{
          segments?: Array<{ segment?: { bookingCode?: string; cabinCode?: string } }>;
        }>;
      };
    }>;
  };
}

export interface BfmItinerary {
  id: number;
  legs?: Array<{ ref: number }>;
  pricingInformation?: BfmPricingInfo[];
}

export interface BfmResponse {
  groupedItineraryResponse?: {
    version?: string;
    messages?: Array<{ severity?: string; code?: string; text?: string; value?: string }>;
    statistics?: { itineraryCount?: number };
    scheduleDescs?: BfmSchedule[];
    legDescs?: BfmLegDesc[];
    itineraryGroups?: Array<{ itineraries?: BfmItinerary[] }>;
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
      Version: '5.5.0',
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
