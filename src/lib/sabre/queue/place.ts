import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

export interface QueuePlaceInput {
  locator: string;
  queueNumber: string;
  comment?: string;
}

const buildBody = (pcc: string, input: QueuePlaceInput): string => `
  <QueuePlaceRQ xmlns="http://webservices.sabre.com/sabreXML/2003/07" Version="2.0.9">
    <QueueInfo Number="${input.queueNumber}">
      <QueuePlace PseudoCityCode="${pcc}">
        ${input.comment ? `<Text>${input.comment}</Text>` : ''}
      </QueuePlace>
    </QueueInfo>
    <PNR_Locator>${input.locator}</PNR_Locator>
  </QueuePlaceRQ>
`;

export const queuePlace = async (
  resolved: ResolvedCredentials,
  input: QueuePlaceInput,
  orgId: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'queueWrite',
    orgId,
    service: 'QueuePlaceLLSRQ',
    action: 'QueuePlaceLLSRQ',
    bodyXml: buildBody(resolved.creds.pcc, input)
  });
