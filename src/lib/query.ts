import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';
import { API_BASE_URL } from './constants';
import { fetchJson, wait } from './api';
import { flags } from './sabre/flags';
import {
  type FlightResult,
  type HotelResult,
  type CarResult,
  type PNR,
  type QueueBucket,
  type Airport,
  type SeatMap,
  type FidsBoard
} from './types';

const postJson = async <T, B = unknown>(url: string, body: B): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Request failed');
  return (await res.json()) as T;
};

export const useFlights = () =>
  useQuery<FlightResult[]>({
    queryKey: ['fixtures', 'flights'],
    queryFn: () => fetchJson<FlightResult[]>(`${API_BASE_URL}/flights`),
    staleTime: Infinity
  });

export interface FlightShopQuery {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  adults: number;
  cabin?: 'Y' | 'S' | 'C' | 'F';
}

export const useSabreAirShop = (query: FlightShopQuery | null) =>
  useQuery<FlightResult[]>({
    queryKey: ['sabre', 'air', 'shop', query],
    enabled: flags.air && Boolean(query),
    queryFn: () => postJson<FlightResult[]>('/api/sabre/air/shop', query)
  });

export const useHotels = () =>
  useQuery<HotelResult[]>({
    queryKey: ['fixtures', 'hotels'],
    queryFn: () => fetchJson<HotelResult[]>(`${API_BASE_URL}/hotels`),
    staleTime: Infinity
  });

