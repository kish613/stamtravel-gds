'use client';

import { useState } from 'react';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp } from 'lucide-react';

const STATUS_COLORS = {
  NDC: '#0E9F6E',
  ATPCO: '#D9892B',
  LCC: '#D93141'
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
      <Card className="border-destructive">
        <CardContent className="py-3 text-destructive">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { label: 'Total bookings', value: total, trend: 8 },
    { label: 'Total segments', value: totalSegments, trend: 3 },
    { label: 'Revenue', value: `$${revenue}`, trend: -5 },
    { label: 'Awaiting Ticket', value: awaiting, trend: 12 }
  ];

  return (
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <p className="gds-eyebrow mb-2">Analytics</p>
        <h1 className="font-display text-[28px] font-extrabold text-foreground tracking-tight leading-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Analyse booking performance and content mix across all agents</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={exportCsv} variant="primary">Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="gds-eyebrow mb-2">{card.label}</p>
              <div className="gds-num text-[32px] leading-none">{card.value}</div>
              <div className={`text-[11px] flex items-center gap-0.5 mt-2 font-medium tabular-nums ${card.trend >= 0 ? 'text-[#0E7C56]' : 'text-[#A8202E]'}`}>
                {card.trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span>{Math.abs(card.trend)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bookings per agent</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="agent" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0A2540" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content mix</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={110} innerRadius={45} fill="#8884d8" paddingAngle={3} label>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
