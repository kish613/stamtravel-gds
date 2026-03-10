# Sabre SOAP API Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mock fixture data in sabre-service.ts with real Sabre SOAP/XML API calls against the cert environment, controlled by an API_MODE env var so mock mode remains available.

**Architecture:** The existing API routes (`/api/mock/*`) already import functions from `@/lib/server/sabre-service`. We implement that service to either call real Sabre SOAP endpoints or fall back to fixture data based on `API_MODE`. A thin SOAP client handles XML envelope wrapping, session tokens, and HTTP transport. XML templates build requests; response mappers convert parsed XML to existing TypeScript types.

**Tech Stack:** Next.js 16 server-side, `fast-xml-parser` for XML parsing, native `fetch` for HTTP, template literals for XML building.

---

### Task 1: Environment Template & Config Reader

**Files:**
- Create: `.env.example`
- Create: `src/lib/server/sabre-config.ts`

**Step 1: Create `.env.example`**

```env
# Sabre SOAP API — Cert Environment
# Get these from your Sabre account manager
SABRE_SOAP_ENDPOINT=https://sws-crt.cert.havail.sabre.com
SABRE_USERNAME=
SABRE_PASSWORD=
SABRE_PCC=
SABRE_DOMAIN=DEFAULT

# App mode: "live" uses real Sabre, "mock" uses fixture JSON data
API_MODE=mock
```

**Step 2: Create `src/lib/server/sabre-config.ts`**

```typescript
export interface SabreConfig {
  endpoint: string;
  username: string;
  password: string;
  pcc: string;
  domain: string;
}

export function getSabreConfig(): SabreConfig {
  const endpoint = process.env.SABRE_SOAP_ENDPOINT;
  const username = process.env.SABRE_USERNAME;
  const password = process.env.SABRE_PASSWORD;
  const pcc = process.env.SABRE_PCC;
  const domain = process.env.SABRE_DOMAIN || 'DEFAULT';

  if (!endpoint || !username || !password || !pcc) {
    throw new Error(
      'Missing Sabre config. Set SABRE_SOAP_ENDPOINT, SABRE_USERNAME, SABRE_PASSWORD, and SABRE_PCC in .env.local'
    );
  }

  return { endpoint, username, password, pcc, domain };
}

export function isLiveMode(): boolean {
  return process.env.API_MODE === 'live';
}
```

**Step 3: Commit**

```bash
git add .env.example src/lib/server/sabre-config.ts
git commit -m "feat: add Sabre env template and config reader"
```

---

### Task 2: Install `fast-xml-parser` & SOAP Client

**Files:**
- Modify: `package.json` (npm install)
- Create: `src/lib/server/sabre-soap-client.ts`

**Step 1: Install dependency**

```bash
npm install fast-xml-parser
```

**Step 2: Create `src/lib/server/sabre-soap-client.ts`**

This is the core SOAP transport layer. It:
- Wraps any XML body in a SOAP envelope with `wsse:Security` header containing the binary security token
- POSTs to the Sabre endpoint with the correct SOAPAction header
- Parses the XML response into a JS object
- Extracts and throws SOAP faults as errors

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => {
    // Sabre often returns single items that should be arrays
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
  /** Milliseconds, default 30000 */
  timeout?: number;
}

export interface SoapResponse {
  parsed: Record<string, unknown>;
  raw: string;
}

/**
 * Wrap XML body in a SOAP envelope. If token is provided, include wsse:Security header.
 */
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

/**
 * Call a Sabre SOAP endpoint. Returns the parsed body content.
 */
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
      // Try to extract a SOAP fault message
      const faultMatch = raw.match(/<faultstring>([^<]+)<\/faultstring>/);
      throw new Error(
        faultMatch?.[1] || `Sabre SOAP error: HTTP ${res.status}`
      );
    }

    const parsed = parser.parse(raw);

    // Check for SOAP faults inside the envelope
    const envelope_parsed = parsed?.['Envelope'] ?? parsed;
    const soapBody = envelope_parsed?.['Body'] ?? {};

    if (soapBody['Fault']) {
      const fault = soapBody['Fault'];
      throw new Error(
        fault['faultstring'] || fault['detail'] || 'Unknown SOAP fault'
      );
    }

    return { parsed: soapBody, raw };
  } finally {
    clearTimeout(timer);
  }
}
```

**Step 3: Commit**

```bash
git add package.json package-lock.json src/lib/server/sabre-soap-client.ts
git commit -m "feat: add Sabre SOAP client with XML parsing"
```

---

### Task 3: Session Management

**Files:**
- Create: `src/lib/server/sabre-session.ts`

**Step 1: Create `src/lib/server/sabre-session.ts`**

Handles `SessionCreateRQ` and `SessionCloseRQ`. Each service call will create a session, use it, and close it.

```typescript
import { callSabre } from './sabre-soap-client';
import { getSabreConfig } from './sabre-config';

/**
 * Create a Sabre session. Returns the binary security token.
 */
export async function createSession(): Promise<string> {
  const config = getSabreConfig();

  const body = `<SessionCreateRQ Version="1" xmlns="http://www.opentravel.org/OTA/2002/11">
    <POS>
      <Source PseudoCityCode="${config.pcc}"/>
    </POS>
  </SessionCreateRQ>`;

  // SessionCreateRQ uses Basic auth in the Security header, not a token
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

  // Extract BinarySecurityToken from response
  const tokenMatch = raw.match(
    /<wsse:BinarySecurityToken[^>]*>([^<]+)<\/wsse:BinarySecurityToken>/
  );

  if (!tokenMatch?.[1]) {
    throw new Error('SessionCreateRQ: no security token in response');
  }

  return tokenMatch[1];
}

