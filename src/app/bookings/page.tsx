'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';

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

  const kpis = useMemo(() => {
    const list = data || [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const total = list.length;
    const awaiting = list.filter((p) => p.status === 'Awaiting Ticket').length;
    const ticketedToday = list.filter(
      (p) => p.status === 'Ticketed' && p.createdAt?.slice(0, 10) === todayKey
    ).length;
    const atRisk = list.filter(
      (p) => p.status === 'Awaiting Ticket' || p.status === 'Booked'
    ).length;
    return { total, awaiting, ticketedToday, atRisk };
  }, [data]);

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="PNR Manager"
        title="Bookings"
        meta="Search and manage passenger name records"
      />

      <KpiStrip cols={4}>
        <KpiTile
          label="Total PNRs"
          value={kpis.total}
          tone="brand"
          sub="across all queues"
        />
        <KpiTile
          label="Awaiting Ticket"
          value={kpis.awaiting}
          tone={kpis.awaiting > 0 ? 'warn' : 'good'}
          delta={kpis.awaiting > 0 ? 'REVIEW' : 'CLEAR'}
          sub="pending issuance"
        />
        <KpiTile
          label="Ticketed Today"
          value={kpis.ticketedToday}
          tone="good"
          sub="settled"
        />
        <KpiTile
          label="At Risk"
          value={kpis.atRisk}
          tone={kpis.atRisk > 0 ? 'danger' : 'good'}
          delta={kpis.atRisk > 0 ? 'WATCH' : 'OK'}
          sub="booked / awaiting"
        />
      </KpiStrip>

      <Card variant="pro" accent="brand">
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="inline-flex flex-wrap gap-1 bg-muted rounded-[10px] p-1 border border-border">
            {(['locator', 'surname', 'ticket'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors capitalize ${
                  mode === m
                    ? 'bg-white text-[var(--brand-navy-800)] shadow-card'
                    : 'text-muted-foreground hover:text-[var(--brand-navy-800)]'
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
        <Card variant="pro" accent="danger">
          <CardContent className="text-destructive py-3">
            {(error as Error)?.message}
            <Button className="ml-3" variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card variant="pro">
        <CardHeader>
          <Eyebrow>Results</Eyebrow>
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {filtered.length} of {(data || []).length}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-8 bg-muted animate-shimmer rounded" />
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
                  <TableHead className="text-right">Segments</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((pnr) => (
                  <TableRow key={pnr.locator}>
                    <TableCell>
                      <Link
                        href={`/bookings/${pnr.locator}`}
                        className="font-mono font-semibold tracking-[0.02em] tabular-nums text-[var(--brand-teal-500)] hover:text-[#0A8A98] transition-colors"
                      >
                        {pnr.locator}
                      </Link>
                    </TableCell>
                    <TableCell>{pnr.passengerName}</TableCell>
                    <TableCell className="font-mono tabular-nums text-[12px]">{pnr.route}</TableCell>
                    <TableCell className="tabular-nums">{pnr.departureDate}</TableCell>
                    <TableCell className="text-right tabular-nums">{pnr.segments.length}</TableCell>
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
