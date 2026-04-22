import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface OfferPriceInput {
  responseId: string;
  offerId: string;
  offerItemIds: string[];
  passengerRefs: string[];
}

export const offerPrice = async (
  resolved: ResolvedCredentials,
  input: OfferPriceInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'priceCheck',
    orgId,
    path: '/v1/offers/price',
    method: 'POST',
    body: {
      OfferPriceRQ: {
        ResponseID: input.responseId,
        Query: {
          Offers: {
            Offer: [
              {
                OfferID: { value: input.offerId },
                OfferItemIDs: { OfferItemID: input.offerItemIds.map((id) => ({ value: id })) }
              }
            ]
          },
          Passengers: { Passenger: input.passengerRefs.map((ref) => ({ PassengerID: ref })) }
        }
      }
    }
  });
