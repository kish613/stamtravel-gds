import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import {
  deleteAgencyCredentials,
  getAgencyCredentialsPublic,
  putAgencyCredentials,
  type StoredAgencyCredentials
} from '@/lib/sabre';
import { requireActiveOrgId, requireOrgAdmin } from '@/lib/auth/org';

const NDC_CARRIER_DEFAULTS = ['BA', 'IB', 'AA', 'UA', 'DL', 'LY'] as const;

const putSchema = z.object({
  env: z.enum(['CERT', 'PROD']),
  pcc: z.string().min(2).max(10),
  epr: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  iata: z
    .string()
    .regex(/^\d{7,8}$/)
    .optional(),
  arc: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),
  ndcCarriers: z.array(z.string().length(2)).max(50).optional()
});

export const GET = async () => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const pub = await getAgencyCredentialsPublic(orgId);
    return NextResponse.json(pub);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 401 }
    );
  }
};

export const PUT = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireOrgAdmin();
    const body = putSchema.parse(await req.json());
    const stored: StoredAgencyCredentials = {
      env: body.env,
      pcc: body.pcc,
      epr: body.epr,
      password: body.password,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      iata: body.iata,
      arc: body.arc,
      ndcCarriers: body.ndcCarriers ?? Array.from(NDC_CARRIER_DEFAULTS)
    };
    await putAgencyCredentials(orgId, stored);
    const pub = await getAgencyCredentialsPublic(orgId);
    return NextResponse.json(pub);
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 401;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status }
    );
  }
};

export const DELETE = async () => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireOrgAdmin();
    await deleteAgencyCredentials(orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 401 }
    );
  }
};
