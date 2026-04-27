import { NextResponse } from 'next/server';
import alerts from '@/fixtures/flight-alerts.json';
import type { FlightAlert } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  const all = alerts as FlightAlert[];
  if (!since) return NextResponse.json(all);
  const cutoff = Date.parse(since);
  if (Number.isNaN(cutoff)) return NextResponse.json(all);
  const delta = all.filter((a) => Date.parse(a.createdAt) > cutoff);
  return NextResponse.json(delta);
}
