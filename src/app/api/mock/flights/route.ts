import { NextResponse } from 'next/server';
import flights from '@/fixtures/flights.json';

export async function GET() {
  return NextResponse.json(flights);
}
