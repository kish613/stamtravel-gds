import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from './constants';
import { fetchJson } from './api';
import type {
  AirSearchParams,
  FlightResult,
  HotelResult,
  CarResult,
  PNR,
  QueueBucket,
  Airport,
  SeatMap,
  CreatePnrInput,
  PnrActionInput,
  QueueMutationInput,
  SabreCapability,
  SabreCommandResponse,
  SabreMutationResult,
  SeatAssignmentInput
} from './types';

const queryKeys = {
  flights: (params?: Partial<AirSearchParams>) => ['sabre', 'flights', params ?? {}] as const,
  hotels: ['sabre', 'hotels'] as const,
  cars: ['sabre', 'cars'] as const,
  pnrs: ['sabre', 'pnrs'] as const,
  pnr: (locator?: string) => ['sabre', 'pnr', locator ?? ''] as const,
  seatmap: (locator?: string, segmentId?: string) => ['sabre', 'seatmap', locator ?? '', segmentId ?? ''] as const,
  airports: (q?: string) => ['sabre', 'airports', q ?? ''] as const,
  queues: ['sabre', 'queues'] as const,
  capabilities: ['sabre', 'capabilities'] as const
};

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const url = new URL(`${API_BASE_URL}${path}`, 'http://localhost');
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

export const useFlights = (params?: Partial<AirSearchParams>, enabled = true) =>
  useQuery<FlightResult[]>({
    queryKey: queryKeys.flights(params),
    queryFn: () => fetchJson<FlightResult[]>(buildUrl('/flights', params as Record<string, string | number | boolean | undefined>)),
    enabled,
    staleTime: 60_000
  });

export const useHotels = () =>
  useQuery<HotelResult[]>({
    queryKey: queryKeys.hotels,
    queryFn: () => fetchJson<HotelResult[]>(`${API_BASE_URL}/hotels`),
    staleTime: 60_000
  });

export const useCars = () =>
  useQuery<CarResult[]>({
    queryKey: queryKeys.cars,
    queryFn: () => fetchJson<CarResult[]>(`${API_BASE_URL}/cars`),
    staleTime: 60_000
  });

export const usePnrList = () =>
  useQuery<PNR[]>({
    queryKey: queryKeys.pnrs,
    queryFn: () => fetchJson<PNR[]>(`${API_BASE_URL}/pnr`),
    staleTime: 10_000
  });

export const usePnr = (locator?: string) =>
  useQuery<PNR>({
    queryKey: queryKeys.pnr(locator),
    enabled: Boolean(locator),
    queryFn: () => fetchJson<PNR>(`${API_BASE_URL}/pnr/${locator}`),
    staleTime: 5_000
  });

export const useSeatMap = (locator?: string, segmentId?: string) =>
  useQuery<SeatMap>({
    queryKey: queryKeys.seatmap(locator, segmentId),
    enabled: Boolean(locator && segmentId),
    queryFn: () =>
      fetchJson<SeatMap>(
        buildUrl('/seatmap', {
          locator,
          segmentId
        })
      ),
    staleTime: 5_000
  });

export const useAirports = (q?: string) =>
  useQuery<Airport[]>({
    queryKey: queryKeys.airports(q),
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
    queryKey: queryKeys.queues,
    queryFn: () => fetchJson<QueueBucket[]>(`${API_BASE_URL}/queues`),
    staleTime: 5_000
  });

export const useCapabilities = () =>
  useQuery<SabreCapability[]>({
    queryKey: queryKeys.capabilities,
    queryFn: () => fetchJson<SabreCapability[]>(`${API_BASE_URL}/capabilities`),
    staleTime: 30_000
  });

export const useRevalidateResult = () =>
  useMutation<SabreMutationResult, Error, FlightResult>({
    mutationFn: async (flight) => {
      const res = await fetch(`${API_BASE_URL}/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight })
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to revalidate itinerary');
      }
      return res.json() as Promise<SabreMutationResult>;
    }
  });

export const useCreatePnr = () => {
  const queryClient = useQueryClient();
  return useMutation<SabreMutationResult, Error, CreatePnrInput>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE_URL}/pnr/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to create PNR');
      }
      return res.json() as Promise<SabreMutationResult>;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pnrs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.queues }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pnr(result.locator) })
      ]);
    }
  });
};

export const usePnrAction = (locator?: string) => {
  const queryClient = useQueryClient();
  return useMutation<SabreMutationResult, Error, PnrActionInput>({
    mutationFn: async (payload) => {
      if (!locator) throw new Error('Missing locator');
      const res = await fetch(`${API_BASE_URL}/pnr/${locator}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to update PNR');
      }
      return res.json() as Promise<SabreMutationResult>;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pnrs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.queues }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pnr(result.locator) })
      ]);
    }
  });
};

export const useAssignSeat = () => {
  const queryClient = useQueryClient();
  return useMutation<SabreMutationResult, Error, SeatAssignmentInput>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE_URL}/seatmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to assign seat');
      }
      return res.json() as Promise<SabreMutationResult>;
    },
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pnr(result.locator) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pnrs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.seatmap(variables.locator, variables.segmentId) })
      ]);
    }
  });
};

export const useQueueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<SabreMutationResult, Error, QueueMutationInput>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE_URL}/queues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to update queue');
      }
      return res.json() as Promise<SabreMutationResult>;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.queues }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pnrs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pnr(result.locator) })
      ]);
    }
  });
};

export const useExecuteTerminalCommand = () =>
  useMutation<SabreCommandResponse, Error, string>({
    mutationFn: async (command) => {
      const res = await fetch(`${API_BASE_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (!res.ok) {
        throw new Error((await res.text()) || 'Failed to execute command');
      }
      return res.json() as Promise<SabreCommandResponse>;
    }
  });
