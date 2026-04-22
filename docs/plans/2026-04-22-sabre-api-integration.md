# Sabre API Integration Plan — BYOC (Bring Your Own Credentials)

> **For Claude:** Multi-tenant Sabre integration. Developer holds **search-only** credentials used in development + shared read-only surfaces. Each agency using the live app enters their **own** Sabre credentials in-app so bookings, tickets, and write operations bill to that agency's Sabre contract.

**Goal:** Replace the mock layer in [src/app/api/mock](src/app/api/mock) and [src/lib/query.ts](src/lib/query.ts) with real Sabre calls, routed through a credential resolver that picks the right credential tier per request. No agency ever sees or shares another agency's creds; the dev never has to store agency secrets in the repo.

**Architecture philosophy:**
- **Dev (search) credentials** — single shared pool, stored in env vars, used for *non-billable read* paths + local dev.
- **Agent credentials** — per-agency, stored encrypted server-side, supplied by the agent via Settings UI. Used for any *write* (book/ticket/queue place/cancel/order create) and for any *read under the agency's PCC* (retrieve PNR, queue access, session journal).
- **Credential resolver** runs on every Sabre call, chooses the pool, and refuses bookable actions when no agent credentials are loaded for the current session.

**Tech Stack:** Next.js 16 route handlers (server-only Sabre calls), TypeScript, Zod validation, `@aws-sdk/client-kms` *or* Node `crypto` AES-256-GCM with a `CREDENTIAL_ENCRYPTION_KEY` env var (decided in Task 2), Zustand for UI state of the active credential.

**Sabre products required (CERT + PROD of each):**

Search / read tier — enabled on **dev PCC**:
- OAuth Token Create v3
- Bargain Finder Max (BFM) — shop (ATPCO + NDC co-mingled)
- InstaFlights Search — cached shop
- Revalidate Itinerary — pre-book price confirm
- CSL: GetHotelAvail, GetHotelLeadRate, GetHotelRateInfo, HotelPriceCheck, Get Hotel Content, GeoSearch
- GetVehAvailRQ — car shop
- Airport / Airline / Travel Theme Lookup
- Enhanced Seat Map / Get Seats (read-only against offer/order)

Agency tier — enabled on **each agency's PCC** (agency does this with their own Sabre rep):
- EnhancedAirBookRQ, PassengerDetailsRQ, UpdatePassengerDetailsRQ
- NDC Offer Price, Order Create, Order View, OrderChange, Reshop/Reprice
- AirTicketRQ (Enhanced Air Ticket), VoidTicketRQ, Automated Exchanges
- GetReservationRQ, OTA_CancelLLSRQ
- Queue suite: QueueCountLLSRQ, QueueAccessLLSRQ, QueuePlaceLLSRQ, QueueRemoveLLSRQ
- OTA_VehResLLSRQ — car book
- CSL Create PNR (hotel book)
- AirSeatLLSRQ — paid seat assignment
- SabreCommandLLSRQ — live terminal passthrough (gated behind per-agency feature flag)
- NDC carrier activations via Sabre Central Marketplace (per airline)

**Environments:**
- CERT: `https://api.cert.platform.sabre.com` (REST) + `https://webservices.cert.platform.sabre.com` (SOAP)
- PROD: `https://api.platform.sabre.com` + `https://webservices.platform.sabre.com`

---

## Credential model

```
┌──────────────────────────────────────────────────────────────────┐
│  Dev search pool  (env)                                          │
│  SABRE_DEV_CLIENT_ID / SABRE_DEV_CLIENT_SECRET / SABRE_DEV_PCC   │
│  Used for: /search/air, /search/hotel, /search/car, lookups,     │
│            all dev-mode calls when no agent cred is loaded.      │
│  Billing:  developer's Sabre account.                            │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │  fallback (read-only, non-PNR)
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│  Credential resolver                                             │
│  Inputs: requested Sabre op, agencyId from session               │
│  Output: { pool: 'dev' | 'agency', creds, token }                │
│  Rules:                                                          │
│   - bookable op → agency (throws if missing)                     │
│   - retrieve-own-PNR / queue / session journal → agency          │
│   - shop / lookup / seat map by offer → dev if no agency loaded  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Agency pool  (encrypted DB row per agency)                      │
│  { pcc, epr, password, clientId?, clientSecret?, iata/arc,       │
│    env: 'CERT'|'PROD', ndcCarriers: [...], verifiedAt }          │
│  Supplied via /settings/credentials UI by an agency admin.       │
│  Billing:  the agency's own Sabre contract.                      │
└──────────────────────────────────────────────────────────────────┘
```

