import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadSession, fetchSpots, createSpot, subscribeSpots, deviceId,
  fetchPresence, deleteSpot, renameSpot, upsertPresence,
} from '../lib/db';
import { simXY, currentLatLon } from '../lib/geo';
import { metersToLatLon, VENUE } from '../lib/venue';
import { TabBar } from '../components/TabBar';
import { Avatar } from '../components/Avatar';

const NEON = ['var(--orange)', 'var(--cyan)', 'var(--magenta)', 'var(--green)', 'var(--gold)', 'var(--blue)'];
const kLat = 110540, kLon = 111320 * Math.cos(52.3683 * Math.PI / 180);

export default function Spots() {
  const nav = useNavigate();
  const session = loadSession();
  const [spots, setSpots] = useState([]);
  const [people, setPeople] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [actionSpot, setActionSpot] = useState(null);  // spot con popup abierto
  const [editing, setEditing] = useState(null);        // spot en edición de nombre
  const [editName, setEditName] = useState('');
  const pressTimer = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchSpots(session.group).then(setSpots).catch(() => {});
    fetchPresence(session.group).then((r) => { setPeople(r); const me = r.find((x) => x.member === session.name); if (me?.avatar_url) setMyAvatar(me.avatar_url); }).catch(() => {});
    const t = setInterval(() => fetchPresence(session.group).then(setPeople).catch(() => {}), 12000);
    const un = subscribeSpots(session.group, () => fetchSpots(session.group).then(setSpots));
    return () => { clearInterval(t); un(); };
  }, [session?.group]);

  // cuánta gente hay en el radio de 10m de cada spot
  const countAt = useMemo(() => {
    const fn = (sp) => {
      const spot = metersToLatLon(sp.x, sp.y);
      // incluir mi posición local + la de todos, sin duplicarme
      const mine = currentLatLon();
      const list = people.filter((p) => p.member !== session?.name && p.lat != null);
      if (mine) list.push({ member: session?.name, lat: mine.lat, lon: mine.lon });
      let n = 0;
      for (const p of list) {
        const d = Math.hypot((p.lat - spot.lat) * kLat, (p.lon - spot.lon) * kLon);
        if (d <= 10) n++;
      }
      return n;
    };
    return fn;
  }, [people, session?.name]);

  const startPress = (sp) => { pressTimer.current = setTimeout(() => setActionSpot(sp), 500); };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };
  const doDelete = async () => {
    if (!confirm(`¿Eliminar el spot "${actionSpot.name}"?`)) return;
    try { await deleteSpot(actionSpot.id); setActionSpot(null); fetchSpots(session.group).then(setSpots); }
    catch (e) { alert('No se pudo eliminar: ' + e.message); }
  };
  const startEdit = () => { setEditing(actionSpot); setEditName(actionSpot.name); setActionSpot(null); };
  const doRename = async () => {
    if (!editName.trim()) return;
    try { await renameSpot(editing.id, editName.trim().toUpperCase()); setEditing(null); fetchSpots(session.group).then(setSpots); }
    catch (e) { alert('No se pudo renombrar: ' + e.message); }
  };

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const { mx, my } = simXY();
      // publicar mi presencia en la posición actual antes de crear el spot,
      // así el creador cuenta dentro de su propio spot
      const ll = currentLatLon() || metersToLatLon(mx, my);
      try { await upsertPresence({ group: session.group, member: session.name, lat: ll.lat, lon: ll.lon, accuracy: 8 }); } catch {}
      await createSpot(session.group, name.trim().toUpperCase(), mx, my, deviceId(), session.name);
      setName(''); setCreating(false);
      fetchSpots(session.group).then(setSpots).catch(() => {});
    } catch (e) { alert('No se pudo crear el spot: ' + (e?.message || 'error')); }
    setSaving(false);
  };

  return (
    <div style={S.root}>
      {/* header FIJO */}
      <div style={S.head}>
        <div style={S.brandRow}>
          <button onClick={() => nav('/menu')} style={{ background: 'none', padding: 0 }}><span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 22, fontWeight: 900 }}>NEMO</span></button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => nav('/perfil')} style={{ background: 'none', padding: 0, borderRadius: 999 }}><Avatar name={session?.name} uri={myAvatar} size={38} /></button>
          </div>
        </div>
        <div style={S.kicker}>SPOTS</div>
        <div style={S.laser} />
      </div>

      {/* lista SCROLLEABLE (única zona que scrollea) */}
      <div style={S.list}>
        {spots.map((sp, i) => {
          const c = NEON[i % NEON.length];
          const n = countAt(sp);
          return (
            <button key={sp.id} className="neon-box" style={{ '--nc': c, ...S.card }}
              onClick={() => nav(`/spot/${sp.id}`)}
              onPointerDown={() => startPress(sp)} onPointerUp={cancelPress}
              onPointerLeave={cancelPress} onContextMenu={(e) => { e.preventDefault(); setActionSpot(sp); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {sp.photo_url && <img src={sp.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                <div className="neon-text" style={{ '--nc': c, ...S.cardName }}>{sp.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ ...S.count, color: c, borderColor: c }}>👤 {n}</span>
                <span style={{ color: c, fontSize: 20 }}>›</span>
              </div>
            </button>
          );
        })}
        {spots.length === 0 && <p style={S.empty}>Todavía no hay puntos. Creá el primero para que el grupo se junte ahí.</p>}
      </div>

      {/* botón FIJO (no se superpone con la lista) */}
      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.cta }} onClick={() => setCreating(true)}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)' }}>+ NUEVO SPOT ACÁ</span>
      </button>

      {creating && (
        <div style={S.modalWrap} onClick={() => setCreating(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontWeight: 900, fontFamily: 'inherit' }}>Nombre del spot</h3>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="BARRA, ENTRADA, ÁRBOL…" style={S.input}
              onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button style={S.btnCyan} onClick={create}>{saving ? 'CREANDO…' : 'CREAR'}</button>
          </div>
        </div>
      )}
      {/* popup de acciones (mantener apretado) */}
      {actionSpot && (
        <div style={S.modalWrap} onClick={() => setActionSpot(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div className="neon-text" style={{ '--nc': 'var(--cyan)', ...S.sheetTitle }}>{actionSpot.name}</div>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--cyan)', color: 'var(--cyan)' }} onClick={startEdit}>✎ Editar nombre</button>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={doDelete}>🗑 Eliminar spot</button>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--card-border)', color: 'var(--ink-dim)' }} onClick={() => setActionSpot(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {/* editar nombre */}
      {editing && (
        <div style={S.modalWrap} onClick={() => setEditing(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontWeight: 900, fontFamily: 'inherit' }}>Nuevo nombre</h3>
            <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value.toUpperCase())}
              style={S.input} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
            <button style={S.btnCyan} onClick={doRename}>GUARDAR</button>
          </div>
        </div>
      )}
      <TabBar active="spots" />
    </div>
  );
}

