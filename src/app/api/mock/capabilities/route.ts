import { NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { getCapabilities } from '@/lib/server/sabre-service';

export async function GET() {
  try {
    const result = await getCapabilities();
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to evaluate Sabre capabilities.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
