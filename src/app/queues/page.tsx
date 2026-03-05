'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueues } from '@/lib/query';
import { QueueBucket, QueueItem } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toMinutesLeft, formatCountdown } from '@/lib/time';
import { RefreshCw } from 'lucide-react';

function QueueCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`rounded-md border border-border bg-card p-2 transition-colors hover:bg-muted/40 ${isDragging ? 'opacity-60 shadow-card-md' : ''}`}
    >
      {children}
    </div>
  );
}

export default function QueuesPage() {
  const { data, isLoading, isError, refetch, error } = useQueues();
  const [filters, setFilters] = useState({ agent: '', dateFrom: '', dateTo: '' });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(
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

  const buckets = useMemo(() => {
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

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-3 text-destructive">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-[13px]">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Queues</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and manage booking queues across all agents</p>
      </div>

      <div className="flex flex-wrap gap-2 items-end justify-between">
        <Card className="flex-1">
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-2">
              <Input
                value={filters.agent}
                onChange={(e) => setFilters((s) => ({ ...s, agent: e.target.value }))}
                placeholder="Filter by agent"
                className="w-40"
              />
              <Input
                value={filters.dateFrom}
                onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))}
                type="date"
              />
              <Input
                value={filters.dateTo}
                onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))}
                type="date"
              />
              <Button variant="outline" onClick={() => setFilters({ agent: '', dateFrom: '', dateTo: '' })}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-right text-[12px] text-muted-foreground">
          <div>Last refreshed: {lastRefreshed.toLocaleTimeString()}</div>
          <Button variant="outline" className="mt-2" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-[1600px]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} className="w-64 min-w-64">
                    <CardContent>
                      <div className="h-44 animate-pulse rounded bg-muted" />
                    </CardContent>
                  </Card>
                ))
              : buckets.map((bucket: QueueBucket) => (
                  <Card key={bucket.queueCode} className="w-64 min-w-64">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{bucket.queueCode}</span>
                        <Badge variant="neutral">{bucket.items.length}</Badge>
                      </div>
                      <SortableContext
                        items={bucket.items.map((item: QueueItem & { id: string }) => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {bucket.items.map((item: QueueItem & { id: string }) => {
                          const mins = toMinutesLeft(item.deadlineAt);
                          const isOverdue = mins < 0;
                          const isUrgent = !isOverdue && mins <= 30;
                          return (
                            <QueueCard key={item.id} id={item.id}>
                              <div className="relative text-[12px]">
                                {/* Status accent dot */}
                                <span
                                  className={`absolute right-0 top-0 w-1.5 h-1.5 rounded-full ${
                                    isOverdue ? 'bg-rose-500' : isUrgent ? 'bg-amber-400' : 'bg-emerald-500'
                                  }`}
                                />
                                <div className="font-mono font-semibold text-foreground pr-3">{item.locator}</div>
                                <div className="text-muted-foreground mt-0.5">{item.passengerName}</div>
                                <div className="text-muted-foreground">{item.departureDate} · {item.route}</div>
                                <div className="text-muted-foreground">Segments: {item.segmentsCount}</div>
                                <div className={`text-[11px] mt-1 font-medium ${
                                  isOverdue ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'
                                }`}>
                                  TTL {formatCountdown(item.deadlineAt)}
                                </div>
                              </div>
                            </QueueCard>
                          );
                        })}
                      </SortableContext>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
