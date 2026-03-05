import { NextResponse } from 'next/server';
import queues from '@/fixtures/queues.json';

export async function GET() {
  return NextResponse.json(queues);
}
