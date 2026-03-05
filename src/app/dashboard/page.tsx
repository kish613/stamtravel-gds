'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePnrList, useQueues } from '@/lib/query';
import { toMinutesLeft, formatCountdown } from '@/lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statusClass = (count: number) => {
  if (count < 10) return 'text-status-good bg-status-good/10 border-status-good';
  if (count <= 30) return 'text-status-warn bg-status-warn/10 border-status-warn';
  return 'text-status-danger bg-status-danger/10 border-status-danger';
};

export default function DashboardPage() {
  const { data: pnrData, isLoading: loadingPnr, isError: errPnr, error: pnrError, refetch: refetchPnr } = usePnrList();
  const { data: queueData, isLoading: loadingQueue, isError: errQueue, error: queueError, refetch: refetchQueue } = useQueues();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const q0to9 = useMemo(() => {
    const buckets = queueData || [];
    return Array.from({ length: 10 }, (_, i) => {
      const q = buckets.find((bucket) => bucket.queueCode === `Q${i}`);
      return { queueCode: `Q${i}`, count: q?.items.length || 0 };
    });
  }, [queueData]);

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const todaysPnrs = (pnrData || []).filter((p) => p.departureDate === todayKey);
  const urgentPnrs = (pnrData || [])
    .map((p) => {
      const allDeadlines = p.segments.map((s) => s.deadlineAt || '').filter(Boolean);
      const deadlineAt = allDeadlines.sort()[0] || p.departureDate;
      return { ...p, deadlineAt, minutes: toMinutesLeft(deadlineAt) };
    })
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 5);

  const bookingsToday = pnrData?.filter((p) => p.createdAt.slice(0, 10) === todayKey).length ?? 0;
  const segmentsToday =
    pnrData
      ?.filter((p) => p.departureDate === todayKey)
      .reduce((acc, p) => acc + p.segments.length, 0) ?? 0;
  const revenueToday = pnrData?.filter((p) => p.departureDate === todayKey).reduce((acc, p) => acc + p.pricing.total, 0) ?? 0;

  const busy = loadingPnr || loadingQueue;

  return (
    <div className="space-y-4 text-[13px]">
      <div>
        <h1 className="text-[20px] font-semibold">Dashboard</h1>
      </div>

      <section>
        <div className="flex flex-wrap gap-2">
          {busy ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="h-20 w-32 rounded border border-[#E2E8F0] bg-white shadow-card p-2">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </div>
          ) : (
            q0to9.map((q) => (
              <Card key={q.queueCode} className={`w-32 border ${statusClass(q.count)}`}>
                <CardContent className="p-2">
                  <div className="text-[11px] text-[#334155]">{q.queueCode}</div>
                  <div className="text-[20px] font-semibold">{q.count}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {errQueue && (
        <Card className="border-status-danger">
          <CardContent className="text-status-danger py-3 text-sm">
            {(queueError as Error)?.message || 'Failed to load queues'}
            <div className="mt-2">
              <Button size="sm" onClick={() => refetchQueue()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Bookings today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-semibold">{busy ? <Skeleton className="h-8 w-16" /> : bookingsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Segments today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-semibold">{busy ? <Skeleton className="h-8 w-16" /> : segmentsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-semibold">{busy ? <Skeleton className="h-8 w-20" /> : `$${revenueToday}`}</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s departures</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPnr ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-8 w-full" />
                ))}
              </div>
            ) : todaysPnrs.length === 0 ? (
              <div className="text-[#64748B] py-2">No departures today.</div>
            ) : (
              <div className="space-y-2">
                {todaysPnrs.map((p) => (
                  <div key={p.locator} className="rounded border border-[#CBD5E1] bg-[#F8FAFC] p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.passengerName}</div>
                      <div className="text-[12px] text-[#475569]">{p.locator} · {p.route}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticketing time-limit alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPnr ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {urgentPnrs.map((p) => {
                  const deadline = formatCountdown(p.deadlineAt) || '00:00';
                  return (
                    <div key={p.locator} className="rounded border border-[#CBD5E1] bg-[#F8FAFC] p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.locator}</div>
                        <div className="text-[12px] text-[#475569]">{p.passengerName} · {p.route}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[12px]">{deadline}</div>
                        <Badge variant={Number(p.minutes) <= 40 ? 'warning' : 'neutral'}>
                          {Number(p.minutes) <= 40 ? 'Approaching' : 'Safe'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {!urgentPnrs.length && <div className="text-[#64748B]">No urgent ticketing deadlines.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2">
            <Link href="/search/air">
              <Button size="lg">New Search</Button>
            </Link>
            <Link href="/bookings">
              <Button variant="outline" size="lg">
                Open PNR
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              New Queue
            </Button>
          </CardContent>
        </Card>
      </section>

      {errPnr && (
        <Card className="border-status-danger">
          <CardContent className="text-status-danger py-3">
            {(pnrError as Error)?.message || 'Failed to load PNR data'}
            <div className="mt-2">
              <Button size="sm" onClick={() => refetchPnr()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
