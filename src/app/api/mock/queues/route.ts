import { NextResponse } from 'next/server';
import queues from '@/fixtures/queues.json';
import { rebaseQueues } from '@/lib/mock-rebase';
import type { QueueBucket } from '@/lib/types';

export async function GET() {
  return NextResponse.json(rebaseQueues(queues as unknown as QueueBucket[]));
}
