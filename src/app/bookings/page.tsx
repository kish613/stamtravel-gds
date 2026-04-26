'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <p className="gds-eyebrow mb-2">PNR Manager</p>
        <h1 className="font-display text-[28px] font-extrabold text-foreground tracking-tight leading-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and manage passenger name records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PNR Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mode selector */}
          <div className="inline-flex flex-wrap gap-1 bg-muted rounded-[10px] p-1 border border-border">
            {(['locator', 'surname', 'ticket'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors capitalize ${
                  mode === m
                    ? 'bg-white text-[#0A2540] shadow-card'
                    : 'text-muted-foreground hover:text-[#0A2540]'
                }`}
              >
                {m === 'surname' ? 'Surname + departure' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
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
        <Card className="border-destructive">
          <CardContent className="text-destructive py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">No matching PNRs.</div>
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
                      <Link
                        href={`/bookings/${pnr.locator}`}
                        className="font-mono font-semibold tracking-[0.02em] text-[#25A5B4] hover:text-[#0A8A98] transition-colors"
                      >
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
