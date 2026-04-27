'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { usePnr } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCountdown, toMinutesLeft } from '@/lib/time';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { ActionBar } from '@/components/ui/action-bar';
import type { CardAccent } from '@/components/ui/card';

function statusToAccent(status: string): CardAccent | undefined {
  if (status === 'Ticketed') return 'good';
  if (status === 'Awaiting Ticket' || status === 'Booked') return 'warn';
  if (status === 'Void' || status === 'Canceled') return 'danger';
  return 'brand';
}

function statusToTone(status: string): 'good' | 'warn' | 'danger' | 'brand' {
  if (status === 'Ticketed') return 'good';
  if (status === 'Awaiting Ticket' || status === 'Booked') return 'warn';
  if (status === 'Void' || status === 'Canceled') return 'danger';
  return 'brand';
}

export default function BookingDetailPage({ params }: { params: Promise<{ locator: string }> }) {
  const resolvedParams = use(params);
  const { data, isLoading, isError, error, refetch } = usePnr(resolvedParams.locator);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const earliestDeadline = useMemo(() => {
    if (!data || !data.segments.length) return null;
    return data.segments.reduce((min, s) =>
      new Date(s.deadlineAt).getTime() < new Date(min.deadlineAt).getTime() ? s : min,
      data.segments[0]
    ).deadlineAt;
  }, [data]);

  const earliestDeadlineMin = earliestDeadline && now != null
    ? Math.round((new Date(earliestDeadline).getTime() - now) / 60000)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 animate-shimmer rounded" />
        <div className="h-24 animate-shimmer rounded-[14px]" />
        <div className="h-64 animate-shimmer rounded-[14px]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card variant="pro" accent="danger">
        <CardContent className="text-destructive py-3">
          {(error as Error)?.message || 'Booking not found'}
        </CardContent>
      </Card>
    );
  }

  const pnr = data;
  const accent = statusToAccent(pnr.status);
  const ttlTone = earliestDeadlineMin == null
    ? 'brand'
    : earliestDeadlineMin < 0
    ? 'danger'
    : earliestDeadlineMin < 120
    ? 'warn'
    : 'good';

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Booking Detail"
        title={pnr.passengerName}
        meta={
          <>
            Locator{' '}
            <span className="font-mono font-semibold tracking-[0.02em] text-[var(--brand-navy-800)]">
              {pnr.locator}
            </span>{' '}
            · {pnr.route} · {pnr.departureDate}
          </>
        }
        actions={<StatusBadge status={pnr.status} />}
      />

      <KpiStrip cols={4}>
        <KpiTile
          label="TTL"
          value={
            earliestDeadline == null || earliestDeadlineMin == null
              ? '—'
              : earliestDeadlineMin < 0
              ? 'PAST'
              : formatCountdown(earliestDeadline)
          }
          tone={ttlTone}
          delta={ttlTone === 'danger' ? 'BREACH' : ttlTone === 'warn' ? 'SOON' : 'OK'}
          sub="earliest segment deadline"
        />
        <KpiTile
          label="Segments"
          value={pnr.segments.length}
          tone="brand"
          sub={`${pnr.passengers.length} passenger${pnr.passengers.length === 1 ? '' : 's'}`}
        />
        <KpiTile
          label="Fare Total"
          value={`${pnr.pricing.currency} ${pnr.pricing.total.toLocaleString()}`}
          tone="brand"
          sub={`taxes ${pnr.pricing.taxes} · fees ${pnr.pricing.fees}`}
        />
        <KpiTile
          label="Status"
          value={pnr.status}
          tone={statusToTone(pnr.status)}
          sub={pnr.history?.length ? `${pnr.history.length} events` : 'no history'}
        />
      </KpiStrip>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card variant="pro" accent={accent}>
            <CardHeader>
              <CardTitle>Booking {pnr.locator}</CardTitle>
              <StatusBadge status={pnr.status} />
            </CardHeader>
            <CardContent>
              <div className="text-[14px] text-muted-foreground">
                {pnr.passengerName} · {pnr.route} · {pnr.departureDate}
              </div>
            </CardContent>
          </Card>

          <Card variant="pro">
            <CardHeader>
              <CardTitle>Segments</CardTitle>
              <Eyebrow>{pnr.segments.length} flight{pnr.segments.length === 1 ? '' : 's'}</Eyebrow>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead className="text-right">TTL</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pnr.segments.map((segment) => {
                    const mins = toMinutesLeft(segment.deadlineAt);
                    const ttlClass =
                      mins < 0
                        ? 'text-[var(--color-status-danger)]'
                        : mins < 120
                        ? 'text-[var(--color-status-warn)]'
                        : 'text-foreground';
                    return (
                      <TableRow key={segment.id}>
                        <TableCell className="font-mono tabular-nums">
                          {segment.carrier}
                          {segment.flightNumber}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-[12px]">
                          {segment.from} → {segment.to}
                        </TableCell>
                        <TableCell className="tabular-nums">{segment.departure}</TableCell>
                        <TableCell>
                          <Link
                            href={`/bookings/${pnr.locator}/seatmap/${segment.id}`}
                            className="text-[var(--brand-teal-500)] hover:text-[#0A8A98] underline-offset-4 hover:underline transition-colors"
                          >
                            Seat map
                          </Link>
                        </TableCell>
                        <TableCell className={`text-right tabular-nums font-mono ${ttlClass}`}>
                          {mins < 0 ? `${Math.abs(mins)}m past` : `${mins}m`}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setConfirmAction(`cancel-${segment.id}`)}>
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="pro">
              <CardHeader>
                <CardTitle>Passengers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {pnr.passengers.map((p) => (
                    <div
                      key={p.passportNumber}
                      className="rounded-[10px] border bg-[#F6F8FB] px-3 py-2"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <div className="font-semibold text-[var(--brand-navy-800)]">
                        {p.title} {p.firstName} {p.lastName}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {p.nationality} · {p.passportNumber}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="pro" accent="brand">
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <Eyebrow>{pnr.pricing.currency}</Eyebrow>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{(pnr.pricing.total - pnr.pricing.taxes - pnr.pricing.fees).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes</span>
                    <span>{pnr.pricing.taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees</span>
                    <span>{pnr.pricing.fees.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between font-display text-[16px] font-extrabold text-[var(--brand-navy-800)]">
                    <span>Total</span>
                    <span>
                      {pnr.pricing.currency} {pnr.pricing.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card variant="pro">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="history">
                <TabsList>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="history">
                  {pnr.history?.length ? (
                    <div className="space-y-1.5">
                      {pnr.history.map((h) => (
                        <div
                          key={`${h.date}-${h.event}`}
                          className="rounded-[10px] border px-3 py-2"
                          style={{ borderColor: '#E2E8F0' }}
                        >
                          <div className="font-mono tabular-nums text-[12px] text-[var(--brand-navy-800)]">{h.date}</div>
                          <div className="text-[12px] text-muted-foreground">
                            {h.event} · {h.actor}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-3">No history yet.</div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card variant="pro">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Eyebrow>Ticketing</Eyebrow>
                <Button variant="primary" size="lg" className="w-full">
                  Issue Ticket
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  Reissue
                </Button>
              </div>
              <div className="space-y-1.5">
                <Eyebrow>Workflow</Eyebrow>
                <Button variant="outline" size="lg" className="w-full">
                  Add to Queue
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  Print
                </Button>
              </div>
              <div className="space-y-1.5">
                <Eyebrow className="text-[var(--color-status-danger)]">Danger zone</Eyebrow>
                <Button variant="destructive" size="lg" className="w-full" onClick={() => setConfirmAction('void')}>
                  Void Ticket
                </Button>
                <Button variant="destructive" size="lg" className="w-full" onClick={() => setConfirmAction('cancel-all')}>
                  Cancel All
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ActionBar
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>Quick actions</Eyebrow>
            <span className="text-[12px] text-muted-foreground">
              {pnr.locator} · {pnr.status}
            </span>
          </div>
        }
        secondary={
          <Button variant="outline" size="default" onClick={() => refetch()}>
            Refresh
          </Button>
        }
        primary={
          <Button variant="primary" size="default">
            Issue Ticket
          </Button>
        }
      />

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
          </DialogHeader>
          <div className="text-sm pb-3">This action is destructive and cannot be undone.</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                alert(`${confirmAction} executed`);
                setConfirmAction(null);
                refetch();
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
