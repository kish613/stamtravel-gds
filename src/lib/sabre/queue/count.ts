import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

const buildBody = (pcc: string): string => `
  <QueueCountRQ xmlns="http://webservices.sabre.com/sabreXML/2003/07" Version="2.0.6">
    <QueueIdentifier PseudoCityCode="${pcc}"/>
  </QueueCountRQ>
`;

export const queueCount = async (
  resolved: ResolvedCredentials,
  orgId: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'queueRead',
    orgId,
    service: 'QueueCountLLSRQ',
    action: 'QueueCountLLSRQ',
    bodyXml: buildBody(resolved.creds.pcc)
  });
