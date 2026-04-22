import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface OrderChangeInput {
  orderId: string;
  action: 'Cancel' | 'Modify';
  acceptAllChanges?: boolean;
}

export const orderChange = async (
  resolved: ResolvedCredentials,
  input: OrderChangeInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: input.action === 'Cancel' ? 'cancel' : 'bookNdc',
    orgId,
    path: '/v1/orders/change',
    method: 'POST',
    body: {
      OrderChangeRQ: {
        Query: {
          OrderID: { value: input.orderId },
          Actions: { Action: [{ Type: input.action }] },
          AcceptAllChanges: input.acceptAllChanges ?? true
        }
      }
    }
  });
