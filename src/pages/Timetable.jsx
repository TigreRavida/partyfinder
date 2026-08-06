import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMETABLE } from '../lib/timetable';
import { TabBar } from '../components/TabBar';
import { loadSession, setGroupFav, fetchGroupFavs, subscribeGroupFavs } from '../lib/db';

const STAGE_COLORS = {
  ARENA: 'var(--magenta)', NEST: 'var(--cyan)', RISE: 'var(--green)',
  CIRCLE: 'var(--orange)', FIRE: 'var(--amber)', '909': 'var(--blue)',
};
const DAYS = Object.keys(TIMETABLE);
const STAGES = ['909', 'FIRE', 'CIRCLE', 'RISE', 'NEST', 'ARENA'];

const setId = (day, st, p) => `${day}|${st}|${p.s}|${p.a}`;

export default function Timetable() {
  const nav = useNavigate();
  const session = loadSession();
  const [day, setDay] = useState(DAYS[0]);
  const [stage, setStage] = useState(null);       // null = TODOS los escenarios
  const [mode, setMode] = useState('all');         // 'all' | 'mine' | 'group'
  const [groupFavs, setGroupFavs] = useState({});  // { setId: [member,...] } del grupo
  const [whoView, setWhoView] = useState(null);    // popup: quiénes marcaron un set

  // cargar favoritos del grupo desde Supabase (compartidos)
  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchGroupFavs(session.group).then(setGroupFavs).catch(() => {});
    const unsub = subscribeGroupFavs(session.group, () =>
      fetchGroupFavs(session.group).then(setGroupFavs).catch(() => {}));
    return unsub;
  }, [session?.group]);

  const iMarked = (id) => (groupFavs[id] || []).includes(session?.name);

  const toggleFav = async (id) => {
    const on = !iMarked(id);
    // optimista
    setGroupFavs((cur) => {
      const list = new Set(cur[id] || []);
      if (on) list.add(session.name); else list.delete(session.name);
      return { ...cur, [id]: [...list] };
    });
    try { await setGroupFav(session.group, id, session.name, on); }
    catch { fetchGroupFavs(session.group).then(setGroupFavs).catch(() => {}); }
  };

  const data = TIMETABLE[day] || {};
  let sets = [];
  const stagesToShow = stage ? [stage] : STAGES;
  for (const st of stagesToShow) {
    for (const p of (data[st] || [])) sets.push({ ...p, stage: st, id: setId(day, st, p) });
  }
  if (mode === 'mine') sets = sets.filter((p) => iMarked(p.id));
  if (mode === 'group') sets = sets.filter((p) => (groupFavs[p.id] || []).length > 0);
  sets.sort((a, b) => a.s.localeCompare(b.s));

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/menu')}>‹</button>
        <span className="neon-tube" style={{ '--nc': 'var(--gold)', fontSize: 20, fontWeight: 900 }}>TIMETABLE</span>
      </div>

      {/* días */}
      <div style={S.days}>
        {DAYS.map((d) => (
          <button key={d} onClick={() => setDay(d)}
            className={day === d ? 'neon-box' : ''}
            style={{ '--nc': 'var(--gold)', ...S.dayBtn, color: day === d ? '#fff' : 'var(--ink-dim)' }}>
            {d}
          </button>
        ))}
      </div>

      {/* NIVEL 1: TODOS / MIS FAVORITOS / FAVORITOS GRUPO */}
      <div style={S.filters}>
        <button onClick={() => setMode('all')} className={mode === 'all' ? 'neon-box' : ''}
          style={{ '--nc': 'var(--cyan)', ...S.filterBtn, color: mode === 'all' ? '#fff' : 'var(--ink-dim)' }}>TODOS</button>
        <button onClick={() => setMode('mine')} className={mode === 'mine' ? 'neon-box' : ''}
          style={{ '--nc': 'var(--gold)', ...S.filterBtn, color: mode === 'mine' ? '#fff' : 'var(--ink-dim)' }}>★ MIS FAVORITOS</button>
        <button onClick={() => setMode('group')} className={mode === 'group' ? 'neon-box' : ''}
          style={{ '--nc': 'var(--magenta)', ...S.filterBtn, color: mode === 'group' ? '#fff' : 'var(--ink-dim)' }}>♛ FAVORITOS GRUPO</button>
      </div>

      {/* NIVEL 2: escenarios */}
      <div style={S.filters2}>
        <button onClick={() => setStage(null)} className={!stage ? 'neon-box' : ''}
          style={{ '--nc': 'var(--cyan)', ...S.filterBtn, color: !stage ? '#fff' : 'var(--ink-dim)' }}>TODOS</button>
        {STAGES.map((st) => (
          <button key={st} onClick={() => setStage(stage === st ? null : st)}
            className={stage === st ? 'neon-box' : ''}
            style={{ '--nc': STAGE_COLORS[st], ...S.filterBtn, color: stage === st ? '#fff' : 'var(--ink-dim)' }}>
            {st}
          </button>
        ))}
      </div>

      {/* lista de sets */}
      <div style={S.list}>
        {sets.map((p, i) => {
          const c = STAGE_COLORS[p.stage];
          const marks = groupFavs[p.id] || [];
          const fav = marks.includes(session?.name);
          return (
            <div key={i} className="neon-box" style={{ '--nc': c, ...S.setRow }}>
              <div style={S.time}>
                <div style={{ color: c, fontWeight: 900, fontSize: 15 }}>{p.s}</div>
                <div style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{p.e}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.artist}>{p.a}</div>
                {!stage && <div style={{ color: c, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>{p.stage}</div>}
              </div>
              {/* contador del grupo (si alguien lo marcó) */}
              {marks.length > 0 && (
                <button onClick={() => setWhoView({ set: p, who: marks })} style={S.count}
                  title="Ver quiénes lo marcaron">
                  <span style={{ color: 'var(--magenta)', fontWeight: 900, fontSize: 13 }}>♛ {marks.length}</span>
                </button>
              )}
              {/* mi estrella */}
              <button onClick={() => toggleFav(p.id)} style={S.star}
                title={fav ? 'Quitar de mis favoritos' : 'Agregar a mis favoritos'}>
                <span style={{ color: fav ? 'var(--gold)' : 'var(--ink-faint)', fontSize: 22,
                  textShadow: fav ? '0 0 8px rgba(255,203,46,0.8)' : 'none' }}>{fav ? '★' : '☆'}</span>
              </button>
            </div>
          );
        })}
        {sets.length === 0 && (
          <p style={S.empty}>
            {mode === 'mine' ? 'Todavía no marcaste favoritos. Tocá la ☆ en los sets que quieras ver.'
              : mode === 'group' ? 'Nadie del grupo marcó favoritos todavía.'
              : 'Sin datos para este filtro.'}
          </p>
        )}
      </div>

      {/* popup: quiénes del grupo marcaron este set */}
      {whoView && (
        <div style={S.modalWrap} onClick={() => setWhoView(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalH}>♛ {whoView.set.a}</h3>
            <p style={S.modalSub}>{whoView.set.s} · {whoView.set.stage}</p>
            <div style={{ marginTop: 10 }}>
              {whoView.who.map((m) => (
                <div key={m} style={S.whoRow}>{m}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TabBar active="lineup" />
    </div>
  );
}

const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 10px', borderBottom: '1px solid rgba(255,203,46,0.3)', background: 'rgba(8,6,10,0.7)', flexShrink: 0 },
  back: { width: 34, height: 34, borderRadius: 17, background: 'rgba(8,6,10,0.8)', border: '1px solid var(--card-border)', color: 'var(--ink)', fontSize: 22, fontWeight: 900, fontFamily: 'inherit' },
  days: { display: 'flex', gap: 8, padding: '12px 16px 8px', flexShrink: 0 },
  dayBtn: { flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(8,6,10,0.5)', fontSize: 13, fontWeight: 900, letterSpacing: 1, fontFamily: 'inherit' },
  filters: { display: 'flex', gap: 7, padding: '4px 16px 6px', flexWrap: 'wrap', flexShrink: 0 },
  filters2: { display: 'flex', gap: 7, padding: '2px 16px 12px', flexWrap: 'wrap', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 2, paddingTop: 8 },
  filterBtn: { padding: '7px 12px', borderRadius: 999, background: 'rgba(8,6,10,0.5)', fontSize: 12, fontWeight: 900, letterSpacing: 1, fontFamily: 'inherit' },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' },
  setRow: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 },
  count: { background: 'rgba(176,107,255,0.12)', border: '1px solid var(--magenta)', borderRadius: 999, padding: '4px 9px', flexShrink: 0, cursor: 'pointer' },
  star: { background: 'none', padding: 4, flexShrink: 0, lineHeight: 1, cursor: 'pointer' },
  time: { textAlign: 'center', flexShrink: 0, width: 44 },
  artist: { color: 'var(--ink)', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 30 },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, zIndex: 30 },
  modal: { background: 'var(--card)', border: '1.5px solid var(--magenta)', borderRadius: 18, padding: 20, width: '100%', maxWidth: 300, boxShadow: '0 0 30px rgba(176,107,255,0.4)' },
  modalH: { color: 'var(--ink)', fontSize: 18, fontWeight: 900, margin: 0 },
  modalSub: { color: 'var(--ink-dim)', fontSize: 12, margin: '4px 0 0' },
  whoRow: { color: 'var(--ink)', fontSize: 15, fontWeight: 700, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' },
};
