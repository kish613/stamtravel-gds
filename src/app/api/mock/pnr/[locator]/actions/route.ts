import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { applyPnrAction } from '@/lib/server/sabre-service';
import type { PnrActionInput } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locator: string }> }
) {
  try {
    const { locator } = await params;
    const payload = (await request.json()) as PnrActionInput;
    if (!payload.action) {
      return NextResponse.json({ message: 'action is required.' }, { status: 400 });
    }
    const result = await applyPnrAction(locator, payload);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to update booking.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
