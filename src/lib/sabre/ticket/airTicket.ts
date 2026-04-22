import { sabreRestCall } from '../http/client';
import { SabreError } from '../errors';
import type { ResolvedCredentials } from '../types';

export interface IssueTicketInput {
  locator: string;
  commissionPercent?: number;
  formOfPayment: 'CC' | 'CASH' | 'CHECK';
  cardNumber?: string;
  cardExpiry?: string;
}

export const issueTicket = async (
  resolved: ResolvedCredentials,
  input: IssueTicketInput,
  orgId: string
) => {
  const iata = resolved.creds.iata ?? resolved.creds.arc;
  if (!iata) {
    throw new SabreError(
      'Cannot issue tickets: stored credentials have no IATA or ARC number. Add one in Settings.',
      'TICKET_NO_IATA',
      400
    );
  }
  return sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'ticket',
    orgId,
    path: '/v1.19.4/passenger/records/AirTicketRQ',
    method: 'POST',
    body: {
      AirTicketRQ: {
        targetCity: resolved.creds.pcc,
        Ticketing: {
          IATA: iata,
          PriceQuote: { Record: [{ Select: { Number: 'ALL' } }] },
          PaymentInfo: {
            PaymentCard:
              input.formOfPayment === 'CC'
                ? { Code: 'VI', CardNumber: input.cardNumber, ExpirationDate: input.cardExpiry }
                : undefined,
            Cash: input.formOfPayment === 'CASH' ? {} : undefined,
            Check: input.formOfPayment === 'CHECK' ? {} : undefined
          },
          CommissionInfo: input.commissionPercent !== undefined ? { Percentage: input.commissionPercent } : undefined
        }
      }
    }
  });
};
