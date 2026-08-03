import { createClient } from '@supabase/supabase-js';

// mismas claves que la app Expo (mismo backend). En Vite: VITE_ prefix.
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  // aviso claro en vez de pantalla en blanco
  console.error('[PartyFinder] Falta el archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

// no explota si faltan las claves — usa placeholders y la app igual carga
export const supabase = createClient(
  URL || 'https://placeholder.supabase.co',
  KEY || 'placeholder-key'
);
export const supabaseReady = !!(URL && KEY);

/* --------- sesión local (sin cuentas: nombre + grupo) --------- */
const SK = 'pf.session';
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; }
}
export function saveSession(s) { localStorage.setItem(SK, JSON.stringify(s)); }
export function clearSession() { localStorage.removeItem(SK); }

/* device id estable para identificar al autor */
const DK = 'pf.device';
export function deviceId() {
  let d = localStorage.getItem(DK);
  if (!d) { d = 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DK, d); }
  return d;
}

/* --------------------- presencia --------------------- */
export async function upsertPresence({ group, member, lat, lon, accuracy, battery, status, avatar_url }) {
  const row = {
    group_code: group, member, lat, lon, accuracy: accuracy ?? 8,
    updated_at: new Date().toISOString(),
  };
  if (battery !== undefined) row.battery = battery;
  if (status !== undefined) row.status = status;
  if (avatar_url !== undefined) row.avatar_url = avatar_url;
  const { error } = await supabase.from('presence').upsert(row, { onConflict: 'group_code,member' });
  if (error) console.warn('presence:', error.message);
}
export async function fetchPresence(group) {
  const { data } = await supabase.from('presence').select('*').eq('group_code', group);
  return data ?? [];
}
export function subscribePresence(group, onRow) {
  const ch = supabase.channel('pres:' + group + ':' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence', filter: `group_code=eq.${group}` },
      (p) => onRow(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}
export async function setMyStatus(group, member, status) {
  await supabase.from('presence').update({ status: status.trim() || null, updated_at: new Date().toISOString() })
    .eq('group_code', group).eq('member', member);
}
// subir avatar del usuario (reusa el bucket spot-photos, carpeta avatars/)
export async function uploadAvatar(group, member, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `avatars/${group}_${member}_${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('spot-photos').upload(path, file, { upsert: true });
  if (upErr) { console.error('uploadAvatar:', upErr.message); throw upErr; }
  const { data: pub } = supabase.storage.from('spot-photos').getPublicUrl(path);
  const url = pub.publicUrl;
  await setMyAvatar(group, member, url);
  return url;
}

export async function setMyAvatar(group, member, avatar_url) {
  await supabase.from('presence').update({ avatar_url, updated_at: new Date().toISOString() })
    .eq('group_code', group).eq('member', member);
}

/* --------------------- chat grupo + DM --------------------- */
export async function fetchConversation(group, kind, me, other) {
  const { data } = await supabase.from('group_messages').select('*')
    .eq('group_code', group).eq('kind', kind).order('created_at', { ascending: true });
  if (!data) return [];
  if (kind === 'group') return data;
  return data.filter((m) =>
    (m.author === me && m.recipient === other) || (m.author === other && m.recipient === me));
}
export async function sendGroupMessage(group, kind, author, body, recipient) {
  await supabase.from('group_messages').insert({
    group_code: group, kind, author, body: body.trim(), recipient: recipient ?? null,
  });
}
export function subscribeConversation(group, onMsg) {
  const ch = supabase.channel('gm:' + group + ':' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_code=eq.${group}` },
      (p) => onMsg(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* no leídos por conversación (local) */
const CS = 'pf.convSeen';
function convSeen() { try { return JSON.parse(localStorage.getItem(CS)) || {}; } catch { return {}; } }
export function convKey(kind, other) { return kind === 'group' ? 'group' : `dm:${other}`; }
export function markConvSeen(kind, other) {
  const s = convSeen(); s[convKey(kind, other)] = Date.now();
  localStorage.setItem(CS, JSON.stringify(s));
}
export async function fetchConvUnread(group, me) {
  const seen = convSeen();
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { data } = await supabase.from('group_messages')
    .select('kind, author, recipient, created_at').eq('group_code', group).gte('created_at', since);
  if (!data) return {};
  const counts = {};
  for (const m of data) {
    if (m.author === me) continue;
    let key = null;
    if (m.kind === 'group') key = 'group';
    else if (m.kind === 'dm' && m.recipient === me) key = `dm:${m.author}`;
    if (!key) continue;
    if (new Date(m.created_at).getTime() > (seen[key] ?? 0)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/* --------------------- spots --------------------- */
export async function fetchSpots(group) {
  const { data } = await supabase.from('spots').select('*').eq('group_code', group).order('created_at', { ascending: false });
  return data ?? [];
}
export async function createSpot(group, name, x, y, author_id, author) {
  const { data, error } = await supabase.from('spots')
    .insert({ group_code: group, name, x, y, author_id, author }).select().single();
  if (error) { console.error('createSpot:', error.message); throw error; }
  return data;
}
export async function fetchSpot(id) {
  const { data } = await supabase.from('spots').select('*').eq('id', id).single();
  return data;
}
export async function fetchSpotMessages(spotId) {
  const { data } = await supabase.from('spot_messages').select('*').eq('spot_id', spotId).order('created_at', { ascending: true });
  return data ?? [];
}
export async function sendSpotMessage(spotId, group, author, body) {
  const { error } = await supabase.from('spot_messages').insert({ spot_id: spotId, group_code: group, author, body: body.trim() });
  if (error) { console.error('sendSpotMessage:', error.message); throw error; }
}
export function subscribeSpotMessages(spotId, onMsg) {
  const ch = supabase.channel('sm:' + spotId + ':' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spot_messages', filter: `spot_id=eq.${spotId}` },
      (p) => onMsg(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}
// subir foto del spot a Supabase Storage (bucket "spot-photos")
export async function uploadSpotPhoto(spotId, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${spotId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('spot-photos').upload(path, file, { upsert: true });
  if (upErr) { console.error('uploadSpotPhoto:', upErr.message); throw upErr; }
  const { data: pub } = supabase.storage.from('spot-photos').getPublicUrl(path);
  const url = pub.publicUrl;
  const { error } = await supabase.from('spots').update({ photo_url: url }).eq('id', spotId);
  if (error) { console.error('setSpotPhoto:', error.message); throw error; }
  return url;
}

export function subscribeSpots(group, onChange) {
  const ch = supabase.channel('spots:' + group + ':' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'spots', filter: `group_code=eq.${group}` }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}


/* --------- TESTING: sembrar integrantes ficticios en el grupo --------- */
// Inserta presencia de personas de prueba, repartidas dentro y fuera del predio,
// para validar mapa, miembros y chats sin necesitar muchos teléfonos.
export async function seedTestMembers(group) {
  const { metersToLatLon } = await import('./venue');
  const names = ['Tigre', 'Duri', 'Lola', 'Fede', 'Mica', 'Nacho', 'Sol', 'Bruno'];
  const rows = names.map((member, i) => {
    // repartir: algunos dentro (±120m), un par fuera (±250m)
    const spread = i >= 6 ? 260 : 120;
    const mx = (Math.random() - 0.5) * spread * 2;
    const my = (Math.random() - 0.5) * spread * 2;
    const { lat, lon } = metersToLatLon(mx, my);
    const statuses = ['en la barra 🍺', 'buscando fuego 🔥', '', 'cerca del main', 'en el baño', '', 'llegando', 'en ARENA'];
    return {
      group_code: group, member, lat, lon, accuracy: 8,
      battery: 30 + Math.floor(Math.random() * 70),
      status: statuses[i] || null,
      updated_at: new Date().toISOString(),
    };
  });
  const { error } = await supabase.from('presence').upsert(rows, { onConflict: 'group_code,member' });
  if (error) { console.error('seed:', error.message); throw error; }
  return names.length;
}
export async function clearTestMembers(group) {
  const names = ['Tigre', 'Duri', 'Lola', 'Fede', 'Mica', 'Nacho', 'Sol', 'Bruno'];
  await supabase.from('presence').delete().eq('group_code', group).in('member', names);
}
