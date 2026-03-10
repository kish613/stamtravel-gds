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
