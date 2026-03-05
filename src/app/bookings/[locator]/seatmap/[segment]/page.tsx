'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSeatMap } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import type { Seat } from '@/lib/types';

const exitRows = [11, 12, 13, 14, 29];

export default function SeatMapPage({ params }: { params: { locator: string; segment: string } }) {
  const router = useRouter();
  const { data: mapData } = useSeatMap(params.segment);
  const selectedSeats = useAppStore((state) => state.booking.selectedSeats);
  const setSelectedSeat = useAppStore((state) => state.setSelectedSeat);
  const [localSeat, setLocalSeat] = useState(selectedSeats[params.segment] || '');

  const rows = useMemo(() => {
    if (!mapData) return [];
    return mapData.rows.flat() as Seat[];
  }, [mapData]);

  const grouped = useMemo(() => {
    const index: Record<number, any[]> = {};
    rows.forEach((seat) => {
      if (!index[seat.row]) index[seat.row] = [];
      index[seat.row].push(seat);
    });
    return Object.entries(index)
      .map(([row, seats]) => ({
        row: Number(row),
        seats: seats.sort((a, b) => a.col.localeCompare(b.col))
      }))
      .sort((a, b) => a.row - b.row);
  }, [rows]);

  const colors = (status: string, selected: boolean) => {
    if (selected) return 'bg-blue-500 text-white';
    if (status === 'occupied') return 'bg-gray-400 text-white';
    if (status === 'premium' || status === 'fee') return 'bg-amber-500 text-white';
    return 'bg-white';
  };

  if (!mapData) {
    return <div className="text-sm">Loading seat map...</div>;
  }

  return (
    <div className="space-y-4 text-[13px]">
      <Card>
        <CardHeader>
          <CardTitle>Seat Map · Segment {params.segment} · {params.locator}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid gap-2 min-w-[640px]">
              {grouped.map(({ row, seats }) => {
                const isExitRow = exitRows.includes(row);
                return (
                  <div key={row} className={`flex items-center gap-1 ${isExitRow ? 'border-t border-b border-emerald-500' : ''}`}>
                    <div className="w-8 text-right text-[12px] text-[#64748B]">{row}</div>
                    <div className="flex gap-1">
                      {seats
                        .filter((s) => s.col <= 'C')
                        .map((seat) => {
                          const seatCode = `${seat.row}${seat.col}`;
                          const selected = localSeat === seatCode;
                          return (
                            <button
                              key={seatCode}
                              title={`${seatCode} • ${seat.type || 'seat'} ${seat.fee ? `• $${seat.fee}` : ''}`}
                              onClick={() => {
                                if (seat.status === 'occupied') return;
                                setLocalSeat(seatCode);
                              }}
                              disabled={seat.status === 'occupied'}
                              className={`h-8 w-8 rounded border text-[11px] ${colors(
                                seat.status,
                                selected
                              )} ${seat.status === 'occupied' ? 'cursor-not-allowed opacity-70' : 'hover:opacity-90'}`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                    </div>
                    <div className="w-6" />
                    <div className="flex gap-1">
                      {seats
                        .filter((s) => s.col > 'C')
                        .map((seat) => {
                          const seatCode = `${seat.row}${seat.col}`;
                          const selected = localSeat === seatCode;
                          return (
                            <button
                              key={seatCode}
                              title={`${seatCode} • ${seat.type || 'seat'} ${seat.fee ? `• $${seat.fee}` : ''}`}
                              onClick={() => {
                                if (seat.status === 'occupied') return;
                                setLocalSeat(seatCode);
                              }}
                              disabled={seat.status === 'occupied'}
                              className={`h-8 w-8 rounded border text-[11px] ${colors(
                                seat.status,
                                selected
                              )} ${seat.status === 'occupied' ? 'cursor-not-allowed opacity-70' : 'hover:opacity-90'}`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                    </div>
                    <div className="ml-3 text-[11px] text-[#64748B]">{isExitRow ? 'Exit row' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-[12px]">
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-white border"></span>Available</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-gray-400"></span>Occupied</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-amber-500"></span>Premium/Fee</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-blue-500"></span>Selected</div>
            <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 border-2 border-emerald-500"></span>Exit row</div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              onClick={() => {
                if (!localSeat) return;
                setSelectedSeat(params.segment, localSeat);
                router.push(`/bookings/${params.locator}`);
              }}
            >
              Confirm selection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
