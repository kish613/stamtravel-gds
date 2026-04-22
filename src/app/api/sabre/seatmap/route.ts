import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { getSeatsByOffer, getSeatsByPnr } from '@/lib/sabre/seat/getSeats';
import { mapSabreSeatMap } from '@/lib/sabre/mappers/seatMap';
import { getActiveOrgId, requireActiveOrgId } from '@/lib/auth/org';

const byOffer = z.object({ kind: z.literal('offer'), offerId: z.string() });
const byPnr = z.object({ kind: z.literal('pnr'), locator: z.string(), segmentRph: z.string() });
const schema = z.discriminatedUnion('kind', [byOffer, byPnr]);

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const body = schema.parse(await req.json());
    if (body.kind === 'offer') {
      const orgId = (await getActiveOrgId()) ?? undefined;
      const resolved = await resolveCredentials({ op: 'seatMapByOffer', orgId });
      const raw = await getSeatsByOffer(resolved, { offerId: body.offerId }, orgId);
      return NextResponse.json(mapSabreSeatMap(raw, body.offerId));
    }
    const orgId = await requireActiveOrgId();
    const resolved = await resolveCredentials({ op: 'seatMapByPnr', orgId });
    const raw = await getSeatsByPnr(resolved, body, orgId);
    return NextResponse.json(mapSabreSeatMap(raw, `${body.locator}:${body.segmentRph}`));
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seat map failed' },
      { status }
    );
  }
};
