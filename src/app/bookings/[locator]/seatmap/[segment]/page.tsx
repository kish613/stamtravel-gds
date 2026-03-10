'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignSeat, useSeatMap } from '@/lib/query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import type { Seat } from '@/lib/types';

const exitRows = [11, 12, 13, 14, 29];

export default function SeatMapPage({ params }: { params: Promise<{ locator: string; segment: string }> }) {
  const { locator, segment } = use(params);
  const router = useRouter();
  const { data: mapData, isLoading, isError, error } = useSeatMap(locator, segment);
  const selectedSeats = useAppStore((state) => state.booking.selectedSeats);
  const setSelectedSeat = useAppStore((state) => state.setSelectedSeat);
  const [localSeat, setLocalSeat] = useState(selectedSeats[segment] || '');
  const [message, setMessage] = useState<string | null>(null);
  const assignSeat = useAssignSeat();

  const rows = useMemo(() => {
    if (!mapData) return [] as Array<{ row: number; seats: Seat[] }>;
    const grouped = new Map<number, Seat[]>();
    mapData.rows.flat().forEach((seat) => {
      if (!grouped.has(seat.row)) grouped.set(seat.row, []);
      grouped.get(seat.row)!.push(seat);
    });
    return Array.from(grouped.entries())
      .map(([row, seats]) => ({ row, seats: seats.sort((left, right) => left.col.localeCompare(right.col)) }))
      .sort((left, right) => left.row - right.row);
  }, [mapData]);

  const seatClass = (status: string, selected: boolean) => {
    if (selected) return 'bg-sky-500 border-sky-500 text-white';
    if (status === 'occupied') return 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60';
    if (status === 'premium' || status === 'fee') return 'bg-amber-400 border-amber-400 text-white';
    return 'bg-background border-border text-foreground hover:bg-muted/50';
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading seat map...</div>;
  }

  if (isError || !mapData) {
    return <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-destructive">{(error as Error)?.message || 'Unable to load seat map.'}</div>;
  }

  return (
    <div className="space-y-6 text-[13px]">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Seat Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Segment {segment} · Locator <span className="font-mono">{locator}</span></p>
      </div>

      {message && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {message}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto">
            <div className="grid gap-1.5 min-w-[640px]">
              {rows.map(({ row, seats }) => {
                const isExitRow = exitRows.includes(row);
                return (
                  <div key={row} className={`flex items-center gap-1 ${isExitRow ? 'border-t border-b border-sky-400' : ''}`}>
                    <div className="w-8 text-right text-[12px] text-muted-foreground">{row}</div>
                    <div className="flex gap-1">
                      {seats.filter((seat) => seat.col <= 'C').map((seat) => {
                        const seatCode = `${seat.row}${seat.col}`;
                        const selected = localSeat === seatCode;
                        return (
                          <button
                            key={seatCode}
                            title={`${seatCode} · ${seat.type || 'standard'}${seat.fee ? ` · $${seat.fee}` : ''}`}
                            onClick={() => seat.status !== 'occupied' && setLocalSeat(seatCode)}
                            disabled={seat.status === 'occupied'}
                            className={`h-8 w-8 rounded border text-[11px] font-medium transition-colors ${seatClass(seat.status, selected)}`}
                          >
                            {seat.col}
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-5" />
                    <div className="flex gap-1">
                      {seats.filter((seat) => seat.col > 'C').map((seat) => {
                        const seatCode = `${seat.row}${seat.col}`;
                        const selected = localSeat === seatCode;
                        return (
                          <button
                            key={seatCode}
                            title={`${seatCode} · ${seat.type || 'standard'}${seat.fee ? ` · $${seat.fee}` : ''}`}
                            onClick={() => seat.status !== 'occupied' && setLocalSeat(seatCode)}
                            disabled={seat.status === 'occupied'}
                            className={`h-8 w-8 rounded border text-[11px] font-medium transition-colors ${seatClass(seat.status, selected)}`}
                          >
                            {seat.col}
                          </button>
                        );
                      })}
                    </div>
                    <div className="ml-3 text-[11px] text-muted-foreground">{isExitRow ? 'Exit' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-muted-foreground border-t border-border pt-4">
            <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded border border-border bg-background" />Available</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded border border-border bg-muted opacity-60" />Occupied</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded border border-amber-400 bg-amber-400" />Premium / Fee</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded border border-sky-500 bg-sky-500" />Selected</div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/bookings/${locator}`)}>Cancel</Button>
            <Button
              disabled={!localSeat || assignSeat.isPending}
              onClick={() => {
                assignSeat.mutate(
                  { locator, segmentId: segment, seatCode: localSeat },
                  {
                    onSuccess: (result) => {
                      setSelectedSeat(segment, localSeat);
                      setMessage(result.warnings[0] || `Seat ${localSeat} assigned.`);
                      router.push(`/bookings/${locator}`);
                    },
                    onError: (mutationError) => {
                      setMessage(mutationError.message || 'Unable to assign seat.');
                    }
                  }
                );
              }}
            >
              {assignSeat.isPending ? 'Assigning…' : `Confirm seat ${localSeat || ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
