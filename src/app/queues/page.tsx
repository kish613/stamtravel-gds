'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueues } from '@/lib/query';
import { QueueBucket, QueueItem } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toMinutesLeft, formatCountdown } from '@/lib/time';
import { RefreshCw } from 'lucide-react';

function QueueCard({
  id,
  children
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`rounded border border-white/20 bg-white/60 backdrop-blur-sm p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] ${isDragging ? 'opacity-70 shadow-lg' : ''}`}
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

  const setColumnsInCache = (
    updater: (prev: QueueBucket[] | undefined) => QueueBucket[] | undefined
  ) => {
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
          .map((item) => ({
            ...item,
            id: `${bucket.queueCode}-${item.locator}`
          }))
          .filter((item) => {
            if (item.id === itemId) {
              moved = item;
              return false;
            }
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
      <Card className="border-status-danger text-status-danger bg-white/60 backdrop-blur-md">
        <CardContent className="py-3">{(error as Error)?.message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <Card className="flex-1 bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <CardHeader className="bg-gradient-to-r from-slate-50/80 to-blue-50/80 rounded-t-lg">
            <CardTitle>Queue Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <input
                value={filters.agent}
                onChange={(e) => setFilters((state) => ({ ...state, agent: e.target.value }))}
                placeholder="Agent"
                className="h-8 rounded border border-white/20 bg-white/50 backdrop-blur-sm px-2 text-[13px] transition-shadow hover:shadow-md focus:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300/50"
              />
              <input
                value={filters.dateFrom}
                onChange={(e) => setFilters((state) => ({ ...state, dateFrom: e.target.value }))}
                type="date"
                className="h-8 rounded border border-white/20 bg-white/50 backdrop-blur-sm px-2 text-[13px] transition-shadow hover:shadow-md focus:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300/50"
              />
              <input
                value={filters.dateTo}
                onChange={(e) => setFilters((state) => ({ ...state, dateTo: e.target.value }))}
                type="date"
                className="h-8 rounded border border-white/20 bg-white/50 backdrop-blur-sm px-2 text-[13px] transition-shadow hover:shadow-md focus:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-300/50"
              />
              <Button variant="outline" onClick={() => setFilters({ agent: '', dateFrom: '', dateTo: '' })}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-right text-[12px]">
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
                  <Card key={idx} className="w-64 min-w-64 bg-white/60 backdrop-blur-md border-white/20">
                    <CardContent>
                      <div className="h-44 animate-pulse rounded bg-white/40 backdrop-blur-sm" />
                    </CardContent>
                  </Card>
                ))
              : buckets.map((bucket: any) => (
                  <Card key={bucket.queueCode} className="w-64 min-w-64 bg-white/60 backdrop-blur-md border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                    <CardHeader className="bg-gradient-to-b from-white/50 to-transparent rounded-t-lg">
                      <CardTitle>
                        {bucket.queueCode}
                        <Badge variant="neutral" className="ml-2">
                          {bucket.items.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <SortableContext items={bucket.items.map((item: any) => item.id)} strategy={verticalListSortingStrategy}>
                        {bucket.items.map((item: any) => {
                          const mins = toMinutesLeft(item.deadlineAt);
                          const itemClass =
                            mins < 0
                              ? 'bg-[#DC2626]/10 border-[#DC2626]/40 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
                              : mins <= 30
                              ? 'border-[#D97706]/40 shadow-[0_0_12px_rgba(217,119,6,0.15)]'
                              : 'border-white/20';
                          return (
                            <QueueCard key={item.id} id={item.id}>
                              <div className={`rounded border p-2 text-[12px] backdrop-blur-sm ${itemClass}`}>
                                <div className="font-semibold">{item.locator}</div>
                                <div>{item.passengerName}</div>
                                <div>
                                  {item.departureDate} · {item.route}
                                </div>
                                <div>Segments: {item.segmentsCount}</div>
                                <div className="text-[11px] mt-1">TTL {formatCountdown(item.deadlineAt)}</div>
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
