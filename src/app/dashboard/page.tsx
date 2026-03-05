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

const queueDotClass = (count: number) => {
  if (count < 10) return 'bg-emerald-500';
  if (count <= 30) return 'bg-amber-400';
  return 'bg-rose-500';
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
    <div className="space-y-6 text-[13px]">
      <div>
        <h1 className="text-[28px] font-black text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-[14px] font-medium mt-1">Real-time operations overview</p>
      </div>

      {/* Queue count cards */}
      <section>
        <div className="flex flex-wrap gap-2.5">
          {busy ? (
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="h-[88px] w-32 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-3 w-6" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-10 mb-1.5" />
                  <Skeleton className="h-2.5 w-8" />
                </div>
              ))}
            </div>
          ) : (
            q0to9.map((q) => (
              <Link key={q.queueCode} href="/queues">
                <Card className="min-w-[124px] border border-border bg-card hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{q.queueCode}</span>
                      <span className={`w-2 h-2 rounded-full ${queueDotClass(q.count)}`} />
                    </div>
                    <div className="text-[28px] font-black tracking-tighter text-foreground leading-none">{q.count}</div>
                    <div className="text-[12px] text-muted-foreground mt-2 font-medium">items</div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {errQueue && (
        <Card className="border-destructive">
          <CardContent className="text-destructive py-3 text-sm">
            {(queueError as Error)?.message || 'Failed to load queues'}
            <div className="mt-2">
              <Button size="sm" onClick={() => refetchQueue()} variant="outline">Retry</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Bookings today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-16" /> : bookingsToday}</div>
              <div className="text-emerald-500 text-[13px] font-bold mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">+12%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-semibold">Segments today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-16" /> : segmentsToday}</div>
              <div className="text-emerald-500 text-[13px] font-bold mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">+8%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-semibold">Revenue today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-20" /> : `$${revenueToday}`}</div>
              <div className="text-emerald-500 text-[13px] font-bold mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">+5%</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Departures and ticketing alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <div className="text-muted-foreground py-2">No departures today.</div>
            ) : (
              <div className="space-y-1">
                {todaysPnrs.map((p) => (
                  <div key={p.locator} className="rounded-[12px] hover:bg-slate-50 transition-colors p-3 flex items-center justify-between group">
                    <div>
                      <div className="font-semibold text-[14px] text-foreground">{p.passengerName}</div>
                      <div className="text-[13px] text-muted-foreground font-medium mt-0.5">{p.locator} <span className="mx-1.5 text-slate-300">•</span> {p.route}</div>
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
              <div className="space-y-1">
                {urgentPnrs.map((p) => {
                  const deadline = formatCountdown(p.deadlineAt) || '00:00';
                  return (
                    <div key={p.locator} className="rounded-[12px] hover:bg-slate-50 transition-colors p-3 flex items-center justify-between group">
                      <div>
                        <div className="font-semibold text-[14px] text-foreground">{p.locator}</div>
                        <div className="text-[13px] text-muted-foreground font-medium mt-0.5">{p.passengerName} <span className="mx-1.5 text-slate-300">•</span> {p.route}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="font-mono text-[13px] font-medium text-slate-400">{deadline}</div>
                        <Badge variant={Number(p.minutes) <= 40 ? 'warning' : 'neutral'} className="font-semibold rounded-md">
                          {Number(p.minutes) <= 40 ? 'Approaching' : 'Safe'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {!urgentPnrs.length && <div className="text-muted-foreground">No urgent ticketing deadlines.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Link href="/search/air">
              <Button size="lg" variant="accent" className="font-bold px-6">New Search</Button>
            </Link>
            <Link href="/bookings">
              <Button variant="outline" size="lg" className="font-semibold bg-white">Open PNR</Button>
            </Link>
            <Button variant="outline" size="lg" className="font-semibold bg-white">New Queue</Button>
          </CardContent>
        </Card>
      </section>

      {errPnr && (
        <Card className="border-destructive">
          <CardContent className="text-destructive py-3">
            {(pnrError as Error)?.message || 'Failed to load PNR data'}
            <div className="mt-2">
              <Button size="sm" onClick={() => refetchPnr()} variant="outline">Retry</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
