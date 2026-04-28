import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/org';
import {
  DEFAULT_LAYOUTS,
  LAYOUT_VERSION,
  layoutsSchema,
  mergeWithDefaults
} from '@/lib/dashboard-layout';
import {
  deleteDashboardLayout,
  getDashboardLayout,
  putDashboardLayout
} from '@/lib/dashboard-layout/store';

const putSchema = z.object({
  version: z.literal(LAYOUT_VERSION),
  layouts: layoutsSchema
});

export const GET = async () => {
  try {
    const userId = await requireUserId();
    const stored = await getDashboardLayout(userId);
    return NextResponse.json(
      stored ?? { version: LAYOUT_VERSION, layouts: DEFAULT_LAYOUTS }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 401 }
    );
  }
};

export const PUT = async (req: Request) => {
  try {
    const userId = await requireUserId();
    const body = putSchema.parse(await req.json());
    const merged = mergeWithDefaults(body.layouts);
    await putDashboardLayout(userId, merged);
    return NextResponse.json({ version: LAYOUT_VERSION, layouts: merged });
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 401;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status }
    );
  }
};

export const DELETE = async () => {
  try {
    const userId = await requireUserId();
    await deleteDashboardLayout(userId);
    return NextResponse.json({ version: LAYOUT_VERSION, layouts: DEFAULT_LAYOUTS });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 401 }
    );
  }
};
