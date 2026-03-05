'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePnr } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCountdown, toMinutesLeft } from '@/lib/time';
import { ArrowRight, Plane } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function BookingDetailPage({ params }: { params: { locator: string } }) {
  const { data, isLoading, isError, error, refetch } = usePnr(params.locator);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

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
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Booking Detail</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Locator <span className="font-mono">{pnr.locator}</span> · {pnr.route} · {pnr.departureDate}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Booking {pnr.locator}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-[14px]">
              {pnr.passengerName} · {pnr.route} · {pnr.departureDate}
              <StatusBadge status={pnr.status} />
            </div>
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
                  <TableHead>Seats</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnr.segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell>{segment.carrier}{segment.flightNumber}</TableCell>
                    <TableCell>{segment.from} → {segment.to}</TableCell>
                    <TableCell>{segment.departure}</TableCell>
                    <TableCell>
                      <Link href={`/bookings/${pnr.locator}/seatmap/${segment.id}`} className="text-sky-600 underline hover:text-sky-700 transition-colors">
                        Seat map
                      </Link>
                    </TableCell>
                    <TableCell>
                      {toMinutesLeft(segment.deadlineAt)}m
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction(`cancel-${segment.id}`)}>
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
            <CardContent>
              {pnr.passengers.map((p) => (
                <div key={p.passportNumber} className="mb-2 rounded-md border border-border bg-muted/30 p-2">
                  {p.title} {p.firstName} {p.lastName} · {p.nationality}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div>Total {pnr.pricing.currency} {pnr.pricing.total}</div>
                <div>Taxes {pnr.pricing.taxes}</div>
                <div>Fees {pnr.pricing.fees}</div>
              </div>
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
              <TabsContent value="history">
                {pnr.history?.length ? (
                  <div className="space-y-1">
                    {pnr.history.map((h) => (
                      <div key={`${h.date}-${h.event}`} className="rounded-md border border-border p-2">
                        <div>{h.date}</div>
                        <div className="text-[12px] text-muted-foreground">{h.event} · {h.actor}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No history yet.</div>
                )}
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
            <Button className="w-full">Issue Ticket</Button>
            <Button variant="destructive" className="w-full" onClick={() => setConfirmAction('void')}>Void Ticket</Button>
            <Button variant="destructive" className="w-full" onClick={() => setConfirmAction('cancel-all')}>Cancel All</Button>
            <Button variant="outline" className="w-full">Add to Queue</Button>
            <Button variant="outline" className="w-full">Reissue</Button>
            <Button variant="outline" className="w-full">Print</Button>
          </CardContent>
        </Card>
      </aside>

      </div>{/* end xl:grid-cols-3 */}

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
          </DialogHeader>
          <div className="text-sm pb-3">This action is destructive and cannot be undone.</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
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
    </div>{/* end space-y-6 */}
  );
}
