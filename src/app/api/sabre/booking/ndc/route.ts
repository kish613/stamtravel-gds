import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { offerPrice } from '@/lib/sabre/ndc/offerPrice';
import { orderCreate } from '@/lib/sabre/ndc/orderCreate';
import { requireActiveOrgId } from '@/lib/auth/org';

const passengerSchema = z.object({
  passengerId: z.string().min(1),
  givenName: z.string().min(1),
  surname: z.string().min(1),
  title: z.string().optional(),
  birthDate: z.string().optional(),
  contact: z.object({ email: z.string().email(), phone: z.string().min(5) }),
  document: z
    .object({ number: z.string(), expiry: z.string(), issuingCountry: z.string().length(2) })
    .optional()
});

const schema = z.object({
  responseId: z.string().min(1),
  offerId: z.string().min(1),
  offerItemIds: z.array(z.string().min(1)).min(1),
  passengers: z.array(passengerSchema).min(1).max(9),
  payment: z.object({
    method: z.enum(['CASH', 'CC', 'OTHER']),
    cardNumber: z.string().optional(),
    expiry: z.string().optional(),
    cvv: z.string().optional(),
    cardHolder: z.string().optional()
  })
});

const extractOrderId = (raw: Record<string, unknown>): string | null => {
  const rs = raw.OrderViewRS as Record<string, unknown> | undefined;
  const response = rs?.Response as Record<string, unknown> | undefined;
  const order = response?.Order as Array<Record<string, unknown>> | undefined;
  const id = order?.[0]?.OrderID as { value?: string } | undefined;
  return id?.value ?? null;
};

export const POST = async (req: Request) => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const body = schema.parse(await req.json());
    const resolved = await resolveCredentials({ op: 'bookNdc', orgId });

    await offerPrice(
      resolved,
      {
        responseId: body.responseId,
        offerId: body.offerId,
        offerItemIds: body.offerItemIds,
        passengerRefs: body.passengers.map((p) => p.passengerId)
      },
      orgId
    );
    const created = await orderCreate(resolved, body, orgId);
    const orderId = extractOrderId(created);
    return NextResponse.json({ orderId, offerId: body.offerId, raw: created });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'NDC booking failed' },
      { status }
    );
  }
};
