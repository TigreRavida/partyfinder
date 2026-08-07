// Geolocalización web + simulador. En web el GPS real usa navigator.geolocation.
// El simulador permite probar sin estar en Loveland (joystick en pantalla).

import { metersToLatLon, insideVenue, venueCenter, VENUE } from './venue';

// ---- SIMULADOR (para testeo) ----
// Poné SIM=true para probar desde casa; SIM=false usa el GPS real del navegador.
export const SIM = false;

// posición inicial: un punto ALEATORIO pero DENTRO del perímetro real del predio.
function randomStartMeters() {
  const { clat, clon } = venueCenter();
  const kLat = 110540, kLon = 111320 * Math.cos(clat * Math.PI / 180);
  // el predio es ~325x316m; probamos puntos hasta que uno caiga dentro del perímetro
  for (let i = 0; i < 200; i++) {
    const mx = (Math.random() - 0.5) * 300;
    const my = (Math.random() - 0.5) * 300;
    const lat = clat + my / kLat;
    const lon = clon + mx / kLon;
    if (insideVenue(lat, lon)) return { mx, my };
  }
  return { mx: 0, my: 0 }; // fallback: el centro
}

const _start = randomStartMeters();
const G = {
  mx: _start.mx,  // metros este/oeste desde el centro del predio
  my: _start.my,  // metros norte/sur
  subs: new Set(),
};
export function simXY() { return { mx: G.mx, my: G.my }; }
export function simMove(dx, dy) {
  G.mx += dx; G.my += dy;
  G.subs.forEach((f) => f());
}
export function simSubscribe(fn) { G.subs.add(fn); return () => G.subs.delete(fn); }

// posición actual como lat/lon — sim o GPS real
export function currentLatLon() {
  if (SIM) return metersToLatLon(G.mx, G.my);
  return null; // GPS real llega por watchPosition
}

// ---- GPS REAL (web) ----
export function watchPosition(onFix, onErr) {
  if (!('geolocation' in navigator)) { onErr?.('sin geolocalización'); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    (p) => onFix({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
    (e) => onErr?.(e.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

// ---- BATERÍA (web, donde esté disponible) ----
export async function readBattery() {
  try {
    if (!navigator.getBattery) { console.log('🔋 getBattery no disponible en este navegador'); return null; }
    const b = await navigator.getBattery();
    const pct = Math.round(b.level * 100);
    console.log('🔋 batería leída:', pct + '%');
    return pct;
  } catch (e) { console.log('🔋 error al leer batería:', e?.message); return null; }
}
