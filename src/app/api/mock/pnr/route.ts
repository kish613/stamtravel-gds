import { NextRequest, NextResponse } from 'next/server';
import pnr from '@/fixtures/pnr.json';
import { rebasePnrs } from '@/lib/mock-rebase';
import type { PNR } from '@/lib/types';

export async function GET() {
  return NextResponse.json(rebasePnrs(pnr as unknown as PNR[]));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const payload = body?.payload;

  if (!payload) {
    return NextResponse.json({ message: 'Missing payload' }, { status: 400 });
  }

  const generated = {
    locator: `${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    status: 'Booked',
    passengerName: payload.passengers?.[0]
      ? `${payload.passengers[0].firstName} ${payload.passengers[0].lastName}`
      : 'Guest',
    route:
      payload.segments?.[0]
        ? `${payload.segments[0].from}-${payload.segments[payload.segments.length - 1]?.to || payload.segments[0].to}`
        : 'N/A',
    createdAt: new Date().toISOString(),
    departureDate: payload.segments?.[0]?.departure?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    segments: payload.segments || [],
    passengers: payload.passengers || [],
    contact: payload.contact || {},
    pricing: payload.pricing || { total: 0, taxes: 0, fees: 0, currency: 'USD' },
    ttlMinutes: 120,
    history: [{ date: new Date().toISOString(), event: 'Created', actor: 'Agent Console' }],
    queue: 'Q0'
  };

  return NextResponse.json(generated);
}
