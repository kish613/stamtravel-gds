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
      <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
          <CardTitle>PNR Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1 bg-white/40 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <button
              type="button"
              onClick={() => setMode('locator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-all duration-200 ${mode === 'locator' ? 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white shadow-md' : 'text-slate-600 hover:bg-white/60'}`}
            >
              Locator
            </button>
            <button
              type="button"
              onClick={() => setMode('surname')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-all duration-200 ${mode === 'surname' ? 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white shadow-md' : 'text-slate-600 hover:bg-white/60'}`}
            >
              Surname + departure
            </button>
            <button
              type="button"
              onClick={() => setMode('ticket')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-all duration-200 ${mode === 'ticket' ? 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white shadow-md' : 'text-slate-600 hover:bg-white/60'}`}
            >
              Ticket number
            </button>
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
        <Card className="border-status-danger bg-white/60 backdrop-blur-md">
          <CardContent className="text-status-danger py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-white/40 backdrop-blur-sm animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-[#64748B] py-8 text-center">No matching PNRs.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100/60 to-blue-100/40 border-white/20">
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
                  <TableRow key={pnr.locator} className="border-white/20 transition-colors duration-200 hover:bg-white/40">
                    <TableCell>
                      <Link href={`/bookings/${pnr.locator}`} className="text-[#1D4ED8] underline transition-all duration-200 hover:text-blue-500 hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]">
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
