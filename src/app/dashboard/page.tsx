'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePnrList, useQueues } from '@/lib/query';
import { formatCountdown, toMinutesLeft } from '@/lib/time';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';

const queueDotClass = (count: number) => {
  if (count < 10) return 'bg-emerald-500';
  if (count <= 30) return 'bg-amber-400';
  return 'bg-rose-500';
};

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

const formatAge = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
};

const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));

const formatDeparture = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));

const deriveQueueAgeMinutes = (
  status: string,
  bucketIndex: number,
  itemIndex: number,
  segmentsCount: number
) => {
  const statusBase =
    status === 'Awaiting Ticket' ? 28 : status === 'Booked' ? 54 : status === 'Ticketed' ? 82 : 40;
  return statusBase + bucketIndex * 9 + itemIndex * 6 + segmentsCount * 5;
};

const getPrimaryDeparture = (departureDate: string, segmentDeparture?: string) =>
  segmentDeparture || `${departureDate}T00:00:00.000Z`;

const generatedPageSrc = '/api/generated-page';

export default function DashboardPage() {
  const { data: pnrData, isLoading: loadingPnr, isError: errPnr, error: pnrError, refetch: refetchPnr } = usePnrList();
  const { data: queueData, isLoading: loadingQueue, isError: errQueue, error: queueError, refetch: refetchQueue } = useQueues();
  const dashboardTheme = useAppStore((state) => state.dashboardTheme);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const now = clock;
  const todayKey = new Date(clock).toISOString().slice(0, 10);
  const busy = loadingPnr || loadingQueue;
  const isDark = dashboardTheme === 'dark';
  const dashboardCardClass = isDark
    ? 'border-white/[0.12] bg-white text-slate-950 shadow-[0_32px_100px_-64px_rgba(255,255,255,0.95)]'
    : '';
  const nestedPanelClass = cn(
    'rounded-[16px] border p-4',
    isDark ? 'border-black/10 bg-black/[0.03]' : 'border-border bg-slate-50/80'
  );
  const detailCardClass = cn(
    'rounded-[14px] border p-4',
    isDark ? 'border-black/10 bg-black/[0.03]' : 'border-border bg-white'
  );
  const listRowClass = cn(
    'rounded-[12px] p-3 flex items-center justify-between group transition-colors',
    isDark ? 'hover:bg-black/[0.04]' : 'hover:bg-slate-50'
  );
  const separatorClass = cn('mx-1.5', isDark ? 'text-slate-400' : 'text-slate-300');

  const q0to9 = useMemo(() => {
    const buckets = queueData || [];
    return Array.from({ length: 10 }, (_, i) => {
      const q = buckets.find((bucket) => bucket.queueCode === `Q${i}`);
      return { queueCode: `Q${i}`, count: q?.items.length || 0 };
    });
  }, [queueData]);

  const queueItems = useMemo(() => {
    return (queueData || []).flatMap((bucket, bucketIndex) =>
      bucket.items.map((item, itemIndex) => {
        const ageMinutes = deriveQueueAgeMinutes(item.status, bucketIndex, itemIndex, item.segmentsCount);
        return {
          ...item,
          queueCode: bucket.queueCode,
          ageMinutes
        };
      })
    );
  }, [queueData]);

  const queueHealth = useMemo(() => {
    const oldestAge = queueItems.length ? Math.max(...queueItems.map((item) => item.ageMinutes)) : 0;
    const newInLastHour = queueItems.filter((item) => item.ageMinutes <= 60).length;
    const slaBreaches = queueItems.filter((item) => item.ageMinutes >= 120).length;
    const pressuredQueues = (queueData || []).filter((bucket) => bucket.items.length >= 8).length;

    return {
      openWork: queueItems.length,
      oldestAge,
      newInLastHour,
      slaBreaches,
      pressuredQueues
    };
  }, [queueData, queueItems]);

  const pnrMetrics = useMemo(() => {
    const enriched = (pnrData || []).map((pnr) => {
      const primaryDeparture = getPrimaryDeparture(pnr.departureDate, pnr.segments[0]?.departure);
      const departureAt = new Date(primaryDeparture).getTime();
      const hoursToDeparture = Math.max(0, Math.round((departureAt - now) / 3600000));
      const scheduleChange = pnr.servicingTags?.includes('schedule-change') ?? false;
      const ticketSyncIssue =
        pnr.orderSyncStatus === 'Out Of Sync' ||
        pnr.orderSyncStatus === 'Needs Review' ||
        (pnr.servicingTags?.includes('ticket-sync') ?? false);

      return {
        ...pnr,
        primaryDeparture,
        hoursToDeparture,
        scheduleChange,
        ticketSyncIssue
      };
    });

    const todaysPnrs = enriched.filter((pnr) => pnr.departureDate === todayKey);
    const urgentPnrs = enriched
      .map((pnr) => {
        const allDeadlines = pnr.segments.map((segment) => segment.deadlineAt || '').filter(Boolean);
        const deadlineAt = allDeadlines.sort()[0] || pnr.departureDate;
        return { ...pnr, deadlineAt, minutes: toMinutesLeft(deadlineAt) };
      })
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 5);

    const bookingsToday = enriched.filter((pnr) => pnr.createdAt.slice(0, 10) === todayKey).length;
    const segmentsToday = todaysPnrs.reduce((acc, pnr) => acc + pnr.segments.length, 0);
    const revenueToday = todaysPnrs.reduce((acc, pnr) => acc + pnr.pricing.total, 0);

    const scheduleBacklog = enriched
      .filter((pnr) => pnr.scheduleChange || pnr.ticketSyncIssue)
      .sort((a, b) => new Date(a.primaryDeparture).getTime() - new Date(b.primaryDeparture).getTime());
    const outOfSync = scheduleBacklog.filter((pnr) => pnr.orderSyncStatus === 'Out Of Sync');
    const within72Hours = scheduleBacklog.filter((pnr) => {
      const diff = new Date(pnr.primaryDeparture).getTime() - now;
      return diff >= 0 && diff <= 72 * 60 * 60 * 1000;
    });

    const unusedTicketCredits = enriched.flatMap((pnr) =>
      (pnr.unusedTicketCredits || []).map((credit) => ({
        ...credit,
        locator: pnr.locator,
        passengerName: pnr.passengerName,
        route: pnr.route
      }))
    );
    const openCredits = unusedTicketCredits.filter((credit) => credit.status === 'Open');
    const expiringSoonCredits = openCredits.filter((credit) => {
      const diff = new Date(credit.expiresAt).getTime() - now;
      return diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
    });
    const oldestOpenCreditIssuedAt = openCredits.length
      ? Math.min(...openCredits.map((credit) => new Date(credit.issuedAt).getTime()))
      : null;

    return {
      todaysPnrs,
      urgentPnrs,
      bookingsToday,
      segmentsToday,
      revenueToday,
      scheduleBacklog,
      outOfSync,
      within72Hours,
      impactedValue: scheduleBacklog.reduce((acc, pnr) => acc + pnr.pricing.total, 0),
      unusedTicketCredits,
      openCredits,
      expiringSoonCredits,
      totalOpenCredit: openCredits.reduce((acc, credit) => acc + credit.amount, 0),
      oldestOpenCreditIssuedAt
    };
  }, [now, pnrData, todayKey]);

  return (
    <div className="space-y-6 text-[13px]">
      <div>
        <h1 className={cn('text-[28px] font-black tracking-tight', isDark ? 'text-white' : 'text-foreground')}>Dashboard</h1>
        <p className={cn('text-[14px] font-medium mt-1', isDark ? 'text-white/[0.62]' : 'text-muted-foreground')}>Real-time operations overview</p>
      </div>

      <section>
        <div className="flex flex-wrap gap-2.5">
          {busy ? (
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-[88px] w-32 rounded-lg border p-3',
                    isDark ? 'border-white/[0.12] bg-white' : 'border-border bg-card'
                  )}
                >
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
                <Card className={cn('min-w-[124px] border bg-card hover:shadow-md transition-all cursor-pointer group', dashboardCardClass)}>
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

      <section>
        <Card className={cn('border-border shadow-sm', dashboardCardClass)}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Queue Health</CardTitle>
                <p className="text-muted-foreground text-[13px] mt-1">Aging and intake visibility for active Sabre work queues</p>
              </div>
              <Badge variant={queueHealth.slaBreaches ? 'warning' : 'confirmed'}>
                {queueHealth.pressuredQueues} pressured queue{queueHealth.pressuredQueues === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Open work', value: String(queueHealth.openWork), tone: 'neutral' },
              { label: 'Oldest item age', value: formatAge(queueHealth.oldestAge), tone: 'warning' },
              { label: 'New in last hour', value: String(queueHealth.newInLastHour), tone: 'confirmed' },
              { label: 'SLA breaches', value: String(queueHealth.slaBreaches), tone: queueHealth.slaBreaches ? 'danger' : 'confirmed' }
            ].map((metric) => (
              <div key={metric.label} className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.label}</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-20" /> : metric.value}</div>
                  <Badge variant={metric.tone as 'confirmed' | 'warning' | 'danger' | 'neutral'}>{metric.tone.replace('-', ' ')}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className={dashboardCardClass}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Bookings today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-16" /> : pnrMetrics.bookingsToday}</div>
              <div className={cn('text-[13px] font-bold mb-1.5 px-2 py-0.5 rounded-md', isDark ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-500 bg-emerald-50')}>live</div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-border', dashboardCardClass)}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-semibold">Segments today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-16" /> : pnrMetrics.segmentsToday}</div>
              <div className={cn('text-[13px] font-bold mb-1.5 px-2 py-0.5 rounded-md', isDark ? 'text-sky-700 bg-sky-100' : 'text-sky-600 bg-sky-50')}>ops</div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-border', dashboardCardClass)}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-semibold">Revenue today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-[36px] font-black text-foreground tracking-tighter">{busy ? <Skeleton className="h-10 w-20" /> : formatUsd(pnrMetrics.revenueToday)}</div>
              <div className={cn('text-[13px] font-bold mb-1.5 px-2 py-0.5 rounded-md', isDark ? 'text-emerald-700 bg-emerald-100' : 'text-emerald-500 bg-emerald-50')}>USD</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className={cn('border-border', dashboardCardClass)}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Schedule-Change Backlog</CardTitle>
                <p className="text-muted-foreground text-[13px] mt-1">Bookings flagged for schedule changes or ticket/order resync</p>
              </div>
              <Badge variant={pnrMetrics.outOfSync.length ? 'danger' : 'confirmed'}>
                {pnrMetrics.outOfSync.length} out of sync
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Affected PNRs</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-16" /> : pnrMetrics.scheduleBacklog.length}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Departing &lt;72h</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-16" /> : pnrMetrics.within72Hours.length}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Needs ticket review</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-16" /> : pnrMetrics.outOfSync.length}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">At-risk value</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-24" /> : formatUsd(pnrMetrics.impactedValue)}</div>
              </div>
            </div>

            {busy ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pnrMetrics.scheduleBacklog.length === 0 ? (
              <div className="text-muted-foreground">No schedule-change or ticket-sync backlog.</div>
            ) : (
              <div className="space-y-2">
                {pnrMetrics.scheduleBacklog.slice(0, 4).map((pnr) => (
                  <div key={pnr.locator} className={detailCardClass}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[14px] text-foreground">{pnr.locator} <span className="text-muted-foreground font-medium">· {pnr.passengerName}</span></div>
                        <div className="text-[13px] text-muted-foreground mt-1">{pnr.route} <span className={separatorClass}>•</span> departs {formatDeparture(pnr.primaryDeparture)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {pnr.scheduleChange && <Badge variant="warning">schedule change</Badge>}
                        {pnr.orderSyncStatus === 'Out Of Sync' && <Badge variant="danger">out of sync</Badge>}
                        {pnr.orderSyncStatus === 'Needs Review' && <Badge variant="warning">needs review</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn('border-border', dashboardCardClass)}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Unused Ticket Credits</CardTitle>
                <p className="text-muted-foreground text-[13px] mt-1">Open credit bank, expiry risk, and residual value to recover</p>
              </div>
              <Badge variant={pnrMetrics.expiringSoonCredits.length ? 'warning' : 'confirmed'}>
                {pnrMetrics.expiringSoonCredits.length} expiring soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Open credits</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-16" /> : pnrMetrics.openCredits.length}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Credit value</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-24" /> : formatUsd(pnrMetrics.totalOpenCredit)}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Expiring in 14d</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">{busy ? <Skeleton className="h-8 w-16" /> : pnrMetrics.expiringSoonCredits.length}</div>
              </div>
              <div className={nestedPanelClass}>
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Oldest open age</div>
                <div className="mt-2 text-[28px] font-black tracking-tighter text-foreground">
                  {busy ? (
                    <Skeleton className="h-8 w-20" />
                  ) : pnrMetrics.oldestOpenCreditIssuedAt ? (
                    formatAge(Math.round((now - pnrMetrics.oldestOpenCreditIssuedAt) / 60000))
                  ) : (
                    '0m'
                  )}
                </div>
              </div>
            </div>

            {busy ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pnrMetrics.unusedTicketCredits.length === 0 ? (
              <div className="text-muted-foreground">No unused ticket credits on file.</div>
            ) : (
              <div className="space-y-2">
                {pnrMetrics.unusedTicketCredits
                  .slice()
                  .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
                  .slice(0, 4)
                  .map((credit) => (
                    <div key={credit.id} className={detailCardClass}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[14px] text-foreground">{credit.locator} <span className="text-muted-foreground font-medium">· {credit.passengerName}</span></div>
                          <div className="text-[13px] text-muted-foreground mt-1">{credit.route} <span className={separatorClass}>•</span> expires {formatShortDate(credit.expiresAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[18px] font-black tracking-tight text-foreground">{formatUsd(credit.amount)}</div>
                          <Badge variant={credit.status === 'Expired' ? 'danger' : new Date(credit.expiresAt).getTime() - now <= 14 * 24 * 60 * 60 * 1000 ? 'warning' : 'confirmed'}>
                            {credit.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={dashboardCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Today&apos;s departures</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'font-semibold',
                      isDark
                        ? 'border-slate-300 bg-white text-slate-950 hover:bg-slate-100'
                        : 'bg-white'
                    )}
                  >
                    Open board
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[96vw] max-w-[1180px] overflow-hidden p-0">
                  <DialogHeader className="border-b border-border px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                      <div>
                        <DialogTitle>Departures board</DialogTitle>
                        <DialogDescription>
                          Live preview of the generated terminal display.
                        </DialogDescription>
                      </div>
                      <a
                        href={generatedPageSrc}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary transition-colors"
                      >
                        Open full page
                      </a>
                    </div>
                  </DialogHeader>
                  <div className="bg-black">
                    <iframe
                      src={generatedPageSrc}
                      title="Departures board"
                      className="h-[75vh] min-h-[640px] w-full border-0"
                      loading="lazy"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPnr ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-8 w-full" />
                ))}
              </div>
            ) : pnrMetrics.todaysPnrs.length === 0 ? (
              <div className="text-muted-foreground py-2">No departures today.</div>
            ) : (
              <div className="space-y-1">
                {pnrMetrics.todaysPnrs.map((pnr) => (
                  <div key={pnr.locator} className={listRowClass}>
                    <div>
                      <div className="font-semibold text-[14px] text-foreground">{pnr.passengerName}</div>
                      <div className="text-[13px] text-muted-foreground font-medium mt-0.5">{pnr.locator} <span className={separatorClass}>•</span> {pnr.route}</div>
                    </div>
                    <StatusBadge status={pnr.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClass}>
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
                {pnrMetrics.urgentPnrs.map((pnr) => {
                  const deadline = formatCountdown(pnr.deadlineAt) || '00:00';
                  return (
                    <div key={pnr.locator} className={listRowClass}>
                      <div>
                        <div className="font-semibold text-[14px] text-foreground">{pnr.locator}</div>
                        <div className="text-[13px] text-muted-foreground font-medium mt-0.5">{pnr.passengerName} <span className={separatorClass}>•</span> {pnr.route}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="font-mono text-[13px] font-medium text-slate-400">{deadline}</div>
                        <Badge variant={Number(pnr.minutes) <= 40 ? 'warning' : 'neutral'} className="font-semibold rounded-md">
                          {Number(pnr.minutes) <= 40 ? 'Approaching' : 'Safe'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {!pnrMetrics.urgentPnrs.length && <div className="text-muted-foreground">No urgent ticketing deadlines.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className={cn('border-border shadow-sm', dashboardCardClass)}>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Link href="/search/air">
              <Button size="lg" variant="accent" className="font-bold px-6">New Search</Button>
            </Link>
            <Link href="/bookings">
              <Button variant="outline" size="lg" className="font-semibold bg-white">Open PNR</Button>
            </Link>
            <Link href="/queues">
              <Button variant="outline" size="lg" className="font-semibold bg-white">Open Queues</Button>
            </Link>
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
