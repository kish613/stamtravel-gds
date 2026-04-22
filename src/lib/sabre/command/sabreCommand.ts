import { sabreSoapCall } from '../soap/client';
import type { ResolvedCredentials } from '../types';

const escape = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) =>
    c === '<'
      ? '&lt;'
      : c === '>'
        ? '&gt;'
        : c === '&'
          ? '&amp;'
          : c === "'"
            ? '&apos;'
            : '&quot;'
  );

const buildBody = (hostCommand: string): string => `
  <SabreCommandLLSRQ xmlns="http://webservices.sabre.com/sabreXML/2011/10" Version="2.6.1">
    <Request Output="SCREEN"><HostCommand>${escape(hostCommand)}</HostCommand></Request>
  </SabreCommandLLSRQ>
`;

const extractScreen = (xml: string): string => {
  const m = xml.match(/<Response>([\s\S]*?)<\/Response>/);
  if (!m) return '';
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export const sendSabreCommand = async (
  resolved: ResolvedCredentials,
  hostCommand: string,
  orgId: string
): Promise<string> => {
  const xml = await sabreSoapCall(resolved, {
    op: 'sabreCommand',
    orgId,
    service: 'SabreCommandLLSRQ',
    action: 'SabreCommandLLSRQ',
    bodyXml: buildBody(hostCommand)
  });
  return extractScreen(xml);
};
