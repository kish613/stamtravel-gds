import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { queuePlace } from '@/lib/sabre/queue/place';
import { requireActiveOrgId } from '@/lib/auth/org';

const schema = z.object({
  locator: z.string().min(6).max(6),
  queueNumber: z.string().regex(/^\d{1,3}$/),
  comment: z.string().max(120).optional()
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'queueWrite', orgId });
    await queuePlace(resolved, body, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Queue place failed' },
      { status }
    );
  }
};
