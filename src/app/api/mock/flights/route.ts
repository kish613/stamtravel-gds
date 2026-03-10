import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { searchAir } from '@/lib/server/sabre-service';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const flights = await searchAir({
      tripType: (params.tripType as 'one-way' | 'return' | 'multi-city') || 'one-way',
      origin: params.origin || '',
      destination: params.destination || '',
      departure: params.departure,
      returnDate: params.returnDate,
      adults: Number(params.adults || 1),
      children: Number(params.children || 0),
      infants: Number(params.infants || 0),
      cabin: (params.cabin as 'Economy' | 'Premium Economy' | 'Business' | 'First') || 'Economy',
      maxStops: Number(params.maxStops || 2),
      preferredAirline: params.preferredAirline,
      alliance: params.alliance,
      ndcOnly: params.ndcOnly === 'true',
      flexibleWindow: Number(params.flexibleWindow || 0),
      flexible: params.flexible === 'true'
    });
    return NextResponse.json(flights);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to search flights.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