export interface HotelShopQuery {
  cityCode?: string;
  lat?: number;
  lng?: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export const useSabreHotelShop = (query: HotelShopQuery | null) =>
  useQuery<HotelResult[]>({
    queryKey: ['sabre', 'hotel', 'shop', query],
    enabled: flags.hotel && Boolean(query),
    queryFn: () => postJson<HotelResult[]>('/api/sabre/hotel/shop', query)
  });

export const useCars = () =>
  useQuery<CarResult[]>({
    queryKey: ['fixtures', 'cars'],
    queryFn: () => fetchJson<CarResult[]>(`${API_BASE_URL}/cars`),
    staleTime: Infinity
  });

export interface CarShopQuery {
  pickupLocation: string;
  pickupDateTime: string;
  returnDateTime: string;
  category?: 'economy' | 'compact' | 'intermediate';
}

export const useSabreCarShop = (query: CarShopQuery | null) =>
  useQuery<CarResult[]>({
    queryKey: ['sabre', 'car', 'shop', query],
    enabled: flags.car && Boolean(query),
    queryFn: () => postJson<CarResult[]>('/api/sabre/car/shop', query)
  });

export const usePnrList = () =>
  useQuery<PNR[]>({
    queryKey: ['fixtures', 'pnrs'],
    queryFn: () => fetchJson<PNR[]>(`${API_BASE_URL}/pnr`),
    staleTime: Infinity
  });

export const usePnr = (locator?: string) =>
  useQuery<PNR | undefined>({
    queryKey: ['pnr', locator],
    enabled: Boolean(locator),
    queryFn: async () => {
      if (!locator) return undefined;
      if (flags.pnr) {
        return fetchJson<PNR>(`/api/sabre/pnr/${locator}`);
      }
      const all = await fetchJson<PNR[]>(`${API_BASE_URL}/pnr`);
      return all.find((p) => p.locator.toLowerCase() === locator.toLowerCase());
    },
    staleTime: Infinity
  });

export const useSeatMap = (segmentId?: string) =>
  useQuery<SeatMap | undefined>({
    queryKey: ['seatmap', segmentId],
    enabled: Boolean(segmentId),
    queryFn: async () => {
      if (!segmentId) return undefined;
      const data = await fetchJson<SeatMap>(`${API_BASE_URL}/seatmap`);
      return data;
    }
  });

export interface SeatMapByOfferQuery { kind: 'offer'; offerId: string }
export interface SeatMapByPnrQuery { kind: 'pnr'; locator: string; segmentRph: string }
export type SeatMapQuery = SeatMapByOfferQuery | SeatMapByPnrQuery;

export const useSabreSeatMap = (query: SeatMapQuery | null) =>
  useQuery<SeatMap>({
    queryKey: ['sabre', 'seatmap', query],
    enabled: Boolean(query) && (flags.pnr || flags.air),
    queryFn: () => postJson<SeatMap>('/api/sabre/seatmap', query)
  });

export const useAirports = (q?: string) =>
  useQuery<Airport[]>({
    queryKey: ['fixtures', 'airports', q || ''],
    queryFn: () => fetchJson<Airport[]>(`${API_BASE_URL}/airports`),
    select: (data) => {
      if (!q) return data;
      const term = q.trim().toLowerCase();
      if (!term) return data;
      return data.filter(
        (item) =>
          item.code.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          item.city.toLowerCase().includes(term)
      );
    },
    staleTime: Infinity
  });

export const useFids = () =>
  useQuery<FidsBoard>({
    queryKey: ['fixtures', 'fids'],
    queryFn: () => fetchJson<FidsBoard>(`${API_BASE_URL}/fids`),
    staleTime: Infinity
  });

export const useQueues = () =>
  useQuery<QueueBucket[]>({
    queryKey: ['queues', flags.queues ? 'sabre' : 'mock'],
    queryFn: () =>
      flags.queues
        ? fetchJson<QueueBucket[]>('/api/sabre/queues')
        : fetchJson<QueueBucket[]>(`${API_BASE_URL}/queues`),
    staleTime: 1000 * 15
  });

export const useSabreQueuePlace = () =>
  useMutation<{ ok: true }, Error, { locator: string; queueNumber: string; comment?: string }>({
    mutationFn: (payload) => postJson<{ ok: true }>('/api/sabre/queues/place', payload)
  });

export const useSabreQueueRemove = () =>
  useMutation<{ ok: true }, Error, { queueNumber: string; locator?: string }>({
    mutationFn: (payload) => postJson<{ ok: true }>('/api/sabre/queues/remove', payload)
  });

export const useRevalidateResult = () =>
  useMutation<unknown, Error, void>({
    mutationFn: async () => {
      await wait(400);
      const res = await fetch(`${API_BASE_URL}/revalidate`, { method: 'POST' });
      return res.json();
    }
  });

export const useCreatePnr = (): UseMutationResult<PNR, Error, any, unknown> =>
  useMutation({
    mutationFn: async (payload: any) => {
      await wait(800);
      const res = await fetch(`${API_BASE_URL}/pnr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Failed to create PNR');
      }
      return res.json();
    }
  });

export interface AtpcoBookingPayload {
  segments: Array<{
    origin: string;
    destination: string;
    departDateTime: string;
    arrivalDateTime: string;
    marketingCarrier: string;
    flightNumber: string;
    bookingClass: string;
    quantity: number;
  }>;
  passengers: Array<{
    nameNumber?: string;
    firstName: string;
    lastName: string;
    title?: string;
    dob?: string;
    gender?: 'M' | 'F' | 'X';
    passportNumber?: string;
    passportExpiry?: string;
    nationality?: string;
  }>;
  contact: { phone: string; email: string };
  ticketingTimeLimit?: string;
}

export const useSabreBookAtpco = () =>
  useMutation<{ locator: string | null; raw: unknown }, Error, AtpcoBookingPayload>({
    mutationFn: (payload) => postJson('/api/sabre/booking/atpco', payload)
  });

export interface NdcBookingPayload {
  responseId: string;
  offerId: string;
  offerItemIds: string[];
  passengers: Array<{
    passengerId: string;
    givenName: string;
    surname: string;
    title?: string;
    birthDate?: string;
    contact: { email: string; phone: string };
    document?: { number: string; expiry: string; issuingCountry: string };
  }>;
  payment: {
    method: 'CASH' | 'CC' | 'OTHER';
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    cardHolder?: string;
  };
}

export const useSabreBookNdc = () =>
  useMutation<{ orderId: string | null; offerId: string; raw: unknown }, Error, NdcBookingPayload>({
    mutationFn: (payload) => postJson('/api/sabre/booking/ndc', payload)
  });

export const useSabreIssueTicket = () =>
  useMutation<
    unknown,
    Error,
    {
      locator: string;
      formOfPayment: 'CC' | 'CASH' | 'CHECK';
      cardNumber?: string;
      cardExpiry?: string;
      commissionPercent?: number;
    }
  >({
    mutationFn: (payload) => postJson('/api/sabre/ticket/issue', payload)
  });

export const useSabreVoidTicket = () =>
  useMutation<unknown, Error, { ticketNumber: string }>({
    mutationFn: (payload) => postJson('/api/sabre/ticket/void', payload)
  });

export const useSabreCommand = () =>
  useMutation<{ screen: string }, Error, { command: string }>({
    mutationFn: (payload) => postJson('/api/sabre/command', payload)
  });
