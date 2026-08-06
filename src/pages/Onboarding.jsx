import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSession, findMyIdentity, upsertPresence } from '../lib/db';

export default function Onboarding() {
  const nav = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('join');
  const [name, setName] = useState('');
  const [group, setGroup] = useState(preset ? preset.toUpperCase() : '');
  const ready = name.trim() && group.trim();

  const go = async () => {
    if (!ready) return;
    const g = group.trim().toUpperCase();
    let finalName = name.trim();
    try {
      const existing = await findMyIdentity(g);
      if (existing && existing !== finalName) {
        const useExisting = confirm(`Este dispositivo ya entró a "${g}" como "${existing}". ¿Continuar como ${existing}?`);
        if (useExisting) finalName = existing;
      }
    } catch {}
    saveSession({ name: finalName, group: g });
    // registrar presencia al entrar (sin ubicación todavía) para que aparezca en
    // el chat aunque no haya abierto el mapa. La ubicación se agrega al abrir el mapa.
    try { await upsertPresence({ group: g, member: finalName, lat: null, lon: null }); } catch {}
    nav('/menu');
  };

  // Fondo = onboarding-bg.jpeg (NEMO arriba + 2 cajas de neón). Inputs
  // transparentes sobre cada caja; botón INGRESAR debajo (la imagen no lo trae).
  return (
    <div style={S.root}>
      <img src="/onboarding-bg.jpeg" alt="NEMO" style={S.bg} draggable={false} />
      <div style={S.overlay}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="TU NOMBRE"
          style={{ ...S.field, top: '47.5%' }} />
        <input value={group} onChange={(e) => setGroup(e.target.value.toUpperCase())} placeholder="NOMBRE DE GRUPO"
          disabled={!!preset} onKeyDown={(e) => e.key === 'Enter' && go()}
          style={{ ...S.field, top: '64%' }} />
        <button onClick={go} disabled={!ready}
          className={ready ? 'neon-box' : ''}
          style={{ '--nc': 'var(--green)', ...S.enter, opacity: ready ? 1 : 0.4 }}>
          <span className={ready ? 'neon-text' : ''} style={{ '--nc': 'var(--green)', fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>INGRESAR</span>
        </button>
      </div>
    </div>
  );
}

const S = {
  root: { flex: 1, position: 'relative', background: '#0a0a0c', overflow: 'hidden' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  overlay: { position: 'absolute', inset: 0 },
  field: {
    position: 'absolute', left: '22%', width: '56%',
    background: 'transparent', border: 'none', outline: 'none', margin: 0,
    color: '#EAFBFF', fontSize: 19, fontWeight: 800, textAlign: 'center', letterSpacing: 2,
    textShadow: '0 0 6px rgba(53,231,225,0.6)', boxSizing: 'border-box',
    paddingTop: '1.6%', paddingBottom: '1.6%', lineHeight: 1.1,
  },
  enter: {
    position: 'absolute', top: '78%', left: '22%', width: '56%', height: '8%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(8,6,10,0.4)', borderRadius: 14,
  },
};
