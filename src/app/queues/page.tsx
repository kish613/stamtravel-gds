'use client';

import React, { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueues, useQueueMutation } from '@/lib/query';
import { QueueBucket, QueueItem } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCountdown } from '@/lib/time';
import { RefreshCw } from 'lucide-react';

type QueueItemWithId = QueueItem & { id: string };
type QueueBucketWithId = Omit<QueueBucket, 'items'> & { items: QueueItemWithId[] };

const QUEUE_QUERY_KEY = ['sabre', 'queues'] as const;

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

function addItemIds(data: QueueBucket[] = []): QueueBucketWithId[] {
  return data.map((bucket) => ({
    ...bucket,
    items: bucket.items.map((item) => ({
      ...item,
      id: `${bucket.queueCode}-${item.locator}`
    }))
  }));
}

function moveItem(prev: QueueBucket[] | undefined, itemId: string, destinationCode: string) {
  if (!prev) return prev;
  let moved: QueueItem | null = null;
  const cleaned = prev.map((bucket) => ({
    ...bucket,
    items: bucket.items.filter((item) => {
      if (`${bucket.queueCode}-${item.locator}` === itemId) {
        moved = item;
        return false;
      }
      return true;
    })
  }));
  if (!moved) return prev;
  return cleaned.map((bucket) => (
    bucket.queueCode === destinationCode
      ? { ...bucket, items: [...bucket.items, moved as QueueItem] }
      : bucket
  ));
}

export default function QueuesPage() {
  const { data, isLoading, isError, refetch, error } = useQueues();
  const queueMutation = useQueueMutation();
  const [filters, setFilters] = useState({ agent: '', dateFrom: '', dateTo: '' });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(() => addItemIds(data), [data]);

  const buckets = useMemo(() => {
    return columns.map((bucket) => ({
      ...bucket,
      items: bucket.items.filter((item) => {
        if (filters.agent && item.agent !== filters.agent) return false;
        if (filters.dateFrom && item.departureDate < filters.dateFrom) return false;
        if (filters.dateTo && item.departureDate > filters.dateTo) return false;
        return true;
      })
    }));
  }, [columns, filters]);

  const refresh = async () => {
    const result = await refetch();
    if (result.data) {
      setLastRefreshed(new Date());
      setMessage(null);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const sourceQueue = String(active.id).split('-')[0];
    const destinationQueue = String(over.id).split('-')[0];
    if (sourceQueue === destinationQueue) return;

    const locator = String(active.id).split('-').slice(1).join('-');
    const previous = queryClient.getQueryData<QueueBucket[]>(QUEUE_QUERY_KEY);
    const optimistic = moveItem(previous, String(active.id), destinationQueue);
    queryClient.setQueryData(QUEUE_QUERY_KEY, optimistic);

    queueMutation.mutate(
      {
        action: 'move',
        locator,
        fromQueue: sourceQueue,
        toQueue: destinationQueue
      },
      {
        onSuccess: (result) => {
          setMessage(result.warnings[0] || `Moved ${locator} to ${destinationQueue}.`);
        },
        onError: (mutationError) => {
          queryClient.setQueryData(QUEUE_QUERY_KEY, previous);
          setMessage(mutationError.message || 'Queue move failed.');
        }
      }
    );
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
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Queues</h1>
        <p className="text-sm text-muted-foreground mt-1">Queue state is now persisted server-side and synchronized back into the booking mirror.</p>
      </div>

      {message && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end justify-between">
        <Card className="flex-1">
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-2">
              <Input value={filters.agent} onChange={(event) => setFilters((state) => ({ ...state, agent: event.target.value }))} placeholder="Filter by agent" className="w-40" />
              <Input value={filters.dateFrom} onChange={(event) => setFilters((state) => ({ ...state, dateFrom: event.target.value }))} type="date" />
              <Input value={filters.dateTo} onChange={(event) => setFilters((state) => ({ ...state, dateTo: event.target.value }))} type="date" />
              <Button variant="outline" onClick={() => setFilters({ agent: '', dateFrom: '', dateTo: '' })}>Clear</Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-right text-[12px] text-muted-foreground">
          <div>Last refreshed: {lastRefreshed.toLocaleTimeString()}</div>
          <Button variant="outline" className="mt-2" onClick={refresh} disabled={queueMutation.isPending}>
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
              : buckets.map((bucket) => (
                  <Card key={bucket.queueCode} className="w-64 min-w-64">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{bucket.queueCode}</span>
                        <Badge variant="neutral">{bucket.items.length}</Badge>
                      </div>
                      <SortableContext items={bucket.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        {bucket.items.map((item) => (
                          <QueueCard key={item.id} id={item.id}>
                            <div className="relative text-[12px]">
                              <span className="absolute right-0 top-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <div className="font-mono font-semibold text-foreground pr-3">{item.locator}</div>
                              <div className="text-muted-foreground mt-0.5">{item.passengerName}</div>
                              <div className="text-muted-foreground">{item.departureDate} · {item.route}</div>
                              <div className="text-muted-foreground">Segments: {item.segmentsCount}</div>
                              <div className="text-[11px] mt-1 font-medium text-muted-foreground">TTL {formatCountdown(item.deadlineAt)}</div>
                            </div>
                          </QueueCard>
                        ))}
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