/**
 * Close a Sabre session.
 */
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
    // Best-effort close — don't throw if close fails
    console.warn('Failed to close Sabre session (non-fatal)');
  }
}

/**
 * Execute a function within a Sabre session. Automatically creates and closes the session.
 */
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
```

**Step 2: Commit**

```bash
git add src/lib/server/sabre-session.ts
git commit -m "feat: add Sabre session management with withSession helper"
```

---

### Task 4: XML Request Templates

**Files:**
- Create: `src/lib/server/sabre-xml-templates.ts`

**Step 1: Create `src/lib/server/sabre-xml-templates.ts`**

Template literal functions for each Sabre SOAP request. Each returns a raw XML string (no envelope — the SOAP client wraps it).

```typescript
import type {
  AirSearchParams,
  CreatePnrInput,
  FlightResult,
  QueueMutationInput,
  SeatAssignmentInput
} from '@/lib/types';
import { getSabreConfig } from './sabre-config';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string): string {
  // Ensure YYYY-MM-DD format
  return dateStr.slice(0, 10);
}

export function buildBargainFinderMaxRQ(params: AirSearchParams): string {
  const config = getSabreConfig();
  const departDate = params.departure ? formatDate(params.departure) : '';
  const returnDate = params.returnDate ? formatDate(params.returnDate) : '';

  const cabinMap: Record<string, string> = {
    Economy: 'Y',
    'Premium Economy': 'S',
    Business: 'C',
    First: 'F'
  };
  const cabin = cabinMap[params.cabin] || 'Y';

  let originDestinations = `
    <OriginDestinationInformation RPH="1">
      <DepartureDateTime>${departDate}T00:00:00</DepartureDateTime>
      <OriginLocation LocationCode="${escapeXml(params.origin)}"/>
      <DestinationLocation LocationCode="${escapeXml(params.destination)}"/>
    </OriginDestinationInformation>`;

  if (params.tripType === 'return' && returnDate) {
    originDestinations += `
    <OriginDestinationInformation RPH="2">
      <DepartureDateTime>${returnDate}T00:00:00</DepartureDateTime>
      <OriginLocation LocationCode="${escapeXml(params.destination)}"/>
      <DestinationLocation LocationCode="${escapeXml(params.origin)}"/>
    </OriginDestinationInformation>`;
  }

  const passengers: string[] = [];
  if (params.adults > 0) {
    passengers.push(`<PassengerTypeQuantity Code="ADT" Quantity="${params.adults}"/>`);
  }
  if (params.children > 0) {
    passengers.push(`<PassengerTypeQuantity Code="CNN" Quantity="${params.children}"/>`);
  }
  if (params.infants > 0) {
    passengers.push(`<PassengerTypeQuantity Code="INF" Quantity="${params.infants}"/>`);
  }

  const airlineFilter = params.preferredAirline
    ? `<VendorPref Code="${escapeXml(params.preferredAirline)}" PreferLevel="Preferred"/>`
    : '';

  return `<OTA_AirLowFareSearchRQ Version="5" xmlns="http://www.opentravel.org/OTA/2003/05"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <POS>
      <Source PseudoCityCode="${config.pcc}">
        <RequestorID Type="1" ID="1" CompanyName="TN"/>
      </Source>
    </POS>
    ${originDestinations}
    <TravelPreferences>
      <CabinPref Cabin="${cabin}"/>
      ${params.maxStops !== undefined ? `<MaxStopsQuantity Value="${params.maxStops}"/>` : ''}
      ${airlineFilter}
    </TravelPreferences>
    <TravelerInfoSummary>
      <AirTravelerAvail>
        ${passengers.join('\n        ')}
      </AirTravelerAvail>
    </TravelerInfoSummary>
    <TPA_Extensions>
      <IntelliSellTransaction>
        <RequestType Name="200ITINS"/>
      </IntelliSellTransaction>
    </TPA_Extensions>
  </OTA_AirLowFareSearchRQ>`;
}

export function buildRevalidateItinRQ(flight: FlightResult): string {
  const config = getSabreConfig();
  return `<OTA_AirLowFareSearchRQ Version="5" xmlns="http://www.opentravel.org/OTA/2003/05">
    <POS>
      <Source PseudoCityCode="${config.pcc}">
        <RequestorID Type="1" ID="1" CompanyName="TN"/>
      </Source>
    </POS>
    <OriginDestinationInformation RPH="1">
      <DepartureDateTime>${formatDate(flight.departure)}T00:00:00</DepartureDateTime>
      <OriginLocation LocationCode="${escapeXml(flight.origin)}"/>
      <DestinationLocation LocationCode="${escapeXml(flight.destination)}"/>
    </OriginDestinationInformation>
    <TravelPreferences>
      <VendorPref Code="${escapeXml(flight.airline)}" PreferLevel="Only"/>
    </TravelPreferences>
    <TravelerInfoSummary>
      <AirTravelerAvail>
        <PassengerTypeQuantity Code="ADT" Quantity="1"/>
      </AirTravelerAvail>
    </TravelerInfoSummary>
    <TPA_Extensions>
      <IntelliSellTransaction>
        <RequestType Name="REVALIDATE"/>
      </IntelliSellTransaction>
    </TPA_Extensions>
  </OTA_AirLowFareSearchRQ>`;
}

