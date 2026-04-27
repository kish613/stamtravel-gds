'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePnrList } from '@/lib/query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiStrip } from '@/components/ui/kpi-strip';
import { KpiTile } from '@/components/ui/kpi-tile';
import { Eyebrow } from '@/components/ui/section-eyebrow';
import { LiveDot } from '@/components/ui/live-dot';
import { StatusBadge } from '@/components/ui/status-badge';
import { RouteSearch, type RouteFilterMode } from '@/components/map/RouteSearch';
import type { FlightLeg } from '@/components/map/RouteMap';
import airportsFixture from '@/fixtures/airports.json';
import type { Airport, PNR } from '@/lib/types';

const RouteMap = dynamic(
  () => import('@/components/map/RouteMap').then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-shimmer rounded-[12px]"
        style={{ height: 560 }}
      />
    )
  }
);

const airports = airportsFixture as Airport[];
const airportIndex = new Map<string, Airport>();
for (const a of airports) airportIndex.set(a.code.toUpperCase(), a);

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function isUpcoming(dateStr: string) {
  const today = todayIso();
  return dateStr >= today;
}

function buildLegs(pnrs: PNR[]): FlightLeg[] {
  const legs: FlightLeg[] = [];
  for (const pnr of pnrs) {
    for (const seg of pnr.segments) {
      const from = airportIndex.get(seg.from?.toUpperCase());
      const to = airportIndex.get(seg.to?.toUpperCase());
      if (!from || !to) continue;
      if (
        typeof from.lat !== 'number' ||
        typeof from.lon !== 'number' ||
        typeof to.lat !== 'number' ||
        typeof to.lon !== 'number'
      ) {
        continue;
      }
      legs.push({
        id: `${pnr.locator}-${seg.id}`,
        locator: pnr.locator,
        passengerName: pnr.passengerName,
        carrier: seg.carrier,
        flightNumber: seg.flightNumber,
        status: pnr.status,
        fromCode: seg.from,
        toCode: seg.to,
        fromName: from.name,
        toName: to.name,
        fromCity: from.city,
        toCity: to.city,
        fromCoord: [from.lon, from.lat],
        toCoord: [to.lon, to.lat],
        departure: seg.departure
      });
    }
  }
  return legs;
}

export default function MapPage() {
  const { data, isLoading } = usePnrList();
  const [mode, setMode] = useState<RouteFilterMode>('today');
  const [locator, setLocator] = useState('');
  const [passenger, setPassenger] = useState('');
  const [selectedLocator, setSelectedLocator] = useState<string | null>(null);

  const allPnrs = useMemo(() => data || [], [data]);

  const filteredPnrs = useMemo(() => {
    if (mode === 'today') {
      const t = todayIso();
      return allPnrs.filter((p) => p.departureDate === t);
    }
    if (mode === 'upcoming') {
      return allPnrs.filter((p) => isUpcoming(p.departureDate));
    }
    if (mode === 'locator') {
      const q = locator.trim().toLowerCase();
      if (!q) return [];
      return allPnrs.filter((p) => p.locator.toLowerCase().includes(q));
    }
    if (mode === 'passenger') {
      const q = passenger.trim().toLowerCase();
      if (!q) return [];
      return allPnrs.filter((p) => p.passengerName.toLowerCase().includes(q));
    }
    return [];
  }, [allPnrs, mode, locator, passenger]);

  const legs = useMemo(() => buildLegs(filteredPnrs), [filteredPnrs]);

  const stats = useMemo(() => {
    const origins = new Set<string>();
    const destinations = new Set<string>();
    const locators = new Set<string>();
    for (const l of legs) {
      origins.add(l.fromCode);
      destinations.add(l.toCode);
      locators.add(l.locator);
    }
    return {
      legs: legs.length,
      origins: origins.size,
      destinations: destinations.size,
      locators: locators.size
    };
  }, [legs]);

  return (
    <div className="space-y-5 text-[13px]">
      <PageHeader
        eyebrow="Network · Live"
        title="Map"
        meta="Today's flight routes across all PNRs"
        actions={<LiveDot tone="brand" pulse label="Live" />}
      />

      <KpiStrip cols={4}>
        <KpiTile
          label="Flights in view"
          value={stats.legs}
          tone="brand"
          sub={`${stats.locators} PNR${stats.locators === 1 ? '' : 's'}`}
        />
        <KpiTile label="Origins" value={stats.origins} tone="brand" sub="unique airports" />
        <KpiTile
          label="Destinations"
          value={stats.destinations}
          tone="brand"
          sub="unique airports"
        />
        <KpiTile
          label="Filter"
          value={
            mode === 'today'
              ? 'TODAY'
              : mode === 'upcoming'
              ? 'UPCOMING'
              : mode === 'locator'
              ? 'LOCATOR'
              : 'PASSENGER'
          }
          tone="neutral"
          sub={`${filteredPnrs.length} of ${allPnrs.length} PNRs`}
        />
      </KpiStrip>

      <Card variant="pro">
        <CardContent className="pt-3">
          <RouteSearch
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              setSelectedLocator(null);
            }}
            locator={locator}
            onLocatorChange={setLocator}
            passenger={passenger}
            onPassengerChange={setPassenger}
            total={allPnrs.length}
            filtered={filteredPnrs.length}
          />
        </CardContent>
      </Card>

      <Card variant="pro" accent="brand">
        <CardHeader>
          <CardTitle>Route map</CardTitle>
          <Eyebrow>{stats.legs} flight{stats.legs === 1 ? '' : 's'} on map</Eyebrow>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div
              className="w-full animate-shimmer rounded-[12px]"
              style={{ height: 560 }}
            />
          ) : (
            <RouteMap
              legs={legs}
              selectedLocator={selectedLocator}
              onSelectLocator={setSelectedLocator}
              height={560}
            />
          )}
        </CardContent>
      </Card>

      <Card variant="pro">
        <CardHeader>
          <CardTitle>Routes in view</CardTitle>
          <Eyebrow>{legs.length} segment{legs.length === 1 ? '' : 's'}</Eyebrow>
        </CardHeader>
        <CardContent>
          {legs.length === 0 ? (
            <div className="text-muted-foreground py-6 text-center">
              {isLoading
                ? 'Loading flights…'
                : mode === 'locator' && !locator.trim()
                ? 'Enter a locator to find a PNR.'
                : mode === 'passenger' && !passenger.trim()
                ? 'Enter a passenger surname to search.'
                : 'No flights match the current filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {legs.map((leg) => {
                const active = selectedLocator === leg.locator;
                return (
                  <button
                    key={leg.id}
                    type="button"
                    onClick={() =>
                      setSelectedLocator(active ? null : leg.locator)
                    }
                    className={`text-left rounded-[10px] border px-3 py-2.5 transition-colors ${
                      active
                        ? 'border-[var(--brand-teal-500)] bg-[var(--brand-teal-100)]'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F6F8FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold tracking-[0.02em] text-[var(--brand-navy-800)]">
                        {leg.locator}
                      </span>
                      <StatusBadge status={leg.status} />
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {leg.passengerName}
                    </div>
                    <div className="mt-0.5 font-mono tabular-nums text-[12px] text-[var(--brand-navy-800)]">
                      {leg.fromCode} → {leg.toCode} ·{' '}
                      <span className="text-muted-foreground">
                        {leg.carrier}
                        {leg.flightNumber}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
