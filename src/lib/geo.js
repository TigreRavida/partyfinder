// Geolocalización web + simulador. En web el GPS real usa navigator.geolocation.
// El simulador permite probar sin estar en Loveland (joystick en pantalla).

import { metersToLatLon } from './venue';

// ---- SIMULADOR (para testeo) ----
// Poné SIM=true para probar desde casa; SIM=false usa el GPS real del navegador.
export const SIM = true;

const G = {
  mx: (Math.random() - 0.5) * 380,  // metros este/oeste desde el centro del predio
  my: (Math.random() - 0.5) * 380,  // metros norte/sur
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
    if (!navigator.getBattery) return null;
    const b = await navigator.getBattery();
    return Math.round(b.level * 100);
  } catch { return null; }
}