export function buildCreatePnrRQ(input: CreatePnrInput): string {
  const config = getSabreConfig();
  const { segments, passengers, contact, pricing, remarks, ssrs } = input.payload;

  const segmentXml = segments
    .map(
      (seg, i) => `
      <FlightSegment DepartureDateTime="${seg.departure}" ArrivalDateTime="${seg.arrival}"
        FlightNumber="${escapeXml(seg.flightNumber)}" NumberInParty="${passengers.length}"
        ResBookDesigCode="${seg.cabin === 'Economy' ? 'Y' : seg.cabin === 'Business' ? 'C' : seg.cabin === 'First' ? 'F' : 'Y'}"
        Status="NN">
        <DestinationLocation LocationCode="${escapeXml(seg.to)}"/>
        <MarketingAirline Code="${escapeXml(seg.carrier)}" FlightNumber="${escapeXml(seg.flightNumber)}"/>
        <OriginLocation LocationCode="${escapeXml(seg.from)}"/>
      </FlightSegment>`
    )
    .join('');

  const passengerXml = passengers
    .map(
      (pax, i) => `
      <PersonName NameNumber="${i + 1}.1">
        <GivenName>${escapeXml(pax.firstName)} ${escapeXml(pax.title)}</GivenName>
        <Surname>${escapeXml(pax.lastName)}</Surname>
      </PersonName>`
    )
    .join('');

  const contactXml = `
    <ContactNumbers>
      <ContactNumber Phone="${escapeXml(contact.phone)}" PhoneUseType="H"/>
    </ContactNumbers>`;

  const ticketingXml = contact.ticketingArrangement === 'Ticket By Date' && contact.ticketByDate
    ? `<TicketingInfo TicketTimeLimit="${formatDate(contact.ticketByDate)}T23:59:00"/>`
    : `<TicketingInfo TicketType="7TAW"/>`;

  return `<CreatePassengerNameRecordRQ version="2.4.0"
    xmlns="http://services.sabre.com/sp/updatereservation/v2_4"
    xmlns:ns2="http://www.opentravel.org/OTA/2003/05"
    xmlns:ns3="http://services.sabre.com/sp/common/v3">
    <TravelItineraryAddInfo>
      <AgencyInfo>
        <Ticketing PseudoCityCode="${config.pcc}" TicketType="7TAW"/>
      </AgencyInfo>
      <CustomerInfo>
        ${passengerXml}
        ${contactXml}
      </CustomerInfo>
    </TravelItineraryAddInfo>
    <AirBook>
      <OriginDestinationInformation>
        ${segmentXml}
      </OriginDestinationInformation>
    </AirBook>
    <PostProcessing>
      <EndTransaction>
        <Source ReceivedFrom="STAMTRAVEL"/>
      </EndTransaction>
    </PostProcessing>
  </CreatePassengerNameRecordRQ>`;
}

export function buildGetReservationRQ(locator: string): string {
  return `<GetReservationRQ Version="1.19.0"
    xmlns="http://webservices.sabre.com/pnrbuilder/v1_19">
    <Locator>${escapeXml(locator)}</Locator>
    <RequestType>Stateful</RequestType>
    <ReturnOptions>
      <SubjectAreas>
        <SubjectArea>FULL</SubjectArea>
      </SubjectAreas>
    </ReturnOptions>
  </GetReservationRQ>`;
}

export function buildTravelItineraryReadRQ(): string {
  return `<TravelItineraryReadRQ Version="3.10.0"
    xmlns="http://services.sabre.com/res/tir/v3_10">
    <MessagingDetails>
      <SubjectAreas>
        <SubjectArea>FULL</SubjectArea>
      </SubjectAreas>
    </MessagingDetails>
  </TravelItineraryReadRQ>`;
}

export function buildEnhancedSeatMapRQ(flightNumber: string, carrier: string, departure: string, origin: string, destination: string): string {
  return `<EnhancedSeatMapRQ Version="7" xmlns="http://stl.sabre.com/Merchandising/v7">
    <SeatMapQueryEnhanced>
      <RequestType>Payload</RequestType>
      <Flight>
        <DepartureDate>${formatDate(departure)}</DepartureDate>
        <Departure>
          <AirportCode>${escapeXml(origin)}</AirportCode>
        </Departure>
        <Arrival>
          <AirportCode>${escapeXml(destination)}</AirportCode>
        </Arrival>
        <Marketing carrier="${escapeXml(carrier)}">${escapeXml(flightNumber)}</Marketing>
      </Flight>
    </SeatMapQueryEnhanced>
  </EnhancedSeatMapRQ>`;
}

export function buildQueueCountRQ(): string {
  const config = getSabreConfig();
  return `<QueueCountRQ Version="2.0.4" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <QueueInfo>
      <QueueIdentifier PseudoCityCode="${config.pcc}"/>
    </QueueInfo>
  </QueueCountRQ>`;
}

export function buildQueueAccessRQ(queue: string): string {
  const config = getSabreConfig();
  return `<QueueAccessRQ Version="2.0.9" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <QueueIdentifier PseudoCityCode="${config.pcc}" Number="${escapeXml(queue)}"/>
    <Navigation Action="QN"/>
  </QueueAccessRQ>`;
}

export function buildQueuePlaceRQ(locator: string, queue: string): string {
  const config = getSabreConfig();
  return `<QueuePlaceRQ Version="2.0.3" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <QueueInfo>
      <QueueIdentifier Number="${escapeXml(queue)}" PseudoCityCode="${config.pcc}"/>
      <UniqueID ID="${escapeXml(locator)}"/>
    </QueueInfo>
  </QueuePlaceRQ>`;
}

export function buildQueueMoveItemRQ(input: QueueMutationInput): string {
  const config = getSabreConfig();
  return `<QueueMoveItemRQ Version="2.0.4" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <QueueInfo>
      <QueueIdentifier Number="${escapeXml(input.fromQueue || '0')}" PseudoCityCode="${config.pcc}"/>
      <UniqueID ID="${escapeXml(input.locator)}"/>
    </QueueInfo>
    <MoveInfo>
      <QueueIdentifier Number="${escapeXml(input.toQueue)}" PseudoCityCode="${config.pcc}"/>
    </MoveInfo>
  </QueueMoveItemRQ>`;
}

