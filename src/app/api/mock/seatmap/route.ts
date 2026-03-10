import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { assignSeat, getSeats } from '@/lib/server/sabre-service';
import type { SeatAssignmentInput } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const locator = request.nextUrl.searchParams.get('locator');
    const segmentId = request.nextUrl.searchParams.get('segmentId');
    if (!locator || !segmentId) {
      return NextResponse.json({ message: 'locator and segmentId are required.' }, { status: 400 });
    }
    const result = await getSeats(locator, segmentId);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to load seat map.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SeatAssignmentInput;
    if (!payload.locator || !payload.segmentId || !payload.seatCode) {
      return NextResponse.json({ message: 'locator, segmentId, and seatCode are required.' }, { status: 400 });
    }
    const result = await assignSeat(payload);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to assign seat.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
