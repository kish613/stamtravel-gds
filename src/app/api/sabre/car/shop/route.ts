import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { getVehAvail } from '@/lib/sabre/car/veh';
import { mapVehAvailToCars } from '@/lib/sabre/mappers/car';
import { getActiveOrgId } from '@/lib/auth/org';

const schema = z.object({
  pickupLocation: z.string().length(3),
  pickupDateTime: z.string(),
  returnDateTime: z.string(),
  category: z.enum(['economy', 'compact', 'intermediate']).optional()
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = (await getActiveOrgId()) ?? undefined;
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'shop', orgId });
    const raw = await getVehAvail(resolved, body, orgId);
    return NextResponse.json(mapVehAvailToCars(raw));
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Car shop failed' },
      { status }
    );
  }
};
