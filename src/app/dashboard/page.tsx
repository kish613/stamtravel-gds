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
  if (count < 10) return 'text-emerald-700 border-emerald-300/50 bg-gradient-to-br from-emerald-100/60 to-emerald-50/30 shadow-[0_0_12px_rgba(5,150,105,0.1)]';
  if (count <= 30) return 'text-amber-700 border-amber-300/50 bg-gradient-to-br from-amber-100/60 to-amber-50/30 shadow-[0_0_12px_rgba(217,119,6,0.1)]';
  return 'text-rose-700 border-rose-300/50 bg-gradient-to-br from-rose-100/60 to-rose-50/30 shadow-[0_0_12px_rgba(225,29,72,0.1)]';
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0F172A] to-[#334155] bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-[#64748B] text-sm mt-1">Real-time operations overview</p>
      </div>

      {/* Queue count cards */}
      <section>
        <div className="flex flex-wrap gap-2.5">
          {busy ? (
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="h-20 w-32 rounded-xl border border-white/20 bg-white/60 backdrop-blur-sm p-2">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </div>
          ) : (
            q0to9.map((q) => (
              <Card key={q.queueCode} className={`w-32 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${statusClass(q.count)}`}>
                <CardContent className="p-2.5">
                  <div className="text-[11px] text-[#64748B] font-medium">{q.queueCode}</div>
                  <div className="text-[22px] font-bold tracking-tight">{q.count}</div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {errQueue && (
        <Card className="border-rose-300/50 bg-rose-50/60 backdrop-blur-sm">
          <CardContent className="text-rose-700 py-3 text-sm">
            {(queueError as Error)?.message || 'Failed to load queues'}
            <div className="mt-2">
              <Button size="sm" onClick={() => refetchQueue()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(59,130,246,0.08)] hover:shadow-[0_8px_40px_rgba(59,130,246,0.14)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-[#64748B] text-sm font-medium">Bookings today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0F172A] tracking-tight">{busy ? <Skeleton className="h-10 w-16" /> : bookingsToday}</div>
              <div className="text-emerald-600 text-xs font-medium mb-1.5">+12%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(56,189,248,0.08)] hover:shadow-[0_8px_40px_rgba(56,189,248,0.14)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-[#64748B] text-sm font-medium">Segments today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0F172A] tracking-tight">{busy ? <Skeleton className="h-10 w-16" /> : segmentsToday}</div>
              <div className="text-emerald-600 text-xs font-medium mb-1.5">+8%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(139,92,246,0.08)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.14)] transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-[#64748B] text-sm font-medium">Revenue today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[32px] font-bold text-[#0F172A] tracking-tight">{busy ? <Skeleton className="h-10 w-20" /> : `$${revenueToday}`}</div>
              <div className="text-emerald-600 text-xs font-medium mb-1.5">+5%</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Departures and ticketing alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
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
                  <div key={p.locator} className="rounded-lg border border-white/20 bg-white/50 backdrop-blur-sm p-2.5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
                    <div>
                      <div className="font-medium text-[#0F172A]">{p.passengerName}</div>
                      <div className="text-[12px] text-[#64748B]">{p.locator} · {p.route}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardHeader className="bg-gradient-to-r from-slate-50/80 to-indigo-50/80 rounded-t-lg">
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
                    <div key={p.locator} className="rounded-lg border border-white/20 bg-white/50 backdrop-blur-sm p-2.5 flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
                      <div>
                        <div className="font-medium text-[#0F172A]">{p.locator}</div>
                        <div className="text-[12px] text-[#64748B]">{p.passengerName} · {p.route}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[12px] text-[#475569]">{deadline}</div>
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

      {/* Quick actions */}
      <section>
        <Card className="bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardContent className="p-5 flex flex-wrap gap-3">
            <Link href="/search/air">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_28px_rgba(59,130,246,0.35)] transition-all duration-300">New Search</Button>
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
        <Card className="border-rose-300/50 bg-rose-50/60 backdrop-blur-sm">
          <CardContent className="text-rose-700 py-3">
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
