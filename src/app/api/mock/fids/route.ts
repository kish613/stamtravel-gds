import { NextResponse } from 'next/server';
import fids from '@/fixtures/fids.json';

export async function GET() {
  return NextResponse.json(fids);
}
