'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  Source,
  Layer,
  type MapRef,
  type LayerProps
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { greatCircle } from '@/lib/great-circle';

export interface FlightLeg {
  id: string;
  locator: string;
  passengerName: string;
  flightNumber: string;
  carrier: string;
  status: string;
  fromCode: string;
  toCode: string;
  fromName?: string;
  toName?: string;
  fromCity?: string;
  toCity?: string;
  fromCoord: [number, number]; // [lon, lat]
  toCoord: [number, number];
  departure: string;
}

interface RouteMapProps {
  legs: FlightLeg[];
  selectedLocator?: string | null;
  onSelectLocator?: (locator: string | null) => void;
  height?: number | string;
}

// Inline raster style using Carto's free Light basemap (Positron-flavoured).
// Raster tiles render reliably across all MapLibre versions and don't depend
// on external style/sprite/font fetches like vector styles do.
import type { StyleSpecification } from 'maplibre-gl';

const RASTER_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 19
    }
  },
  layers: [
    {
      id: 'carto-light',
      type: 'raster',
      source: 'carto-light'
    }
  ]
};

const STATUS_TONE: Record<string, { color: string; rank: number }> = {
  Ticketed: { color: '#0E9F6E', rank: 1 },
  'Awaiting Ticket': { color: '#D9892B', rank: 2 },
  Booked: { color: '#D9892B', rank: 2 },
  Void: { color: '#D93141', rank: 3 },
  Canceled: { color: '#D93141', rank: 3 }
};

const DEFAULT_TONE = { color: '#25A5B4', rank: 0 };

const toneFor = (status: string) => STATUS_TONE[status] ?? DEFAULT_TONE;

const arcLayer: LayerProps = {
  id: 'arc-lines',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': [
      'case',
      ['boolean', ['get', 'selected'], false],
      3,
      ['boolean', ['get', 'dimmed'], false],
      1,
      1.6
    ],
    'line-opacity': [
      'case',
      ['boolean', ['get', 'dimmed'], false],
      0.3,
      ['boolean', ['get', 'selected'], false],
      1,
      0.85
    ]
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round'
  }
};

const arcGlowLayer: LayerProps = {
  id: 'arc-glow',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 8,
    'line-opacity': 0.18,
    'line-blur': 4
  },
  filter: ['==', ['get', 'selected'], true],
  layout: {
    'line-cap': 'round',
    'line-join': 'round'
  }
};

interface AirportPoint {
  code: string;
  name?: string;
  city?: string;
  coord: [number, number];
}

