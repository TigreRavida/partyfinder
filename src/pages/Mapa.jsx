import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENUE, latLonToFrac, stageAt, insideVenue, metersToLatLon } from '../lib/venue';
import { loadSession, fetchPresence, subscribePresence, upsertPresence, setMyStatus,
  createSpot, fetchSpots, deleteSpot, renameSpot, subscribeSpots, deviceId } from '../lib/db';
import { SIM, simXY, simSubscribe, simMove, watchPosition, readBattery } from '../lib/geo';
import { Avatar } from '../components/Avatar';

const STALE = 15 * 60e3;

export default function Mapa() {
  const nav = useNavigate();
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [myLL, setMyLL] = useState(() => (SIM ? metersToLatLon(simXY().mx, simXY().my) : null));
  const [, force] = useState(0);
  const [showMon, setShowMon] = useState(false);
  const [showBatt, setShowBatt] = useState(false);
  const [statusEdit, setStatusEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState(null);
  const [pins, setPins] = useState([]);           // puntos de encuentro guardados
  const [placing, setPlacing] = useState(false);  // modo "colocar pin"
  const [pinView, setPinView] = useState(null);   // pin tocado (editar/eliminar)
  const [pinDraft, setPinDraft] = useState('');   // nombre al crear/editar

  // medir el contenedor para dimensionar el plano rotado (como en Expo con winH)
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
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
    fetchSpots(session.group).then(setPins).catch(() => {});
    const unsubPins = subscribeSpots(session.group, () => fetchSpots(session.group).then(setPins).catch(() => {}));
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
    const beat = setInterval(publish, 4000);  // cada 4s: todos ven lo mismo casi en vivo
    let stopWatch = () => {};
    if (SIM) {
      const un = simSubscribe(() => { const ll = metersToLatLon(simXY().mx, simXY().my); setMyLL(ll); });
      stopWatch = un;
    } else {
      stopWatch = watchPosition((fix) => setMyLL({ lat: fix.lat, lon: fix.lon }));
    }
    const t = setInterval(() => force((n) => n + 1), 15000);
    return () => { unsub(); unsubPins(); clearInterval(beat); clearInterval(t); stopWatch(); };
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
    // Teoría de conjuntos pura, sin radios:
    //  - dentro del polígono de un escenario → ese escenario
    //  - dentro del predio pero fuera de todo escenario → PREDIO
    //  - fuera del predio → FUERA
    // Invariantes: dentro + fuera = total ; suma(escenarios) + predio = dentro
    const byStage = {}; let predio = 0, inside = 0, outside = 0;
    for (const m of members) {
      // contamos a todo el que tiene una posición conocida (igual que los puntos
      // dibujados en el mapa). No excluimos por antigüedad: mostramos su última
      // ubicación conocida, así los números coinciden con lo que se ve.
      if (m.lat == null) continue;
      if (insideVenue(m.lat, m.lon)) {
        inside++;
        const s = stageAt(m.lat, m.lon);
        if (s) byStage[s] = (byStage[s] ?? 0) + 1;
        else predio++;
      } else {
        outside++;
      }
    }
    return { byStage, predio, inside, outside };
  }, [members]);

  const active = members.filter((m) => m.lat != null).length;
  const lowBatt = members.filter((m) => !m.stale && m.battery != null && m.battery <= 20);

  const saveStatus = async () => {
    setStatusEdit(false);
    setRows((cur) => cur.map((r) => r.member === session.name ? { ...r, status: draft.trim() || null } : r));
    try { await setMyStatus(session.group, session.name, draft.trim()); } catch {}
  };

  // --- PUNTOS DE ENCUENTRO (pines) ---
  // convierte un tap (clientX,clientY) en fracción u,v del mapa, deshaciendo
  // la rotación 90°, el zoom y el pan del lienzo.
  const tapToUV = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    // punto relativo al centro del lienzo (donde está el transformOrigin)
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    // deshacer zoom
    dx /= zoom; dy /= zoom;
    // el lienzo sin rotar mide (box.h) x (box.h*aspect); tras rotate(90deg)
    // su ancho visual = box.h*aspect y alto visual = box.h.
    // deshacer rotación 90° horaria: (x',y') → (y', -x')
    const lw = box.h;                 // ancho del lienzo sin rotar
    const lh = box.h * VENUE.aspect;  // alto del lienzo sin rotar
    // coords dentro del lienzo sin rotar, con origen en el centro:
    const ux = dy;      // inversa de la rotación
    const uy = -dx;
    // pasar a fracción 0..1 (origen esquina sup-izq del lienzo sin rotar)
    const u = (ux + lw / 2) / lw;
    const v = (uy + lh / 2) / lh;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { u, v };
  };
  const onMapTap = (e) => {
    if (!placing) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const uv = tapToUV(t.clientX, t.clientY);
    if (!uv) return;
    setPlacing(false);
    const name = prompt('Nombre del punto de encuentro:');
    if (name == null || !name.trim()) return;
    createSpot(session.group, name.trim(), uv.u, uv.v, deviceId(), session.name)
      .then(() => fetchSpots(session.group).then(setPins))
      .catch((err) => alert('No se pudo crear: ' + err.message));
  };
  const editPin = async () => {
    const name = prompt('Nuevo nombre:', pinView.name);
    if (name == null) return;
    if (!name.trim()) return;
    try { await renameSpot(pinView.id, name.trim()); await fetchSpots(session.group).then(setPins); setPinView(null); }
    catch (err) { alert('No se pudo editar: ' + err.message); }
  };
  const removePin = async () => {
    if (!confirm(`¿Eliminar "${pinView.name}"?`)) return;
    try { await deleteSpot(pinView.id); await fetchSpots(session.group).then(setPins); setPinView(null); }
    catch (err) { alert('No se pudo eliminar: ' + err.message); }
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
      {/* foto satelital rotada 90° para llenar la pantalla vertical completa.
          La imagen es panorámica (ancha); al rotarla queda alta y ocupa todo. */}
      <div ref={stageRef} style={S.stage} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div ref={canvasRef} onClick={onMapTap} style={{
          position: 'relative',
          // el lienzo (sin rotar) mide: ancho = altoPantalla, alto = altoPantalla*aspect.
          // al rotar 90°, su ancho visual pasa a ser el alto de pantalla (llena vertical).
          width: box.h,
          height: box.h * VENUE.aspect,
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom}) rotate(90deg)`,
          transformOrigin: 'center',
          flexShrink: 0,
          cursor: placing ? 'crosshair' : 'default',
        }}>
          <img src={VENUE.image} alt="Loveland"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
            draggable={false} />
          {/* nombres de los escenarios sobre el mapa */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {VENUE.stages.map((s) => {
              const f = latLonToFrac(s.lat, s.lon);
              const px = f.u * box.h;
              const py = f.v * box.h * VENUE.aspect;
              return (
                <span key={s.name} style={{ ...S.stageLabel, left: px, top: py }}>{s.name}</span>
              );
            })}
          </div>
          {/* pines de punto de encuentro */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {pins.map((p) => {
              const px = p.x * box.h;
              const py = p.y * box.h * VENUE.aspect;
              return (
                <button key={p.id} onClick={(e) => { e.stopPropagation(); setPinView(p); }}
                  style={{ ...S.pinMark, left: px, top: py }}>
                  <span style={S.pinIcon}>📍</span>
                  <span style={S.pinLabel}>{p.name}</span>
                </button>
              );
            })}
          </div>
          {/* capa de gente */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {members.map((m) => {
              if (m.lat == null) return null;
              const f = latLonToFrac(m.lat, m.lon);
              const px = f.u * box.h;
              const py = f.v * box.h * VENUE.aspect;
              return (
                <button key={m.member}
                  onClick={() => { if (m.mine) { setDraft(m.status ?? ''); setStatusEdit(true); } else setView(m); }}
                  style={{ ...S.person, left: px, top: py }}>
                  <span style={{ ...S.dot, background: m.mine ? 'var(--amber)' : m.stale ? 'var(--ink-faint)' : 'var(--magenta)',
                    boxShadow: m.stale ? 'none' : `0 0 8px ${m.mine ? '#FFB020' : '#FF3DB8'}` }} />
                  <span style={{ ...S.name, color: m.mine ? 'var(--amber)' : '#fff' }}>
                    {m.member}
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
        <button style={S.pill} onClick={() => nav('/menu')}>‹ SALIR</button>
        {/* botón de Loveland (contador) OCULTO temporalmente — no funciona como se quiere.
            Para reactivarlo, cambiar false por true. */}
        {false && (
        <button style={{ ...S.pill, ...S.pillLive }} onClick={() => setShowMon((v) => !v)}>
          {VENUE.name.toUpperCase()} · {active} {showMon ? '▲' : '▼'}
        </button>
        )}
        <button style={{ ...S.pill, ...S.pillCal }} onClick={() => nav('/lineup')} title="Line-up">📅</button>
        <button style={{ ...S.pill, ...S.pillPin, ...(placing ? S.pillPinOn : {}) }}
          onClick={() => setPlacing((v) => !v)} title="Marcar punto de encuentro">📍</button>
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
          <div style={S.rowSm}>
            <span style={{ ...S.stageK, color: 'var(--ink-dim)' }}>PREDIO (sin escenario)</span>
            <span style={S.stageV}>{monitor.predio}</span>
          </div>
        </div>
      )}

      {lowBatt.length > 0 && (
        <button style={S.battChip} onClick={() => setShowBatt((v) => !v)}>
          🪫 {lowBatt.length} con poca batería {showBatt ? '▲' : '▼'}
        </button>
      )}
      {showBatt && lowBatt.length > 0 && (
        <div style={S.battList} onClick={() => setShowBatt(false)}>
          {lowBatt.map((m) => (
            <div key={m.member} style={S.battRow}>
              <span>{m.member}</span>
              <span style={{ color: 'var(--bad)', fontWeight: 900 }}>{m.battery}%</span>
            </div>
          ))}
          <div style={S.battHint}>No los dejes solos 🙂</div>
        </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar name={view.member} uri={view.avatar_url} size={40} />
              <h3 style={{ ...S.modalH, margin: 0 }}>{view.member}</h3>
            </div>
            {view.status && <p style={S.vstatus}>"{view.status}"</p>}
            <p style={S.vsub}>{view.ageMs < 90e3 ? 'en evento ahora' : `visto hace ${Math.round(view.ageMs / 60000)} min`}
              {view.battery != null ? ` · ${view.battery}% 🔋` : ''}</p>
            <button className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.msgBtn }}
              onClick={() => nav(`/conv?kind=dm&to=${encodeURIComponent(view.member)}`)}>
              <span className="neon-text" style={{ '--nc': 'var(--cyan)' }}>✉ MENSAJE</span>
            </button>
          </div>
        </div>
      )}

      {pinView && (
        <div style={S.modalWrap} onClick={() => setPinView(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalH}>📍 {pinView.name}</h3>
            <p style={S.vsub}>Punto de encuentro{pinView.author ? ` · por ${pinView.author}` : ''}</p>
            <button className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.msgBtn }} onClick={editPin}>
              <span className="neon-text" style={{ '--nc': 'var(--cyan)' }}>✎ EDITAR NOMBRE</span>
            </button>
            <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.msgBtn, marginTop: 8 }} onClick={removePin}>
              <span className="neon-text" style={{ '--nc': 'var(--magenta)' }}>🗑 ELIMINAR</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, c }) {
  return <div style={S.row}><span style={{ ...S.rowK, color: c || 'var(--ink)' }}>{k}</span><span style={{ ...S.rowV, color: c || 'var(--ink)' }}>{v}</span></div>;
}

// Joystick ANALÓGICO: arrastrás la palanca desde el centro; la dirección
// (incluidas diagonales N/S/E/O y combinaciones) y la velocidad salen del vector.
// Velocidad de caminata real: ~1.5 m/s a fondo.
function Joystick() {
  const baseRef = useRef(null);
  const vecRef = useRef({ x: 0, y: 0 });   // -1..1 en cada eje (lo que se arrastró)
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const MAX = 42;        // radio en px de la palanca
  const WALK = 1.5;      // m/s a fondo (caminata real)

  const loop = (t) => {
    const dt = lastRef.current ? (t - lastRef.current) / 1000 : 0.016;
    lastRef.current = t;
    const v = vecRef.current;
    if (v.x !== 0 || v.y !== 0) {
      // v.x = este(+)/oeste(-), v.y = arriba en pantalla. Mapeo a mundo:
      // arriba en pantalla = norte (my+); derecha = este (mx+)
      const mx = v.x * WALK * dt;
      const my = -v.y * WALK * dt;   // y de pantalla crece hacia abajo → invertir
      simMove(mx, my);
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const onMove = (e) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX) { dx = dx / dist * MAX; dy = dy / dist * MAX; }
    setKnob({ x: dx, y: dy });
    vecRef.current = { x: dx / MAX, y: dy / MAX };  // normalizado -1..1
  };
  const start = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    lastRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    onMove(e);
  };
  const end = () => {
    vecRef.current = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
    cancelAnimationFrame(rafRef.current);
  };

  return (
    <div style={S.joyWrap}>
      <div ref={baseRef} style={S.joyBase}
        onPointerDown={(e) => { e.preventDefault(); start(e); }}
        onPointerMove={(e) => { if (vecRef.current || knob.x || knob.y) onMove(e); }}
        onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
        <div style={{ ...S.joyKnob, transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <span style={S.joyLabel}>SIM · arrastrá</span>
    </div>
  );
}

const S = {
  root: { position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' },
  stage: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overflow: 'hidden' },
  person: { position: 'absolute', transform: 'translate(-50%,-50%)', transformOrigin: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'none', padding: 0, whiteSpace: 'nowrap' },
  dot: { width: 10, height: 10, borderRadius: 5, display: 'block' },
  name: { fontSize: 10, fontWeight: 900, marginTop: 1, textShadow: '0 1px 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' },
  pstatus: { fontSize: 9, fontWeight: 700, color: 'var(--cyan)', textShadow: '0 1px 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', marginTop: -1 },
  top: { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, right: 12, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 10 },
  pill: { background: 'rgba(8,6,10,0.9)', border: '1.5px solid var(--violet)', borderRadius: 999, padding: '8px 14px', color: 'var(--ink)', fontSize: 12, fontWeight: 900, letterSpacing: 1, boxShadow: '0 0 8px rgba(176,107,255,0.4)', whiteSpace: 'nowrap' },
  pillLive: { border: '1.5px solid var(--cyan)', color: 'var(--cyan)', boxShadow: '0 0 12px rgba(53,231,225,0.6)' },
  pillCal: { border: '1.5px solid var(--gold)', boxShadow: '0 0 10px rgba(255,203,46,0.5)', padding: '8px 12px' },
  pillPin: { border: '1.5px solid #FF3B3B', boxShadow: '0 0 10px rgba(255,59,59,0.6)', padding: '8px 12px' },
  pillPinOn: { background: '#FF3B3B', boxShadow: '0 0 18px rgba(255,59,59,1)', transform: 'scale(1.18)', borderColor: '#fff' },
  pinMark: { position: 'absolute', transform: 'translate(-50%,-100%)', transformOrigin: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, background: 'none', padding: 0, whiteSpace: 'nowrap', zIndex: 5 },
  pinIcon: { fontSize: 24, filter: 'drop-shadow(0 0 4px rgba(255,59,59,0.9))' },
  pinLabel: { fontSize: 10, fontWeight: 900, color: '#fff', marginTop: -6, textShadow: '0 1px 3px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' },
  placingBanner: { position: 'absolute', top: 'calc(env(safe-area-inset-top) + 58px)', left: 12, right: 12, background: 'rgba(255,59,59,0.95)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '10px 14px', borderRadius: 12, textAlign: 'center', zIndex: 15 },
  monitor: { position: 'absolute', top: 'max(env(safe-area-inset-top), 10px)', marginTop: 42, right: 12, width: 210, background: 'rgba(8,6,10,0.95)', border: '2px solid var(--cyan)', borderRadius: 14, padding: 14, zIndex: 15, boxShadow: '0 0 16px rgba(53,231,225,0.5)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' },
  rowK: { fontSize: 12, fontWeight: 900, letterSpacing: 0.5 }, rowV: { fontSize: 16, fontWeight: 900 },
  divider: { height: 1, background: 'var(--card-border)', margin: '8px 0' },
  rowSm: { display: 'flex', justifyContent: 'space-between', padding: '2.5px 0' },
  stageK: { color: 'var(--ink-dim)', fontSize: 12.5, fontWeight: 700, letterSpacing: 1 },
  stageV: { color: 'var(--magenta)', fontSize: 13, fontWeight: 900 },
  stageLabel: { position: 'absolute', transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 900, letterSpacing: 1, textShadow: '0 0 6px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)', whiteSpace: 'nowrap' },
  battChip: { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 20px)', left: 20, background: 'rgba(20,6,8,0.92)', border: '1.5px solid var(--bad)', borderRadius: 999, padding: '8px 14px', color: '#fff', fontSize: 12, fontWeight: 900, boxShadow: '0 0 10px rgba(255,59,59,0.5)', zIndex: 12 },
  battList: { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 58px)', left: 20, maxWidth: 220, background: 'rgba(12,8,14,0.97)', border: '1.5px solid var(--bad)', borderRadius: 14, padding: 12, zIndex: 13, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' },
  battRow: { display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--ink)', fontSize: 13, fontWeight: 700, padding: '3px 0' },
  battHint: { color: 'var(--ink-dim)', fontSize: 11, marginTop: 6, textAlign: 'center' },
  joyWrap: { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom) + 20px)', right: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 12 },
  joyBase: { width: 108, height: 108, borderRadius: 54, background: 'rgba(8,6,10,0.55)', border: '2px solid var(--cyan)', boxShadow: '0 0 14px rgba(53,231,225,0.4), inset 0 0 20px rgba(53,231,225,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', userSelect: 'none' },
  joyKnob: { width: 44, height: 44, borderRadius: 22, background: 'radial-gradient(circle at 35% 30%, #7ff6f2, var(--cyan))', boxShadow: '0 0 12px rgba(53,231,225,0.9)', pointerEvents: 'none' },
  joyLabel: { color: 'var(--cyan)', fontSize: 10, fontWeight: 900, letterSpacing: 2 },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  modal: { background: 'var(--bg-elev)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 22, width: '100%', maxWidth: 380 },
  modalH: { color: 'var(--ink)', fontSize: 20, fontWeight: 900, margin: '0 0 12px' },
  vstatus: { color: 'var(--cyan)', fontSize: 17, fontWeight: 700, fontStyle: 'italic' },
  vsub: { color: 'var(--ink-dim)', fontSize: 13 },
  msgBtn: { width: '100%', padding: 13, marginTop: 16, fontSize: 14, fontWeight: 900, letterSpacing: 1, color: '#fff' },
  input: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12 },
  btnCyan: { width: '100%', background: 'var(--cyan)', color: '#00201D', borderRadius: 14, padding: 15, fontSize: 14, fontWeight: 900, letterSpacing: 0.5, boxShadow: '0 0 14px rgba(53,231,225,0.5)' },
};
