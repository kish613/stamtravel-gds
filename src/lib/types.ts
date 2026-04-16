export type ContentType = 'NDC' | 'ATPCO' | 'LCC';

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

export interface Pricing { total: number; taxes: number; fees: number; currency: string; }

export interface PNR {
  locator: string;
  status: 'Booked' | 'Ticketed' | 'Awaiting Ticket' | 'Void' | 'Canceled';
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
  // Optional fields consumed by the dashboard / departure board views.  They
  // aren't always present on legacy fixture entries so they're marked optional
  // and accessed defensively in UI code.
  servicingTags?: string[];
  orderSyncStatus?: 'In Sync' | 'Out Of Sync' | 'Needs Review';
  unusedTicketCredits?: {
    id: string;
    amount: number;
    currency: string;
    issuedAt: string;
    expiresAt: string;
    status: 'Open' | 'Used' | 'Expired';
  }[];
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
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}
