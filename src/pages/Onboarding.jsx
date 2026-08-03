import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSession } from '../lib/db';
import { Logo } from '../components/Logo';

export default function Onboarding() {
  const nav = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('join');
  const [name, setName] = useState('');
  const [group, setGroup] = useState(preset ? preset.toUpperCase() : '');
  const ready = name.trim() && group.trim();

  const go = () => {
    if (!ready) return;
    saveSession({ name: name.trim(), group: group.trim().toUpperCase() });
    nav('/spots');
  };

  return (
    <div style={S.root}>
      <div style={{ marginBottom: 48 }}><Logo size={120} /></div>

      {preset && (
        <div className="neon-box" style={{ '--nc': 'var(--gold)', ...S.invite }}>
          <div style={S.inviteK}>TE INVITARON AL GRUPO</div>
          <div className="neon-text" style={{ '--nc': 'var(--gold)', ...S.inviteG }}>{group}</div>
        </div>
      )}

      <input className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.input }}
        value={name} onChange={(e) => setName(e.target.value)} placeholder="NICK" />
      <input className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.input }}
        value={group} onChange={(e) => setGroup(e.target.value.toUpperCase())} placeholder="GRUPO"
        disabled={!!preset} onKeyDown={(e) => e.key === 'Enter' && go()} />

      <button className={ready ? 'neon-box' : ''} onClick={go} disabled={!ready}
        style={{ '--nc': 'var(--green)', ...S.continue, opacity: ready ? 1 : 0.35 }}>
        <span className={ready ? 'neon-text' : ''} style={{ '--nc': 'var(--green)' }}>ENTRAR</span>
      </button>
    </div>
  );
}

const S = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflowY: 'auto' },
  input: { width: '100%', padding: '18px 20px', color: 'var(--ink)', fontSize: 20, fontWeight: 800, textAlign: 'center', letterSpacing: 2, marginBottom: 18, outline: 'none', background: 'rgba(8,6,10,0.5)' },
  continue: { width: '100%', padding: '18px', fontSize: 18, fontWeight: 900, letterSpacing: 3, marginTop: 14, color: '#fff' },
  invite: { width: '100%', padding: 16, marginBottom: 24, textAlign: 'center' },
  inviteK: { color: 'var(--gold)', fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  inviteG: { fontSize: 30, fontWeight: 900, marginTop: 4 },
};
