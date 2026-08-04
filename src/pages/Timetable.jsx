import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMETABLE } from '../lib/timetable';
import { TabBar } from '../components/TabBar';

const STAGE_COLORS = {
  ARENA: 'var(--magenta)', NEST: 'var(--cyan)', RISE: 'var(--green)',
  CIRCLE: 'var(--orange)', FIRE: 'var(--amber)', '909': 'var(--blue)',
};
const DAYS = Object.keys(TIMETABLE);
const STAGES = ['909', 'FIRE', 'CIRCLE', 'RISE', 'NEST', 'ARENA'];

export default function Timetable() {
  const nav = useNavigate();
  const [day, setDay] = useState(DAYS[0]);
  const [stage, setStage] = useState(null); // null = TODOS

  const data = TIMETABLE[day] || {};
  // armar lista de sets: si hay filtro de escenario, solo ése; si no, todos ordenados por hora
  let sets = [];
  const stagesToShow = stage ? [stage] : STAGES;
  for (const st of stagesToShow) {
    for (const p of (data[st] || [])) sets.push({ ...p, stage: st });
  }
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

      {/* filtros de escenario */}
      <div style={S.filters}>
        <button onClick={() => setStage(null)}
          className={!stage ? 'neon-box' : ''}
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
            </div>
          );
        })}
        {sets.length === 0 && <p style={S.empty}>Sin datos para este filtro.</p>}
      </div>
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
  filters: { display: 'flex', gap: 7, padding: '4px 16px 12px', flexWrap: 'wrap', flexShrink: 0 },
  filterBtn: { padding: '7px 12px', borderRadius: 999, background: 'rgba(8,6,10,0.5)', fontSize: 12, fontWeight: 900, letterSpacing: 1, fontFamily: 'inherit' },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' },
  setRow: { display: 'flex', alignItems: 'center', gap: 14, padding: 12, marginBottom: 8 },
  time: { textAlign: 'center', flexShrink: 0, width: 44 },
  artist: { color: 'var(--ink)', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 30 },
};
