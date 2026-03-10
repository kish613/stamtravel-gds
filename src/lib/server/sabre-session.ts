import { callSabre } from './sabre-soap-client';
import { getSabreConfig } from './sabre-config';

export async function createSession(): Promise<string> {
  const config = getSabreConfig();

  const body = `<SessionCreateRQ Version="1" xmlns="http://www.opentravel.org/OTA/2002/11">
    <POS>
      <Source PseudoCityCode="${config.pcc}"/>
    </POS>
  </SessionCreateRQ>`;

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eb="http://www.ebxml.org/namespaces/messageHeader"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsd="http://www.w3.org/1999/XMLSchema">
  <SOAP-ENV:Header>
    <eb:MessageHeader SOAP-ENV:mustUnderstand="1" eb:version="1.0">
      <eb:From><eb:PartyId>${config.pcc}</eb:PartyId></eb:From>
      <eb:To><eb:PartyId>SWS</eb:PartyId></eb:To>
      <eb:CPAId>${config.pcc}</eb:CPAId>
      <eb:Action>SessionCreateRQ</eb:Action>
    </eb:MessageHeader>
    <wsse:Security xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext">
      <wsse:UsernameToken>
        <wsse:Username>${config.username}</wsse:Username>
        <wsse:Password>${config.password}</wsse:Password>
        <Organization>${config.pcc}</Organization>
        <Domain>${config.domain}</Domain>
      </wsse:UsernameToken>
    </wsse:Security>
  </SOAP-ENV:Header>
  <SOAP-ENV:Body>
    ${body}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: 'SessionCreateRQ'
    },
    body: envelope
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`SessionCreateRQ failed: HTTP ${res.status} — ${raw.slice(0, 200)}`);
  }

  const tokenMatch = raw.match(
    /<wsse:BinarySecurityToken[^>]*>([^<]+)<\/wsse:BinarySecurityToken>/
  );

  if (!tokenMatch?.[1]) {
    throw new Error('SessionCreateRQ: no security token in response');
  }

  return tokenMatch[1];
}

export async function closeSession(token: string): Promise<void> {
  const config = getSabreConfig();

  try {
    await callSabre({
      endpoint: config.endpoint,
      action: 'SessionCloseRQ',
      token,
      body: `<SessionCloseRQ Version="1" xmlns="http://www.opentravel.org/OTA/2002/11">
        <POS>
          <Source PseudoCityCode="${config.pcc}"/>
        </POS>
      </SessionCloseRQ>`,
      timeout: 10_000
    });
  } catch {
    console.warn('Failed to close Sabre session (non-fatal)');
  }
}

export async function withSession<T>(
  fn: (token: string) => Promise<T>
): Promise<T> {
  const token = await createSession();
  try {
    return await fn(token);
  } finally {
    await closeSession(token);
  }
}
