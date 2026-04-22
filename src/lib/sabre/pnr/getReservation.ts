import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

export interface GetReservationInput {
  locator: string;
}

const buildBody = (locator: string): string => `
  <GetReservationRQ xmlns="http://webservices.sabre.com/pnrbuilder/v1_19" Version="1.19.11">
    <Locator>${locator}</Locator>
    <RequestType>Stateless</RequestType>
    <ReturnOptions PriceQuoteServiceVersion="3.4.0">
      <SubjectAreas>
        <SubjectArea>ITINERARY</SubjectArea>
        <SubjectArea>PASSENGER</SubjectArea>
        <SubjectArea>TICKETING</SubjectArea>
        <SubjectArea>REMARKS</SubjectArea>
        <SubjectArea>SPECIAL_SERVICES</SubjectArea>
        <SubjectArea>QUEUE</SubjectArea>
      </SubjectAreas>
    </ReturnOptions>
  </GetReservationRQ>
`;

export const getReservation = async (
  resolved: ResolvedCredentials,
  input: GetReservationInput,
  orgId?: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'retrievePnr',
    orgId,
    service: 'GetReservationRQ',
    action: 'GetReservationRQ',
    bodyXml: buildBody(input.locator)
  });
