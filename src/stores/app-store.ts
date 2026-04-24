import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FlightResult, HotelResult, CarResult, Passenger, Segment } from '@/lib/types';

interface BookingSession {
  passengers: Passenger[];
  airSegments: Segment[];
  hotel?: HotelResult | null;
  car?: CarResult | null;
  activeFlight?: FlightResult | null;
  activeSearchType: 'air' | 'hotel' | 'car';
  contact: {
    phone?: string;
    phoneType?: 'Office' | 'Mobile';
    email?: string;
    agencyIata?: string;
    ticketingArrangement?: 'Ticket At Will' | 'Ticket By Date';
    ticketByDate?: string;
  };
  ssrs: string[];
  remarks: string;
  specialRequestSeatMap: Record<string, boolean>;
  selectedSeats: Record<string, string>;
}

type DashboardTheme = 'light' | 'dark';

interface AppState {
  terminalOpen: boolean;
  toggleTerminal: () => void;
  terminalDrawerOpen: boolean;
  toggleTerminalDrawer: () => void;
  pendingTerminalCommand: string | null;
  setPendingTerminalCommand: (cmd: string | null) => void;
  openTerminalWithCommand: (cmd: string) => void;
  dashboardTheme: DashboardTheme;
  setDashboardTheme: (theme: DashboardTheme) => void;
  toggleDashboardTheme: () => void;
  booking: BookingSession;
  setBookingSession: (session: Partial<BookingSession>) => void;
  resetBookingSession: () => void;
  addAirSegment: (segment: Segment) => void;
  removeAirSegment: (id: string) => void;
  setSelectedSeat: (segmentId: string, seat: string) => void;
  setActiveFlight: (flight: FlightResult) => void;
}

const defaultBooking: BookingSession = {
  passengers: [],
  airSegments: [],
  hotel: null,
  car: null,
  activeFlight: null,
  activeSearchType: 'air',
  contact: {},
  ssrs: [],
  remarks: '',
  specialRequestSeatMap: {},
  selectedSeats: {}
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      terminalOpen: false,
      terminalDrawerOpen: false,
      pendingTerminalCommand: null,
      dashboardTheme: 'light',
      booking: defaultBooking,
      toggleTerminal: () =>
        set((state) => ({
          terminalOpen: !state.terminalOpen,
          terminalDrawerOpen: false,
          pendingTerminalCommand: state.terminalOpen ? null : state.pendingTerminalCommand
        })),
      toggleTerminalDrawer: () =>
        set((state) => ({
          terminalDrawerOpen: !state.terminalDrawerOpen
        })),
      setPendingTerminalCommand: (cmd) =>
        set(() => ({
          pendingTerminalCommand: cmd
        })),
      openTerminalWithCommand: (cmd) =>
        set(() => ({
          terminalOpen: true,
          terminalDrawerOpen: false,
          pendingTerminalCommand: cmd
        })),
      setDashboardTheme: (dashboardTheme) =>
        set(() => ({
          dashboardTheme
        })),
      toggleDashboardTheme: () =>
        set((state) => ({
          dashboardTheme: state.dashboardTheme === 'dark' ? 'light' : 'dark'
        })),
      setBookingSession: (session) =>
        set((state) => ({
          booking: { ...state.booking, ...session }
        })),
      resetBookingSession: () =>
        set(() => ({
          booking: defaultBooking
        })),
      addAirSegment: (segment) =>
        set((state) => ({
          booking: {
            ...state.booking,
            airSegments: [...state.booking.airSegments, segment]
          }
        })),
      removeAirSegment: (id) =>
        set((state) => ({
          booking: {
            ...state.booking,
            airSegments: state.booking.airSegments.filter((s) => s.id !== id)
          }
        })),
      setSelectedSeat: (segmentId, seat) =>
        set((state) => ({
          booking: {
            ...state.booking,
            selectedSeats: { ...state.booking.selectedSeats, [segmentId]: seat }
          }
        })),
      setActiveFlight: (flight) =>
        set((state) => ({
          booking: {
            ...state.booking,
            activeFlight: flight,
            activeSearchType: 'air',
            airSegments: [
              {
                id: flight.id,
                from: flight.origin,
                to: flight.destination,
                carrier: flight.airline,
                flightNumber: flight.flightNumber,
                departure: flight.departure,
                arrival: flight.arrival,
                durationMinutes: flight.durationMinutes,
                stops: flight.stops,
                cabin: flight.tripType === 'return' ? 'Economy' : 'Economy',
                fareType: flight.contentType,
                deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
            ]
          }
        }))
    }),
    {
      name: 'sabre-gds-store',
      partialize: (state) => {
        const { pendingTerminalCommand: _omit, ...rest } = state;
        void _omit;
        return rest as AppState;
      }
    }
  )
);
