import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, clearSession, fetchPresence, uploadAvatar } from '../lib/db';
import { useRef } from 'react';
import { VENUE, stageAt, insideVenue } from '../lib/venue';
import { Avatar } from '../components/Avatar';

const STALE = 15 * 60e3;

export default function Miembros() {
  const nav = useNavigate();
  const session = loadSession();
  const [rows, setRows] = useState([]);

  const fileRef = useRef(null);
  const [myAvatar, setMyAvatar] = useState(null);
  const refresh = () => fetchPresence(session.group).then((r) => {
    setRows(r);
    const me = r.find((x) => x.member === session.name);
    if (me?.avatar_url) setMyAvatar(me.avatar_url);
  }).catch(() => {});
  const changeAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadAvatar(session.group, session.name, file); setMyAvatar(url); refresh(); }
    catch (err) { alert('No se pudo subir: ' + err.message); }
  };
  useEffect(() => {
    if (!session) { nav('/'); return; }
    refresh();
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, []);

  // agrupar: dentro del predio (por escenario o "en el predio"), fuera, y sin señal
  const groups = useMemo(() => {
    const now = Date.now();
    const inStage = {};   // escenario -> [gente]
    const inVenue = [];   // dentro del predio pero no en un escenario puntual
    const outside = [];   // fuera del predio
    const noSignal = [];  // sin ubicación reciente
    for (const m of rows) {
      const age = now - new Date(m.updated_at || 0).getTime();
      const stale = age > STALE || m.lat == null;
      if (stale) { noSignal.push(m); continue; }
      if (insideVenue(m.lat, m.lon)) {
        const st = stageAt(m.lat, m.lon);
        if (st) { (inStage[st] ??= []).push(m); }
        else inVenue.push(m);
      } else {
        outside.push(m);
      }
    }
    return { inStage, inVenue, outside, noSignal };
  }, [rows]);

  const invite = () => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(session.group)}`;
    if (navigator.share) navigator.share({ title: 'NEMO', text: 'Sumate a mi grupo en NEMO 🎉', url });
    else { navigator.clipboard.writeText(url); alert('Link copiado: ' + url); }
  };
  const leave = () => { if (confirm('¿Salir del grupo?')) { clearSession(); nav('/'); } };

  const Person = ({ m, color }) => (
    <div className="neon-box" style={{ '--nc': color, ...S.row }}>
      <Avatar name={m.member} uri={m.avatar_url} size={44} />
      <div style={{ flex: 1 }}>
        <div className="neon-text" style={{ '--nc': color, ...S.name }}>
          {m.member}{m.member === session?.name ? ' (vos)' : ''}
        </div>
        {m.status && <div style={S.status}>"{m.status}"</div>}
      </div>
      {m.battery != null && <div style={{ ...S.batt, color: m.battery <= 20 ? 'var(--bad)' : 'var(--ink-dim)' }}>{m.battery}%</div>}
    </div>
  );

  const Section = ({ label, count, color, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={S.sectionHead}>
        <span className="neon-text" style={{ '--nc': color, ...S.sectionLabel }}>{label}</span>
        <span style={{ ...S.sectionCount, color }}>{count}</span>
      </div>
      {children}
    </div>
  );

  const total = rows.length;
  const insideCount = Object.values(groups.inStage).reduce((a, l) => a + l.length, 0) + groups.inVenue.length;

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/spots')}>‹ SPOTS</button>
        <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 18, fontWeight: 900 }}>GRUPO {session?.group}</span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* mi avatar */}
        <div style={S.meBox}>
          <div onClick={() => fileRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
            <Avatar name={session?.name} uri={myAvatar} size={64} />
            <div style={S.editBadge}>✎</div>
          </div>
          <div style={{ marginLeft: 14 }}>
            <div className="neon-text" style={{ '--nc': 'var(--cyan)', fontSize: 18, fontWeight: 900 }}>{session?.name}</div>
            <div style={{ color: 'var(--ink-dim)', fontSize: 12 }}>Tocá tu foto para cambiarla</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={changeAvatar} style={{ display: 'none' }} />
        </div>

        {/* resumen */}
        <div style={S.summary}>
          <div style={S.sumItem}><div className="neon-text" style={{ '--nc': 'var(--cyan)', ...S.sumN }}>{total}</div><div style={S.sumL}>EN LA APP</div></div>
          <div style={S.sumItem}><div className="neon-text" style={{ '--nc': 'var(--green)', ...S.sumN }}>{insideCount}</div><div style={S.sumL}>EN EL EVENTO</div></div>
          <div style={S.sumItem}><div className="neon-text" style={{ '--nc': 'var(--amber)', ...S.sumN }}>{groups.outside.length}</div><div style={S.sumL}>FUERA</div></div>
        </div>

        {/* por escenario */}
        {VENUE.stages.map((st) => {
          const people = groups.inStage[st.name];
          if (!people?.length) return null;
          return (
            <Section key={st.name} label={st.name} count={people.length} color="var(--magenta)">
              {people.map((m) => <Person key={m.member} m={m} color="var(--magenta)" />)}
            </Section>
          );
        })}

        {/* dentro del predio sin escenario puntual */}
        {groups.inVenue.length > 0 && (
          <Section label="EN EL PREDIO" count={groups.inVenue.length} color="var(--green)">
            {groups.inVenue.map((m) => <Person key={m.member} m={m} color="var(--green)" />)}
          </Section>
        )}

        {/* fuera */}
        {groups.outside.length > 0 && (
          <Section label="FUERA DEL EVENTO" count={groups.outside.length} color="var(--amber)">
            {groups.outside.map((m) => <Person key={m.member} m={m} color="var(--amber)" />)}
          </Section>
        )}

        {/* sin señal */}
        {groups.noSignal.length > 0 && (
          <Section label="SIN UBICACIÓN" count={groups.noSignal.length} color="var(--ink-faint)">
            {groups.noSignal.map((m) => <Person key={m.member} m={m} color="var(--ink-faint)" />)}
          </Section>
        )}

        {total === 0 && <p style={S.empty}>Todavía no hay nadie en el grupo. Invitá gente 👇</p>}
      </div>

      <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.invite }} onClick={invite}>
        <span className="neon-text" style={{ '--nc': 'var(--magenta)' }}>INVITAR GENTE</span>
      </button>

      <button style={S.leave} onClick={leave}>salir del grupo</button>
    </div>
  );
}

const S = {
  root: { flex: 1, overflowY: 'auto', paddingBottom: 40 },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px' },
  back: { color: 'var(--ink-dim)', fontSize: 14, fontWeight: 900, fontFamily: 'inherit' },
  meBox: { display: 'flex', alignItems: 'center', background: 'rgba(53,231,225,0.06)', border: '1px solid var(--cyan)', borderRadius: 16, padding: 14, marginBottom: 18, boxShadow: '0 0 10px rgba(53,231,225,0.2)' },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, background: 'var(--cyan)', color: '#04231F', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' },
  summary: { display: 'flex', gap: 10, marginBottom: 22 },
  sumItem: { flex: 1, background: 'rgba(8,6,10,0.5)', border: '1px solid var(--card-border)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' },
  sumN: { fontSize: 26, fontWeight: 900 },
  sumL: { color: 'var(--ink-dim)', fontSize: 10, fontWeight: 900, letterSpacing: 1, marginTop: 4 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 },
  sectionLabel: { fontSize: 13, fontWeight: 900, letterSpacing: 2 },
  sectionCount: { fontSize: 15, fontWeight: 900 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 900 },
  status: { color: 'var(--cyan)', fontSize: 13.5, fontStyle: 'italic', marginTop: 3 },
  batt: { fontSize: 13, fontWeight: 900 },
  invite: { display: 'block', margin: '10px 16px 0', width: 'calc(100% - 32px)', padding: 18, fontSize: 15, fontWeight: 900, letterSpacing: 1, color: '#fff' },
  leave: { display: 'block', margin: '16px auto', color: 'var(--ink-dim)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: 'none' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 30 },
};
