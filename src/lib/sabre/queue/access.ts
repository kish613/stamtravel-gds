import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

const buildBody = (pcc: string, queueNumber: string): string => `
  <QueueAccessRQ xmlns="http://webservices.sabre.com/sabreXML/2003/07" Version="2.1.1">
    <QueueIdentifier PseudoCityCode="${pcc}" Number="${queueNumber}"/>
    <ReturnList/>
  </QueueAccessRQ>
`;

export const queueAccess = async (
  resolved: ResolvedCredentials,
  queueNumber: string,
  orgId: string
): Promise<string> =>
  sabreSoapCall(resolved, {
    op: 'queueRead',
    orgId,
    service: 'QueueAccessLLSRQ',
    action: 'QueueAccessLLSRQ',
    bodyXml: buildBody(resolved.creds.pcc, queueNumber)
  });
