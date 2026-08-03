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
          <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 22, fontWeight: 900 }}>NEMO</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <MapButton />
            <button style={S.gear} onClick={() => nav('/miembros')}>⚙</button>
          </div>
        </div>
        <div style={S.kicker}>SPOTS</div>
        <div style={S.laser} />
      </div>
      <div style={S.list}>
        {spots.map((sp, i) => {
          const NEON = ['var(--orange)', 'var(--cyan)', 'var(--magenta)', 'var(--green)', 'var(--gold)', 'var(--blue)'];
          const c = NEON[i % NEON.length];
          return (
            <div key={sp.id} className="neon-box" style={{ '--nc': c, ...S.card }}>
              <div className="neon-text" style={{ '--nc': c, ...S.cardName }}>{sp.name}</div>
            </div>
          );
        })}
        {spots.length === 0 && <p style={S.empty}>Todavía no hay puntos. Creá el primero para que el grupo se junte ahí.</p>}
      </div>
      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.cta }} onClick={() => setCreating(true)}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)' }}>+ NUEVO SPOT ACÁ</span>
      </button>

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
  card: { padding: 18, marginBottom: 12 },
  cardName: { fontSize: 22, fontWeight: 900, letterSpacing: -0.6 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 1.5, padding: '0 20px' },
  cta: { position: 'absolute', bottom: 'calc(max(env(safe-area-inset-bottom), 10px) + 70px)', left: 16, right: 16, padding: 20, fontSize: 16, fontWeight: 900, letterSpacing: 1 },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  modal: { background: 'rgba(13,11,16,0.97)', border: '2px solid var(--cyan)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380, boxShadow: '0 0 20px rgba(53,231,225,0.4)' },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12, outline: 'none' },
  btnCyan: { width: '100%', background: 'var(--cyan)', color: '#00201D', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, boxShadow: '0 0 14px rgba(53,231,225,0.5)' },
};
