import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchPresence, fetchConvUnread, subscribeConversation, upsertPresence } from '../lib/db';
import { readBattery } from '../lib/geo';
import { TabBar } from '../components/TabBar';

import { Avatar } from '../components/Avatar';

export default function Chat() {
  const nav = useNavigate();
  const session = loadSession();
  const [myAvatar, setMyAvatar] = useState(null);
  const [notifOn, setNotifOn] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const enableNotifs = async () => {
    if (typeof Notification === 'undefined') { alert('Este navegador no soporta notificaciones.'); return; }
    if (Notification.permission === 'granted') {
      // ya está: mandar una de prueba para confirmar
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.showNotification) await reg.showNotification('NEMO', { body: '¡Notificaciones activas! 🎉', icon: '/icon-192.png' });
        else new Notification('NEMO', { body: '¡Notificaciones activas! 🎉', icon: '/icon-192.png' });
      } catch {}
      setNotifOn(true);
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Las notificaciones están bloqueadas. Activalas desde los ajustes del navegador para este sitio.');
      return;
    }
    const p = await Notification.requestPermission();
    setNotifOn(p === 'granted');
    if (p === 'granted') {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.showNotification) await reg.showNotification('NEMO', { body: '¡Notificaciones activas! 🎉', icon: '/icon-192.png' });
      } catch {}
    }
  };
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState({});

  const refresh = useCallback(() => {
    if (!session) return;
    // registrar mi presencia al abrir el chat (por si nunca abrí el mapa) + batería,
    // y RECIÉN DESPUÉS leer la lista, así mi batería recién guardada ya aparece.
    readBattery()
      .then((battery) => upsertPresence({ group: session.group, member: session.name, lat: null, lon: null, battery }))
      .catch(() => {})
      .finally(() => {
        fetchPresence(session.group).then((r) => { setRows(r); const me = r.find((x) => x.member === session.name); if (me?.avatar_url) setMyAvatar(me.avatar_url); }).catch(() => {});
      });
    fetchConvUnread(session.group, session.name).then(setUnread).catch(() => {});
  }, [session?.group]);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    refresh();
    const un = subscribeConversation(session.group, refresh);
    const t = setInterval(refresh, 12000);
    return () => { un(); clearInterval(t); };
  }, [refresh]);

  const groupUnread = unread['group'] ?? 0;
  const others = rows.filter((m) => m.member && m.member !== session?.name);
  const sorted = [...others].sort((a, b) => {
    const ua = unread[`dm:${a.member}`] ?? 0, ub = unread[`dm:${b.member}`] ?? 0;
    if (ua !== ub) return ub - ua;
    return (a.member || '').localeCompare(b.member || '');
  });

  const NEON = ['var(--orange)', 'var(--blue)', 'var(--magenta)', 'var(--green)', 'var(--violet)', 'var(--cyan)', 'var(--gold)'];
  const Badge = ({ n, c }) => <span className="neon-box" style={{ '--nc': c, ...S.badge }}>{n > 9 ? '9+' : n}</span>;

  return (
    <div style={S.root}>
      <div style={S.head}>
        <div style={S.brandRow}>
          <button onClick={() => nav('/menu')} style={{ background: 'none', padding: 0 }}><span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 22, fontWeight: 900 }}>NEMO</span></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={enableNotifs} style={{ background: 'none', padding: 0, fontSize: 20 }}
              title="Activar notificaciones">{notifOn ? '🔔' : '🔕'}</button>
            <button onClick={() => nav('/perfil')} style={{ background: 'none', padding: 0, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 800 }}>{session?.name}</span>
              <Avatar name={session?.name} uri={myAvatar} size={36} />
            </button>
          </div>
        </div>
        <div style={S.kicker}>CHAT</div>
        <div style={S.laser} />
      </div>
      <div style={S.list}>
        <button className="neon-box" style={{ '--nc': 'var(--gold)', ...S.row }} onClick={() => nav('/conv?kind=group')}>
          <div className="neon-box" style={{ '--nc': 'var(--gold)', ...S.groupIcon }}>★</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="neon-text" style={{ '--nc': 'var(--gold)', ...S.rowName }}>Grupo · {session?.group}</span>
              {rows.length > 0 && <span style={S.groupCount}>👥 {rows.length}</span>}
            </div>
            <div style={{ ...S.rowSub, color: 'var(--ink-dim)' }}>Mensaje a todo el grupo</div>
          </div>
          {groupUnread > 0 ? <Badge n={groupUnread} c="var(--gold)" /> : null}
        </button>
        {sorted.map((m, i) => {
          const n = unread[`dm:${m.member}`] ?? 0;
          const c = NEON[i % NEON.length];
          return (
            <button key={m.member} className="neon-box" style={{ '--nc': c, ...S.row }}
              onClick={() => nav(`/conv?kind=dm&to=${encodeURIComponent(m.member)}`)}>
              <Avatar name={m.member} uri={m.avatar_url} size={44} />
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="neon-text" style={{ '--nc': c, ...S.rowName }}>{m.member}</span>
                  {m.battery != null && (
                    <span style={{ ...S.batt, color: m.battery <= 20 ? 'var(--bad)' : 'var(--ink-dim)' }}>
                      {m.battery <= 20 ? '🪫' : '🔋'} {m.battery}%
                    </span>
                  )}
                </div>
                <div style={{ ...S.rowSub, color: n > 0 ? 'var(--ink)' : 'var(--ink-dim)' }}>
                  {n > 0 ? `${n} mensaje${n > 1 ? 's' : ''} sin leer` : (m.status || 'Toca para escribirle')}
                </div>
              </div>
              {n > 0 ? <Badge n={n} c={c} /> : <span style={{ color: c, fontSize: 22 }}>›</span>}
            </button>
          );
        })}
        {others.length === 0 && <p style={S.empty}>Todavía no hay nadie más. Invitá gente desde ⚙.</p>}
      </div>
      <TabBar active="chat" />
    </div>
  );
}
const S = {
  root: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  head: { padding: '16px 20px 0', flexShrink: 0 },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  gear: { fontSize: 22, color: 'var(--ink)', background: 'none' },
  kicker: { color: 'var(--ink-dim)', fontSize: 12, fontWeight: 900, letterSpacing: 4, marginTop: 14 },
  laser: { height: 2, background: 'var(--cyan)', borderRadius: 1, marginTop: 8, marginBottom: 16, boxShadow: '0 0 10px var(--cyan)' },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' },
  row: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 12 },
  rowUnread: { border: '1px solid var(--cyan)', background: 'rgba(53,231,225,0.06)' },
  pinned: { border: '1px solid var(--magenta)' },
  groupIcon: { width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 22, fontWeight: 900 },
  rowName: { fontSize: 16, fontWeight: 900 },
  groupCount: { fontSize: 12, fontWeight: 800, color: 'var(--gold)', background: 'rgba(255,203,46,0.12)', border: '1px solid rgba(255,203,46,0.4)', borderRadius: 999, padding: '2px 8px', flexShrink: 0 },
  batt: { fontSize: 12, fontWeight: 800, flexShrink: 0, whiteSpace: 'nowrap' },
  rowSub: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, minWidth: 24, height: 24, padding: '0 8px', color: '#fff', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(53,231,225,0.6)' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', margin: 0, textAlign: 'center', marginTop: 40 },
};
