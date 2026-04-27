'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueues } from '@/lib/query';
import { QueueBucket, QueueItem } from '@/lib/types';

type QueueItemWithId = QueueItem & { id: string };
type QueueBucketWithId = Omit<QueueBucket, 'items'> & { items: QueueItemWithId[] };
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toMinutesLeft, formatCountdown } from '@/lib/time';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { LiveDot } from '@/components/ui/live-dot';

function QueueCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: '#E2E8F0'
      }}
      {...attributes}
      {...listeners}
      className={`rounded-[10px] border bg-white p-2.5 transition-colors hover:bg-[#F6F8FB] cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-60 shadow-card-md' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function QueuesPage() {
  const { data, isLoading, isError, refetch, error } = useQueues();
  const [filters, setFilters] = useState({ agent: '', dateFrom: '', dateTo: '' });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns: QueueBucketWithId[] = useMemo(
    () =>
      (data || []).map((bucket) => ({
        ...bucket,
        items: bucket.items.map((item) => ({
          ...item,
          id: `${bucket.queueCode}-${item.locator}`
        }))
      })),
    [data]
  );

  const setColumnsInCache = (updater: (prev: QueueBucket[] | undefined) => QueueBucket[] | undefined) => {
    queryClient.setQueryData<QueueBucket[] | undefined>(['fixtures', 'queues'], updater);
  };

  const buckets: QueueBucketWithId[] = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      items: col.items.filter((item) => {
        if (filters.agent && item.agent !== filters.agent) return false;
        if (filters.dateFrom && item.departureDate < filters.dateFrom) return false;
        if (filters.dateTo && item.departureDate > filters.dateTo) return false;
        return true;
      })
    }));
  }, [columns, filters]);

  const refresh = async () => {
    const result = await refetch();
    if (result.data) setLastRefreshed(new Date());
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const sourceColumnCode = String(active.id).split('-')[0];
    const destinationCode = String(over.id).split('-')[0];
    if (sourceColumnCode === destinationCode) return;
    const itemId = String(active.id);
    setColumnsInCache((prev) => {
      if (!prev) return;
      let moved: (QueueItem & { id: string }) | null = null;
      const cleaned = prev.map((bucket) => {
        const filtered = bucket.items
          .map((item) => ({ ...item, id: `${bucket.queueCode}-${item.locator}` }))
          .filter((item) => {
            if (item.id === itemId) { moved = item; return false; }
            return true;
          })
          .map((item) => ({ ...item }));
        return { ...bucket, items: filtered.map(({ id, ...item }) => item) };
      });
      if (!moved) return prev;
      const movedItem = moved as QueueItem;
      return cleaned.map((bucket) => {
        if (bucket.queueCode === destinationCode) {
          return {
            ...bucket,
            items: [
              ...bucket.items,
              {
                queueCode: destinationCode,
                locator: movedItem.locator,
                passengerName: movedItem.passengerName,
                departureDate: movedItem.departureDate,
                route: movedItem.route,
                deadlineAt: movedItem.deadlineAt,
                segmentsCount: movedItem.segmentsCount,
                status: movedItem.status,
                agent: movedItem.agent
              }
            ]
          };
        }
        return bucket;
      });
    });
  };

  const totals = useMemo(() => {
    if (now == null) {
      return {
        buckets: (data || []).filter((b) => b.items.length > 0).length,
        total: (data || []).reduce((a, b) => a + b.items.length, 0),
        overdue: 0,
        urgent: 0,
        oldestMins: 0
      };
    }
    const all = (data || []).flatMap((b) => b.items);
    const overdue = all.filter((i) => new Date(i.deadlineAt).getTime() < now).length;
    const urgent = all.filter((i) => {
      const mins = (new Date(i.deadlineAt).getTime() - now) / 60000;
      return mins >= 0 && mins <= 30;
    }).length;
    const oldestMins = all.reduce((max, i) => {
      const mins = Math.round((now - new Date(i.deadlineAt).getTime()) / 60000);
      return Math.max(max, mins);
    }, 0);
    return {
      buckets: (data || []).filter((b) => b.items.length > 0).length,
      total: all.length,
      overdue,
      urgent,
      oldestMins
    };
  }, [data, now]);

  if (isError) {
    return (
      <Card variant="pro" accent="danger">
        <CardContent className="text-destructive py-3">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Work Queues"
        title="Queues"
        meta="Monitor and manage booking queues across all agents"
        actions={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
              Last refresh {lastRefreshed.toLocaleTimeString()}
            </span>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        }
      />

      <KpiStrip cols={4}>
        <KpiTile
          label="Active Buckets"
          value={totals.buckets}
          tone="brand"
          sub="with work in flight"
        />
        <KpiTile
          label="Total Items"
          value={totals.total}
          tone="brand"
          sub="across all queues"
        />
        <KpiTile
          label="Urgent (≤30m)"
          value={totals.urgent}
          tone={totals.urgent > 0 ? 'warn' : 'good'}
          delta={totals.urgent > 0 ? 'WATCH' : 'OK'}
          sub="needs attention soon"
        />
        <KpiTile
          label="Overdue"
          value={totals.overdue}
          tone={totals.overdue > 0 ? 'danger' : 'good'}
          delta={totals.overdue > 0 ? 'BREACH' : 'CLEAR'}
          sub={totals.oldestMins > 0 ? `oldest ${totals.oldestMins}m past` : 'on time'}
        />
      </KpiStrip>

      <Card variant="pro">
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Eyebrow as="div" className="mb-1">Agent</Eyebrow>
              <Input
                value={filters.agent}
                onChange={(e) => setFilters((s) => ({ ...s, agent: e.target.value }))}
                placeholder="Filter by agent"
                className="w-40"
              />
            </div>
            <div>
              <Eyebrow as="div" className="mb-1">From</Eyebrow>
              <Input
                value={filters.dateFrom}
                onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))}
                type="date"
              />
            </div>
            <div>
              <Eyebrow as="div" className="mb-1">To</Eyebrow>
              <Input
                value={filters.dateTo}
                onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))}
                type="date"
              />
            </div>
            <Button variant="outline" onClick={() => setFilters({ agent: '', dateFrom: '', dateTo: '' })}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-[1600px]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} variant="pro" className="w-64 min-w-64">
                    <CardContent>
                      <div className="h-44 animate-shimmer rounded" />
                    </CardContent>
                  </Card>
                ))
              : buckets.map((bucket) => {
                  const tnow = now ?? 0;
                  const bucketAccent =
                    tnow > 0 && bucket.items.some((i) => new Date(i.deadlineAt).getTime() < tnow)
                      ? 'danger'
                      : tnow > 0 && bucket.items.some(
                          (i) => (new Date(i.deadlineAt).getTime() - tnow) / 60000 <= 30
                        )
                      ? 'warn'
                      : 'brand';
                  return (
                    <Card key={bucket.queueCode} variant="pro" accent={bucketAccent} className="w-64 min-w-64">
                      <CardHeader>
                        <CardTitle className="font-mono text-[12px] tracking-[0.14em] uppercase">
                          {bucket.queueCode}
                        </CardTitle>
                        <Badge variant="brand">{bucket.items.length}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <SortableContext
                          items={bucket.items.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {bucket.items.length === 0 && (
                            <div className="text-[12px] text-muted-foreground italic py-3 text-center">
                              No items
                            </div>
                          )}
                          {bucket.items.map((item) => {
                            const mins = toMinutesLeft(item.deadlineAt);
                            const isOverdue =
                              tnow > 0 && new Date(item.deadlineAt).getTime() < tnow;
                            const isUrgent = !isOverdue && mins <= 30;
                            const tone = isOverdue ? 'danger' : isUrgent ? 'warn' : 'good';
                            return (
                              <QueueCard key={item.id} id={item.id}>
                                <div className="text-[12px]">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-mono font-semibold tracking-[0.02em] text-[var(--brand-navy-800)]">
                                      {item.locator}
                                    </span>
                                    <LiveDot tone={tone} pulse={isOverdue || isUrgent} />
                                  </div>
                                  <div className="text-muted-foreground mt-0.5">
                                    {item.passengerName}
                                  </div>
                                  <div className="text-muted-foreground tabular-nums font-mono text-[11px]">
                                    {item.departureDate} · {item.route}
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    Segments: {item.segmentsCount}
                                  </div>
                                  <div
                                    className={`text-[11px] mt-1.5 font-mono font-bold tabular-nums ${
                                      isOverdue
                                        ? 'text-[var(--color-status-danger)]'
                                        : isUrgent
                                        ? 'text-[var(--color-status-warn)]'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    TTL {formatCountdown(item.deadlineAt)}
                                  </div>
                                </div>
                              </QueueCard>
                            );
                          })}
                        </SortableContext>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
