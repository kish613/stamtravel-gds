import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { getHotelAvail } from '@/lib/sabre/hotel/csl';
import { mapCslToHotels } from '@/lib/sabre/mappers/hotel';
import { getActiveOrgId } from '@/lib/auth/org';

const schema = z.object({
  cityCode: z.string().length(3).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(6).default(2),
  rooms: z.number().int().min(1).max(4).default(1)
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = (await getActiveOrgId()) ?? undefined;
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'shop', orgId });
    const raw = await getHotelAvail(resolved, body, orgId);
    return NextResponse.json(mapCslToHotels(raw));
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Hotel shop failed' },
      { status }
    );
  }
};
