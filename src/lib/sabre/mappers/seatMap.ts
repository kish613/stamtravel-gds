import type { Seat, SeatMap } from '@/lib/types';

interface SabreSeatRow {
  row?: number | string;
  seats?: Array<{
    code?: string;
    column?: string;
    available?: boolean;
    type?: string;
    price?: { amount?: number };
  }>;
}

interface SabreSeatMapLike {
  segmentId?: string;
  rows?: SabreSeatRow[];
  premiumRows?: number[];
}

const statusFor = (seat: NonNullable<SabreSeatRow['seats']>[number]): Seat['status'] => {
  if (!seat.available) return 'occupied';
  if (seat.type?.toLowerCase().includes('exit')) return 'exit';
  if (seat.type?.toLowerCase().includes('premium')) return 'premium';
  if (seat.price?.amount && seat.price.amount > 0) return 'fee';
  return 'available';
};

export const mapSabreSeatMap = (
  raw: unknown,
  fallbackSegmentId: string
): SeatMap => {
  const r = (raw ?? {}) as SabreSeatMapLike;
  return {
    segmentId: r.segmentId ?? fallbackSegmentId,
    rows:
      r.rows?.map((row) =>
        (row.seats ?? []).map<Seat>((s) => ({
          row: Number(row.row ?? 0) || 0,
          col: s.column ?? s.code?.slice(-1) ?? '',
          status: statusFor(s),
          fee: s.price?.amount,
          type: s.type
        }))
      ) ?? [],
    premiumRows: r.premiumRows ?? []
  };
};
