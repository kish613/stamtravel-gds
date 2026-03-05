import { NextResponse } from 'next/server';
import seatmap from '@/fixtures/seatmap.json';

export async function GET() {
  return NextResponse.json(seatmap);
}

export async function POST() {
  return NextResponse.json({ status: 'live', message: 'Sabre seatmap integration coming in Phase 3' });
}
