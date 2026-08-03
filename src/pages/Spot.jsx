import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  loadSession, fetchSpot, fetchSpotMessages, sendSpotMessage,
  subscribeSpotMessages, uploadSpotPhoto,
} from '../lib/db';

export default function Spot() {
  const nav = useNavigate();
  const { id } = useParams();
  const session = loadSession();
  const [spot, setSpot] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchSpot(id).then(setSpot).catch(() => {});
    fetchSpotMessages(id).then(setMsgs).catch(() => {});
    return subscribeSpotMessages(id, (m) => setMsgs((c) => [...c, m]));
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft.trim(); setDraft('');
    try { await sendSpotMessage(id, session.group, session.name, body); } catch {}
  };

  const pickPhoto = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSpotPhoto(id, file);
      setSpot((s) => ({ ...s, photo_url: url }));
    } catch (err) {
      alert('No se pudo subir la foto: ' + (err?.message || 'error') + '\n\n(¿Existe el bucket "spot-photos" en Supabase Storage?)');
    }
    setUploading(false);
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/spots')}>‹</button>
        <span className="neon-tube" style={{ '--nc': 'var(--orange)', fontSize: 20, fontWeight: 900 }}>{spot?.name ?? '...'}</span>
      </div>

      {/* foto del lugar */}
      <div style={S.photoWrap}>
        {spot?.photo_url ? (
          <img src={spot.photo_url} alt={spot.name} style={S.photo} onClick={pickPhoto} />
        ) : (
          <button className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.photoEmpty }} onClick={pickPhoto} disabled={uploading}>
            {uploading ? 'Subiendo…' : '📷 Agregar foto del lugar'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      </div>

      {/* chat del spot */}
      <div style={S.msgs}>
        {msgs.map((m) => {
          const mine = m.author === session?.name;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ ...S.bubble, ...(mine ? S.mine : S.theirs) }}>
                {!mine && <div style={S.author}>{m.author}</div>}
                <div style={{ color: 'var(--ink)' }}>{m.body}</div>
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && <p style={S.empty}>Sin mensajes en este punto. Coordiná acá el encuentro.</p>}
        <div ref={endRef} />
      </div>

      <div style={S.inputBar}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Mensaje en ${spot?.name ?? 'el punto'}…`}
          style={S.input} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button style={{ ...S.send, opacity: draft.trim() ? 1 : 0.4 }} onClick={send}>➤</button>
      </div>
    </div>
  );
}

const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', borderBottom: '1px solid rgba(255,107,44,0.3)', background: 'rgba(8,6,10,0.7)' },
  back: { width: 34, height: 34, borderRadius: 17, background: 'rgba(8,6,10,0.8)', border: '1px solid var(--card-border)', color: 'var(--ink)', fontSize: 22, fontWeight: 900, fontFamily: 'inherit' },
  photoWrap: { padding: 16 },
  photo: { width: '100%', height: 180, objectFit: 'cover', borderRadius: 16, border: '2px solid var(--cyan)', display: 'block' },
  photoEmpty: { width: '100%', height: 120, color: 'var(--cyan)', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' },
  msgs: { flex: 1, overflowY: 'auto', padding: '0 16px 16px' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: '9px 13px' },
  mine: { background: 'rgba(53,231,225,0.16)', border: '1px solid var(--cyan)', boxShadow: '0 0 8px rgba(53,231,225,0.3)', borderBottomRightRadius: 4 },
  theirs: { background: 'rgba(176,107,255,0.12)', border: '1px solid var(--violet)', boxShadow: '0 0 8px rgba(176,107,255,0.25)', borderBottomLeftRadius: 4 },
  author: { color: 'var(--orange)', fontSize: 11, fontWeight: 900, marginBottom: 2 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 30, padding: '0 20px' },
  inputBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px calc(env(safe-area-inset-bottom) + 10px)', borderTop: '1px solid rgba(255,107,44,0.3)', background: 'rgba(8,6,10,0.8)' },
  input: { flex: 1, background: 'rgba(8,6,10,0.6)', border: '1.5px solid var(--card-border)', borderRadius: 20, padding: '10px 15px', color: 'var(--ink)', fontSize: 15, outline: 'none', fontFamily: 'inherit' },
  send: { width: 44, height: 44, borderRadius: 22, background: 'rgba(53,231,225,0.18)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', fontSize: 18, fontWeight: 900, boxShadow: '0 0 12px rgba(53,231,225,0.5)', flexShrink: 0 },
};
