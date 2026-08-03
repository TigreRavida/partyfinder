import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  loadSession, fetchSpot, fetchSpotMessages, sendSpotMessage,
  subscribeSpotMessages, uploadSpotPhoto, deleteSpot, renameSpot,
} from '../lib/db';

export default function Spot() {
  const nav = useNavigate();
  const { id } = useParams();
  const session = loadSession();
  const [spot, setSpot] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchSpot(id).then(setSpot).catch(() => {});
    fetchSpotMessages(id).then(setMsgs).catch(() => {});
    return subscribeSpotMessages(id, (m) => {
      setMsgs((c) => {
        if (c.some((x) => x.id === m.id)) return c;
        const i = c.findIndex((x) => String(x.id).startsWith('tmp_') && x.author === m.author && x.body === m.body);
        if (i >= 0) { const copy = [...c]; copy[i] = m; return copy; }
        return [...c, m];
      });
    });
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    const optimistic = { id: 'tmp_' + Date.now(), author: session.name, body, created_at: new Date().toISOString() };
    setMsgs((c) => [...c, optimistic]);
    try { await sendSpotMessage(id, session.group, session.name, body); }
    catch { setMsgs((c) => c.filter((m) => m.id !== optimistic.id)); alert('No se pudo enviar'); }
  };

  const doDelete = async () => {
    if (!confirm(`¿Eliminar el spot "${spot?.name}"?`)) return;
    try { await deleteSpot(id); nav('/spots'); } catch (e) { alert('No se pudo eliminar: ' + e.message); }
  };
  const doRename = async () => {
    if (!newName.trim()) return;
    try { await renameSpot(id, newName.trim().toUpperCase()); setSpot((s) => ({ ...s, name: newName.trim().toUpperCase() })); setRenaming(false); setMenu(false); }
    catch (e) { alert('No se pudo renombrar: ' + e.message); }
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
      alert('No se pudo subir la foto: ' + (err?.message || 'error'));
    }
    setUploading(false);
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/spots')}>‹</button>
        <span className="neon-tube" style={{ '--nc': 'var(--orange)', fontSize: 20, fontWeight: 900, flex: 1 }}>{spot?.name ?? '...'}</span>
        <button style={S.photoIcon} onClick={pickPhoto} disabled={uploading} title="Foto del lugar">
          {uploading ? '…' : (spot?.photo_url ? '🖼️' : '📷')}
        </button>
        <button style={S.gearIcon} onClick={() => setMenu(true)} title="Editar / eliminar">⚙</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      </div>

      {spot?.photo_url && (
        <div style={S.photoStrip}>
          <img src={spot.photo_url} alt={spot.name} style={S.photoThumb} onClick={pickPhoto} />
        </div>
      )}

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

      {menu && (
        <div style={S.modalWrap} onClick={() => setMenu(false)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div className="neon-text" style={{ '--nc': 'var(--orange)', fontSize: 20, fontWeight: 900, textAlign: 'center', marginBottom: 16 }}>{spot?.name}</div>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--cyan)', color: 'var(--cyan)' }} onClick={() => { setNewName(spot?.name || ''); setRenaming(true); }}>✎ Editar nombre</button>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--bad)', color: 'var(--bad)' }} onClick={doDelete}>🗑 Eliminar spot</button>
            <button style={{ ...S.sheetBtn, borderColor: 'var(--card-border)', color: 'var(--ink-dim)' }} onClick={() => setMenu(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {renaming && (
        <div style={S.modalWrap} onClick={() => setRenaming(false)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontWeight: 900, fontFamily: 'inherit', color: 'var(--ink)' }}>Nuevo nombre</h3>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value.toUpperCase())}
              style={S.renameInput} onKeyDown={(e) => e.key === 'Enter' && doRename()} />
            <button style={{ ...S.sheetBtn, borderColor: 'var(--cyan)', color: 'var(--cyan)' }} onClick={doRename}>GUARDAR</button>
          </div>
        </div>
      )}
      <div style={S.inputBar}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Mensaje"
          type="text" autoComplete="off" autoCorrect="off" autoCapitalize="sentences" enterKeyHint="send" name="nemo-msg"
          style={S.input} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button style={{ ...S.send, opacity: draft.trim() ? 1 : 0.4 }} onClick={send}>➤</button>
      </div>
    </div>
  );
}

const S = {
  root: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 12px) 16px 12px', borderBottom: '1px solid rgba(255,107,44,0.3)', background: 'rgba(8,6,10,0.7)', flexShrink: 0 },
  back: { width: 34, height: 34, borderRadius: 17, background: 'rgba(8,6,10,0.8)', border: '1px solid var(--card-border)', color: 'var(--ink)', fontSize: 22, fontWeight: 900, fontFamily: 'inherit', flexShrink: 0 },
  photoIcon: { width: 40, height: 40, borderRadius: 12, background: 'rgba(53,231,225,0.12)', border: '1.5px solid var(--cyan)', fontSize: 18, flexShrink: 0 },
  gearIcon: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,157,46,0.12)', border: '1.5px solid var(--orange)', fontSize: 18, flexShrink: 0, color: 'var(--ink)' },
  modalWrap: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 30 },
  sheet: { background: 'rgba(13,11,16,0.98)', border: '1px solid var(--card-border)', borderRadius: 20, padding: 18, width: '100%', maxWidth: 340 },
  sheetBtn: { display: 'block', width: '100%', border: '1.5px solid', borderRadius: 14, padding: 15, fontSize: 15, fontWeight: 900, background: 'rgba(8,6,10,0.5)', marginBottom: 10, fontFamily: 'inherit' },
  renameInput: { width: '100%', background: 'var(--card)', border: '1.5px solid var(--card-border)', borderRadius: 14, padding: 15, color: 'var(--ink)', fontSize: 16, marginBottom: 12, outline: 'none', fontFamily: 'inherit' },
  photoStrip: { padding: '10px 16px 0', flexShrink: 0 },
  photoThumb: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 14, border: '1.5px solid var(--cyan)', display: 'block' },
  msgs: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: '9px 13px' },
  mine: { background: 'rgba(53,231,225,0.16)', border: '1px solid var(--cyan)', boxShadow: '0 0 8px rgba(53,231,225,0.3)', borderBottomRightRadius: 4 },
  theirs: { background: 'rgba(176,107,255,0.12)', border: '1px solid var(--violet)', boxShadow: '0 0 8px rgba(176,107,255,0.25)', borderBottomLeftRadius: 4 },
  author: { color: 'var(--orange)', fontSize: 11, fontWeight: 900, marginBottom: 2 },
  empty: { color: 'var(--ink-dim)', fontSize: 14, fontFamily: 'inherit', textAlign: 'center', marginTop: 30, padding: '0 20px' },
  inputBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px calc(env(safe-area-inset-bottom) + 10px)', borderTop: '1px solid rgba(255,107,44,0.3)', background: 'rgba(8,6,10,0.8)', flexShrink: 0 },
  input: { flex: 1, background: 'rgba(8,6,10,0.6)', border: '1.5px solid var(--card-border)', borderRadius: 20, padding: '10px 15px', color: 'var(--ink)', fontSize: 16, outline: 'none', fontFamily: 'inherit' },
  send: { width: 44, height: 44, borderRadius: 22, background: 'rgba(53,231,225,0.18)', border: '1.5px solid var(--cyan)', color: 'var(--cyan)', fontSize: 18, fontWeight: 900, boxShadow: '0 0 12px rgba(53,231,225,0.5)', flexShrink: 0 },
};
