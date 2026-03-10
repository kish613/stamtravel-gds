import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => {
    const arrayTags = [
      'PricedItinerary', 'AirItinerary', 'FlightSegment',
      'OriginDestinationOption', 'PassengerTypeQuantity',
      'FareBreakdown', 'Row', 'Column', 'Seat',
      'Item', 'QueueCount'
    ];
    return arrayTags.includes(name);
  }
});

export interface SoapCallOptions {
  endpoint: string;
  action: string;
  token?: string;
  body: string;
  timeout?: number;
}

export interface SoapResponse {
  parsed: Record<string, unknown>;
  raw: string;
}

function wrapEnvelope(body: string, token?: string): string {
  const securityHeader = token
    ? `<wsse:Security xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext">
         <wsse:BinarySecurityToken valueType="String" EncodingType="wsse:Base64Binary">${token}</wsse:BinarySecurityToken>
       </wsse:Security>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eb="http://www.ebxml.org/namespaces/messageHeader"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsd="http://www.w3.org/1999/XMLSchema">
  <SOAP-ENV:Header>
    <eb:MessageHeader SOAP-ENV:mustUnderstand="1" eb:version="1.0">
      <eb:Action>${body.match(/<(\w+:)?(\w+RQ|OTA_\w+RQ)/)?.[0]?.replace('<', '') ?? 'Unknown'}</eb:Action>
    </eb:MessageHeader>
    ${securityHeader}
  </SOAP-ENV:Header>
  <SOAP-ENV:Body>
    ${body}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

export async function callSabre(options: SoapCallOptions): Promise<SoapResponse> {
  const { endpoint, action, token, body, timeout = 30_000 } = options;
  const envelope = wrapEnvelope(body, token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: action
      },
      body: envelope,
      signal: controller.signal
    });

    const raw = await res.text();

    if (!res.ok) {
      const faultMatch = raw.match(/<faultstring>([^<]+)<\/faultstring>/);
      throw new Error(faultMatch?.[1] || `Sabre SOAP error: HTTP ${res.status}`);
    }

    const parsed = parser.parse(raw);
    const envelope_parsed = parsed?.['Envelope'] ?? parsed;
    const soapBody = envelope_parsed?.['Body'] ?? {};

    if (soapBody['Fault']) {
      const fault = soapBody['Fault'];
      throw new Error(fault['faultstring'] || fault['detail'] || 'Unknown SOAP fault');
    }

    return { parsed: soapBody, raw };
  } finally {
    clearTimeout(timer);
  }
}
