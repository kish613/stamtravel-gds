import { NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { getReservation } from '@/lib/server/sabre-service';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ locator: string }> }
) {
  try {
    const { locator } = await params;
    const result = await getReservation(locator);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to load booking.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
