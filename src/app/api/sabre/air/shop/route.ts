import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { runBfmShop } from '@/lib/sabre/air/bfm';
import { mapBfmToFlightResults } from '@/lib/sabre/mappers/flight';
import { getActiveOrgId } from '@/lib/auth/org';

const querySchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(['Y', 'S', 'C', 'F']).optional()
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = (await getActiveOrgId()) ?? undefined;
    const body = querySchema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'shop', orgId });
    const raw = await runBfmShop(resolved, body, orgId);
    const flights = mapBfmToFlightResults(raw);
    return NextResponse.json(flights);
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Shop failed' },
      { status }
    );
  }
};
