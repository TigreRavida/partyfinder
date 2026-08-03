import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadSession, fetchSpots, createSpot, subscribeSpots, deviceId,
  fetchPresence,
} from '../lib/db';
import { simXY } from '../lib/geo';
import { metersToLatLon, VENUE } from '../lib/venue';
import { TabBar } from '../components/TabBar';
import { MapButton } from '../components/MapButton';

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

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchSpots(session.group).then(setSpots).catch(() => {});
    fetchPresence(session.group).then(setPeople).catch(() => {});
    const t = setInterval(() => fetchPresence(session.group).then(setPeople).catch(() => {}), 12000);
    const un = subscribeSpots(session.group, () => fetchSpots(session.group).then(setSpots));
    return () => { clearInterval(t); un(); };
  }, [session?.group]);

  // cuánta gente hay en el radio de 10m de cada spot
  const countAt = useMemo(() => {
    const fn = (sp) => {
      const spot = metersToLatLon(sp.x, sp.y);
      let n = 0;
      for (const p of people) {
        if (p.lat == null) continue;
        const d = Math.hypot((p.lat - spot.lat) * kLat, (p.lon - spot.lon) * kLon);
        if (d <= 10) n++;
      }
      return n;
    };
    return fn;
  }, [people]);

  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const { mx, my } = simXY();
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
          <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 22, fontWeight: 900 }}>NEMO</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <MapButton />
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
            <button key={sp.id} className="neon-box" style={{ '--nc': c, ...S.card }} onClick={() => nav(`/spot/${sp.id}`)}>
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
  modal: { background: 'rgba(13,11,16,0.97)', border: '2px solid var(--cyan)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380, boxShadow: '0 0 20px rgba(53,231,225,0.4)' },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12, outline: 'none', fontFamily: 'inherit' },
  btnCyan: { width: '100%', background: 'rgba(53,231,225,0.18)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, fontFamily: 'inherit' },
};
