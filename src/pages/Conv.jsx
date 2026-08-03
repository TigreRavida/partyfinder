import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchConversation, sendGroupMessage, subscribeConversation, markConvSeen } from '../lib/db';
import { Avatar } from '../components/Avatar';

export default function Conv() {
  const nav = useNavigate();
  const session = loadSession();
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('kind') || 'group';
  const to = params.get('to') || undefined;
  const isGroup = kind === 'group';
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    const me = session.name;
    fetchConversation(session.group, kind, me, to).then(setMsgs).catch(() => {});
    markConvSeen(kind, to);
    return subscribeConversation(session.group, (m) => {
      if (isGroup && m.kind === 'group') { setMsgs((c) => [...c, m]); markConvSeen('group'); }
      else if (!isGroup && m.kind === 'dm' &&
        ((m.author === me && m.recipient === to) || (m.author === to && m.recipient === me))) {
        setMsgs((c) => [...c, m]); markConvSeen('dm', to);
      }
    });
  }, [kind, to]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft.trim(); setDraft('');
    try { await sendGroupMessage(session.group, kind, session.name, body, to); } catch {}
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/chat')}>‹</button>
        {!isGroup && to && <Avatar name={to} size={34} />}
        <div style={S.title}>{isGroup ? `Grupo · ${session?.group}` : to}</div>
      </div>
      <div style={S.msgs}>
        {msgs.map((m) => {
          const mine = m.author === session?.name;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ ...S.bubble, ...(mine ? S.mine : S.theirs) }}>
                {!mine && isGroup && <div style={S.author}>{m.author}</div>}
                <div style={{ color: mine ? '#04231F' : 'var(--ink)' }}>{m.body}</div>
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && <p style={S.empty}>Todavía no hay mensajes. Escribí el primero.</p>}
        <div ref={endRef} />
      </div>
      <div style={S.inputBar}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={isGroup ? 'Mensaje al grupo…' : `Mensaje a ${to}…`}
          style={S.input} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button style={{ ...S.send, opacity: draft.trim() ? 1 : 0.4 }} onClick={send}>➤</button>
      </div>
    </div>
  );
}
const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', borderBottom: '1px solid var(--line)' },
  back: { width: 34, height: 34, borderRadius: 17, background: 'var(--bg-elev)', border: '1px solid var(--card-border)', color: 'var(--ink)', fontSize: 22, fontWeight: 900 },
  title: { fontSize: 19, fontWeight: 900, flex: 1 },
  msgs: { flex: 1, overflowY: 'auto', padding: 16 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: '9px 13px' },
  mine: { background: 'var(--cyan)', borderBottomRightRadius: 4 },
  theirs: { background: 'var(--card)', border: '1px solid var(--card-border)', borderBottomLeftRadius: 4 },
  author: { color: 'var(--magenta)', fontSize: 11, fontWeight: 900, marginBottom: 2 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, textAlign: 'center', marginTop: 50 },
  inputBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px calc(env(safe-area-inset-bottom) + 10px)', borderTop: '1px solid var(--line)', background: 'var(--bg-elev)' },
  input: { flex: 1, background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 20, padding: '10px 15px', color: 'var(--ink)', fontSize: 15, outline: 'none' },
  send: { width: 44, height: 44, borderRadius: 22, background: 'var(--cyan)', color: '#04231F', fontSize: 18, fontWeight: 900, boxShadow: '0 0 12px rgba(53,231,225,0.5)', flexShrink: 0 },
};
