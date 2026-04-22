import { NextResponse } from 'next/server';
import type { QueueBucket, QueueItem } from '@/lib/types';
import { ensureSabreBootstrapped } from '@/lib/sabre/bootstrap';
import { resolveCredentials } from '@/lib/sabre';
import { queueCount } from '@/lib/sabre/queue/count';
import { queueAccess } from '@/lib/sabre/queue/access';
import { requireActiveOrgId } from '@/lib/auth/org';

const parseCountXml = (xml: string): { queueCode: string; itemCount: number }[] => {
  const re = /<QueueInfo[^>]*Number="(\d+)"[^>]*Count="(\d+)"/g;
  return [...xml.matchAll(re)].map((m) => ({ queueCode: m[1], itemCount: Number(m[2]) }));
};

const parseAccessXml = (xml: string): QueueItem[] => {
  const re = /<PNR>([\s\S]*?)<\/PNR>/g;
  return [...xml.matchAll(re)].map((m) => {
    const block = m[1];
    const locator = /<RecordLocator>([^<]+)<\/RecordLocator>/.exec(block)?.[1] ?? '';
    const name = /<PassengerName>([^<]+)<\/PassengerName>/.exec(block)?.[1] ?? '';
    const depDate = /<DepartureDate>([^<]+)<\/DepartureDate>/.exec(block)?.[1] ?? '';
    const route = /<Route>([^<]+)<\/Route>/.exec(block)?.[1] ?? '';
    return {
      locator,
      passengerName: name,
      departureDate: depDate,
      route,
      deadlineAt: '',
      segmentsCount: 0,
      status: 'Booked' as const,
      agent: ''
    };
  });
};

export const GET = async () => {
  ensureSabreBootstrapped();
  try {
    const orgId = await requireActiveOrgId();
    const resolved = await resolveCredentials({ op: 'queueRead', orgId });
    const countXml = await queueCount(resolved, orgId);
    const counts = parseCountXml(countXml);
    const buckets: QueueBucket[] = await Promise.all(
      counts.map(async ({ queueCode }) => {
        const accessXml = await queueAccess(resolved, queueCode, orgId);
        return { queueCode, items: parseAccessXml(accessXml) };
      })
    );
    return NextResponse.json(buckets);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Queues fetch failed' },
      { status: 400 }
    );
  }
};
