// VENUE fijo — Loveland. Anclas y polígonos reales (coords del organizador).
export const VENUE = {
  name: 'Loveland',
  image: '/loveland.jpeg',
  aspect: 0.4661,
  perimeter: [
    [4.818521, 52.369781], [4.813908, 52.369742],
    [4.813736, 52.366958], [4.817913, 52.366925],
  ],
  anchors: [
    { name: '909',    lat: 52.368273, lon: 4.814614, u: 0.236, v: 0.392 },
    { name: 'FIRE',   lat: 52.367593, lon: 4.814276, u: 0.065, v: 0.800 },
    { name: 'CIRCLE', lat: 52.367202, lon: 4.815686, u: 0.339, v: 0.720 },
    { name: 'RISE',   lat: 52.368208, lon: 4.815748, u: 0.452, v: 0.606 },
    { name: 'NEST',   lat: 52.368621, lon: 4.816528, u: 0.538, v: 0.606 },
    { name: 'ARENA',  lat: 52.369202, lon: 4.817810, u: 0.674, v: 0.706 },
  ],
  stages: [
    { name: 'ARENA',  poly: [[4.818147,52.369316],[4.817884,52.369421],[4.817455,52.369090],[4.817755,52.368979]] },
    { name: 'NEST',   poly: [[4.816940,52.368622],[4.816650,52.368828],[4.816119,52.368622],[4.816403,52.368412]] },
    { name: 'RISE',   poly: [[4.816040,52.368228],[4.815659,52.368402],[4.815423,52.368179],[4.815868,52.368022]] },
    { name: 'CIRCLE', poly: [[4.815805,52.367167],[4.815778,52.367307],[4.815532,52.367218],[4.815628,52.367118]] },
    { name: 'FIRE',   poly: [[4.814664,52.367394],[4.814251,52.367815],[4.814041,52.367805],[4.814149,52.367360]] },
    { name: '909',    poly: [[4.814859,52.368248],[4.814612,52.368431],[4.814332,52.368301],[4.814654,52.368113]] },
  ],
  widthMeters: 325,
};

const kLat = 110540;
const kLon = 111320 * Math.cos((52.3683 * Math.PI) / 180);

export function pointInPolygon(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function stageAt(lat, lon) {
  for (const s of VENUE.stages) if (pointInPolygon(lon, lat, s.poly)) return s.name;
  return null;
}
export function insideVenue(lat, lon) { return pointInPolygon(lon, lat, VENUE.perimeter); }

export function latLonToFrac(lat, lon) {
  let sw = 0, su = 0, sv = 0;
  for (const a of VENUE.anchors) {
    const dLat = (lat - a.lat) * kLat, dLon = (lon - a.lon) * kLon;
    const d2 = dLat * dLat + dLon * dLon;
    if (d2 < 1e-6) return { u: a.u, v: a.v };
    const w = 1 / (d2 * d2);
    sw += w; su += w * a.u; sv += w * a.v;
  }
  return { u: su / sw, v: sv / sw };
}
export function venueCenter() {
  const clat = VENUE.anchors.reduce((s, a) => s + a.lat, 0) / VENUE.anchors.length;
  const clon = VENUE.anchors.reduce((s, a) => s + a.lon, 0) / VENUE.anchors.length;
  return { clat, clon };
}
export function metersToLatLon(mx, my) {
  const { clat, clon } = venueCenter();
  return { lat: clat + my / kLat, lon: clon + mx / kLon };
}
// GPS real → fracción del plano
export function gpsToFrac(lat, lon) { return latLonToFrac(lat, lon); }
