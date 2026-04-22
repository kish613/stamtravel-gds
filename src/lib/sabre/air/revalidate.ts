import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface RevalidateInput {
  pcc: string;
  origin: string;
  destination: string;
  departDate: string;
  marketingCarrier: string;
  flightNumber: string;
  bookingClass: string;
  passengers: number;
}

export interface RevalidateResponse {
  OTA_AirLowFareSearchRS?: {
    PricedItineraries?: { PricedItinerary?: unknown[] };
    Errors?: { Error?: { ErrorMessage?: string }[] };
  };
}

const buildRequest = (q: RevalidateInput) => ({
  OTA_AirLowFareSearchRQ: {
    Target: 'Production',
    POS: { Source: [{ PseudoCityCode: q.pcc, RequestorID: { Type: '1', ID: '1', CompanyName: { Code: 'TN' } } }] },
    OriginDestinationInformation: [
      {
        RPH: '1',
        DepartureDateTime: `${q.departDate}T00:00:00`,
        OriginLocation: { LocationCode: q.origin },
        DestinationLocation: { LocationCode: q.destination },
        TPA_Extensions: {
          Flight: [
            {
              Number: q.flightNumber,
              Marketing: { Code: q.marketingCarrier },
              DepartureDateTime: `${q.departDate}T00:00:00`,
              BookingClass: q.bookingClass
            }
          ]
        }
      }
    ],
    TravelerInfoSummary: {
      SeatsRequested: [q.passengers],
      AirTravelerAvail: [{ PassengerTypeQuantity: [{ Code: 'ADT', Quantity: q.passengers }] }]
    }
  }
});

export const revalidateItinerary = async (
  resolved: ResolvedCredentials,
  q: RevalidateInput,
  orgId?: string
): Promise<RevalidateResponse> =>
  sabreRestCall<RevalidateResponse>(resolved, {
    op: 'priceCheck',
    orgId,
    path: '/v4.3.0/shop/flights/revalidate',
    method: 'POST',
    body: buildRequest(q)
  });
