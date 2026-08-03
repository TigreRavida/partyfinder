import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchPresence, fetchConvUnread, subscribeConversation } from '../lib/db';
import { TabBar } from '../components/TabBar';
import { MapButton } from '../components/MapButton';
import { Avatar } from '../components/Avatar';

export default function Chat() {
  const nav = useNavigate();
  const session = loadSession();
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState({});

  const refresh = useCallback(() => {
    if (!session) return;
    fetchPresence(session.group).then(setRows).catch(() => {});
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
  const others = rows.filter((m) => m.member !== session?.name);
  const sorted = [...others].sort((a, b) => {
    const ua = unread[`dm:${a.member}`] ?? 0, ub = unread[`dm:${b.member}`] ?? 0;
    if (ua !== ub) return ub - ua;
    return a.member.localeCompare(b.member);
  });

  const NEON = ['var(--orange)', 'var(--blue)', 'var(--magenta)', 'var(--green)', 'var(--violet)', 'var(--cyan)', 'var(--gold)'];
  const Badge = ({ n, c }) => <span className="neon-box" style={{ '--nc': c, ...S.badge }}>{n > 9 ? '9+' : n}</span>;

  return (
    <div style={S.root}>
      <div style={S.head}>
        <div style={S.brandRow}>
          <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 22, fontWeight: 900 }}>NEMO</span>
          <MapButton />
        </div>
        <div style={S.kicker}>CHAT</div>
        <div style={S.laser} />
      </div>
      <div style={S.list}>
        <button className="neon-box" style={{ '--nc': 'var(--gold)', ...S.row }} onClick={() => nav('/conv?kind=group')}>
          <div className="neon-box" style={{ '--nc': 'var(--gold)', ...S.groupIcon }}>★</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div className="neon-text" style={{ '--nc': 'var(--gold)', ...S.rowName }}>Grupo · {session?.group}</div>
            <div style={S.rowSub}>Mensaje a todo el grupo</div>
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
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div className="neon-text" style={{ '--nc': c, ...S.rowName }}>{m.member}</div>
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
  root: { flex: 1, overflowY: 'auto', paddingBottom: 90 },
  head: { padding: '16px 20px 0' },
  brandRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: 'var(--ink-dim)', fontSize: 12, fontWeight: 900, letterSpacing: 4, marginTop: 14 },
  laser: { height: 2, background: 'var(--cyan)', borderRadius: 1, marginTop: 8, marginBottom: 16, boxShadow: '0 0 10px var(--cyan)' },
  list: { padding: '0 16px' },
  row: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 12 },
  rowUnread: { border: '1px solid var(--cyan)', background: 'rgba(53,231,225,0.06)' },
  pinned: { border: '1px solid var(--magenta)' },
  groupIcon: { width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 22, fontWeight: 900 },
  rowName: { fontSize: 16, fontWeight: 900 },
  rowSub: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 999, color: '#fff', minWidth: 24, height: 24, padding: '0 8px', color: '#00201D', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(53,231,225,0.6)' },
  empty: { color: 'var(--ink-dim)', fontSize: 14, textAlign: 'center', marginTop: 40 },
};
