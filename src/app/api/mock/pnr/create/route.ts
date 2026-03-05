import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    locator: `NEW${Math.floor(10 + Math.random() * 90)}`,
    status: 'Booked',
    passengerName: 'New Passenger',
    route: 'LHR-JFK',
    createdAt: new Date().toISOString(),
    departureDate: new Date().toISOString().slice(0, 10),
    segments: [],
    passengers: [],
    contact: { phone: '', email: '', agencyIata: '' },
    pricing: { total: 0, taxes: 0, fees: 0, currency: 'USD' },
    ttlMinutes: 120,
    history: [],
    queue: 'Q0'
  });
}
