import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { sendSabreCommand } from '@/lib/sabre/command/sabreCommand';
import { requireActiveOrgId } from '@/lib/auth/org';

const schema = z.object({ command: z.string().min(1).max(400) });

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const { command } = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'sabreCommand', orgId });
    const screen = await sendSabreCommand(resolved, command, orgId);
    return NextResponse.json({ screen });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Command failed' },
      { status }
    );
  }
};
