'use client';

import { ChangeEvent, useState } from 'react';
import Link from 'next/link';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Card as UiCard, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';

export default function BookingManagerPage() {
  const { data, isLoading, isError, error, refetch } = usePnrList();
  const [mode, setMode] = useState<'locator' | 'surname' | 'ticket'>('locator');
  const [locator, setLocator] = useState('');
  const [surname, setSurname] = useState('');
  const [depDate, setDepDate] = useState('');
  const [ticket, setTicket] = useState('');

  const filtered = (data || []).filter((p) => {
    if (mode === 'locator') {
      return !locator || p.locator.toLowerCase().includes(locator.toLowerCase());
    }
    if (mode === 'surname') {
      return (!surname || p.passengerName.toLowerCase().includes(surname.toLowerCase())) && (!depDate || p.departureDate === depDate);
    }
    return !ticket || ticket.length > 3;
  });

  return (
    <div className="space-y-4 text-[13px]">
      <Card>
        <CardHeader>
          <CardTitle>PNR Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'locator'} onChange={() => setMode('locator')} />
              Locator
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'surname'} onChange={() => setMode('surname')} />
              Surname + departure
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'ticket'} onChange={() => setMode('ticket')} />
              Ticket number
            </label>
          </div>

          {mode === 'locator' && <Input value={locator} onChange={(e) => setLocator(e.target.value)} placeholder="Search locator" />}
          {mode === 'surname' && (
            <div className="flex flex-wrap gap-2">
              <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" />
              <Input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} />
            </div>
          )}
          {mode === 'ticket' && <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Ticket number" />}
        </CardContent>
      </Card>

      {isError && (
        <Card className="border-status-danger">
          <CardContent className="text-status-danger py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-[#E2E8F0] animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-[#64748B] py-8 text-center">No matching PNRs.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locator</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Segments</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pnr) => (
                  <TableRow key={pnr.locator}>
                    <TableCell>
                      <Link href={`/bookings/${pnr.locator}`} className="text-[#1D4ED8] underline">
                        {pnr.locator}
                      </Link>
                    </TableCell>
                    <TableCell>{pnr.passengerName}</TableCell>
                    <TableCell>{pnr.route}</TableCell>
                    <TableCell>{pnr.departureDate}</TableCell>
                    <TableCell>{pnr.segments.length}</TableCell>
                    <TableCell>
                      <StatusBadge status={pnr.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
