import { NextResponse } from 'next/server';
import hotels from '@/fixtures/hotels.json';

export async function GET() {
  return NextResponse.json(hotels);
}
