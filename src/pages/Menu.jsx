import { useNavigate } from 'react-router-dom';
import { loadSession } from '../lib/db';

export default function Menu() {
  const nav = useNavigate();
  const session = loadSession();
  if (!session) { nav('/'); return null; }

  // La imagen nueva_1 tiene NEMO arriba y 3 botones (Timetable/Maps/Chat) en la
  // mitad inferior. Ponemos la imagen de fondo y 3 zonas tocables sobre cada botón.
  // Los porcentajes están medidos sobre la imagen (768x1376).
  return (
    <div style={S.root}>
      <div style={S.bgWrap}>
        <img src="/menu-bg.jpeg" alt="NEMO" style={S.bg} draggable={false} />
        {/* zonas tocables sobre los botones dibujados */}
        <button style={{ ...S.hit, top: '50.5%', height: '11.5%' }} onClick={() => nav('/lineup')} aria-label="Timetable" />
        <button style={{ ...S.hit, top: '65.5%', height: '11.5%' }} onClick={() => nav('/mapa')} aria-label="Maps" />
        <button style={{ ...S.hit, top: '80.5%', height: '11.5%' }} onClick={() => nav('/chat')} aria-label="Chat" />
      </div>
    </div>
  );
}

const S = {
  root: { flex: 1, position: 'relative', display: 'flex', background: '#0a0a0c', overflow: 'hidden' },
  bgWrap: { position: 'relative', width: '100%', height: '100%' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  hit: { position: 'absolute', left: '8%', width: '84%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'rgba(53,231,225,0.15)' },
};
