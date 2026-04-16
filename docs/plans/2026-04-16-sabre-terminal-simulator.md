# Sabre Terminal Training Simulator Implementation Plan

> **For Claude:** Task-by-task implementation of a stateful Sabre-cryptic-command mock terminal that lets users drive a realistic agent workflow end-to-end.

**Goal:** Turn the current placeholder terminal into a functional Sabre training simulator covering queues, PNR retrieval/display, availability, selling, pricing, ticketing, SSR/DOCS, and end-transaction flows against rich mock data.

**Architecture:** Session-aware command dispatcher. State lives in a module-level `TerminalSession` object (current PNR, active queue & position, availability cache, last price). Regex parser matches input against command patterns and dispatches to category handlers; each handler returns response text + state mutations. Existing terminal overlay keeps using `executeMockCommand` — the swap is internal.

**Tech Stack:** TypeScript, existing Next.js/React app. No new runtime deps. Reuses `queues.json` locators for PNR identity.

---

### Task 1: Skeleton — session + module structure

**Files:**
- Create: `src/lib/terminal/session.ts`
- Create: `src/lib/terminal/types.ts`
- Create: `src/lib/terminal/index.ts`

`session.ts` exports a singleton-like object with:
- `currentPnr: MockPNR | null`
- `activeQueue: { code: string; position: number; items: string[] } | null`
- `availability: AvailabilityResult | null`
- `lastPrice: PriceQuote | null`
- `pccConfig`: `{ pcc: 'A0UC', agentSign: 'ASC', officeDate: '16APR' }`
- `reset()`, `setPnr()`, `setAvailability()`, etc.

`types.ts` holds shapes used internally (`MockPNR`, `AvailabilityResult`, `PriceQuote`).

### Task 2: Rich PNR fixtures

**Files:**
- Create: `src/lib/terminal/fixtures/pnrs.ts`

Export a `MOCK_PNRS: Record<string, MockPNR>` keyed by locator. Generate from `queues.json` locators but enrich: 1-3 segments per PNR, real city pairs matching the queue route, passenger names, phone, email, ticketing time limit, SSRs (DOCS, meal), remarks, agent sign. Use deterministic generation based on locator hash so same locator always produces same PNR.

Expose helpers: `getPnrByLocator(loc)`, `findPnrsByName(surname)`.

### Task 3: Availability + route fixtures

**Files:**
- Create: `src/lib/terminal/fixtures/routes.ts`

Export `generateAvailability(origin, destination, date): AvailabilityResult` — deterministic pseudo-random generation seeded by origin+destination+date. 5-8 flights per request with realistic carriers (BA, AA, VS, UA, DL, AF, KL, LH, EK), class-of-service inventory (F/A/J/C/D/I/Y/B/H/K/M/L/V/S/N/Q/O/G with counts 0-9), departure/arrival times, equipment, elapsed time.

Export `AIRPORTS` lookup with city pair validation.

### Task 4: Output formatters

**Files:**
- Create: `src/lib/terminal/formatters.ts`

Functions (each returns `string[]` — array of terminal lines):
- `formatPnr(pnr, mode: 'R' | 'I' | 'N' | 'P' | 'H')` — full PNR, itinerary only, names only, etc.
- `formatAvailability(result)` — the numbered grid with classes
- `formatQueueCount(queues)` — QUEUE  ITEMS  NAME table
- `formatQueueEntry(queueCode, itemCount, firstPnr)` — Q/9 entry message + first PNR
- `formatPriceQuote(quote)` — WP response with XT breakdown
- `formatTicket(ticketNumbers)` — OK 0016 ETKT block

All output uppercase where Sabre uses uppercase. Fixed-column widths using padStart/padEnd.

### Task 5: Command handlers — queue

**Files:**
- Create: `src/lib/terminal/handlers/queue.ts`

Handles: `QC/`, `QC/9`, `QC/200-210`, `Q/9`, `QP/500/11`, `QR`, `QXI`, `I` (next in queue).
- `QC/` reads `queues.json`, outputs count table.
- `Q/<n>` sets activeQueue, loads first PNR into currentPnr, displays PNR summary.
- `QR` removes current item from activeQueue, advances.
- `QXI` clears activeQueue without removing.
- `I` advances position and loads next PNR.

### Task 6: Command handlers — PNR

**Files:**
- Create: `src/lib/terminal/handlers/pnr.ts`

Handles: `*<LOCATOR>` (retrieve), `*-<SURNAME>` (retrieve by name), `*R`, `*A`, `*I`, `*N`, `*P`, `*H`, `*PQ`, `*T`, `*B`, `*FF`.

Retrieve commands set `currentPnr`. Display commands require `currentPnr`. Return "NO PNR IN WORKING AREA" when no PNR loaded.

### Task 7: Command handlers — availability + selling

**Files:**
- Create: `src/lib/terminal/handlers/availability.ts`
- Create: `src/lib/terminal/handlers/selling.ts`

Availability: parse `1<DDMMM><ORG><DEST>` (e.g., `130JUNLHRJFK`) and optional `-<CLASS>` or `‡<CARRIER>` suffix. Set `session.availability`, format grid.

Selling: parse `0<N><CLASS><COUNT>` (e.g., `01Y3` = sell line 1 Y class 3 seats). Requires session availability. Adds segment to a draft PNR in session. Also handles name entry `-<SURNAME>/<GIVEN>`.

### Task 8: Command handlers — pricing, ticketing, SSR, misc

**Files:**
- Create: `src/lib/terminal/handlers/pricing.ts`
- Create: `src/lib/terminal/handlers/ticketing.ts`
- Create: `src/lib/terminal/handlers/misc.ts`

Pricing: `WP`, `WPNC`, `WP*` — reads currentPnr, produces PriceQuote, formats.

Ticketing: `W‡APK‡FCASH‡KP0` style — validates PNR priced, generates fake e-ticket numbers, updates PNR status to "Ticketed".

Misc: `HLP`, `E`, `ER`, `I` (ignore — conflicts with queue-next, resolved by context: if activeQueue open and no currentPnr dirty, "I" = next; else = ignore), `IR`, `DC‡USD100/EUR`, `3DOCS/...`, `5H-...`, `7TAW...`, `9-...`.

### Task 9: Parser/dispatcher

**Files:**
- Create: `src/lib/terminal/parser.ts`

Ordered array of `{ pattern: RegExp, handler: (match, session) => string[] }`. First match wins. Export `dispatch(input: string): string[]`.

Pattern ordering matters: `*R` must match before `*<LOC>`; `QC/9` before `Q/9`; `QR` before `Q...`.

Handles the "‡" / "¥" cross-of-Lorraine input: users may type `#` as a shorthand — normalize to `‡` before matching.

### Task 10: Wire up

**Files:**
- Modify: `src/lib/commands/commands.ts` — replace `executeMockCommand` body with a call to the new dispatcher; convert return type to support multi-line (`string | string[]`).
- Modify: `src/components/terminal/terminal-overlay.tsx` — handle string-array responses (writeln each line), update `TERMINAL_COMMANDS` list to real Sabre commands with realistic descriptions.
- Update welcome banner: `SABRE GDS TERMINAL · PCC A0UC · AGENT ASC` and sample tips.

### Task 11: Build + lint + smoke test

Run: `npm run build && npm run lint`. Fix any type errors. Boot dev server briefly if needed.

### Task 12: Commit + push

```bash
git add -A
git commit -m "feat: expand mock sabre terminal into full training simulator"
git push origin main
```