---

### Task 1: Scaffold `src/lib/sabre/` module tree

**Files:**
- Create: `src/lib/sabre/config.ts` — env loading, URL selection, dev-creds guard
- Create: `src/lib/sabre/types.ts` — `SabreEnv`, `AgencyCredentials`, `CredentialPool`, Sabre DTO types
- Create: `src/lib/sabre/errors.ts` — `SabreAuthError`, `SabreBookingError`, `CredentialMissingError`
- Create: `src/lib/sabre/index.ts` — barrel

`config.ts` reads `SABRE_ENV`, `SABRE_DEV_CLIENT_ID`, `SABRE_DEV_CLIENT_SECRET`, `SABRE_DEV_PCC`, `CREDENTIAL_ENCRYPTION_KEY`. Throws at boot if missing in production.

### Task 2: Encryption helper for agency credentials

**Files:**
- Create: `src/lib/sabre/crypto.ts`

AES-256-GCM wrapper using `crypto.subtle` or Node `crypto`. Key sourced from `CREDENTIAL_ENCRYPTION_KEY` (32-byte base64). Exposes `encrypt(plaintext): { ciphertext, iv, tag }` and `decrypt(ciphertext, iv, tag): plaintext`. Unit-testable with a fixed test key.

**Decision point:** KMS vs local key. MVP uses local env-var key; document upgrade path to AWS KMS / Vercel encryption.

### Task 3: Agency credentials store

**Files:**
- Create: `src/lib/sabre/credentials-store.ts`
- Create: `src/app/api/credentials/route.ts` (GET self, PUT upsert, DELETE)
- Create: `src/app/api/credentials/test/route.ts` (POST — verify against Sabre token endpoint)

