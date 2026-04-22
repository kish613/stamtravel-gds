import { NextResponse } from 'next/server';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import {
  getAgencyCredentials,
  putAgencyCredentials,
  resolveCredentials,
  sabreRestCall
} from '@/lib/sabre';
import { requireActiveOrgId } from '@/lib/auth/org';

export const POST = async () => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const stored = await getAgencyCredentials(orgId);
    if (!stored) {
      return NextResponse.json(
        { ok: false, error: 'No credentials saved yet.' },
        { status: 400 }
      );
    }
    const resolved = await resolveCredentials({ op: 'lookup', orgId });
    await sabreRestCall<{ AirlineLookup?: unknown }>(resolved, {
      op: 'lookup',
      orgId,
      path: '/v1/lists/utilities/airlines?airlinecode=BA'
    });
    const verifiedAt = new Date().toISOString();
    await putAgencyCredentials(orgId, { ...stored, verifiedAt });
    return NextResponse.json({ ok: true, verifiedAt });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Test failed' },
      { status: 400 }
    );
  }
};
