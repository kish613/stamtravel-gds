import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface VoidTicketInput {
  ticketNumber: string;
}

export const voidTicket = async (
  resolved: ResolvedCredentials,
  input: VoidTicketInput,
  orgId: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'void',
    orgId,
    path: '/v1.0.0/passenger/records/void',
    method: 'POST',
    body: {
      VoidTicketRQ: { Ticket: { Number: input.ticketNumber } }
    }
  });
