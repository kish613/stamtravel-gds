import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { revalidateAir } from '@/lib/server/sabre-service';
import type { FlightResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { flight?: FlightResult };
    if (!body.flight) {
      return NextResponse.json({ message: 'Missing flight payload.' }, { status: 400 });
    }
    const result = await revalidateAir(body.flight);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to revalidate itinerary.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
