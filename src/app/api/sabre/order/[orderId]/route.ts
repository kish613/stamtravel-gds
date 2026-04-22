import { NextResponse } from 'next/server';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { orderView } from '@/lib/sabre/ndc/orderView';
import { requireActiveOrgId } from '@/lib/auth/org';

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const { orderId } = await params;
    const resolved = await resolveCredentials({ op: 'retrievePnr', orgId });
    const raw = await orderView(resolved, orderId, orgId);
    return NextResponse.json(raw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Order view failed' },
      { status: 400 }
    );
  }
};
