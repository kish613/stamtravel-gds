'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Ban, Route as RouteIcon } from 'lucide-react';
import { useFlightAlerts } from '@/lib/query';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { LiveDot } from '@/components/ui/live-dot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { CardAccent } from '@/components/ui/card';
import type { FlightAlert, FlightAlertKind } from '@/lib/types';

type FilterMode = 'all' | FlightAlertKind;

const KIND_BADGE: Record<
  FlightAlertKind,
  { variant: 'warning' | 'info' | 'danger'; label: string }
> = {
  delayed: { variant: 'warning', label: 'Delayed' },
  rerouted: { variant: 'info', label: 'Rerouted' },
  canceled: { variant: 'danger', label: 'Canceled' }
};

const KIND_ACCENT: Record<FlightAlertKind, CardAccent> = {
  delayed: 'warn',
  rerouted: 'info',
  canceled: 'danger'
};

const KIND_ICON: Record<FlightAlertKind, typeof AlertTriangle> = {
  delayed: AlertTriangle,
  rerouted: RouteIcon,
  canceled: Ban
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelative(iso: string) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { data, isLoading } = useFlightAlerts();
  const notificationsLastSeenAt = useAppStore(
    (state) => state.notificationsLastSeenAt
  );
  const markNotificationsSeen = useAppStore(
    (state) => state.markNotificationsSeen
  );
  const [filter, setFilter] = useState<FilterMode>('all');

  const alerts = useMemo<FlightAlert[]>(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }, [data]);

  const counts = useMemo(() => {
    const c = { delayed: 0, rerouted: 0, canceled: 0 };
    for (const a of alerts) c[a.kind] += 1;
    return c;
  }, [alerts]);

  const filtered = useMemo(
    () => (filter === 'all' ? alerts : alerts.filter((a) => a.kind === filter)),
    [alerts, filter]
  );

  const unreadCutoff = notificationsLastSeenAt
    ? Date.parse(notificationsLastSeenAt)
    : -Infinity;

  const hasUnread = useMemo(
    () => alerts.some((a) => Date.parse(a.createdAt) > unreadCutoff),
    [alerts, unreadCutoff]
  );

  useEffect(() => {
    if (!isLoading && alerts.length > 0 && hasUnread) {
      markNotificationsSeen();
    }
  }, [isLoading, alerts.length, hasUnread, markNotificationsSeen]);

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Operations · Live"
        title="Notifications"
        meta="Disruption alerts across booked flights"
        actions={
          <>
            <LiveDot tone="brand" pulse label="Live" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => markNotificationsSeen()}
              disabled={!hasUnread}
            >
              Mark all as read
            </Button>
          </>
        }
      />

      <KpiStrip cols={3}>
        <KpiTile
          label="Delayed"
          value={counts.delayed}
          tone="warn"
          sub="schedule slipped"
        />
        <KpiTile
          label="Rerouted"
          value={counts.rerouted}
          tone="info"
          sub="origin or destination changed"
        />
        <KpiTile
          label="Canceled"
          value={counts.canceled}
          tone="danger"
          sub="needs rebooking"
        />
      </KpiStrip>

      <Card variant="pro">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <Eyebrow>
            {filtered.length} of {alerts.length}
          </Eyebrow>
        </CardHeader>
        <CardContent>
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as FilterMode)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="delayed">Delayed</TabsTrigger>
              <TabsTrigger value="rerouted">Rerouted</TabsTrigger>
              <TabsTrigger value="canceled">Canceled</TabsTrigger>
            </TabsList>
            <TabsContent value={filter}>
              {isLoading ? (
                <div className="flex flex-col gap-2 mt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-muted-foreground py-10 text-center">
                  No alerts in this view.
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  {filtered.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      unread={Date.parse(alert.createdAt) > unreadCutoff}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({ alert, unread }: { alert: FlightAlert; unread: boolean }) {
  const badge = KIND_BADGE[alert.kind];
  const Icon = KIND_ICON[alert.kind];
  const accent: CardAccent | undefined = unread ? KIND_ACCENT[alert.kind] : undefined;

  const destination =
    alert.kind === 'rerouted' && alert.reroutedTo
      ? alert.reroutedTo
      : alert.to;

  return (
    <Card variant="pro" accent={accent}>
      <CardContent className="flex flex-col gap-2 px-[18px] py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              className="h-[14px] w-[14px] flex-shrink-0"
              style={{
                color:
                  alert.kind === 'delayed'
                    ? 'var(--color-status-warn)'
                    : alert.kind === 'rerouted'
                      ? 'var(--color-status-info)'
                      : 'var(--color-status-danger)'
              }}
            />
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
            <span className="font-mono tabular-nums font-bold text-[var(--brand-navy-800)]">
              {alert.carrier}
              {alert.flightNumber}
            </span>
            <span className="font-mono tabular-nums text-[var(--brand-navy-800)]">
              {alert.from} →{' '}
              {alert.kind === 'rerouted' && alert.reroutedTo ? (
                <>
                  <span className="line-through text-muted-foreground">
                    {alert.to}
                  </span>{' '}
                  {alert.reroutedTo}
                </>
              ) : (
                destination
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {unread && <Badge variant="brand">New</Badge>}
            <span className="text-[11px] text-muted-foreground">
              {formatRelative(alert.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <div>
            <span className="text-muted-foreground mr-1.5">Departs</span>
            {alert.updatedDeparture &&
            alert.updatedDeparture !== alert.scheduledDeparture ? (
              <>
                <span className="line-through text-muted-foreground tabular-nums">
                  {formatDateTime(alert.scheduledDeparture)}
                </span>{' '}
                <span
                  className="tabular-nums font-semibold"
                  style={{ color: 'var(--brand-navy-800)' }}
                >
                  {formatDateTime(alert.updatedDeparture)}
                </span>
              </>
            ) : (
              <span className="tabular-nums text-[var(--brand-navy-800)]">
                {formatDateTime(alert.scheduledDeparture)}
              </span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground mr-1.5">PNR</span>
            <Link
              href={`/bookings/${alert.pnrLocator}`}
              className="font-mono font-bold tracking-[0.02em] text-[var(--brand-navy-800)] hover:underline"
            >
              {alert.pnrLocator}
            </Link>
          </div>
        </div>

        {alert.reason && (
          <p className="text-[12px] text-muted-foreground">{alert.reason}</p>
        )}
      </CardContent>
    </Card>
  );
}
