import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface VehAvailQuery {
  pickupLocation: string;
  pickupDateTime: string;
  returnDateTime: string;
  category?: string;
}

export interface VehAvailResponse {
  GetVehAvailRS?: {
    VehAvailInfos?: {
      VehAvailInfo?: Array<{
        Vendor?: { Code?: string; CompanyShortName?: string };
        VehAvailCore?: {
          Vehicle?: {
            VehType?: { VehicleCategory?: string };
            VehMakeModel?: { Name?: string };
            VehClass?: { Size?: string };
            Code?: string;
          };
          TotalCharge?: { RateTotalAmount?: string; EstimatedTotalAmount?: string; CurrencyCode?: string };
        };
      }>;
    };
  };
}

const buildRequest = (q: VehAvailQuery) => ({
  GetVehAvailRQ: {
    POS: { Source: [{ PseudoCityCode: '' }] },
    VehAvailRQCore: {
      Status: 'Available',
      VehRentalCore: {
        PickUpDateTime: q.pickupDateTime,
        ReturnDateTime: q.returnDateTime,
        PickUpLocation: { LocationCode: q.pickupLocation }
      },
      VehPrefs: q.category ? { VehPref: [{ VehClass: { Size: q.category } }] } : undefined
    }
  }
});

export const getVehAvail = async (
  resolved: ResolvedCredentials,
  q: VehAvailQuery,
  orgId?: string
): Promise<VehAvailResponse> =>
  sabreRestCall<VehAvailResponse>(resolved, {
    op: 'shop',
    orgId,
    path: '/v1.0.0/shop/cars',
    method: 'POST',
    body: buildRequest(q)
  });
