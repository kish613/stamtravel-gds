import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { voidTicket } from '@/lib/sabre/ticket/voidTicket';
import { requireActiveOrgId } from '@/lib/auth/org';

const schema = z.object({ ticketNumber: z.string().min(10) });

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'void', orgId });
    const raw = await voidTicket(resolved, body, orgId);
    return NextResponse.json(raw);
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Void failed' },
      { status }
    );
  }
};
