// Internal types for the Sabre terminal simulator.
// These are deliberately separate from the app-wide PNR shape so we can keep
// simulator-specific details (like per-segment booking class) without polluting
// the main data model.

export interface MockPassenger {
  title: string; // MR, MRS, MS, MSTR, MISS
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  nationality: string; // ISO 3 (GBR, USA, etc.)
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD
  gender: 'M' | 'F';
  paxType: 'ADT' | 'CNN' | 'INF';
}

export interface MockSegment {
  carrier: string; // 2-letter code (BA, AA, VS)
  flightNumber: number; // numeric portion
  bookingClass: string; // Y, J, F, etc.
  from: string; // LHR
  to: string; // JFK
  depDate: string; // DDMMM (05MAR)
  depTime: string; // HHMM local (0815)
  arrTime: string; // HHMM local (1130)
  arrDayOffset: number; // +1 for overnight
  status: 'HK' | 'SS' | 'HL' | 'UC' | 'NO'; // HK confirmed / SS sold / HL waitlist
  paxCount: number;
  equipment: string; // 777, 789, 351
  elapsed: string; // H:MM
}

export interface MockSSR {
  code: string; // DOCS, VGML, WCHR
  airline: string; // BA, AA (2-letter)
  status: 'HK' | 'KK' | 'HN'; // confirmed / acknowledge / need-reply
  text: string; // raw SSR free text
  paxRef: string; // 1.1, 2.1
}

export interface MockPhone {
  type: 'A' | 'B' | 'H'; // Agency / Business / Home
  city: string; // LON
  number: string;
}

export interface MockRemark {
  text: string;
}

export interface MockHistoryEntry {
  timestamp: string; // 16APR/1054
  actor: string; // A0UC.A0UC*ASC
  event: string;
}

export interface MockPNR {
  locator: string;
  createdAt: string; // 16APR/1054 style
  status: 'Booked' | 'Ticketed' | 'Awaiting Ticket' | 'Canceled' | 'Void';
  passengers: MockPassenger[];
  segments: MockSegment[];
  phones: MockPhone[];
  email?: string;
  ssrs: MockSSR[];
  remarks: MockRemark[];
  ticketTimeLimit?: string; // TAW11JUN/ or similar
  receivedFrom: string;
  agentSign: string;
  pcc: string;
  history: MockHistoryEntry[];
  priceQuote?: MockPriceQuote;
  tickets?: string[]; // E-ticket numbers once ticketed
  dirty: boolean; // has unsaved changes
}

export interface AvailabilityLine {
  lineNumber: number;
  carrier: string;
  flightNumber: number;
  classes: { code: string; seats: number | 'L' }[];
  from: string;
  to: string;
  depTime: string;
  arrTime: string;
  arrDayOffset: number;
  equipment: string;
  elapsed: string;
}

export interface AvailabilityResult {
  origin: string;
  destination: string;
  date: string; // DDMMM (30JUN)
  weekday: string; // WED
  lines: AvailabilityLine[];
}

export interface MockPriceQuote {
  paxType: 'ADT' | 'CNN' | 'INF';
  baseFare: number;
  taxes: { code: string; amount: number }[];
  total: number;
  currency: string; // USD
  fareBasis: string; // YLOWUS
  fareCalc: string; // LHR BA JFK 873.95YLOWUS NUC873.95END ROE1.0
  lastPurchaseDate: string; // 20JUN
  restrictions: string[]; // NONREF/PENALTY APPLIES
  nuc: number;
  roe: number;
}

export interface QueueEntry {
  locator: string;
  placedAt: string; // 16APR/1054
}

export interface ActiveQueue {
  code: string;
  name: string;
  entries: QueueEntry[];
  position: number; // 0-based index into entries
}

export interface TerminalSession {
  pcc: string;
  agentSign: string;
  officeDate: string; // DDMMM (16APR)
  officeTime: string; // HHMM (1054)
  currentPnr: MockPNR | null;
  draftPnr: Partial<MockPNR> | null; // segments+names being built pre-ER
  activeQueue: ActiveQueue | null;
  availability: AvailabilityResult | null;
  lastResponse: string[];
}
