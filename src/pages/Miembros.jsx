import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, clearSession, fetchPresence, seedTestMembers, clearTestMembers } from '../lib/db';
import { Avatar } from '../components/Avatar';

export default function Miembros() {
  const nav = useNavigate();
  const session = loadSession();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchPresence(session.group).then(setRows).catch(() => {});
  }, []);
  const invite = () => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(session.group)}`;
    if (navigator.share) navigator.share({ title: 'PartyFinder', text: `Sumate a mi grupo en PartyFinder 🎉`, url });
    else { navigator.clipboard.writeText(url); alert('Link copiado: ' + url); }
  };
  const leave = () => { if (confirm('¿Salir del grupo?')) { clearSession(); nav('/'); } };
  const seed = async () => { try { const n = await seedTestMembers(session.group); alert(n + ' integrantes de prueba agregados'); fetchPresence(session.group).then(setRows); } catch (e) { alert('Error: ' + e.message); } };
  const unseed = async () => { await clearTestMembers(session.group); fetchPresence(session.group).then(setRows); };
  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/spots')}>‹ SPOTS</button>
        <div style={S.title}>Grupo · {session?.group}</div>
      </div>
      <div style={{ padding: '0 16px' }}>
        {rows.map((m) => (
          <div key={m.member} style={S.row}>
            <Avatar name={m.member} uri={m.avatar_url} size={46} />
            <div style={{ flex: 1 }}>
              <div style={S.name}>{m.member}{m.member === session?.name ? '  (vos)' : ''}</div>
              {m.status && <div style={S.status}>"{m.status}"</div>}
            </div>
          </div>
        ))}
      </div>
      <button style={S.invite} onClick={invite}>INVITAR GENTE</button>
      <div style={{ margin: '20px 16px 0', padding: 14, border: '1px dashed var(--card-border)', borderRadius: 12 }}>
        <div style={{ color: 'var(--ink-faint)', fontSize: 11, fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>MODO PRUEBA</div>
        <button style={S.testBtn} onClick={seed}>+ Agregar 8 integrantes de prueba</button>
        <button style={{ ...S.testBtn, color: 'var(--ink-dim)', marginTop: 8 }} onClick={unseed}>Quitar integrantes de prueba</button>
      </div>
      <button style={S.leave} onClick={leave}>salir del grupo</button>
    </div>
  );
}
const S = {
  root: { flex: 1, overflowY: 'auto', paddingBottom: 40 },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px' },
  back: { color: 'var(--ink-dim)', fontSize: 14, fontWeight: 900 },
  title: { fontSize: 18, fontWeight: 900 },
  row: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,13,20,0.6)', border: '1px solid var(--violet)', borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: '0 0 8px rgba(176,107,255,0.2)' },
  name: { fontSize: 16, fontWeight: 900 },
  status: { color: 'var(--cyan)', fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  invite: { display: 'block', margin: '20px 16px 0', width: 'calc(100% - 32px)', background: 'rgba(255,61,184,0.15)', border: '2px solid var(--magenta)', color: 'var(--magenta)', borderRadius: 16, padding: 18, fontSize: 15, fontWeight: 900, letterSpacing: 1, boxShadow: '0 0 20px rgba(255,61,184,0.5)' },
  testBtn: { display: 'block', width: '100%', background: 'var(--bg-elev)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 12, color: 'var(--cyan)', fontSize: 13, fontWeight: 700 },
  leave: { display: 'block', margin: '16px auto', color: 'var(--ink-dim)', fontSize: 13, fontWeight: 700 },
};
