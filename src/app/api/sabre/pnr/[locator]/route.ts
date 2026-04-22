import { NextResponse } from 'next/server';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { getReservation } from '@/lib/sabre/pnr/getReservation';
import { mapReservationXmlToPnr } from '@/lib/sabre/mappers/pnr';
import { requireActiveOrgId } from '@/lib/auth/org';

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ locator: string }> }
) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const { locator } = await params;
    const resolved = await resolveCredentials({ op: 'retrievePnr', orgId });
    const xml = await getReservation(resolved, { locator }, orgId);
    return NextResponse.json(mapReservationXmlToPnr(xml, locator));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Retrieve failed' },
      { status: 400 }
    );
  }
};
