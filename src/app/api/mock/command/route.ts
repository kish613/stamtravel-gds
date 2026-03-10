import { NextRequest, NextResponse } from 'next/server';
import { toErrorPayload } from '@/lib/server/errors';
import { runTerminalCommand } from '@/lib/server/sabre-service';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { command?: string };
    const result = await runTerminalCommand(body.command || '');
    return NextResponse.json(result);
  } catch (error) {
    const payload = toErrorPayload(error, 'Unable to execute terminal command.');
    return NextResponse.json(payload.body, { status: payload.statusCode });
  }
}
