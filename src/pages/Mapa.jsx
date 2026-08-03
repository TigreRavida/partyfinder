import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENUE, latLonToFrac, stageAt, insideVenue, metersToLatLon } from '../lib/venue';
import { loadSession, fetchPresence, subscribePresence, upsertPresence, setMyStatus } from '../lib/db';
import { SIM, simXY, simSubscribe, simMove, watchPosition, readBattery } from '../lib/geo';

const STALE = 15 * 60e3;

export default function Mapa() {
  const nav = useNavigate();
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [myLL, setMyLL] = useState(() => (SIM ? metersToLatLon(simXY().mx, simXY().my) : null));
  const [, force] = useState(0);
  const [showMon, setShowMon] = useState(false);
  const [statusEdit, setStatusEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState(null);

  // medir el contenedor para dimensionar el plano rotado (como en Expo con winH)
  const stageRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const measure = () => {
      if (stageRef.current) {
        const r = stageRef.current.getBoundingClientRect();
        setBox({ w: r.width, h: r.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // zoom/pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const gestures = useRef({ startDist: 0, startZoom: 1, panning: false, lastX: 0, lastY: 0, startPan: null });

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchPresence(session.group).then(setRows).catch(() => {});
    const unsub = subscribePresence(session.group, (r) =>
      setRows((cur) => [...cur.filter((x) => x.member !== r.member), r]));
    // publicar mi posición
    const publish = async () => {
      const battery = await readBattery();
      const ll = SIM ? metersToLatLon(simXY().mx, simXY().my) : myLL;
      if (!ll) return;
      await upsertPresence({ group: session.group, member: session.name, lat: ll.lat, lon: ll.lon, accuracy: 8, battery });
    };
    publish();
    const beat = setInterval(publish, 10000);
    let stopWatch = () => {};
    if (SIM) {
      const un = simSubscribe(() => { const ll = metersToLatLon(simXY().mx, simXY().my); setMyLL(ll); });
      stopWatch = un;
    } else {
      stopWatch = watchPosition((fix) => setMyLL({ lat: fix.lat, lon: fix.lon }));
    }
    const t = setInterval(() => force((n) => n + 1), 15000);
    return () => { unsub(); clearInterval(beat); clearInterval(t); stopWatch(); };
  }, [session?.group]);

  const members = useMemo(() => {
    const now = Date.now();
    const list = rows.map((r) => {
      const ageMs = now - new Date(r.updated_at).getTime();
      const mine = r.member === session?.name;
      const lat = mine && myLL ? myLL.lat : r.lat;
      const lon = mine && myLL ? myLL.lon : r.lon;
      return { ...r, lat, lon, ageMs, stale: mine ? false : ageMs > STALE, mine };
    });
    if (session && myLL && !list.some((m) => m.mine)) {
      list.push({ group_code: session.group, member: session.name, lat: myLL.lat, lon: myLL.lon, ageMs: 0, stale: false, mine: true });
    }
    return list;
  }, [rows, session?.name, myLL]);

  const monitor = useMemo(() => {
    const byStage = {}; let inside = 0, outside = 0;
    for (const m of members) {
      if (m.stale || m.lat == null) continue;
      if (insideVenue(m.lat, m.lon)) inside++; else outside++;
      const s = stageAt(m.lat, m.lon);
      if (s) byStage[s] = (byStage[s] ?? 0) + 1;
    }
    return { byStage, inside, outside };
  }, [members]);

  const active = members.filter((m) => m.lat != null).length;
  const lowBatt = members.filter((m) => !m.stale && m.battery != null && m.battery <= 20);

  const saveStatus = async () => {
    setStatusEdit(false);
    setRows((cur) => cur.map((r) => r.member === session.name ? { ...r, status: draft.trim() || null } : r));
    try { await setMyStatus(session.group, session.name, draft.trim()); } catch {}
  };

  // gestos de zoom/pan sobre el contenedor
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      gestures.current.startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      gestures.current.startZoom = zoom;
    } else if (e.touches.length === 1) {
      gestures.current.panning = true;
      gestures.current.lastX = e.touches[0].clientX;
      gestures.current.lastY = e.touches[0].clientY;
      gestures.current.startPan = { ...pan };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.max(1, Math.min(5, gestures.current.startZoom * (d / gestures.current.startDist)));
      setZoom(next);
    } else if (e.touches.length === 1 && gestures.current.panning) {
      const dx = e.touches[0].clientX - gestures.current.lastX;
      const dy = e.touches[0].clientY - gestures.current.lastY;
      // límite: no dejar salir la imagen
      const lim = (s) => Math.max(0, (window.innerWidth * (zoom - 1)) / 2 + s);
      setPan({
        x: Math.max(-lim(200), Math.min(lim(200), gestures.current.startPan.x + dx)),
        y: Math.max(-lim(200), Math.min(lim(200), gestures.current.startPan.y + dy)),
      });
    }
  };
  const onTouchEnd = () => { gestures.current.panning = false; if (zoom < 1.05) { setZoom(1); setPan({ x: 0, y: 0 }); } };

  return (
    <div style={S.root}>
      {/* plano apaisado — el lienzo mide (altoMarco x anchoMarco) y se rota 90°,
          así el plano panorámico llena el ancho del teléfono y se ve completo */}
      <div ref={stageRef} style={S.stage} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div style={{
          position: 'relative',
          width: box.h,      // alto del marco → tras rotar, es el ancho visual
          height: box.w,     // ancho del marco → tras rotar, es el alto visual
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom}) rotate(90deg)`,
          transformOrigin: 'center',
          flexShrink: 0,
        }}>
          {/* la imagen mantiene su proporción dentro del lienzo (contain) */}
          <img src={VENUE.image} alt="Loveland"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            draggable={false} />
          {/* capa de gente: mismo tamaño y proporción que la imagen contenida */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {members.map((m) => {
              if (m.lat == null) return null;
              const f = latLonToFrac(m.lat, m.lon);
              // la imagen está 'contain' dentro del lienzo box.h x box.w.
              // proporción imagen = 0.4661 (alto/ancho). lienzo prop = box.w/box.h.
              // como el plano llena el ancho del lienzo, hay bandas arriba/abajo:
              const imgW = box.h;                          // la imagen llena el ancho del lienzo
              const imgH = box.h * VENUE.aspect;           // alto real de la imagen
              const bandY = (box.w - imgH) / 2;            // banda superior (centrado vertical)
              const px = f.u * imgW;
              const py = bandY + f.v * imgH;
              return (
                <button key={m.member}
                  onClick={() => { if (m.mine) { setDraft(m.status ?? ''); setStatusEdit(true); } else setView(m); }}
                  style={{ ...S.person, left: px, top: py }}>
                  <span style={{ ...S.dot, background: m.mine ? 'var(--amber)' : m.stale ? 'var(--ink-faint)' : 'var(--magenta)',
                    boxShadow: m.stale ? 'none' : `0 0 8px ${m.mine ? '#FFB020' : '#FF3DB8'}` }} />
                  <span style={{ ...S.name, color: m.mine ? 'var(--amber)' : '#fff' }}>
                    {m.mine ? 'VOS' : m.member}
                  </span>
                  {m.status && <span style={S.pstatus}>{m.status}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* barra superior horizontal */}
      <div style={S.top}>
        <button style={S.pill} onClick={() => nav('/spots')}>‹ SALIR</button>
        <button style={{ ...S.pill, ...S.pillLive }} onClick={() => setShowMon((v) => !v)}>
          {VENUE.name.toUpperCase()} · {active} {showMon ? '▲' : '▼'}
        </button>
        <button style={{ ...S.pill, ...S.pillCal }} onClick={() => nav('/lineup')} title="Line-up">📅</button>
      </div>

      {showMon && (
        <div style={S.monitor}>
          <Row k="EN EL GRUPO" v={members.length} />
          <Row k="DENTRO" v={monitor.inside} c="var(--good)" />
          <Row k="FUERA" v={monitor.outside} c="var(--amber)" />
          <div style={S.divider} />
          {VENUE.stages.map((s) => (
            <div key={s.name} style={S.rowSm}>
              <span style={S.stageK}>{s.name}</span>
              <span style={S.stageV}>{monitor.byStage[s.name] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {lowBatt.length > 0 && (
        <div style={S.battBar}>🔋 {lowBatt.map((m) => `${m.member} ${m.battery}%`).join(' · ')} — no lo dejes solo</div>
      )}

      {SIM && <Joystick />}

      {statusEdit && (
        <div style={S.modalWrap} onClick={() => setStatusEdit(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalH}>Tu estado</h3>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60}
              placeholder="en la barra 🍺 · fui al baño…" style={S.input}
              onKeyDown={(e) => e.key === 'Enter' && saveStatus()} />
            <button style={S.btnCyan} onClick={saveStatus}>GUARDAR</button>
          </div>
        </div>
      )}
      {view && (
        <div style={S.modalWrap} onClick={() => setView(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalH}>{view.member}</h3>
            {view.status ? <p style={S.vstatus}>"{view.status}"</p> : <p style={S.vsub}>Sin estado por ahora.</p>}
            <p style={S.vsub}>{view.ageMs < 90e3 ? 'en evento ahora' : `visto hace ${Math.round(view.ageMs / 60000)} min`}
              {view.battery != null ? ` · ${view.battery}% 🔋` : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, c }) {
  return <div style={S.row}><span style={{ ...S.rowK, color: c || 'var(--ink)' }}>{k}</span><span style={{ ...S.rowV, color: c || 'var(--ink)' }}>{v}</span></div>;
}

// joystick de simulación — cada flecha mueve el punto en la dirección que VES
// en el mapa (el plano está rotado 90°, así que compensamos esa rotación).
function Joystick() {
  const dirRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  // El plano se dibuja con rotate(90°). Para que el punto se mueva donde el
  // usuario ve la flecha, mapeamos cada flecha al vector (mx,my) del mundo que,
  // tras la rotación, apunta en esa dirección en pantalla:
  //   ▲ arriba en pantalla  → norte del plano
  //   ▼ abajo               → sur
  //   ◀ izquierda           → oeste
  //   ▶ derecha             → este
  // (mx = este/oeste, my = norte/sur). Con el plano rotado 90° horario:
  const VECTORS = {
    up:    { mx: 0,  my: 1 },   // norte
    down:  { mx: 0,  my: -1 },  // sur
    left:  { mx: -1, my: 0 },   // oeste
    right: { mx: 1,  my: 0 },   // este
  };

  const loop = (t) => {
    if (!dirRef.current) return;
    const dt = lastRef.current ? (t - lastRef.current) / 1000 : 0.016;
    lastRef.current = t;
    const SPEED = 8; // m/s — constante en cualquier dirección
    const v = VECTORS[dirRef.current];
    simMove(v.mx * SPEED * dt, v.my * SPEED * dt);
    rafRef.current = requestAnimationFrame(loop);
  };
  const start = (dir) => {
    dirRef.current = dir;
    lastRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  };
  const stop = () => { dirRef.current = null; cancelAnimationFrame(rafRef.current); };

  const btn = (dir, arrow, area) => (
    <button style={{ ...S.joyBtn, gridArea: area }}
      onPointerDown={(e) => { e.preventDefault(); start(dir); }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>{arrow}</button>
  );
  return (
    <div style={S.joyWrap}>
      <div style={S.joyGrid}>
        {btn('up', '▲', 'up')}
        {btn('left', '◀', 'left')}
        <div style={{ gridArea: 'mid' }} />
        {btn('right', '▶', 'right')}
        {btn('down', '▼', 'down')}
      </div>
      <span style={S.joyLabel}>SIM · mantené apretado</span>
    </div>
  );
}

const S = {
  root: { position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' },
  stage: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overflow: 'hidden' },
  person: { position: 'absolute', transform: 'translate(-50%,-50%)', transformOrigin: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 3, background: 'none', padding: 0, whiteSpace: 'nowrap' },
  dot: { width: 10, height: 10, borderRadius: 5, display: 'block' },
  name: { fontSize: 10, fontWeight: 900, marginTop: 2, textShadow: '0 1px 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' },
  pstatus: { fontSize: 9, fontWeight: 700, color: 'var(--cyan)', textShadow: '0 1px 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' },
  top: { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, right: 12, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 10 },
  pill: { background: 'rgba(8,6,10,0.9)', border: '1.5px solid var(--violet)', borderRadius: 999, padding: '8px 14px', color: 'var(--ink)', fontSize: 12, fontWeight: 900, letterSpacing: 1, boxShadow: '0 0 8px rgba(176,107,255,0.4)', whiteSpace: 'nowrap' },
  pillLive: { border: '1.5px solid var(--cyan)', color: 'var(--cyan)', boxShadow: '0 0 12px rgba(53,231,225,0.6)' },
  pillCal: { border: '1.5px solid var(--gold)', boxShadow: '0 0 10px rgba(255,203,46,0.5)', padding: '8px 12px' },
  monitor: { position: 'absolute', top: 'max(env(safe-area-inset-top), 10px)', marginTop: 42, right: 12, width: 210, background: 'rgba(8,6,10,0.95)', border: '2px solid var(--cyan)', borderRadius: 14, padding: 14, zIndex: 15, boxShadow: '0 0 16px rgba(53,231,225,0.5)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  rowK: { fontSize: 12, fontWeight: 900, letterSpacing: 0.5 }, rowV: { fontSize: 16, fontWeight: 900 },
  divider: { height: 1, background: 'var(--card-border)', margin: '8px 0' },
  rowSm: { display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' },
  stageK: { color: 'var(--ink-dim)', fontSize: 12.5, fontWeight: 700, letterSpacing: 1 },
  stageV: { color: 'var(--magenta)', fontSize: 13, fontWeight: 900 },
  battBar: { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 16px)', left: 16, right: 16, background: 'rgba(20,5,12,0.92)', border: '1px solid var(--bad)', borderRadius: 12, padding: 12, color: 'var(--bad)', fontSize: 12.5, fontWeight: 900, textAlign: 'center', zIndex: 9 },
  joyWrap: { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 20px)', right: 20, alignItems: 'center', textAlign: 'center', zIndex: 12 },
  joyGrid: { display: 'grid', gridTemplateAreas: '". up ." "left mid right" ". down ."', gridTemplateColumns: '36px 36px 36px', gridTemplateRows: '36px 36px 36px', gap: 3 },
  joyBtn: { width: 36, height: 36, borderRadius: 10, background: 'rgba(8,6,10,0.9)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', userSelect: 'none', boxShadow: '0 0 6px rgba(53,231,225,0.4)' },
  joyLabel: { color: 'var(--cyan)', fontSize: 10, fontWeight: 900, letterSpacing: 2 },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  modal: { background: 'var(--bg-elev)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380 },
  modalH: { color: 'var(--ink)', fontSize: 20, fontWeight: 900, margin: '0 0 12px' },
  vstatus: { color: 'var(--cyan)', fontSize: 17, fontWeight: 700, fontStyle: 'italic' },
  vsub: { color: 'var(--ink-dim)', fontSize: 13 },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12 },
  btnCyan: { width: '100%', background: 'var(--cyan)', color: '#00201D', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, letterSpacing: 0.5, boxShadow: '0 0 14px rgba(53,231,225,0.5)' },
};