const S = {
  root: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  head: { padding: '16px 20px 0', flexShrink: 0 },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  gear: { fontSize: 20, color: 'var(--ink)', background: 'none' },
  kicker: { color: 'var(--ink-dim)', fontSize: 12, fontWeight: 900, letterSpacing: 4, marginTop: 14 },
  laser: { height: 2, background: 'var(--cyan)', borderRadius: 1, marginTop: 8, marginBottom: 8, boxShadow: '0 0 10px var(--cyan)' },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px' },
  card: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 16, marginBottom: 12 },
  cardName: { fontSize: 20, fontWeight: 900, letterSpacing: -0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  count: { fontSize: 13, fontWeight: 900, border: '1px solid', borderRadius: 999, padding: '3px 9px' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 40, lineHeight: 1.5, padding: '0 20px' },
  cta: { flexShrink: 0, margin: '8px 16px 12px', padding: 18, fontSize: 16, fontWeight: 900, letterSpacing: 1, color: '#fff' },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  sheet: { background: 'rgba(13,11,16,0.98)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 18, width: '100%', maxWidth: 340 },
  sheetTitle: { fontSize: 20, fontWeight: 900, textAlign: 'center', marginBottom: 16 },
  sheetBtn: { display: 'block', width: '100%', border: '1.5px solid', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 900, background: 'rgba(8,6,10,0.5)', marginBottom: 10, fontFamily: 'inherit' },
  modal: { background: 'rgba(13,11,16,0.97)', border: '2px solid var(--cyan)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380, boxShadow: '0 0 20px rgba(53,231,225,0.4)' },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12, outline: 'none', fontFamily: 'inherit' },
  btnCyan: { width: '100%', background: 'rgba(53,231,225,0.18)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, fontFamily: 'inherit' },
};
