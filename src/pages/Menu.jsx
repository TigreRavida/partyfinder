import { useNavigate } from 'react-router-dom';
import { loadSession } from '../lib/db';
import { Logo } from '../components/Logo';

export default function Menu() {
  const nav = useNavigate();
  const session = loadSession();
  if (!session) { nav('/'); return null; }

  const Item = ({ label, to }) => (
    <button className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.big }} onClick={() => nav(to)}>
      <span className="neon-hollow" style={{ '--nc': 'var(--cyan)', ...S.bigTxt }}>{label}</span>
    </button>
  );

  return (
    <div style={S.root}>
      {/* solo el pin (sin wordmark), como la referencia */}
      <div style={S.pin}><Logo size={92} pinOnly /></div>

      <div style={S.list}>
        <Item label="Timetable" to="/lineup" />
        <Item label="Maps" to="/mapa" />
        <Item label="Chat" to="/chat" />
      </div>
    </div>
  );
}

const S = {
  root: { flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 30px 40px' },
  pin: { marginBottom: 40 },
  list: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, marginTop: 10 },
  big: { width: '100%', maxWidth: 330, aspectRatio: '2.6 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  bigTxt: { fontSize: 38, fontWeight: 700, letterSpacing: 1 },
};
