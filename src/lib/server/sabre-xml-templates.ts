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
  const { segments, passengers, contact } = input.payload;

  const segmentXml = segments
    .map(
      (seg) => `
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
