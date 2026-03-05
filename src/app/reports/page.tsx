'use client';

import { useState } from 'react';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp } from 'lucide-react';

const STATUS_COLORS = {
  NDC: '#059669',
  ATPCO: '#D97706',
  LCC: '#DC2626'
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
      <Card className="border-status-danger text-status-danger bg-white/60 backdrop-blur-md">
        <CardContent className="py-3">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { label: 'Total bookings', value: total, trend: 8, gradient: 'from-blue-500/10 to-indigo-500/10' },
    { label: 'Total segments', value: totalSegments, trend: 3, gradient: 'from-emerald-500/10 to-teal-500/10' },
    { label: 'Revenue', value: `$${revenue}`, trend: -5, gradient: 'from-violet-500/10 to-purple-500/10' },
    { label: 'Awaiting Ticket', value: awaiting, trend: 12, gradient: 'from-amber-500/10 to-orange-500/10' }
  ];

  return (
    <div className="space-y-4 text-[13px]">
      <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button onClick={exportCsv} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200">Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <Card key={card.label} className={`bg-gradient-to-br ${card.gradient} backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)]`}>
            <CardContent className="p-3">
              <div className="text-[#64748B] text-[12px]">{card.label}</div>
              <div className="text-[26px] font-semibold">{card.value}</div>
              <div className={`text-[11px] ${card.trend >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'} flex items-center`}>
                {card.trend >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                <span className={card.trend >= 0 ? 'drop-shadow-[0_0_4px_rgba(5,150,105,0.4)]' : 'drop-shadow-[0_0_4px_rgba(220,38,38,0.4)]'}>{Math.abs(card.trend)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
            <CardTitle>Bookings per agent</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byAgent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agent" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0A1628" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardHeader className="bg-gradient-to-r from-slate-50/80 to-indigo-50/80 rounded-t-lg">
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
