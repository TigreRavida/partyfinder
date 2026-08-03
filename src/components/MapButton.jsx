import { useNavigate } from 'react-router-dom';
export function MapButton() {
  const nav = useNavigate();
  return (
    <button onClick={() => nav('/mapa')} className="neon-box" style={{ '--nc': 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '8px 14px', color: 'var(--cyan)', fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>
      ◎ MAPA
    </button>
  );
}
