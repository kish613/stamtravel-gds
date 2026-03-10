export type ContentType = 'NDC' | 'ATPCO' | 'LCC';
export type BookingContentSource = 'CLASSIC_GDS' | 'NDC';
export type FareClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';

export interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
  fareBasis: string;
  price: number;
  currency: string;
  baggageAllowance: string;
  refundable: boolean;
  fareRulesSummary: string;
  contentType: ContentType;
  contentSource: BookingContentSource;
  bookingSupported: boolean;
  unsupportedReason?: string;
  aircraft: string;
  tripType: 'one-way' | 'return' | 'multi-city';
}

export interface HotelResult {
  id: string;
  name: string;
  starRating: number;
  distanceKm: number;
  nightlyRate: number;
  refundable: boolean;
  currency: string;
  address: string;
  city: string;
  description: string;
  rooms: { name: string; capacity: number; rate: number; refundable: boolean }[];
  policies: string[];
}

export interface CarResult {
  id: string;
  vendor: string;
  model: string;
  acriss: string;
  category: 'economy' | 'compact' | 'intermediate';
  pickupLocation: string;
  dailyRate: number;
  inclusions: string[];
  currency: string;
}

export interface SSRCode {
  code: string;
  description: string;
}

export interface Segment {
  id: string;
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
  cabin: FareClass;
  seatAssignment?: string;
  fareType: ContentType;
  contentSource: BookingContentSource;
  deadlineAt: string;
}

export interface Passenger {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  issuingCountry: string;
  gender?: 'M' | 'F' | 'X';
}

export interface Pricing {
  total: number;
  taxes: number;
  fees: number;
  currency: string;
}

export interface UnusedTicketCredit {
  id: string;
  amount: number;
  currency: string;
  issuedAt: string;
  expiresAt: string;
  status: 'Open' | 'Applied' | 'Expired';
}

export interface PNR {
  locator: string;
  status: 'Booked' | 'Ticketed' | 'Awaiting Ticket' | 'Void' | 'Canceled';
  contentSource: BookingContentSource;
  passengerName: string;
  route: string;
  createdAt: string;
  departureDate: string;
  segments: Segment[];
  passengers: Passenger[];
  contact: {
    phone: string;
    email: string;
    agencyIata: string;
  };
  pricing: Pricing;
  ttlMinutes: number;
  history: { date: string; event: string; actor: string }[];
  queue: string;
  orderSyncStatus?: 'In Sync' | 'Out Of Sync' | 'Needs Review';
  servicingTags?: ('schedule-change' | 'ticket-sync' | 'unused-credit')[];
  unusedTicketCredits?: UnusedTicketCredit[];
  warnings?: string[];
  lastSyncedAt?: string;
}

export interface Seat {
  row: number;
  col: string;
  status: 'available' | 'occupied' | 'premium' | 'fee' | 'exit';
  fee?: number;
  type?: string;
}

export interface SeatMap {
  segmentId: string;
  rows: Seat[][];
  premiumRows: number[];
}

export interface QueueItem {
  locator: string;
  passengerName: string;
  departureDate: string;
  route: string;
  deadlineAt: string;
  segmentsCount: number;
  status: PNR['status'];
  agent: string;
}

export interface QueueBucket {
  queueCode: string;
  items: QueueItem[];
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface QueryErrorPayload {
  message: string;
  code?: string;
  warnings?: string[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export interface AirSearchParams {
  tripType: 'one-way' | 'return' | 'multi-city';
  origin: string;
  destination: string;
  departure?: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: FareClass;
  maxStops: number;
  preferredAirline?: string;
  alliance?: string;
  ndcOnly?: boolean;
  flexibleWindow?: number;
  flexible?: boolean;
}

export interface CreatePnrInput {
  payload: {
    segments: Segment[];
    passengers: Passenger[];
    contact: {
      phone: string;
      email: string;
      agencyIata: string;
      ticketingArrangement?: 'Ticket At Will' | 'Ticket By Date';
      ticketByDate?: string;
    };
    pricing: Pricing;
    remarks?: string;
    ssrs?: string[];
  };
  idempotencyKey?: string;
}

export interface PnrActionInput {
  action: 'issue-ticket' | 'void-ticket' | 'cancel-all' | 'cancel-segment' | 'queue-place';
  segmentId?: string;
  queueCode?: string;
}

export interface SeatAssignmentInput {
  locator: string;
  segmentId: string;
  seatCode: string;
}

export interface QueueMutationInput {
  action: 'move' | 'place';
  locator: string;
  fromQueue?: string;
  toQueue: string;
}

export interface SabreMutationResult {
  locator: string;
  status: PNR['status'];
  warnings: string[];
  sabreRequestId?: string;
  statefulFollowUpRequired: boolean;
  pnr?: PNR;
  seatCode?: string;
  queueCode?: string;
}

export interface SabreCapability {
  key: string;
  label: string;
  mode: 'live' | 'mirror' | 'disabled';
  configured: boolean;
  healthy: boolean;
  message: string;
  lastCheckedAt: string;
}

export interface SabreCommandResponse {
  output: string;
  warnings: string[];
}
