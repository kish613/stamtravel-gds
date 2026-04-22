import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface PassengerDetailsInput {
  passengers: Array<{
    nameNumber: string;
    firstName: string;
    lastName: string;
    title?: string;
    dob?: string;
    gender?: 'M' | 'F' | 'X';
    passportNumber?: string;
    passportExpiry?: string;
    nationality?: string;
  }>;
  contact: { phone: string; email: string };
  ticketingTimeLimit?: string;
  endTransaction?: boolean;
}

export const passengerDetails = async (
  resolved: ResolvedCredentials,
  input: PassengerDetailsInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'bookAtpco',
    orgId,
    path: '/v3.4.0/passenger/records',
    method: 'POST',
    body: {
      PassengerDetailsRQ: {
        ignoreOnError: false,
        haltOnError: true,
        TravelItineraryAddInfoRQ: {
          AgencyInfo: {
            Ticketing: { TicketType: '7TAW' }
          },
          CustomerInfo: {
            ContactNumbers: {
              ContactNumber: [{ Phone: input.contact.phone, NameNumber: '1.1' }]
            },
            Email: [{ Address: input.contact.email, NameNumber: '1.1' }],
            PersonName: input.passengers.map((p) => ({
              NameNumber: p.nameNumber,
              GivenName: p.firstName,
              Surname: p.lastName,
              NameTitle: p.title
            }))
          }
        },
        SpecialReqDetails: {
          AddRemark: input.ticketingTimeLimit
            ? { RemarkInfo: { Remark: [{ Type: 'General', Text: `TAW/${input.ticketingTimeLimit}` }] } }
            : undefined
        },
        PostProcessing: { EndTransaction: input.endTransaction !== false ? { Source: { ReceivedFrom: 'API' } } : undefined }
      }
    }
  });
