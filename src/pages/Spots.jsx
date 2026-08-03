import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchSpots, createSpot, subscribeSpots, deviceId } from '../lib/db';
import { simXY } from '../lib/geo';
import { TabBar } from '../components/TabBar';
import { MapButton } from '../components/MapButton';

export default function Spots() {
  const nav = useNavigate();
  const session = loadSession();
  const [spots, setSpots] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchSpots(session.group).then(setSpots).catch(() => {});
    return subscribeSpots(session.group, () => fetchSpots(session.group).then(setSpots));
  }, [session?.group]);

  const [saving, setSaving] = useState(false);
  const create = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const { mx, my } = simXY();
      await createSpot(session.group, name.trim().toUpperCase(), mx, my, deviceId(), session.name);
      setName(''); setCreating(false);
      fetchSpots(session.group).then(setSpots).catch(() => {});
    } catch (e) {
      alert('No se pudo crear el spot: ' + (e?.message || 'error desconocido'));
    }
    setSaving(false);
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <div style={S.brandRow}>
          <div style={{ fontSize: 14, fontWeight: 900 }}><span style={{ color: 'var(--cyan)' }}>Party</span><span style={{ color: 'var(--magenta)' }}>Finder</span></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <MapButton />
            <button style={S.gear} onClick={() => nav('/miembros')}>⚙</button>
          </div>
        </div>
        <div style={S.kicker}>SPOTS</div>
        <div style={S.laser} />
      </div>
      <div style={S.list}>
        {spots.map((sp) => (
          <div key={sp.id} style={S.card}>
            <div style={S.cardName}>{sp.name}</div>
          </div>
        ))}
        {spots.length === 0 && <p style={S.empty}>Todavía no hay puntos. Creá el primero para que el grupo se junte ahí.</p>}
      </div>
      <button style={S.cta} onClick={() => setCreating(true)}>+ NUEVO SPOT ACÁ</button>

      {creating && (
        <div style={S.modalWrap} onClick={() => setCreating(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontWeight: 900 }}>Nombre del spot</h3>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="BARRA, ENTRADA, ÁRBOL…" style={S.input} onKeyDown={(e) => e.key === 'Enter' && create()} />
            <button style={S.btnCyan} onClick={create}>CREAR</button>
          </div>
        </div>
      )}
      <TabBar active="spots" />
    </div>
  );
}
const S = {
  root: { flex: 1, overflowY: 'auto', paddingBottom: 150, position: 'relative' },
  head: { padding: '16px 20px 0' },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  gear: { fontSize: 20, color: 'var(--ink)' },
  kicker: { color: 'var(--ink-dim)', fontSize: 12, fontWeight: 900, letterSpacing: 4, marginTop: 14 },
  laser: { height: 2, background: 'var(--cyan)', borderRadius: 1, marginTop: 8, marginBottom: 16, boxShadow: '0 0 10px var(--cyan)' },
  list: { padding: '0 16px' },
  card: { background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 16, padding: 18, marginBottom: 10 },
  cardName: { fontSize: 22, fontWeight: 900, letterSpacing: -0.6 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 1.5, padding: '0 20px' },
  cta: { position: 'absolute', bottom: 'calc(max(env(safe-area-inset-bottom), 10px) + 70px)', left: 16, right: 16, background: 'var(--magenta)', color: '#fff', borderRadius: 18, padding: 20, fontSize: 16, fontWeight: 900, letterSpacing: 1, boxShadow: '0 0 24px rgba(255,61,184,0.6)' },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  modal: { background: 'var(--bg-elev)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380 },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12, outline: 'none' },
  btnCyan: { width: '100%', background: 'var(--cyan)', color: '#00201D', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, boxShadow: '0 0 14px rgba(53,231,225,0.5)' },
};
