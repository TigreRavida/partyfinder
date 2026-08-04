import { useNavigate } from 'react-router-dom';
import { loadSession } from '../lib/db';
import { Wordmark } from '../components/Logo';

export default function Menu() {
  const nav = useNavigate();
  const session = loadSession();
  if (!session) { nav('/'); return null; }

  return (
    <div style={S.root}>
      {/* cables de neón de fondo: desde NEMO (arriba) hacia cada botón */}
      <svg style={S.cables} viewBox="0 0 300 560" preserveAspectRatio="xMidYMid meet" fill="none">
        <defs>
          <filter id="cableGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* desde el logo hacia el botón CHATS */}
        <path d="M150 70 C 120 130, 90 150, 70 200" stroke="#FF6B2C" strokeWidth="2.5" filter="url(#cableGlow)" opacity="0.9" />
        <path d="M150 70 C 180 130, 210 150, 230 200" stroke="#35E7E1" strokeWidth="2.5" filter="url(#cableGlow)" opacity="0.9" />
        {/* desde el logo hacia el botón MAPA (más largo) */}
        <path d="M150 70 C 100 200, 80 320, 70 380" stroke="#4DF7A0" strokeWidth="2.5" filter="url(#cableGlow)" opacity="0.75" />
        <path d="M150 70 C 200 200, 220 320, 230 380" stroke="#B06BFF" strokeWidth="2.5" filter="url(#cableGlow)" opacity="0.75" />
      </svg>

      <div style={{ marginBottom: 44, zIndex: 1 }}><Wordmark size={46} /></div>

      <button className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.big }} onClick={() => nav('/lineup')}>
        <span className="neon-text" style={{ '--nc': 'var(--cyan)', ...S.bigTxt }}>TIMETABLE</span>
      </button>

      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.big }} onClick={() => nav('/chat')}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)', ...S.bigTxt }}>CHATS</span>
      </button>

      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.big }} onClick={() => nav('/mapa')}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)', ...S.bigTxt }}>MAPA</span>
      </button>

    </div>
  );
}

const S = {
  root: { flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', gap: 18 },
  cables: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 },
  big: { width: '100%', maxWidth: 290, aspectRatio: '2.2 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20, zIndex: 1 },
  bigTxt: { fontSize: 34, fontWeight: 900, letterSpacing: 2 },
  spotsLink: { marginTop: 8, padding: '10px 24px', background: 'none', zIndex: 1 },
};
