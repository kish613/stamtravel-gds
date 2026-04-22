import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { revalidateItinerary } from '@/lib/sabre/air/revalidate';
import { enhancedAirBook } from '@/lib/sabre/air/enhancedAirBook';
import { passengerDetails } from '@/lib/sabre/pnr/passengerDetails';
import { requireActiveOrgId } from '@/lib/auth/org';

const segmentSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departDateTime: z.string(),
  arrivalDateTime: z.string(),
  marketingCarrier: z.string().min(2).max(3),
  flightNumber: z.string().regex(/^\d{1,4}$/),
  bookingClass: z.string().length(1),
  quantity: z.number().int().min(1).max(9)
});

const passengerSchema = z.object({
  nameNumber: z.string().default('1.1'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(['M', 'F', 'X']).optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  nationality: z.string().optional()
});

const schema = z.object({
  segments: z.array(segmentSchema).min(1).max(6),
  passengers: z.array(passengerSchema).min(1).max(9),
  contact: z.object({ phone: z.string().min(5), email: z.string().email() }),
  ticketingTimeLimit: z.string().optional(),
  revalidate: z.boolean().default(true)
});

const extractLocator = (res: Record<string, unknown>): string | null => {
  const candidates = [
    'ItineraryRef',
    'Itinerary',
    'TravelItineraryRead',
    'TravelItinerary',
    'CreatePassengerNameRecordRS'
  ];
  for (const key of candidates) {
    const v = res[key] as Record<string, unknown> | undefined;
    const locator = v?.['@ID'] ?? v?.ID ?? v?.Locator ?? v?.ConfirmationNumber;
    if (typeof locator === 'string') return locator;
  }
  return null;
};

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'bookAtpco', orgId });

    if (body.revalidate) {
      const first = body.segments[0];
      await revalidateItinerary(
        resolved,
        {
          pcc: resolved.creds.pcc,
          origin: first.origin,
          destination: first.destination,
          departDate: first.departDateTime.slice(0, 10),
          marketingCarrier: first.marketingCarrier,
          flightNumber: first.flightNumber,
          bookingClass: first.bookingClass,
          passengers: body.passengers.length
        },
        orgId
      );
    }

    await enhancedAirBook(resolved, { segments: body.segments }, orgId);
    const detailsRes = await passengerDetails(
      resolved,
      {
        passengers: body.passengers,
        contact: body.contact,
        ticketingTimeLimit: body.ticketingTimeLimit,
        endTransaction: true
      },
      orgId
    );

    const locator = extractLocator(detailsRes);
    return NextResponse.json({ locator, raw: detailsRes });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Booking failed' },
      { status }
    );
  }
};