export function buildSabreCommandLLSRQ(command: string): string {
  return `<SabreCommandLLSRQ Version="1.8.1"
    xmlns="http://webservices.sabre.com/sabreXML/2003/07">
    <Request Output="SCREEN" CDATA="true">
      <HostCommand>${escapeXml(command)}</HostCommand>
    </Request>
  </SabreCommandLLSRQ>`;
}

export function buildVoidTicketRQ(locator: string): string {
  return `<VoidTicketRQ Version="1.0.0" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <Ticketing>
      <UniqueID ID="${escapeXml(locator)}"/>
    </Ticketing>
  </VoidTicketRQ>`;
}

export function buildCancelRQ(segmentId?: string): string {
  const segmentAttr = segmentId ? ` Number="${escapeXml(segmentId)}"` : ' Type="Entire"';
  return `<OTA_CancelRQ Version="2.0.2" xmlns="http://webservices.sabre.com/sabreXML/2011/10">
    <Segment${segmentAttr}/>
  </OTA_CancelRQ>`;
}

export function buildPassengerSeatMapRQ(input: SeatAssignmentInput): string {
  return `<UpdatePassengerNameRecordRQ version="1.0.0"
    xmlns="http://services.sabre.com/sp/updatereservation/v1">
    <Itinerary id="${escapeXml(input.locator)}"/>
    <AirSeat>
      <Seats>
        <Seat NameNumber="1.1" Designation="${escapeXml(input.seatCode)}"
              SegmentNumber="${escapeXml(input.segmentId)}"/>
      </Seats>
    </AirSeat>
    <PostProcessing>
      <EndTransaction>
        <Source ReceivedFrom="STAMTRAVEL"/>
      </EndTransaction>
    </PostProcessing>
  </UpdatePassengerNameRecordRQ>`;
}
```

**Step 2: Commit**

```bash
git add src/lib/server/sabre-xml-templates.ts
git commit -m "feat: add Sabre SOAP XML request templates"
```

---

### Task 5: Response Mappers

**Files:**
- Create: `src/lib/server/sabre-response-maps.ts`

**Step 1: Create `src/lib/server/sabre-response-maps.ts`**

Each mapper converts parsed XML (from `fast-xml-parser`) into the existing TypeScript types defined in `src/lib/types.ts`. These are best-effort mappings — Sabre's XML is deeply nested and varies by version. The mappers extract the fields the UI needs and provide sensible defaults for missing data.

```typescript
import type {
  FlightResult,
  PNR,
  Passenger,
  Segment,
  Seat,
  SeatMap,
  QueueBucket,
  QueueItem,
  SabreMutationResult,
  SabreCapability,
  SabreCommandResponse
} from '@/lib/types';

