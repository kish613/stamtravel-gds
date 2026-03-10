import { NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { listPnrs } from '@/lib/server/sabre-service';

export async function GET() {
  try {
    const pnrs = await listPnrs();
    return NextResponse.json(pnrs);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to load bookings.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
