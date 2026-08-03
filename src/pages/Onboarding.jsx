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
      <Logo size={150} />
      <div style={S.wordmark}><span style={{ color: 'var(--cyan)' }}>Party</span><span style={{ color: 'var(--magenta)' }}>Finder</span></div>

      {preset && (
        <div style={S.invite}>
          <div style={S.inviteK}>TE INVITARON AL GRUPO</div>
          <div style={S.inviteG}>{group}</div>
        </div>
      )}

      <div style={S.field}>
        <label style={{ ...S.label, color: 'var(--cyan)' }}>TU NOMBRE</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te dicen"
          style={{ ...S.input, borderColor: 'var(--cyan)' }} />
      </div>
      <div style={S.field}>
        <label style={{ ...S.label, color: 'var(--magenta)' }}>{preset ? 'CÓDIGO (YA CARGADO)' : 'GRUPO A PERTENECER'}</label>
        <input value={group} onChange={(e) => setGroup(e.target.value.toUpperCase())} placeholder="Ej: LOVELAND"
          disabled={!!preset} style={{ ...S.input, borderColor: 'var(--magenta)' }}
          onKeyDown={(e) => e.key === 'Enter' && go()} />
      </div>

      <button onClick={go} disabled={!ready}
        style={{ ...S.continue, opacity: ready ? 1 : 0.4, boxShadow: ready ? '0 0 20px rgba(53,231,225,0.7)' : 'none' }}>
        CONTINUAR
      </button>
    </div>
  );
}

const S = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', overflowY: 'auto' },
  wordmark: { fontSize: 22, fontWeight: 900, letterSpacing: 0.5, marginTop: 14, marginBottom: 40 },
  field: { alignSelf: 'stretch', marginBottom: 24 },
  label: { display: 'block', fontSize: 14, fontWeight: 900, letterSpacing: 2, textAlign: 'center', marginBottom: 12 },
  input: { width: '100%', background: 'rgba(53,231,225,0.04)', border: '2px solid', borderRadius: 14, padding: 16, color: 'var(--ink)', fontSize: 17, fontWeight: 600, textAlign: 'center', outline: 'none' },
  continue: { width: 150, height: 150, borderRadius: 75, border: '2.5px solid var(--cyan)', background: 'rgba(53,231,225,0.05)', color: 'var(--cyan)', fontSize: 17, fontWeight: 900, letterSpacing: 1.5, marginTop: 20 },
  invite: { alignSelf: 'stretch', background: 'rgba(53,231,225,0.06)', border: '1.5px solid var(--cyan)', borderRadius: 16, padding: 18, marginBottom: 28, textAlign: 'center' },
  inviteK: { color: 'var(--cyan)', fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  inviteG: { color: 'var(--ink)', fontSize: 30, fontWeight: 900 },
};
