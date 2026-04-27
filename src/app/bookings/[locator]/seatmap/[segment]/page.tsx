'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSeatMap } from '@/lib/query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';
import { PageHeader } from '@/components/ui/page-header';
import { ActionBar } from '@/components/ui/action-bar';
import { LiveDot } from '@/components/ui/live-dot';
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
    const index: Record<number, Seat[]> = {};
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

  const seatClass = (status: string, selected: boolean) => {
    if (selected) return 'bg-sky-500 border-sky-500 text-white';
    if (status === 'occupied') return 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-60';
    if (status === 'premium' || status === 'fee') return 'bg-amber-400 border-amber-400 text-white';
    return 'bg-background border-border text-foreground hover:bg-muted/50';
  };

  if (!mapData) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 animate-shimmer rounded" />
        <div className="h-96 animate-shimmer rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[13px] pb-4">
      <PageHeader
        eyebrow={<>Seat Map · Segment {params.segment}</>}
        title="Pick a seat"
        meta={
          <>
            Locator{' '}
            <span className="font-mono font-semibold tracking-[0.02em] text-[var(--brand-navy-800)]">
              {params.locator}
            </span>
          </>
        }
        actions={<LiveDot tone="brand" pulse label="Live availability" />}
      />

      <Card variant="pro" accent="brand">
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid gap-1.5 min-w-[640px]">
              {grouped.map(({ row, seats }) => {
                const isExitRow = exitRows.includes(row);
                return (
                  <div
                    key={row}
                    className={`flex items-center gap-1 ${isExitRow ? 'border-t border-b border-sky-400' : ''}`}
                  >
                    <div className="w-8 text-right text-[12px] text-muted-foreground">{row}</div>
                    <div className="flex gap-1">
                      {seats
                        .filter((s) => s.col <= 'C')
                        .map((seat) => {
                          const seatCode = `${seat.row}${seat.col}`;
                          const selected = localSeat === seatCode;
                          return (
                            <button
                              key={seatCode}
                              title={`${seatCode} · ${seat.type || 'standard'} ${seat.fee ? `· $${seat.fee}` : ''}`}
                              onClick={() => { if (seat.status !== 'occupied') setLocalSeat(seatCode); }}
                              disabled={seat.status === 'occupied'}
                              className={`h-8 w-8 rounded border text-[11px] font-medium transition-colors ${seatClass(seat.status, selected)}`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                    </div>
                    {/* Aisle gap */}
                    <div className="w-5" />
                    <div className="flex gap-1">
                      {seats
                        .filter((s) => s.col > 'C')
                        .map((seat) => {
                          const seatCode = `${seat.row}${seat.col}`;
                          const selected = localSeat === seatCode;
                          return (
                            <button
                              key={seatCode}
                              title={`${seatCode} · ${seat.type || 'standard'} ${seat.fee ? `· $${seat.fee}` : ''}`}
                              onClick={() => { if (seat.status !== 'occupied') setLocalSeat(seatCode); }}
                              disabled={seat.status === 'occupied'}
                              className={`h-8 w-8 rounded border text-[11px] font-medium transition-colors ${seatClass(seat.status, selected)}`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                    </div>
                    <div className="ml-3 text-[11px] text-muted-foreground">
                      {isExitRow ? 'Exit' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-muted-foreground border-t border-border pt-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-border bg-background" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-border bg-muted opacity-60" />
              Occupied
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-amber-400 bg-amber-400" />
              Premium / Fee
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border border-sky-500 bg-sky-500" />
              Selected
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded border-2 border-sky-400 bg-background" />
              Exit row
            </div>
          </div>

        </CardContent>
      </Card>

      <ActionBar
        meta={
          <span className="text-[12px] text-muted-foreground">
            {localSeat ? (
              <>
                Selected seat{' '}
                <span className="font-mono font-bold text-[var(--brand-navy-800)] tabular-nums">
                  {localSeat}
                </span>
              </>
            ) : (
              <>No seat selected yet — pick from the map.</>
            )}
          </span>
        }
        secondary={
          <Button variant="outline" onClick={() => router.push(`/bookings/${params.locator}`)}>
            Cancel
          </Button>
        }
        primary={
          <Button
            variant="primary"
            disabled={!localSeat}
            onClick={() => {
              setSelectedSeat(params.segment, localSeat);
              router.push(`/bookings/${params.locator}`);
            }}
          >
            Confirm seat {localSeat || ''}
          </Button>
        }
      />
    </div>
  );
}
