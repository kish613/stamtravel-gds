import { sabreRestCall } from '../http/client';
import type { ResolvedCredentials } from '../types';

export interface OrderCreatePassenger {
  passengerId: string;
  givenName: string;
  surname: string;
  title?: string;
  birthDate?: string;
  contact: { email: string; phone: string };
  document?: { number: string; expiry: string; issuingCountry: string };
}

export interface OrderCreateInput {
  responseId: string;
  offerId: string;
  offerItemIds: string[];
  passengers: OrderCreatePassenger[];
  payment: {
    method: 'CASH' | 'CC' | 'OTHER';
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    cardHolder?: string;
  };
}

export const orderCreate = async (
  resolved: ResolvedCredentials,
  input: OrderCreateInput,
  orgId?: string
) =>
  sabreRestCall<Record<string, unknown>>(resolved, {
    op: 'bookNdc',
    orgId,
    path: '/v1/orders/create',
    method: 'POST',
    body: {
      OrderCreateRQ: {
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
          Passengers: {
            Passenger: input.passengers.map((p) => ({
              PassengerID: p.passengerId,
              Individual: {
                GivenName: p.givenName,
                Surname: p.surname,
                TitleName: p.title,
                Birthdate: p.birthDate
              },
              ContactInfo: {
                EmailAddress: { EmailAddressValue: p.contact.email },
                PhoneNumber: { FullPhoneNumber: p.contact.phone }
              },
              IdentityDocument: p.document
                ? {
                    IdentityDocumentNumber: p.document.number,
                    ExpiryDate: p.document.expiry,
                    IssuingCountryCode: p.document.issuingCountry
                  }
                : undefined
            }))
          },
          Payments:
            input.payment.method === 'CC'
              ? {
                  Payment: [
                    {
                      Method: {
                        PaymentCard: {
                          CardNumber: { value: input.payment.cardNumber },
                          ExpirationDate: input.payment.expiry,
                          CardHolderName: { value: input.payment.cardHolder },
                          SeriesCode: { value: input.payment.cvv }
                        }
                      }
                    }
                  ]
                }
              : { Payment: [{ Method: { Cash: {} } }] }
        }
      }
    }
  });
