# Sabre SOAP API Integration Design

**Date:** 2026-03-09
**Status:** Approved
**Approach:** Option A — Direct SOAP Client (no `soap` npm lib)

## Decisions

- **API format:** Sabre SOAP/XML
- **Environment:** Cert only (`sws-crt.cert.havail.sabre.com`)
- **Auth:** None (skip for now)
- **Mode switch:** `API_MODE` env var toggles between `live` (real Sabre) and `mock` (fixture data)

## Environment Variables

```env
SABRE_SOAP_ENDPOINT=https://sws-crt.cert.havail.sabre.com
SABRE_USERNAME=
SABRE_PASSWORD=
SABRE_PCC=
SABRE_DOMAIN=DEFAULT
API_MODE=live  # "live" | "mock"
```

## Architecture

### Session Management (`sabre-session.ts`)

Per-request sessions: create -> use -> close. No pooling in v1.

- `createSession()` — `SessionCreateRQ` -> returns binary security token
- `closeSession(token)` — `SessionCloseRQ`

### SOAP Client (`sabre-soap-client.ts`)

Thin XML-over-HTTP wrapper:

- `callSabre(action, token, xmlBody)` — wraps in SOAP envelope with `wsse:Security` header, POSTs, parses response
- Uses `fast-xml-parser` for XML->JS parsing
- Maps SOAP faults to `toErrorPayload` format

### XML Templates (`sabre-xml-templates.ts`)

Template literal functions for each Sabre request:

- `buildSessionCreateRQ(username, password, pcc, domain)`
- `buildSessionCloseRQ(token)`
- `buildBargainFinderMaxRQ(params)`
- `buildRevalidateItinRQ(segments)`
- `buildCreatePnrRQ(input)`
- `buildGetReservationRQ(locator)`
- `buildTravelItineraryReadRQ()`
- `buildEnhancedSeatMapRQ(flight, departure)`
- `buildQueueCountRQ()`
- `buildQueueAccessRQ(queue)`
- `buildQueueMoveItemRQ(input)`
- `buildQueuePlaceRQ(locator, queue)`
- `buildSabreCommandLLSRQ(command)`
- Action-specific: `buildVoidTicketRQ`, `buildCancelRQ`

### Response Mappers (`sabre-response-maps.ts`)

Functions that convert parsed XML objects to existing TypeScript types:

- `mapFlightResults(parsed)` -> `FlightResult[]`
- `mapPnr(parsed)` -> `PNR`
- `mapPnrList(parsed)` -> `PNR[]`
- `mapSeatMap(parsed)` -> `SeatMap`
- `mapQueueBuckets(parsed)` -> `QueueBucket[]`
- `mapMutationResult(parsed)` -> `SabreMutationResult`

### Service Layer (`sabre-service.ts`)

Implements all functions already imported by mock routes:

| Function | Sabre Action | Notes |
|----------|-------------|-------|
| `searchAir` | BargainFinderMaxRQ | Flight search |
| `revalidateAir` | RevalidateItinRQ | Price check |
| `createPnr` | CreatePassengerNameRecordRQ | Booking |
| `getReservation` | GetReservationRQ | Read PNR |
| `listPnrs` | TravelItineraryReadRQ | List bookings |
| `applyPnrAction` | Various | Ticket/void/cancel/queue |
| `getSeats` | EnhancedSeatMapRQ | Seat maps |
| `assignSeat` | PassengerSeatMapRQ | Seat assignment |
| `listQueues` | QueueCountRQ + QueueAccessRQ | Queue data |
| `moveQueueItem` | QueueMoveItemRQ | Queue ops |
| `runTerminalCommand` | SabreCommandLLSRQ | Cryptic terminal |
| `getCapabilities` | Ping / health check | System status |

Each function: create session -> build XML -> call Sabre -> parse response -> map to types -> close session -> return.

### API Routes

New routes at `/api/sabre/*` mirror `/api/mock/*` exactly:

```
src/app/api/sabre/
├── flights/route.ts
├── capabilities/route.ts
├── pnr/route.ts
├── pnr/create/route.ts
├── pnr/[locator]/route.ts
├── pnr/[locator]/actions/route.ts
├── queues/route.ts
├── seatmap/route.ts
├── revalidate/route.ts
└── command/route.ts
```

### URL Switching

`src/lib/constants.ts` reads `API_MODE` at build time:

- `live` -> `API_BASE_URL = '/api/sabre'`
- `mock` -> `API_BASE_URL = '/api/mock'`

Client code (React Query hooks) unchanged.

## New Dependency

- `fast-xml-parser` — XML parsing, 45KB, zero deps

## File Structure

```
src/lib/server/
├── sabre-config.ts        # Env config reader
├── sabre-session.ts       # Session create/close
├── sabre-soap-client.ts   # Generic SOAP caller
├── sabre-service.ts       # All Sabre operations
├── sabre-xml-templates.ts # XML request templates
├── sabre-response-maps.ts # XML→TypeScript mappers
├── errors.ts              # Existing
└── runtime-store.ts       # Existing

src/app/api/sabre/         # Real API routes
.env.local                 # Credentials (gitignored)
.env.example               # Template (committed)
```

## Out of Scope

- Agent authentication
- Session pooling / connection reuse
- Hotel and car Sabre integration
- NDC content
- Production environment