export function RouteMap({
  legs,
  selectedLocator,
  onSelectLocator,
  height = 560
}: RouteMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [hovered, setHovered] = useState<FlightLeg | null>(null);
  const [airportHovered, setAirportHovered] = useState<AirportPoint | null>(null);

  const airports: AirportPoint[] = useMemo(() => {
    const m = new Map<string, AirportPoint>();
    for (const l of legs) {
      if (!m.has(l.fromCode)) {
        m.set(l.fromCode, {
          code: l.fromCode,
          name: l.fromName,
          city: l.fromCity,
          coord: l.fromCoord
        });
      }
      if (!m.has(l.toCode)) {
        m.set(l.toCode, {
          code: l.toCode,
          name: l.toName,
          city: l.toCity,
          coord: l.toCoord
        });
      }
    }
    return Array.from(m.values());
  }, [legs]);

  const featureCollection = useMemo(() => {
    // Sort lower-rank statuses first so higher-importance arcs render on top.
    const sortedLegs = [...legs].sort(
      (a, b) => toneFor(a.status).rank - toneFor(b.status).rank
    );
    const features = sortedLegs.flatMap((leg) => {
      const segments = greatCircle(leg.fromCoord, leg.toCoord);
      const tone = toneFor(leg.status);
      const isSelected = !!selectedLocator && leg.locator === selectedLocator;
      const isDimmed = !!selectedLocator && !isSelected;
      return segments.map((coords, idx) => ({
        type: 'Feature' as const,
        properties: {
          id: `${leg.id}-${idx}`,
          locator: leg.locator,
          color: tone.color,
          selected: isSelected,
          dimmed: isDimmed
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: coords
        }
      }));
    });
    return {
      type: 'FeatureCollection' as const,
      features
    };
  }, [legs, selectedLocator]);

  // Auto-fit to all airports whenever the leg set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || airports.length === 0) return;
    if (airports.length === 1) {
      map.easeTo({ center: airports[0].coord, zoom: 4, duration: 600 });
      return;
    }
    const lons = airports.map((a) => a.coord[0]);
    const lats = airports.map((a) => a.coord[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)]
    ];
    map.fitBounds(bounds, { padding: 64, duration: 600, maxZoom: 6 });
  }, [airports]);

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <MapLibreMap
        ref={mapRef}
        mapStyle={RASTER_STYLE}
        initialViewState={{ longitude: 0, latitude: 25, zoom: 1.5 }}
        interactiveLayerIds={['arc-lines']}
        cursor={hovered ? 'pointer' : 'grab'}
        onMouseEnter={() => undefined}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          if (!f) {
            if (hovered) setHovered(null);
            return;
          }
          const locator = (f.properties as { locator?: string } | null)?.locator;
          if (!locator) return;
          const leg = legs.find((l) => l.locator === locator);
          if (leg && (!hovered || hovered.id !== leg.id)) setHovered(leg);
        }}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => {
          const f = e.features?.[0];
          const locator = (f?.properties as { locator?: string } | null)?.locator;
          if (locator) {
            onSelectLocator?.(locator === selectedLocator ? null : locator);
          } else if (selectedLocator) {
            onSelectLocator?.(null);
          }
        }}
        attributionControl={{ compact: true }}
      >
        <Source id="arcs" type="geojson" data={featureCollection}>
          <Layer {...arcGlowLayer} />
          <Layer {...arcLayer} />
        </Source>

        {airports.map((a) => (
          <Marker
            key={a.code}
            longitude={a.coord[0]}
            latitude={a.coord[1]}
            anchor="center"
          >
            <button
              type="button"
              aria-label={`${a.code} ${a.name ?? ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setAirportHovered(a);
              }}
              onMouseEnter={() => setAirportHovered(a)}
              onMouseLeave={() => setAirportHovered((cur) => (cur?.code === a.code ? null : cur))}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid #25A5B4',
                background: '#0A2540',
                boxShadow: '0 0 0 4px rgba(37,165,180,0.18)',
                padding: 0,
                cursor: 'pointer'
              }}
            />
          </Marker>
        ))}

        {airportHovered && (
          <Popup
            longitude={airportHovered.coord[0]}
            latitude={airportHovered.coord[1]}
            anchor="bottom"
            offset={14}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setAirportHovered(null)}
            className="route-map-popup"
          >
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12 }}>
              <div
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0A2540'
                }}
              >
                {airportHovered.code}
              </div>
              {airportHovered.name && (
                <div style={{ color: '#0A2540', fontWeight: 600 }}>
                  {airportHovered.name}
                </div>
              )}
              {airportHovered.city && (
                <div style={{ color: '#64748B' }}>{airportHovered.city}</div>
              )}
            </div>
          </Popup>
        )}

        {hovered && (
          <Popup
            longitude={(hovered.fromCoord[0] + hovered.toCoord[0]) / 2}
            latitude={(hovered.fromCoord[1] + hovered.toCoord[1]) / 2}
            anchor="bottom"
            offset={10}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setHovered(null)}
            className="route-map-popup"
          >
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, minWidth: 180 }}>
              <div
                style={{
                  fontFamily: 'var(--font-jetbrains)',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#0A2540',
                  letterSpacing: '0.04em'
                }}
              >
                {hovered.locator}
              </div>
              <div style={{ color: '#0A2540', fontWeight: 600, marginTop: 2 }}>
                {hovered.passengerName}
              </div>
              <div style={{ color: '#64748B', marginTop: 2, fontFamily: 'var(--font-jetbrains)' }}>
                {hovered.fromCode} → {hovered.toCode} · {hovered.carrier}
                {hovered.flightNumber}
              </div>
              <div
                style={{
                  marginTop: 4,
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: 4,
                  color: toneFor(hovered.status).color,
                  background: 'rgba(0,0,0,0.04)'
                }}
              >
                {hovered.status}
              </div>
            </div>
          </Popup>
        )}
      </MapLibreMap>
    </div>
  );
}

export default RouteMap;
