import { NextResponse } from 'next/server';
import airports from '@/fixtures/airports.json';

export async function GET() {
  return NextResponse.json(airports);
}
