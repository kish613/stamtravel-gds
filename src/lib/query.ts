import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';
import { API_BASE_URL } from './constants';
import { fetchJson, wait } from './api';
import {
  type FlightResult,
  type HotelResult,
  type CarResult,
  type PNR,
  type QueueBucket,
  type Airport,
  type SeatMap
} from './types';

export const useFlights = () =>
  useQuery<FlightResult[]>({
    queryKey: ['fixtures', 'flights'],
    queryFn: () => fetchJson<FlightResult[]>(`${API_BASE_URL}/flights`),
    staleTime: Infinity
  });

export const useHotels = () =>
  useQuery<HotelResult[]>({
    queryKey: ['fixtures', 'hotels'],
    queryFn: () => fetchJson<HotelResult[]>(`${API_BASE_URL}/hotels`),
    staleTime: Infinity
  });

export const useCars = () =>
  useQuery<CarResult[]>({
    queryKey: ['fixtures', 'cars'],
    queryFn: () => fetchJson<CarResult[]>(`${API_BASE_URL}/cars`),
    staleTime: Infinity
  });

export const usePnrList = () =>
  useQuery<PNR[]>({
    queryKey: ['fixtures', 'pnrs'],
    queryFn: () => fetchJson<PNR[]>(`${API_BASE_URL}/pnr`),
    staleTime: Infinity
  });

export const usePnr = (locator?: string) =>
  useQuery<PNR | undefined>({
    queryKey: ['fixtures', 'pnr', locator],
    enabled: Boolean(locator),
    queryFn: async () => {
      if (!locator) return undefined;
      const all = await fetchJson<PNR[]>(`${API_BASE_URL}/pnr`);
      return all.find((p) => p.locator.toLowerCase() === locator.toLowerCase());
    },
    staleTime: Infinity
  });

export const useSeatMap = (segmentId?: string) =>
  useQuery<SeatMap | undefined>({
    queryKey: ['fixtures', 'seatmap', segmentId],
    enabled: Boolean(segmentId),
    queryFn: async () => {
      if (!segmentId) return undefined;
      const data = await fetchJson<SeatMap>(`${API_BASE_URL}/seatmap`);
      return data;
    }
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

export const useQueues = () =>
  useQuery<QueueBucket[]>({
    queryKey: ['fixtures', 'queues'],
    queryFn: () => fetchJson<QueueBucket[]>(`${API_BASE_URL}/queues`),
    staleTime: 1000 * 15
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
