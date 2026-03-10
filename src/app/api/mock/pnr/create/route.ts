import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { createPnr } from '@/lib/server/sabre-service';
import type { CreatePnrInput } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreatePnrInput;
    const result = await createPnr(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to create PNR.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
