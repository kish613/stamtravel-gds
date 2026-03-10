import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { listQueues, moveQueueItem } from '@/lib/server/sabre-service';
import type { QueueMutationInput } from '@/lib/types';

export async function GET() {
  try {
    const queues = await listQueues();
    return NextResponse.json(queues);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to load queues.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as QueueMutationInput;
    if (!payload.locator || !payload.toQueue) {
      return NextResponse.json({ message: 'locator and toQueue are required.' }, { status: 400 });
    }
    const result = await moveQueueItem(payload);
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to update queue.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
