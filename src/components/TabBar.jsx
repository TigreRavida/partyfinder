import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchConvUnread } from '../lib/db';

export function TabBar({ active }) {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const s = loadSession(); if (!s) return;
    const load = () => fetchConvUnread(s.group, s.name).then((u) =>
      setUnread(Object.values(u).reduce((a, b) => a + b, 0))).catch(() => {});
    load(); const t = setInterval(load, 12000); return () => clearInterval(t);
  }, [active]);
  const Tab = ({ k, label, icon, badge }) => (
    <button style={S.tab} onClick={() => active !== k && nav(k === 'lineup' ? '/lineup' : k === 'chat' ? '/chat' : '/mapa')}>
      <span className={active === k ? 'neon-text' : ''} style={{ '--nc': 'var(--cyan)', position: 'relative', fontSize: 16, color: active === k ? '#fff' : 'var(--ink-faint)' }}>
        {icon}
        {badge > 0 && <span className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.badge }}>{badge > 9 ? '9+' : badge}</span>}
      </span>
      <span className={active === k ? 'neon-text' : ''} style={{ '--nc': 'var(--cyan)', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: active === k ? '#fff' : 'var(--ink-faint)' }}>{label}</span>
    </button>
  );
  return (
    <div style={S.bar}>
      <Tab k="lineup" label="TIMETABLE" icon="♪" />
      <Tab k="chat" label="CHAT" icon="✦" badge={active !== 'chat' ? unread : 0} />
      <Tab k="mapa" label="MAPA" icon="◎" />
    </div>
  );
}
const S = {
  bar: { flexShrink: 0, display: 'flex', borderTop: '1px solid rgba(176,107,255,0.3)', background: 'rgba(8,6,10,0.92)', backdropFilter: 'blur(8px)', paddingTop: 5, paddingBottom: 'max(env(safe-area-inset-bottom), 5px)', zIndex: 20 },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'none' },
  badge: { position: 'absolute', right: -10, top: -5, borderRadius: 999, color: '#fff', minWidth: 17, height: 17, padding: '0 4px', fontSize: 10, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6px rgba(255,61,184,0.7)' },
};
