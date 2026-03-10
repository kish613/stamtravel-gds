'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { usePnr, usePnrAction } from '@/lib/query';
import type { PnrActionInput } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ConfirmAction =
  | { action: 'void-ticket' }
  | { action: 'cancel-all' }
  | { action: 'cancel-segment'; segmentId: string }
  | null;

export default function BookingDetailPage({ params }: { params: Promise<{ locator: string }> }) {
  const resolvedParams = use(params);
  const { data, isLoading, isError, error } = usePnr(resolvedParams.locator);
  const pnrAction = usePnrAction(resolvedParams.locator);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentActionLabel = useMemo(() => {
    if (!confirmAction) return 'Confirm action';
    if (confirmAction.action === 'cancel-segment') return `Cancel segment ${confirmAction.segmentId}`;
    if (confirmAction.action === 'void-ticket') return 'Void ticket';
    return 'Cancel all segments';
  }, [confirmAction]);

  const runAction = (payload: PnrActionInput) => {
    pnrAction.mutate(payload, {
      onSuccess: (result) => {
        setMessage(result.warnings[0] || `${payload.action} completed.`);
        setConfirmAction(null);
      },
      onError: (mutationError) => {
        setMessage(mutationError.message || 'Action failed.');
        setConfirmAction(null);
      }
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading booking...</div>;
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 text-destructive p-3">
        <div>{(error as Error)?.message || 'Booking not found'}</div>
      </div>
    );
  }

  const pnr = data;

  return (
    <div className="space-y-6 text-[13px]">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Booking Detail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Locator <span className="font-mono">{pnr.locator}</span> · {pnr.route} · {pnr.departureDate}
        </p>
      </div>

      {message && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                Booking {pnr.locator}
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{pnr.contentSource}</Badge>
                  <StatusBadge status={pnr.status} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-[14px] text-foreground">{pnr.passengerName} · {pnr.route}</div>
              <div className="text-sm text-muted-foreground">Queue {pnr.queue} · Last sync {pnr.lastSyncedAt ? new Date(pnr.lastSyncedAt).toLocaleString() : 'n/a'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>TTL</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pnr.segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell>{segment.carrier} {segment.flightNumber}</TableCell>
                      <TableCell>{segment.from} → {segment.to}</TableCell>
                      <TableCell>{new Date(segment.departure).toLocaleString()}</TableCell>
                      <TableCell>
                        <Link href={`/bookings/${pnr.locator}/seatmap/${segment.id}`} className="text-sky-600 underline hover:text-sky-700 transition-colors">
                          {segment.seatAssignment ? `Seat ${segment.seatAssignment}` : 'Open seat map'}
                        </Link>
                      </TableCell>
                      <TableCell>{segment.deadlineAt.slice(0, 16).replace('T', ' ')}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setConfirmAction({ action: 'cancel-segment', segmentId: segment.id })}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Passengers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pnr.passengers.map((passenger) => (
                  <div key={passenger.passportNumber} className="rounded-md border border-border bg-muted/20 p-3">
                    {passenger.title} {passenger.firstName} {passenger.lastName} · {passenger.nationality}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div>Total {pnr.pricing.currency} {pnr.pricing.total}</div>
                <div>Taxes {pnr.pricing.taxes}</div>
                <div>Fees {pnr.pricing.fees}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="history">
                <TabsList>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="space-y-2 mt-3">
                  {pnr.history.map((entry) => (
                    <div key={`${entry.date}-${entry.event}`} className="rounded-md border border-border p-3">
                      <div className="text-foreground">{entry.event}</div>
                      <div className="text-[12px] text-muted-foreground mt-1">{new Date(entry.date).toLocaleString()} · {entry.actor}</div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" disabled={pnrAction.isPending || pnr.status === 'Ticketed'} onClick={() => runAction({ action: 'issue-ticket' })}>
                {pnr.status === 'Ticketed' ? 'Ticketed' : 'Issue Ticket'}
              </Button>
              <Button variant="destructive" className="w-full" disabled={pnrAction.isPending || pnr.status === 'Void'} onClick={() => setConfirmAction({ action: 'void-ticket' })}>
                Void Ticket
              </Button>
              <Button variant="destructive" className="w-full" disabled={pnrAction.isPending || pnr.status === 'Canceled'} onClick={() => setConfirmAction({ action: 'cancel-all' })}>
                Cancel All
              </Button>
              <Button variant="outline" className="w-full" disabled={pnrAction.isPending} onClick={() => runAction({ action: 'queue-place', queueCode: 'Q1' })}>
                Add to Queue Q1
              </Button>
            </CardContent>
          </Card>

          {pnr.warnings?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {pnr.warnings.map((warning) => (
                  <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentActionLabel}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground pb-3">This updates the booking and immediately refreshes the mirrored Sabre state.</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Keep booking</Button>
            <Button
              variant="destructive"
              disabled={pnrAction.isPending || !confirmAction}
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.action === 'cancel-segment') {
                  runAction({ action: 'cancel-segment', segmentId: confirmAction.segmentId });
                  return;
                }
                runAction({ action: confirmAction.action });
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
