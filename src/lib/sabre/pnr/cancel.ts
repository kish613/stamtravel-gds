import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

export interface CancelInput {
  locator: string;
  segmentNumbers?: number[];
}

const buildBody = (input: CancelInput): string => `
  <OTA_CancelRQ xmlns="http://webservices.sabre.com/sabreXML/2003/07" Version="2.0.2">
    <Segment Number="${input.segmentNumbers?.join(',') ?? 'ALL'}"/>
  </OTA_CancelRQ>
`;

export const cancelItinerary = async (
  resolved: ResolvedCredentials,
  input: CancelInput,
  orgId: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'cancel',
    orgId,
    service: 'OTA_CancelLLSRQ',
    action: 'OTA_CancelLLSRQ',
    bodyXml: buildBody(input)
  });