/** Safely access nested properties */
function dig(obj: unknown, ...keys: string[]): unknown {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

function toStr(val: unknown): string {
  if (val == null) return '';
  return String(val);
}

function toNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

export function mapFlightResults(parsed: Record<string, unknown>): FlightResult[] {
  const response = dig(parsed, 'OTA_AirLowFareSearchRS') as Record<string, unknown> | undefined;
  if (!response) return [];

  const itineraries = toArray(dig(response, 'PricedItineraries', 'PricedItinerary') as unknown[]);
  const results: FlightResult[] = [];

  for (const itin of itineraries) {
    const itinObj = itin as Record<string, unknown>;
    const airItin = itinObj['AirItinerary'] as Record<string, unknown> | undefined;
    const odOptions = toArray(dig(airItin, 'OriginDestinationOptions', 'OriginDestinationOption') as unknown[]);

    for (const od of odOptions) {
      const segments = toArray(dig(od as Record<string, unknown>, 'FlightSegment') as unknown[]);
      if (segments.length === 0) continue;

      const firstSeg = segments[0] as Record<string, unknown>;
      const lastSeg = segments[segments.length - 1] as Record<string, unknown>;
      const marketing = firstSeg['MarketingAirline'] as Record<string, unknown> | undefined;

      const pricing = dig(itinObj, 'AirItineraryPricingInfo', 'ItinTotalFare', 'TotalFare') as Record<string, unknown> | undefined;

      results.push({
        id: `${toStr(marketing?.['@_Code'])}${toStr(firstSeg['@_FlightNumber'])}-${results.length}`,
        airline: toStr(marketing?.['@_Code']),
        flightNumber: `${toStr(marketing?.['@_Code'])}${toStr(firstSeg['@_FlightNumber'])}`,
        origin: toStr(dig(firstSeg, 'DepartureAirport', '@_LocationCode')),
        destination: toStr(dig(lastSeg, 'ArrivalAirport', '@_LocationCode')),
        departure: toStr(firstSeg['@_DepartureDateTime']),
        arrival: toStr(lastSeg['@_ArrivalDateTime']),
        durationMinutes: toNum(firstSeg['@_ElapsedTime']),
        stops: segments.length - 1,
        fareBasis: toStr(dig(itinObj, 'AirItineraryPricingInfo', 'FareBreakdown', 'FareBasis', '@_Code')),
        price: toNum(pricing?.['@_Amount']),
        currency: toStr(pricing?.['@_CurrencyCode'] ?? 'USD'),
        baggageAllowance: '23kg',
        refundable: false,
        fareRulesSummary: 'Non-refundable',
        contentType: 'ATPCO',
        contentSource: 'CLASSIC_GDS',
        bookingSupported: true,
        aircraft: toStr(dig(firstSeg, 'Equipment', '@_AirEquipType')),
        tripType: 'one-way'
      });
    }
  }

  return results;
}

export function mapPnr(parsed: Record<string, unknown>): PNR {
  const res = (dig(parsed, 'GetReservationRS') ?? dig(parsed, 'Reservation')) as Record<string, unknown> | undefined;
  if (!res) throw new Error('Could not parse reservation response');

  const locator = toStr(dig(res, 'Reservation', 'BookingDetails', 'RecordLocator') ?? dig(res, '@_Locator'));

  const travelers = toArray(dig(res, 'Reservation', 'PassengerReservation', 'Passengers', 'Passenger') as unknown[]);
  const passengers: Passenger[] = travelers.map((t) => {
    const p = t as Record<string, unknown>;
    return {
      title: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_NamePrefix')),
      firstName: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_GivenName')),
      lastName: toStr(dig(p, 'NameAssociations', 'NameAssociation', 'PreferCustomer', '@_Surname')),
      dob: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      issuingCountry: ''
    };
  });

  const segs = toArray(dig(res, 'Reservation', 'PassengerReservation', 'Segments', 'Segment') as unknown[]);
  const segments: Segment[] = segs.map((s) => {
    const seg = s as Record<string, unknown>;
    const air = (seg['Air'] ?? seg) as Record<string, unknown>;
    return {
      id: toStr(air['@_Id'] ?? air['@_SegmentNumber'] ?? '1'),
      from: toStr(dig(air, 'DepartureAirport') ?? air['@_DepartureAirport']),
      to: toStr(dig(air, 'ArrivalAirport') ?? air['@_ArrivalAirport']),
      carrier: toStr(dig(air, 'MarketingAirline', '@_Code') ?? air['@_MarketingAirlineCode']),
      flightNumber: toStr(air['@_FlightNumber']),
      departure: toStr(air['@_DepartureDateTime']),
      arrival: toStr(air['@_ArrivalDateTime']),
      durationMinutes: toNum(air['@_ElapsedTime']),
      stops: 0,
      cabin: 'Economy' as const,
      fareType: 'ATPCO' as const,
      contentSource: 'CLASSIC_GDS' as const,
      deadlineAt: ''
    };
  });

  const passengerName = passengers.length > 0
    ? `${passengers[0].lastName}/${passengers[0].firstName}`
    : 'UNKNOWN';

  const route = segments.length > 0
    ? `${segments[0].from}-${segments[segments.length - 1].to}`
    : '';

  return {
    locator,
    status: 'Booked',
    contentSource: 'CLASSIC_GDS',
    passengerName,
    route,
    createdAt: new Date().toISOString(),
    departureDate: segments[0]?.departure ?? '',
    segments,
    passengers,
    contact: { phone: '', email: '', agencyIata: '' },
    pricing: { total: 0, taxes: 0, fees: 0, currency: 'USD' },
    ttlMinutes: 60,
    history: [],
    queue: ''
  };
}

export function mapPnrList(parsed: Record<string, unknown>): PNR[] {
  // TravelItineraryReadRQ returns current session PNR
  // For a list, we'd typically use queue access or terminal commands
  // This is a simplified mapper
  try {
    return [mapPnr(parsed)];
  } catch {
    return [];
  }
}

export function mapSeatMap(parsed: Record<string, unknown>): SeatMap {
  const response = dig(parsed, 'EnhancedSeatMapRS') as Record<string, unknown> | undefined;
  const seatMapDetail = dig(response, 'SeatMap') as Record<string, unknown> | undefined;
  const cabinRows = toArray(dig(seatMapDetail, 'Cabin', 'Row') as unknown[]);

  const rows: Seat[][] = [];
  const premiumRows: number[] = [];

  for (const row of cabinRows) {
    const rowObj = row as Record<string, unknown>;
    const rowNumber = toNum(rowObj['@_RowNumber']);
    const columns = toArray(rowObj['Column'] as unknown[]);

    const seats: Seat[] = columns.map((col) => {
      const c = col as Record<string, unknown>;
      const isOccupied = toStr(c['@_Occupied']) === 'true';
      const hasFee = toNum(dig(c, 'Charge', '@_Amount')) > 0;
      const isExit = toStr(c['@_ExitRow']) === 'true';

      let status: Seat['status'] = 'available';
      if (isOccupied) status = 'occupied';
      else if (isExit) status = 'exit';
      else if (hasFee) status = 'fee';

      return {
        row: rowNumber,
        col: toStr(c['@_Column']),
        status,
        fee: hasFee ? toNum(dig(c, 'Charge', '@_Amount')) : undefined
      };
    });

    rows.push(seats);
  }

  return {
    segmentId: '1',
    rows,
    premiumRows
  };
}

export function mapQueueBuckets(parsedCount: Record<string, unknown>, parsedAccess: Record<string, Record<string, unknown>>): QueueBucket[] {
  const countResponse = dig(parsedCount, 'QueueCountRS') as Record<string, unknown> | undefined;
  const queues = toArray(dig(countResponse, 'QueueCount') as unknown[]);

  const buckets: QueueBucket[] = [];

  for (const q of queues) {
    const qObj = q as Record<string, unknown>;
    const queueCode = toStr(qObj['@_Number'] ?? qObj['@_QueueNumber']);
    const count = toNum(qObj['@_Count']);

    const items: QueueItem[] = [];

    // If we have access data for this queue, map the items
    const accessData = parsedAccess[queueCode];
    if (accessData) {
      const accessItems = toArray(dig(accessData, 'QueueAccessRS', 'Item') as unknown[]);
      for (const item of accessItems) {
        const itemObj = item as Record<string, unknown>;
        items.push({
          locator: toStr(itemObj['@_RecordLocator'] ?? itemObj['@_ID']),
          passengerName: toStr(itemObj['@_PassengerName'] ?? ''),
          departureDate: toStr(itemObj['@_DepartureDate'] ?? ''),
          route: toStr(itemObj['@_Route'] ?? ''),
          deadlineAt: toStr(itemObj['@_Deadline'] ?? ''),
          segmentsCount: toNum(itemObj['@_SegmentCount'], 1),
          status: 'Booked',
          agent: toStr(itemObj['@_Agent'] ?? '')
        });
      }
    }

    buckets.push({ queueCode, items });
  }

  return buckets;
}

export function mapMutationResult(parsed: Record<string, unknown>, locator: string): SabreMutationResult {
  // Generic mutation result — extract warnings and status from various response shapes
  const warnings: string[] = [];

  // Look for warning messages in common Sabre response locations
  const msgNodes = toArray(dig(parsed, 'ApplicationResults', 'Warning') as unknown[]);
  for (const msg of msgNodes) {
    const m = msg as Record<string, unknown>;
    const text = toStr(dig(m, 'SystemSpecificResults', 'Message') ?? m['#text'] ?? '');
    if (text) warnings.push(text);
  }

  return {
    locator,
    status: 'Booked',
    warnings,
    sabreRequestId: toStr(dig(parsed, '@_RequestId') ?? ''),
    statefulFollowUpRequired: false
  };
}

export function mapCapabilities(healthy: boolean): SabreCapability[] {
  const now = new Date().toISOString();
  return [
    { key: 'air-search', label: 'Air Shopping', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Connected to Sabre cert' : 'Connection failed', lastCheckedAt: now },
    { key: 'pnr-create', label: 'PNR Creation', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'ticketing', label: 'Ticketing', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'queues', label: 'Queue Management', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'seatmap', label: 'Seat Maps', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now },
    { key: 'terminal', label: 'Terminal / Cryptic', mode: healthy ? 'live' : 'disabled', configured: true, healthy, message: healthy ? 'Ready' : 'Unavailable', lastCheckedAt: now }
  ];
}

export function mapCommandResponse(parsed: Record<string, unknown>): SabreCommandResponse {
  const response = dig(parsed, 'SabreCommandLLSRS') as Record<string, unknown> | undefined;
  const output = toStr(dig(response, 'Response') ?? dig(response, 'Response', '#text') ?? '');
  return { output, warnings: [] };
}
```

**Step 2: Commit**

```bash
git add src/lib/server/sabre-response-maps.ts
git commit -m "feat: add Sabre XML response mappers to TypeScript types"
```

---

### Task 6: Sabre Service (Core Business Logic)

**Files:**
- Create: `src/lib/server/sabre-service.ts`

**Step 1: Create `src/lib/server/sabre-service.ts`**

This replaces the mock/fixture service. When `API_MODE=mock`, it falls back to fixture data. When `API_MODE=live`, it calls real Sabre SOAP endpoints.

```typescript
import { isLiveMode, getSabreConfig } from './sabre-config';
import { withSession } from './sabre-session';
import { callSabre } from './sabre-soap-client';
import {
  buildBargainFinderMaxRQ,
  buildRevalidateItinRQ,
  buildCreatePnrRQ,
  buildGetReservationRQ,
  buildEnhancedSeatMapRQ,
  buildQueueCountRQ,
  buildQueueAccessRQ,
  buildQueueMoveItemRQ,
  buildQueuePlaceRQ,
  buildSabreCommandLLSRQ,
  buildVoidTicketRQ,
  buildCancelRQ,
  buildPassengerSeatMapRQ
} from './sabre-xml-templates';
import {
  mapFlightResults,
  mapPnr,
  mapPnrList,
  mapSeatMap,
  mapQueueBuckets,
  mapMutationResult,
  mapCapabilities,
  mapCommandResponse
} from './sabre-response-maps';
import type {
  AirSearchParams,
  FlightResult,
  PNR,
  CreatePnrInput,
  PnrActionInput,
  SeatAssignmentInput,
  QueueMutationInput,
  QueueBucket,
  SeatMap,
  SabreMutationResult,
  SabreCapability,
  SabreCommandResponse
} from '@/lib/types';

// ── Fixture imports (mock mode) ──────────────────────────
import fixtureFlights from '@/fixtures/flights.json';
import fixturePnrs from '@/fixtures/pnr.json';
import fixtureQueues from '@/fixtures/queues.json';
import fixtureSeatmap from '@/fixtures/seatmap.json';

// ── Air Search ───────────────────────────────────────────

export async function searchAir(params: AirSearchParams): Promise<FlightResult[]> {
  if (!isLiveMode()) {
    return fixtureFlights as unknown as FlightResult[];
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'OTA_AirLowFareSearchRQ',
      token,
      body: buildBargainFinderMaxRQ(params)
    });
    return mapFlightResults(parsed);
  });
}

