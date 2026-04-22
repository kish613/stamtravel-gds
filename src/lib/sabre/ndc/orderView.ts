import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export const orderView = async (
  resolved: ResolvedCredentials,
  orderId: string,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'retrievePnr',
    orgId,
    path: '/v1/orders/view',
    method: 'POST',
    body: { OrderViewRQ: { Query: { Filters: { OrderID: [{ value: orderId }] } } } }
  });