Persistence: MVP uses a JSON file at `.data/credentials.json` encrypted per-row; swap for Prisma/Postgres in a follow-up. Each row keyed by `agencyId` (derived from the signed-in user's org — for now, single-tenant stub that uses a `DEFAULT` agencyId so we can test end-to-end without building auth).

Never return plaintext in GET — return only `{ pcc, env, iata, hasPassword: true, verifiedAt, ndcCarriers }`.

### Task 4: Token client with per-credential cache

**Files:**
- Create: `src/lib/sabre/auth/token.ts`

Implements REST v3 token create:
- `POST {baseUrl}/v3/auth/token`
- `Authorization: Basic base64(clientId:clientSecret)`
- Body: `grant_type=client_credentials`
- Cache tokens in-process by `sha256(clientId+env)`, respect returned `expires_in` with 5-min safety margin.
- Sessionless tokens are good for 7 days; refresh on 401.

Expose `getToken(creds: SabreCredentials): Promise<string>`. No global singleton — pass creds in explicitly so the resolver stays honest.

### Task 5: Credential resolver

**Files:**
- Create: `src/lib/sabre/resolver.ts`

```ts
type Op = 'shop' | 'lookup' | 'priceCheck' | 'seatMapReadOnly'
        | 'bookAtpco' | 'bookNdc' | 'ticket' | 'void' | 'cancel'
        | 'retrievePnr' | 'queueRead' | 'queueWrite' | 'sabreCommand';

resolveCredentials(op: Op, agencyId?: string): Promise<ResolvedCreds>;
```

- `shop | lookup | priceCheck | seatMapReadOnly` — agency creds if loaded, else dev.
- `retrievePnr | queueRead` — must be agency (PCC-scoped data). Throws `CredentialMissingError` if absent.
- `bookAtpco | bookNdc | ticket | void | cancel | queueWrite | sabreCommand` — agency only. Throws if absent.

Centralising the policy here means handlers can't accidentally book under dev creds.

### Task 6: HTTP + SOAP clients

**Files:**
- Create: `src/lib/sabre/http/client.ts` — fetch wrapper: base URL per env, bearer injection, correlation ID, retry on 401 (refresh token once), structured error mapping.
- Create: `src/lib/sabre/soap/client.ts` — small SOAP envelope builder (needed for queue + SabreCommand + some legacy paths). Uses `fetch` + manual XML; avoids a heavy SOAP dep.
- Create: `src/lib/sabre/http/correlation.ts` — generates `Conversation-Id` and logs request shape (no secrets).

### Task 7: Settings UI — credentials page

**Files:**
- Create: `src/app/settings/credentials/page.tsx`
- Create: `src/components/settings/credentials-form.tsx`
- Modify: `src/app/settings/page.tsx` — add "Sabre credentials" link

Fields:
- Env toggle: CERT / PROD
- PCC / iPCC
- EPR (user)
- Password (write-only; placeholder shows "●●●● set" once saved)
- Client ID / Client Secret (optional — if agency supplies v3 creds directly, skip EPR/password derivation)
- IATA / ARC
- NDC carrier activations (multi-select from a known list — UI only; real activation happens in Sabre Central Marketplace)

Actions:
- **Save** → PUT `/api/credentials`
- **Test connection** → POST `/api/credentials/test` — runs a token request + a trivial `Airline Lookup` call; shows green tick + `verifiedAt` timestamp
- **Rotate password reminder** — nag when approaching the Sabre 90-day expiry
- **Delete** — red destructive action, clears the row

Copy for the user (put on the page): "These credentials are billed to **your** Sabre contract. Dev-mode searches run on our shared search-only pool. Bookings, tickets, and PNR writes always use your own credentials."

### Task 8: Dev-credential env wiring

**Files:**
- Modify: `.env.example` — add `SABRE_ENV`, `SABRE_DEV_CLIENT_ID`, `SABRE_DEV_CLIENT_SECRET`, `SABRE_DEV_PCC`, `CREDENTIAL_ENCRYPTION_KEY`
- Modify: `README.md` (only if already exists — don't create new docs files) — one-paragraph note

Add a boot-time check in `src/lib/sabre/config.ts`: in `NODE_ENV=production`, missing dev creds is fine *as long as* agency creds exist; missing encryption key is always fatal.

### Task 9: Air shop — BFM behind `/search/air`

**Files:**
- Create: `src/lib/sabre/air/bfm.ts`
- Create: `src/lib/sabre/mappers/flight.ts`
- Create: `src/app/api/sabre/air/shop/route.ts` (replaces `src/app/api/mock/flights/route.ts` behind a `USE_SABRE_AIR` flag)
- Modify: `src/lib/query.ts` — point `useFlights` at the new route when flag on

Map Sabre BFM response → existing `FlightResult` type in [src/lib/types.ts:5](src/lib/types.ts:5). Preserve `ContentType: 'NDC' | 'ATPCO' | 'LCC'` — BFM tags each offer.

Op type = `'shop'` so dev creds work for pure search.

### Task 10: Hotel / car shop — CSL + GetVehAvail

**Files:**
- Create: `src/lib/sabre/hotel/csl.ts` — GetHotelAvail + GetHotelRateInfo
- Create: `src/lib/sabre/car/veh.ts` — GetVehAvailRQ
- Create: `src/lib/sabre/mappers/hotel.ts`, `mappers/car.ts`
- Create: `src/app/api/sabre/hotel/shop/route.ts`, `/car/shop/route.ts`
- Modify: `src/lib/query.ts` — flag-gated swap for `useHotels`, `useCars`

### Task 11: PNR retrieve + seat map (read, agency-scoped)

**Files:**
- Create: `src/lib/sabre/pnr/getReservation.ts`
- Create: `src/lib/sabre/seat/getSeats.ts`
- Create: `src/lib/sabre/mappers/pnr.ts`, `mappers/seatMap.ts`
- Create: `src/app/api/sabre/pnr/[locator]/route.ts`, `/seatmap/route.ts`
- Modify: `src/lib/query.ts` — `usePnr`, `useSeatMap`

Op types: `'retrievePnr'`, `'seatMapReadOnly'`. If the seat map is requested against an offer from a shop response, dev creds are allowed; against a PNR, agency creds required.

### Task 12: Queues — agency-scoped read + write

**Files:**
- Create: `src/lib/sabre/queue/` — `count.ts`, `access.ts`, `place.ts`, `remove.ts`
- Create: `src/app/api/sabre/queues/route.ts` (count + access), `/place/route.ts`, `/remove/route.ts`
- Modify: `src/app/queues/page.tsx`, `src/lib/query.ts` (`useQueues`)

All queue ops require agency creds. UI shows a "Connect your Sabre account to view queues" empty state if no agency creds loaded.

### Task 13: Air book — ATPCO path

**Files:**
- Create: `src/lib/sabre/air/revalidate.ts`
- Create: `src/lib/sabre/air/enhancedAirBook.ts`
- Create: `src/lib/sabre/pnr/passengerDetails.ts`
- Create: `src/app/api/sabre/booking/atpco/route.ts`
- Modify: `src/app/booking/new/page.tsx` — branch on offer `contentType`; ATPCO hits this route

Flow: Revalidate → EnhancedAirBook → PassengerDetails → return locator. Strictly agency creds.

### Task 14: Air book — NDC path

**Files:**
- Create: `src/lib/sabre/ndc/offerPrice.ts`
- Create: `src/lib/sabre/ndc/orderCreate.ts`
- Create: `src/lib/sabre/ndc/orderView.ts`
- Create: `src/app/api/sabre/booking/ndc/route.ts`

OfferPrice → OrderCreate. Persist `{ orderId, offerId }` alongside the PNR locator in our UI state so [src/app/bookings/[locator]/page.tsx](src/app/bookings/[locator]/page.tsx) can fetch either.

### Task 15: Ticketing

**Files:**
- Create: `src/lib/sabre/ticket/airTicket.ts`
- Create: `src/lib/sabre/ticket/voidTicket.ts`
- Create: `src/app/api/sabre/ticket/issue/route.ts`, `/void/route.ts`

Ticketing uses agency's IATA/ARC — pulled from the agency credential row. If missing, refuse with a clear error surfaced to UI.

### Task 16: Terminal passthrough (feature-flagged, off by default)

**Files:**
- Create: `src/lib/sabre/command/sabreCommand.ts`
- Create: `src/app/api/sabre/command/route.ts`
- Modify: `src/components/terminal/terminal-overlay.tsx` — when agency has `features.liveTerminal === true`, dispatch real commands; otherwise keep the existing mock simulator from [src/lib/terminal](src/lib/terminal)

Agency creds required. Log all commands for audit (without passwords).

### Task 17: Observability

**Files:**
- Create: `src/lib/sabre/telemetry.ts`

Log every Sabre call with: `{ agencyId, op, pool, durationMs, sabreCorrelationId, status }`. Never log request/response bodies by default — add a `SABRE_DEBUG_BODIES=true` dev-only opt-in that still redacts passwords and PII.

### Task 18: End-to-end smoke against CERT

Run a scripted smoke: login → load dev creds → `/search/air` returns results → load personal test-PCC agency creds in settings → book a CERT PNR → retrieve it → place on queue → remove → void. Document in `docs/plans/runbooks/` only if asked; otherwise keep as a local script in `scripts/sabre-smoke.ts`.

### Task 19: Build + lint

`npm run build && npm run lint`. Fix types.

### Task 20: Ship

Feature flags off by default (`USE_SABRE_AIR`, `USE_SABRE_HOTEL`, `USE_SABRE_CAR`, `USE_SABRE_PNR`, `USE_SABRE_QUEUES`, `USE_SABRE_BOOK_ATPCO`, `USE_SABRE_BOOK_NDC`, `USE_SABRE_TICKET`, `USE_SABRE_TERMINAL`). Flip individually as each path is verified in CERT then PROD.

---

## Out of scope (flagged, not built here)

- **Real auth / multi-tenant org model** — MVP stubs `agencyId = 'DEFAULT'`. Plug in real auth before production.
- **KMS** — local-key encryption is adequate for dev/CERT. Move to AWS KMS / Vercel-provided encryption before PROD.
- **MIR / BSP / Session Journal ingest** for `/reports` — not an API product; separate design.
- **Unused ticket credits** (`unusedTicketCredits` in types) — requires Ticket Credit Manager integration; keep mocked.
- **Payments / merchant of record** — app does not charge cards; agencies use their own PSP or Sabre Virtual Payments.
- **NDC carrier activations** — each agency orders airline-by-airline in Sabre Central Marketplace; we just surface the toggle list.

## Open questions to confirm before Task 1

1. Do we already have **our own dev Sabre contract + iPCC** for the search-only pool, or does onboarding start from zero? (Sabre onboarding is 7–21 days.)
2. Is the app **multi-tenant now**, or single-agency-first? (Drives Task 3's `agencyId` design.)
3. Persistence: are we OK with the file-on-disk MVP for agency creds, or do we want Postgres/Prisma from day one?
4. Which 2–3 NDC carriers do we target at launch?