export async function revalidateAir(flight: FlightResult): Promise<SabreMutationResult> {
  if (!isLiveMode()) {
    return {
      locator: '',
      status: 'Booked',
      warnings: [],
      statefulFollowUpRequired: false
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'OTA_AirLowFareSearchRQ',
      token,
      body: buildRevalidateItinRQ(flight)
    });
    return mapMutationResult(parsed, '');
  });
}

// ── PNR Operations ───────────────────────────────────────

export async function createPnr(input: CreatePnrInput): Promise<SabreMutationResult> {
  if (!isLiveMode()) {
    return {
      locator: 'MOCK' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      status: 'Booked',
      warnings: [],
      statefulFollowUpRequired: false
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'CreatePassengerNameRecordRQ',
      token,
      body: buildCreatePnrRQ(input)
    });

    // Extract locator from response
    const locator =
      String(
        (parsed as Record<string, unknown>)?.['CreatePassengerNameRecordRS']
          ? ((parsed as Record<string, unknown>)['CreatePassengerNameRecordRS'] as Record<string, unknown>)?.['ItineraryRef']
            ? (((parsed as Record<string, unknown>)['CreatePassengerNameRecordRS'] as Record<string, unknown>)['ItineraryRef'] as Record<string, unknown>)?.['@_ID']
            : ''
          : ''
      ) || 'UNKNOWN';

    return mapMutationResult(parsed, locator);
  });
}

