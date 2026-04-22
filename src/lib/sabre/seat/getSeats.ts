import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface GetSeatsByOfferInput {
  offerId: string;
  offerItemIds?: string[];
}

export interface GetSeatsByPnrInput {
  locator: string;
  segmentRph: string;
}

export const getSeatsByOffer = async (
  resolved: ResolvedCredentials,
  input: GetSeatsByOfferInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'seatMapByOffer',
    orgId,
    path: '/v3/shop/flights/seatmaps',
    method: 'POST',
    body: { OfferId: input.offerId, OfferItemIds: input.offerItemIds }
  });

export const getSeatsByPnr = async (
  resolved: ResolvedCredentials,
  input: GetSeatsByPnrInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'seatMapByPnr',
    orgId,
    path: '/v4.2.0/seats/flights',
    method: 'POST',
    body: { ConfirmationNumber: input.locator, SegmentRPH: input.segmentRph }
  });
