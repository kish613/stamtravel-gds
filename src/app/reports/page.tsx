'use client';

import { useState } from 'react';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';

const STATUS_COLORS = {
  NDC: 'var(--color-status-good)',
  ATPCO: 'var(--color-status-warn)',
  LCC: 'var(--color-status-danger)'
} as const;

const now = new Date();
const DEFAULT_TO = now.toISOString().slice(0, 10);
const defaultFromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function ReportsPage() {
  const { data, isLoading, isError, error } = usePnrList();
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(DEFAULT_TO);

  const filtered = (data || []).filter((item) => item.departureDate >= from && item.departureDate <= to);

  const total = filtered.length;
  const totalSegments = filtered.reduce((acc, item) => acc + item.segments.length, 0);
  const revenue = filtered.reduce((acc, item) => acc + item.pricing.total, 0);
  const awaiting = filtered.filter((item) => item.status === 'Awaiting Ticket').length;

  const byAgent = Object.entries(
    filtered.reduce<Record<string, number>>((acc, item) => {
      const queue = item.queue || 'Q0';
      const agent = queue.startsWith('Q') ? (queue.endsWith('0') ? 'AGT901' : 'AGT902') : 'AGT901';
      acc[agent] = (acc[agent] || 0) + 1;
      return acc;
    }, {})
  ).map(([agent, count]) => ({ agent, count }));

  const mix = filtered.reduce(
    (acc, item) => {
      for (const segment of item.segments) {
        acc[segment.fareType] = (acc[segment.fareType] || 0) + 1;
      }
      return acc;
    },
    { NDC: 0, ATPCO: 0, LCC: 0 } as Record<string, number>
  );

  const pieData = Object.entries(mix).map(([name, value]) => ({ name, value }));

  const exportCsv = () => {
    const header = ['locator,passenger,route,date,status,segments,total'];
    const rows = filtered.map((r) => `${r.locator},${r.passengerName},${r.route},${r.departureDate},${r.status},${r.segments.length},${r.pricing.total}`);
    const blob = new Blob([header.concat(rows).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gds-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError) {
    return (
      <Card variant="pro" accent="danger">
        <CardContent className="py-3 text-destructive">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        meta="Analyse booking performance and content mix across all agents"
        actions={
          <Button onClick={exportCsv} variant="primary">
            Export CSV
          </Button>
        }
      />

      <Card variant="pro" accent="brand">
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Eyebrow as="div" className="mb-1">From</Eyebrow>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
            </div>
            <div>
              <Eyebrow as="div" className="mb-1">To</Eyebrow>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {filtered.length} bookings in range
            </span>
          </div>
        </CardContent>
      </Card>

      <KpiStrip cols={4}>
        <KpiTile
          label="Total Bookings"
          value={total}
          tone="brand"
          delta="+8%"
          sub="vs prior period"
        />
        <KpiTile
          label="Total Segments"
          value={totalSegments}
          tone="brand"
          delta="+3%"
          sub="across all bookings"
        />
        <KpiTile
          label="Revenue"
          value={`$${revenue.toLocaleString()}`}
          tone="good"
          delta="−5%"
          sub="gross USD"
        />
        <KpiTile
          label="Awaiting Ticket"
          value={awaiting}
          tone={awaiting > 0 ? 'warn' : 'good'}
          delta={awaiting > 0 ? '+12%' : 'OK'}
          sub="pending issuance"
        />
      </KpiStrip>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Bookings per agent</CardTitle>
            <Eyebrow>Volume</Eyebrow>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="agent" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E8EDF3',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(10,37,64,0.08)'
                    }}
                  />
                  <Bar dataKey="count" fill="var(--brand-navy-800)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card variant="pro" accent="brand">
          <CardHeader>
            <CardTitle>Content mix</CardTitle>
            <Eyebrow>NDC · ATPCO · LCC</Eyebrow>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={110} innerRadius={45} paddingAngle={3} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E8EDF3',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(10,37,64,0.08)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
