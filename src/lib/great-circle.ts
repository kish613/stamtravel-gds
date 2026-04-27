// Great-circle path between two [lon, lat] points on the unit sphere,
// returned as an array of [lon, lat] points (suitable for a GeoJSON LineString).
//
// Uses the standard intermediate-point formula. Splits at the antimeridian so
// MapLibre doesn't render a horizontal seam across the map for trans-Pacific
// routes (e.g. JFK → NRT).

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function greatCircle(
  from: [number, number],
  to: [number, number],
  steps = 64
): [number, number][][] {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);

  const sinΔφ = Math.sin((φ2 - φ1) / 2);
  const sinΔλ = Math.sin((λ2 - λ1) / 2);
  const a = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
  const δ = 2 * Math.asin(Math.sqrt(a));

  const points: [number, number][] = [];
  if (δ === 0) {
    return [[from, to]];
  }
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * δ) / Math.sin(δ);
    const B = Math.sin(f * δ) / Math.sin(δ);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);
    points.push([toDeg(λ), toDeg(φ)]);
  }

  // Split when consecutive points jump more than 180° in longitude
  // (i.e. we crossed the antimeridian).
  const segments: [number, number][][] = [];
  let current: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(curr[0] - prev[0]) > 180) {
      segments.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}
