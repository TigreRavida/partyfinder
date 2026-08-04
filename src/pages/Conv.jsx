import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, fetchConversation, sendGroupMessage, subscribeConversation, markConvSeen, fetchPresence } from '../lib/db';
import { Avatar, colorForName } from '../components/Avatar';

export default function Conv() {
  const nav = useNavigate();
  const session = loadSession();
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('kind') || 'group';
  const to = params.get('to') || undefined;
  const isGroup = kind === 'group';
  const [msgs, setMsgs] = useState([]);
  const [toAvatar, setToAvatar] = useState(null);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    const me = session.name;
    fetchConversation(session.group, kind, me, to).then(setMsgs).catch(() => {});
    markConvSeen(kind, to);
    if (!isGroup && to) {
      fetchPresence(session.group).then((r) => {
        const p = r.find((x) => x.member === to);
        if (p?.avatar_url) setToAvatar(p.avatar_url);
      }).catch(() => {});
    }
    return subscribeConversation(session.group, (m) => {
      const belongs = (isGroup && m.kind === 'group') ||
        (!isGroup && m.kind === 'dm' &&
          ((m.author === me && m.recipient === to) || (m.author === to && m.recipient === me)));
      if (!belongs) return;
      setMsgs((c) => {
        // ya está por id real → no duplicar
        if (c.some((x) => x.id === m.id)) return c;
        // reemplazar el optimista (id tmp_, mismo autor+body) si existe
        const i = c.findIndex((x) => String(x.id).startsWith('tmp_') && x.author === m.author && x.body === m.body);
        if (i >= 0) { const copy = [...c]; copy[i] = m; return copy; }
        return [...c, m];
      });
      markConvSeen(kind, to);
    });
  }, [kind, to]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft.trim(); setDraft('');
    const optimistic = { id: 'tmp_' + Date.now(), author: session.name, body, kind, recipient: to ?? null, created_at: new Date().toISOString() };
    setMsgs((c) => [...c, optimistic]);
    try { await sendGroupMessage(session.group, kind, session.name, body, to); }
    catch (e) { setMsgs((c) => c.filter((m) => m.id !== optimistic.id)); alert('No se pudo enviar: ' + (e?.message || 'error') + (e?.code ? ' ['+e.code+']' : '')); }
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/chat')}>‹</button>
        {!isGroup && to && <Avatar name={to} uri={toAvatar} size={34} />}
        <div className="neon-text" style={{ '--nc': isGroup ? 'var(--gold)' : 'var(--cyan)', ...S.title }}>{isGroup ? `Grupo · ${session?.group}` : to}</div>
      </div>
      <div style={S.msgs}>
        {msgs.map((m) => {
          const mine = m.author === session?.name;
          const authorColor = colorForName(m.author);
          const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ ...S.bubble, ...(mine ? S.mine : {
                background: `${authorColor}22`, border: `1px solid ${authorColor}`,
                boxShadow: `0 0 8px ${authorColor}44`, borderBottomLeftRadius: 4,
              }) }}>
                {!mine && isGroup && <div style={{ ...S.author, color: authorColor }}>{m.author}</div>}
                <div style={{ color: 'var(--ink)' }}>{m.body}</div>
                {time && <div style={S.time}>{time}</div>}
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && <p style={S.empty}>Todavía no hay mensajes. Escribí el primero.</p>}
        <div ref={endRef} />
      </div>
      <div style={S.inputBar}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Mensaje"
          type="text" inputMode="text" autoComplete="off" autoCorrect="off" autoCapitalize="sentences"
          spellCheck="false" enterKeyHint="send" name={`msg_${Math.random().toString(36).slice(2, 8)}`}
          data-lpignore="true" data-form-type="other" data-1p-ignore="true" data-bwignore="true"
          aria-autocomplete="none" role="textbox"
          style={S.input} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button style={{ ...S.send, opacity: draft.trim() ? 1 : 0.4 }} onClick={send}>➤</button>
      </div>
    </div>
  );
}
const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', borderBottom: '1px solid rgba(176,107,255,0.3)', background: 'rgba(8,6,10,0.7)' },
  back: { width: 34, height: 34, borderRadius: 17, background: 'var(--bg-elev)', border: '1px solid var(--card-border)', color: 'var(--ink)', fontSize: 22, fontWeight: 900 },
  title: { fontSize: 19, fontWeight: 900, flex: 1 },
  msgs: { flex: 1, overflowY: 'auto', padding: 16 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: '9px 13px' },
  time: { fontSize: 10, color: 'var(--ink-faint)', textAlign: 'right', marginTop: 3, marginBottom: -2 },
  mine: { background: 'rgba(53,231,225,0.16)', border: '1px solid var(--cyan)', boxShadow: '0 0 8px rgba(53,231,225,0.3)', borderBottomRightRadius: 4 },
  theirs: { background: 'rgba(176,107,255,0.12)', border: '1px solid var(--violet)', boxShadow: '0 0 8px rgba(176,107,255,0.25)', borderBottomLeftRadius: 4 },
  author: { color: 'var(--magenta)', fontSize: 11, fontWeight: 900, marginBottom: 2 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', margin: 0, textAlign: 'center', marginTop: 50 },
  inputBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px calc(env(safe-area-inset-bottom) + 10px)', borderTop: '1px solid rgba(176,107,255,0.3)', background: 'rgba(8,6,10,0.8)' },
  input: { flex: 1, background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 20, padding: '10px 15px', color: 'var(--ink)', fontSize: 15, outline: 'none' },
  send: { width: 44, height: 44, borderRadius: 22, background: 'rgba(53,231,225,0.18)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', fontSize: 18, fontWeight: 900, boxShadow: '0 0 12px rgba(53,231,225,0.5)', flexShrink: 0 },
};
