import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface AirBookSegment {
  origin: string;
  destination: string;
  departDateTime: string;
  arrivalDateTime: string;
  marketingCarrier: string;
  flightNumber: string;
  bookingClass: string;
  quantity: number;
}

export interface EnhancedAirBookInput {
  segments: AirBookSegment[];
  haltOnStatus?: Array<'UC' | 'NO' | 'HX'>;
}

export const enhancedAirBook = async (
  resolved: ResolvedCredentials,
  input: EnhancedAirBookInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'bookAtpco',
    orgId,
    path: '/v3.10.0/passenger/records',
    method: 'POST',
    body: {
      EnhancedAirBookRQ: {
        OTA_AirBookRQ: {
          OriginDestinationInformation: {
            FlightSegment: input.segments.map((s) => ({
              DepartureDateTime: s.departDateTime,
              ArrivalDateTime: s.arrivalDateTime,
              FlightNumber: s.flightNumber,
              NumberInParty: s.quantity,
              ResBookDesigCode: s.bookingClass,
              Status: 'NN',
              DestinationLocation: { LocationCode: s.destination },
              OriginLocation: { LocationCode: s.origin },
              MarketingAirline: { Code: s.marketingCarrier, FlightNumber: s.flightNumber }
            }))
          },
          HaltOnStatus: input.haltOnStatus?.map((c) => ({ Code: c })) ?? [{ Code: 'UC' }, { Code: 'NO' }]
        }
      }
    }
  });
