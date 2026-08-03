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
    <button style={S.tab} onClick={() => active !== k && nav(k === 'spots' ? '/spots' : k === 'chat' ? '/chat' : '/mapa')}>
      <span style={{ position: 'relative', fontSize: 18, color: active === k ? 'var(--cyan)' : 'var(--ink-faint)' }}>
        {icon}
        {badge > 0 && <span style={S.badge}>{badge > 9 ? '9+' : badge}</span>}
      </span>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: active === k ? 'var(--cyan)' : 'var(--ink-faint)' }}>{label}</span>
    </button>
  );
  return (
    <div style={S.bar}>
      <Tab k="spots" label="SPOTS" icon="◆" />
      <Tab k="chat" label="CHAT" icon="✦" badge={active !== 'chat' ? unread : 0} />
      <Tab k="mapa" label="MAPA" icon="◎" />
    </div>
  );
}
const S = {
  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)', paddingTop: 10, paddingBottom: 'max(env(safe-area-inset-bottom), 10px)', zIndex: 20 },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none' },
  badge: { position: 'absolute', right: -10, top: -5, background: 'var(--magenta)', borderRadius: 999, minWidth: 17, height: 17, padding: '0 4px', fontSize: 10, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6px rgba(255,61,184,0.7)' },
};