export async function getReservation(locator: string): Promise<PNR> {
  if (!isLiveMode()) {
    const pnrs = fixturePnrs as unknown as PNR[];
    const match = pnrs.find((p) => p.locator === locator);
    if (!match) throw new Error(`PNR ${locator} not found`);
    return match;
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'GetReservationRQ',
      token,
      body: buildGetReservationRQ(locator)
    });
    return mapPnr(parsed);
  });
}

export async function listPnrs(): Promise<PNR[]> {
  if (!isLiveMode()) {
    return fixturePnrs as unknown as PNR[];
  }

  // In live mode, listing PNRs requires queue access or terminal commands.
  // Sabre doesn't have a "list all PNRs" API — they're retrieved from queues.
  // For now, return items from all queues as the PNR list.
  const queues = await listQueues();
  const pnrs: PNR[] = [];

  for (const bucket of queues) {
    for (const item of bucket.items) {
      try {
        const pnr = await getReservation(item.locator);
        pnrs.push(pnr);
      } catch {
        // Skip PNRs we can't retrieve
      }
    }
  }

  return pnrs;
}

export async function applyPnrAction(locator: string, input: PnrActionInput): Promise<SabreMutationResult> {
  if (!isLiveMode()) {
    return {
      locator,
      status: input.action === 'void-ticket' ? 'Void' : input.action === 'cancel-all' ? 'Canceled' : 'Booked',
      warnings: [],
      statefulFollowUpRequired: false
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    let body: string;
    let action: string;

    switch (input.action) {
      case 'void-ticket':
        body = buildVoidTicketRQ(locator);
        action = 'VoidTicketRQ';
        break;
      case 'cancel-all':
        body = buildCancelRQ();
        action = 'OTA_CancelRQ';
        break;
      case 'cancel-segment':
        body = buildCancelRQ(input.segmentId);
        action = 'OTA_CancelRQ';
        break;
      case 'queue-place':
        body = buildQueuePlaceRQ(locator, input.queueCode || '0');
        action = 'QueuePlaceRQ';
        break;
      case 'issue-ticket':
        // Ticketing requires DesignatePrinterLLSRQ + AirTicketRQ in sequence
        // For cert, use terminal command as simpler approach
        body = buildSabreCommandLLSRQ(`W‡${locator}`);
        action = 'SabreCommandLLSRQ';
        break;
      default:
        throw new Error(`Unknown PNR action: ${input.action}`);
    }

    // For actions that need the PNR in the work area first, retrieve it
    if (['void-ticket', 'cancel-all', 'cancel-segment', 'issue-ticket'].includes(input.action)) {
      await callSabre({
        endpoint: config.endpoint,
        action: 'GetReservationRQ',
        token,
        body: buildGetReservationRQ(locator)
      });
    }

    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action,
      token,
      body
    });
    return mapMutationResult(parsed, locator);
  });
}

// ── Seat Maps ────────────────────────────────────────────

export async function getSeats(locator: string, segmentId: string): Promise<SeatMap> {
  if (!isLiveMode()) {
    return fixtureSeatmap as unknown as SeatMap;
  }

  // First get the PNR to find flight details for the segment
  const pnr = await getReservation(locator);
  const segment = pnr.segments.find((s) => s.id === segmentId);
  if (!segment) throw new Error(`Segment ${segmentId} not found in PNR ${locator}`);

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'EnhancedSeatMapRQ',
      token,
      body: buildEnhancedSeatMapRQ(
        segment.flightNumber,
        segment.carrier,
        segment.departure,
        segment.from,
        segment.to
      )
    });
    const seatMap = mapSeatMap(parsed);
    seatMap.segmentId = segmentId;
    return seatMap;
  });
}

export async function assignSeat(input: SeatAssignmentInput): Promise<SabreMutationResult> {
  if (!isLiveMode()) {
    return {
      locator: input.locator,
      status: 'Booked',
      warnings: [],
      seatCode: input.seatCode,
      statefulFollowUpRequired: false
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'UpdatePassengerNameRecordRQ',
      token,
      body: buildPassengerSeatMapRQ(input)
    });
    const result = mapMutationResult(parsed, input.locator);
    result.seatCode = input.seatCode;
    return result;
  });
}

// ── Queue Management ─────────────────────────────────────

export async function listQueues(): Promise<QueueBucket[]> {
  if (!isLiveMode()) {
    return fixtureQueues as unknown as QueueBucket[];
  }

  return withSession(async (token) => {
    const config = getSabreConfig();

    // Step 1: Get queue counts
    const { parsed: countParsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'QueueCountRQ',
      token,
      body: buildQueueCountRQ()
    });

    // Step 2: Access each non-empty queue to get items
    const accessData: Record<string, Record<string, unknown>> = {};
    const countResponse = (countParsed as Record<string, unknown>)?.['QueueCountRS'] as Record<string, unknown> | undefined;
    const queues = Array.isArray(countResponse?.['QueueCount']) ? countResponse!['QueueCount'] as Record<string, unknown>[] : [];

    for (const q of queues) {
      const queueCode = String(q['@_Number'] ?? q['@_QueueNumber'] ?? '');
      const count = Number(q['@_Count'] ?? 0);
      if (count > 0 && queueCode) {
        try {
          const { parsed: accessParsed } = await callSabre({
            endpoint: config.endpoint,
            action: 'QueueAccessRQ',
            token,
            body: buildQueueAccessRQ(queueCode)
          });
          accessData[queueCode] = accessParsed;
        } catch {
          // Skip queues we can't access
        }
      }
    }

    return mapQueueBuckets(countParsed, accessData);
  });
}

