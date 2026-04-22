import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { issueTicket } from '@/lib/sabre/ticket/airTicket';
import { requireActiveOrgId } from '@/lib/auth/org';

const schema = z.object({
  locator: z.string().length(6),
  formOfPayment: z.enum(['CC', 'CASH', 'CHECK']),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  commissionPercent: z.number().min(0).max(100).optional()
});

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'ticket', orgId });
    const raw = await issueTicket(resolved, body, orgId);
    return NextResponse.json(raw);
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ticket issue failed' },
      { status }
    );
  }
};
