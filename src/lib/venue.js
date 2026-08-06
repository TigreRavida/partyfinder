// venue.js — Loveland (foto satelital REAL, a escala).
// Coordenadas y perímetro del pptx del organizador. La imagen está calibrada
// contra los 6 escenarios (cuadros de color) por ajuste lineal de mínimos
// cuadrados → proyección lat/lon ↔ fracción de imagen (u,v) precisa.

export const VENUE = {
  name: 'Loveland',
  image: '/loveland.jpeg',
  aspect: 626 / 1264,  // alto/ancho de la foto satelital
  // perímetro del predio (rectángulo del pptx): NE, NO, SO, SE
  perimeter: [
    [4.819956, 52.370831],  // NE  [lon, lat]
    [4.810554, 52.370831],  // NO
    [4.810554, 52.364549],  // SO
    [4.819956, 52.364549],  // SE
  ],
  bounds: { latN: 52.370831, latS: 52.364549, lonW: 4.810554, lonE: 4.819956 },
  // escenarios con su polígono real (4 esquinas [lon,lat]) del pptx
  stages: [
    { name: 'CIRCLE', lat: 52.367110, lon: 4.815646, poly: [[4.815778,52.367103],[4.815515,52.367103],[4.815515,52.367118],[4.815778,52.367118]] },
    { name: 'FIRE',   lat: 52.365815, lon: 4.814198, poly: [[4.813814,52.366396],[4.813582,52.365328],[4.814650,52.365195],[4.814747,52.366340]] },
    { name: '909',    lat: 52.367207, lon: 4.813230, poly: [[4.812725,52.367327],[4.812826,52.366989],[4.813727,52.367076],[4.813642,52.367435]] },
    { name: 'RISE',   lat: 52.368044, lon: 4.815705, poly: [[4.815530,52.368285],[4.815306,52.367912],[4.815902,52.367808],[4.816083,52.368171]] },
    { name: 'NEST',   lat: 52.368571, lon: 4.816521, poly: [[4.816550,52.368874],[4.816072,52.368584],[4.816422,52.368320],[4.817041,52.368508]] },
    { name: 'ARENA',  lat: 52.368826, lon: 4.817540, poly: [[4.817839,52.368928],[4.817240,52.368928],[4.817240,52.368724],[4.817839,52.368724]] },
  ],
};

// transformación calibrada lat/lon → (u,v) fracción de imagen [0..1]
// (ajuste lineal de mínimos cuadrados contra los 6 escenarios visibles)
// --- ambos mapas comparten la MISMA calibración (misma imagen base, distinto estilo) ---
const TU = [57.75510193, 129.75363503, -7072.48892975];
const TV = [82.22754678, -151.09604564, 7517.14685445];

// metadatos de cada mapa (mismo aspect y rotación; solo cambia imagen y color de puntos)
export const MAPS = {
  sat:    { image: '/loveland.jpeg',        aspect: 627 / 1261, rotate: true, dotColor: 'var(--magenta)' },
  techno: { image: '/loveland-techno.jpeg', aspect: 627 / 1261, rotate: true, dotColor: '#FF7A1A' },
};

export function latLonToFrac(lat, lon) {
  return {
    u: TU[0]*lon + TU[1]*lat + TU[2],
    v: TV[0]*lon + TV[1]*lat + TV[2],
  };
}
export function gpsToFrac(lat, lon) { return latLonToFrac(lat, lon); }

// inversa de latLonToFrac: (u,v) fracción de imagen → lat/lon
const MINV = [[0.007790, 0.006690], [0.004239, -0.002978]];
export function fracToLatLon(u, v) {
  const a = u - (-7072.488930);
  const b = v - (7517.146854);
  const lon = MINV[0][0] * a + MINV[0][1] * b;
  const lat = MINV[1][0] * a + MINV[1][1] * b;
  return { lat, lon };
}


// punto en polígono (ray casting)
export function pointInPolygon(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
export function stageAt(lat, lon) {
  for (const s of VENUE.stages) if (pointInPolygon(lon, lat, s.poly)) return s.name;
  return null;
}
export function insideVenue(lat, lon) {
  const b = VENUE.bounds;
  return lat <= b.latN && lat >= b.latS && lon >= b.lonW && lon <= b.lonE;
}
export function venueCenter() {
  const b = VENUE.bounds;
  return { clat: (b.latN + b.latS) / 2, clon: (b.lonW + b.lonE) / 2 };
}
export function metersToLatLon(mx, my) {
  const { clat, clon } = venueCenter();
  const kLat = 110540, kLon = 111320 * Math.cos(clat * Math.PI / 180);
  return { lat: clat + my / kLat, lon: clon + mx / kLon };
}
