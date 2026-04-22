import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { queueRemove } from '@/lib/sabre/queue/remove';
import { requireActiveOrgId } from '@/lib/auth/org';

const schema = z.object({
  queueNumber: z.string().regex(/^\d{1,3}$/),
  locator: z.string().length(6).optional()
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'queueWrite', orgId });
    await queueRemove(resolved, body, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Queue remove failed' },
      { status }
    );
  }
};
