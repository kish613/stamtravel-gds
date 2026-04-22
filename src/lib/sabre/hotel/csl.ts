import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface HotelAvailQuery {
  cityCode?: string;
  lat?: number;
  lng?: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export interface HotelAvailResponse {
  GetHotelAvailRS?: {
    HotelAvailInfos?: {
      HotelAvailInfo?: Array<{
        HotelInfo?: {
          HotelCode?: string;
          HotelName?: string;
          Address?: { AddressLine1?: string; CityName?: string; CountryCode?: string };
          HotelRating?: string;
          Distance?: { Value?: number; Unit?: string };
        };
        HotelRateInfo?: {
          Rooms?: {
            Room?: Array<{
              RoomDescription?: { Name?: string };
              MaxOccupancy?: string;
              RoomRate?: {
                AmountBeforeTax?: string;
                CurrencyCode?: string;
                CancelPenalties?: { NonRefundable?: boolean };
              };
            }>;
          };
        };
      }>;
    };
  };
}

const buildAvailRequest = (q: HotelAvailQuery) => ({
  GetHotelAvailRQ: {
    SearchCriteria: {
      OffsetAndLimit: { OffsetValue: 1, LimitValue: 100 },
      GeoSearch: q.lat !== undefined && q.lng !== undefined
        ? { GeoRef: { Radius: 15, UOM: 'MI', RefPoint: { Value: `${q.lat},${q.lng}`, ValueContext: 'LAT_LONG' } } }
        : undefined,
      HotelRefs: q.cityCode ? { HotelRef: [{ CityCode: q.cityCode }] } : undefined,
      RateInfoRef: {
        StayDateRange: { StartDate: q.checkIn, EndDate: q.checkOut },
        Rooms: { Room: [{ Index: 1, Adults: q.guests, Children: 0 }] },
        InfoSource: 'BOTH'
      }
    }
  }
});

export const getHotelAvail = async (
  resolved: ResolvedCredentials,
  q: HotelAvailQuery,
  orgId?: string
): Promise<HotelAvailResponse> =>
  sabreRestCall<HotelAvailResponse>(resolved, {
    op: 'shop',
    orgId,
    path: '/v5.0.0/shop/hotels',
    method: 'POST',
    body: buildAvailRequest(q)
  });

export interface HotelPriceCheckInput {
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rateKey: string;
}

export const hotelPriceCheck = async (
  resolved: ResolvedCredentials,
  q: HotelPriceCheckInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'priceCheck',
    orgId,
    path: '/v2.1.0/check/hotels/price',
    method: 'POST',
    body: {
      HotelPriceCheckRQ: {
        RateInfoRef: {
          RateKey: q.rateKey,
          StayDateRange: { StartDate: q.checkIn, EndDate: q.checkOut },
          Rooms: { Room: [{ Index: 1, Adults: q.guests, Children: 0 }] }
        }
      }
    }
  });

export interface CreateHotelPnrInput {
  hotelCode: string;
  rateKey: string;
  checkIn: string;
  checkOut: string;
  guestName: { first: string; last: string };
  contact: { phone: string; email: string };
  payment: { cardNumber: string; expiryYYMM: string };
}

export const createHotelPnr = async (
  resolved: ResolvedCredentials,
  q: CreateHotelPnrInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'bookAtpco',
    orgId,
    path: '/v2.1.0/passenger/records',
    method: 'POST',
    body: {
      CreatePassengerNameRecordRQ: {
        targetCity: resolved.creds.pcc,
        haltOnAirPriceError: true,
        TravelItineraryAddInfo: {
          AgencyInfo: { Address: { AddressLine: '', CountryCode: 'US' } },
          CustomerInfo: {
            ContactNumbers: { ContactNumber: [{ Phone: q.contact.phone, NameNumber: '1.1' }] },
            Email: [{ Address: q.contact.email, NameNumber: '1.1' }],
            PersonName: [{ NameNumber: '1.1', GivenName: q.guestName.first, Surname: q.guestName.last }]
          }
        },
        HotelBook: {
          BookingInfo: {
            HotelCode: q.hotelCode,
            RateKey: q.rateKey,
            StartDate: q.checkIn,
            EndDate: q.checkOut
          },
          Guarantee: { Type: 'G', CC_Info: { CardCode: 'VI', CardNumber: q.payment.cardNumber, ExpireDate: q.payment.expiryYYMM } }
        }
      }
    }
  });
