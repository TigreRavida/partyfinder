import { useNavigate } from 'react-router-dom';
export function MapButton() {
  const nav = useNavigate();
  return (
    <button onClick={() => nav('/mapa')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(53,231,225,0.08)', border: '1.5px solid var(--cyan)', borderRadius: 999, padding: '8px 14px', color: 'var(--cyan)', fontSize: 12, fontWeight: 900, letterSpacing: 1, boxShadow: '0 0 10px rgba(53,231,225,0.4)' }}>
      ◎ MAPA
    </button>
  );
}
