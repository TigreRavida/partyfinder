import { useNavigate } from 'react-router-dom';
import { loadSession } from '../lib/db';
import { Wordmark } from '../components/Logo';

export default function Menu() {
  const nav = useNavigate();
  const session = loadSession();
  if (!session) { nav('/'); return null; }

  return (
    <div style={S.root}>
      <div style={{ marginBottom: 40 }}><Wordmark size={44} /></div>

      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.big }} onClick={() => nav('/chat')}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)', ...S.bigTxt }}>CHATS</span>
      </button>

      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.big }} onClick={() => nav('/mapa')}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)', ...S.bigTxt }}>MAPA</span>
      </button>

      <button style={S.spotsLink} onClick={() => nav('/spots')}>
        <span className="neon-text" style={{ '--nc': 'var(--cyan)', fontSize: 14, fontWeight: 900, letterSpacing: 2 }}>◆ SPOTS</span>
      </button>
    </div>
  );
}

const S = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', gap: 22 },
  big: { width: '100%', maxWidth: 300, aspectRatio: '1.5 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  bigTxt: { fontSize: 40, fontWeight: 900, letterSpacing: 3 },
  spotsLink: { marginTop: 10, padding: '10px 24px', background: 'none' },
};
