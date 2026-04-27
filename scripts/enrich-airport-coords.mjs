#!/usr/bin/env node
// One-off script: enrich src/fixtures/airports.json with lat/lon from
// the OpenFlights public-domain dataset.
//
// Usage:  node scripts/enrich-airport-coords.mjs
//
// Reads:  src/fixtures/airports.json  (existing)
// Writes: src/fixtures/airports.json  (in place, with lat/lon added)
// Logs:   any IATA codes the dataset doesn't cover

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(__dirname, '../src/fixtures/airports.json');

const OPENFLIGHTS_URL =
  'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

function parseOpenflights(csv) {
  const index = new Map();
  for (const line of csv.split('\n')) {
    if (!line.trim()) continue;
    // Naive CSV parser — fields are quoted strings or numbers, comma-separated.
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuote = !inQuote;
      } else if (c === ',' && !inQuote) {
        fields.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    if (fields.length < 8) continue;
    const iata = fields[4];
    const lat = parseFloat(fields[6]);
    const lon = parseFloat(fields[7]);
    if (iata && iata !== '\\N' && iata.length === 3 && Number.isFinite(lat) && Number.isFinite(lon)) {
      index.set(iata.toUpperCase(), { lat, lon });
    }
  }
  return index;
}

const main = async () => {
  console.log('Fetching OpenFlights airports.dat…');
  const res = await fetch(OPENFLIGHTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenFlights data: ${res.status}`);
  }
  const csv = await res.text();
  const coords = parseOpenflights(csv);
  console.log(`Parsed ${coords.size} airports from OpenFlights`);

  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const missing = [];
  let patched = 0;
  for (const a of fixture) {
    const c = coords.get((a.code || '').toUpperCase());
    if (c) {
      a.lat = c.lat;
      a.lon = c.lon;
      patched += 1;
    } else {
      missing.push(a.code);
    }
  }

  await writeFile(fixturePath, JSON.stringify(fixture, null, 2) + '\n');
  console.log(`Patched ${patched}/${fixture.length} entries`);
  if (missing.length) {
    console.log(`Missing coords for ${missing.length} codes: ${missing.join(', ')}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
