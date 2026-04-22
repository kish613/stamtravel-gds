import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

export interface QueueRemoveInput {
  queueNumber: string;
  locator?: string;
}

const buildBody = (pcc: string, input: QueueRemoveInput): string => `
  <QueueRemoveRQ xmlns="http://webservices.sabre.com/sabreXML/2003/07" Version="2.0.4">
    <QueueIdentifier PseudoCityCode="${pcc}" Number="${input.queueNumber}"/>
    ${input.locator ? `<PNR_Locator>${input.locator}</PNR_Locator>` : ''}
  </QueueRemoveRQ>
`;

export const queueRemove = async (
  resolved: ResolvedCredentials,
  input: QueueRemoveInput,
  orgId: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'queueWrite',
    orgId,
    service: 'QueueRemoveLLSRQ',
    action: 'QueueRemoveLLSRQ',
    bodyXml: buildBody(resolved.creds.pcc, input)
  });