export async function moveQueueItem(input: QueueMutationInput): Promise<SabreMutationResult> {
  if (!isLiveMode()) {
    return {
      locator: input.locator,
      status: 'Booked',
      warnings: [],
      queueCode: input.toQueue,
      statefulFollowUpRequired: false
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();

    let body: string;
    let action: string;

    if (input.action === 'place') {
      body = buildQueuePlaceRQ(input.locator, input.toQueue);
      action = 'QueuePlaceRQ';
    } else {
      body = buildQueueMoveItemRQ(input);
      action = 'QueueMoveItemRQ';
    }

    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action,
      token,
      body
    });
    const result = mapMutationResult(parsed, input.locator);
    result.queueCode = input.toQueue;
    return result;
  });
}

// ── Terminal ─────────────────────────────────────────────

export async function runTerminalCommand(command: string): Promise<SabreCommandResponse> {
  if (!isLiveMode()) {
    return {
      output: `MOCK> ${command}\n\nThis is a simulated response. Set API_MODE=live to connect to Sabre.`,
      warnings: []
    };
  }

  return withSession(async (token) => {
    const config = getSabreConfig();
    const { parsed } = await callSabre({
      endpoint: config.endpoint,
      action: 'SabreCommandLLSRQ',
      token,
      body: buildSabreCommandLLSRQ(command)
    });
    return mapCommandResponse(parsed);
  });
}

// ── Capabilities ─────────────────────────────────────────

export async function getCapabilities(): Promise<SabreCapability[]> {
  if (!isLiveMode()) {
    return mapCapabilities(false).map((c) => ({
      ...c,
      mode: 'disabled' as const,
      message: 'Running in mock mode (API_MODE=mock)'
    }));
  }

  try {
    // Health check: try to create and close a session
    await withSession(async () => {});
    return mapCapabilities(true);
  } catch {
    return mapCapabilities(false);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/server/sabre-service.ts
git commit -m "feat: implement Sabre service with live/mock mode switching"
```

---

### Task 7: Fix Error Handler

**Files:**
- Rewrite: `src/lib/server/errors.ts`

The current `errors.ts` file appears corrupted (it's a binary archive fragment). Rewrite it with the `toErrorPayload` function that all API routes import.

**Step 1: Rewrite `src/lib/server/errors.ts`**

```typescript
export interface ErrorPayload {
  statusCode: number;
  body: {
    message: string;
    code?: string;
    warnings?: string[];
  };
}

export function toErrorPayload(error: unknown, fallbackMessage: string): ErrorPayload {
  if (error instanceof Error) {
    const isMissing = error.message.includes('not found') || error.message.includes('Not Found');
    return {
      statusCode: isMissing ? 404 : 500,
      body: {
        message: error.message || fallbackMessage,
        code: isMissing ? 'NOT_FOUND' : 'INTERNAL_ERROR'
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      message: fallbackMessage,
      code: 'INTERNAL_ERROR'
    }
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/server/errors.ts
git commit -m "fix: rewrite corrupted errors.ts with toErrorPayload"
```

---

### Task 8: Create `.env.local` Template & Verify Build

**Files:**
- Verify: `next.config.mjs` (no changes needed — just verify env vars are readable)

**Step 1: Create `.env.local` from template**

```bash
cp .env.example .env.local
```

The user fills in their actual credentials later. For now, `API_MODE=mock` is the default so everything works without credentials.

**Step 2: Verify the build compiles**

```bash
npm run build
```

Expected: Build succeeds. All API routes import from `sabre-service.ts` which falls back to fixtures when `API_MODE=mock`.

**Step 3: Verify dev server starts and mock mode works**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard` — should load with fixture data as before.

**Step 4: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "chore: verify build and mock mode after Sabre integration"
```

---

### Task 9: Smoke Test Live Mode (requires credentials)

This task is **only executable once the user provides Sabre cert credentials**.

**Step 1: Fill in `.env.local` with real credentials**

```env
SABRE_SOAP_ENDPOINT=https://sws-crt.cert.havail.sabre.com
SABRE_USERNAME=<real-username>
SABRE_PASSWORD=<real-password>
SABRE_PCC=<real-pcc>
SABRE_DOMAIN=DEFAULT
API_MODE=live
```

**Step 2: Test session creation**

Start dev server and navigate to `/dashboard`. The capabilities endpoint should show all services as `live` and `healthy`.

**Step 3: Test flight search**

Navigate to `/search/air`, search for a route (e.g., LHR to JFK, Economy, 1 adult). Should return real Sabre results.

**Step 4: Test terminal**

Open the terminal overlay and run a cryptic command like `1SLON` (availability). Should return real Sabre output.

**Step 5: Switch back to mock mode**

Set `API_MODE=mock` in `.env.local` and restart. Confirm fixture data loads again.

---

## Summary of Files Created/Modified

| File | Action |
|------|--------|
| `.env.example` | Create |
| `.env.local` | Create (from template, gitignored) |
| `src/lib/server/sabre-config.ts` | Create |
| `src/lib/server/sabre-soap-client.ts` | Create |
| `src/lib/server/sabre-session.ts` | Create |
| `src/lib/server/sabre-xml-templates.ts` | Create |
| `src/lib/server/sabre-response-maps.ts` | Create |
| `src/lib/server/sabre-service.ts` | Create (replaces corrupted archive) |
| `src/lib/server/errors.ts` | Rewrite (corrupted) |
| `package.json` | Modified (add `fast-xml-parser`) |

## Dependencies Added

- `fast-xml-parser` — XML parsing (45KB, zero deps)

## No Changes Required

- API routes (`src/app/api/mock/*`) — already import from sabre-service
- React Query hooks (`src/lib/query.ts`) — unchanged
- Client code — unchanged
- `src/lib/constants.ts` — `API_BASE_URL` stays `/api/mock` (routes delegate to service layer)
