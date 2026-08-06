import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSession, saveSession, clearSession, fetchPresence, uploadAvatar, setMyStatus, setMyAvatar } from '../lib/db';
import { Avatar } from '../components/Avatar';

const AVATARS = Array.from({ length: 15 }, (_, i) => `/avatars/av${i + 1}.jpg`);

export default function Perfil() {
  const nav = useNavigate();
  const session = loadSession();
  const [name, setName] = useState(session?.name || '');
  const [status, setStatus] = useState('');
  const [avatar, setAvatar] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!session) { nav('/'); return; }
    fetchPresence(session.group).then((r) => {
      const me = r.find((x) => x.member === session.name);
      if (me?.avatar_url) setAvatar(me.avatar_url);
      if (me?.status) setStatus(me.status);
    }).catch(() => {});
  }, []);

  const changeAvatar = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      // redimensionar la foto antes de subir (las fotos de celular pesan varios MB
      // y pueden crashear la app o fallar la subida). La achicamos a 400px.
      const small = await resizeImage(file, 400);
      const url = await uploadAvatar(session.group, session.name, small);
      setAvatar(url);
    } catch (err) {
      alert('No se pudo subir la foto: ' + (err?.message || 'error'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';  // permite reelegir el mismo archivo
    }
  };

  // achica una imagen a maxSize px (lado mayor) y la devuelve como Blob JPEG
  const resizeImage = (file, maxSize) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxSize) { height = height * maxSize / width; width = maxSize; }
      else if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('no se pudo procesar la imagen')); return; }
        blob.name = 'avatar.jpg';
        resolve(blob);
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen inválida')); };
    img.src = url;
  });

  const chooseAvatar = async (url) => {
    setAvatar(url);
    try { await setMyAvatar(session.group, session.name, url); } catch {}
  };

  const invite = () => {
    const url = `${window.location.origin}/?join=${encodeURIComponent(session.group)}`;
    if (navigator.share) navigator.share({ title: 'NEMO', text: 'Sumate a mi grupo en NEMO 🎉', url });
    else { navigator.clipboard.writeText(url); alert('Link copiado: ' + url); }
  };
  const leave = () => { if (confirm('¿Salir del grupo?')) { clearSession(); nav('/'); } };

  const save = async () => {
    // guardar estado
    try { await setMyStatus(session.group, session.name, status); } catch {}
    // si cambió el nombre, actualizar sesión (nota: el nombre es la clave de presencia)
    if (name.trim() && name.trim() !== session.name) {
      saveSession({ ...session, name: name.trim() });
    }
    nav('/menu');
  };

  return (
    <div style={S.root}>
      <div style={S.head}>
        <button style={S.back} onClick={() => nav('/menu')}>‹ MENÚ</button>
        <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: 18, fontWeight: 900 }}>MI PERFIL</span>
      </div>

      <div style={S.body}>
        {/* avatar grande con editar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div onClick={() => fileRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
            <Avatar name={name || session?.name} uri={avatar} size={110} />
            <div style={S.editBadge}>✎</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={changeAvatar} style={{ display: 'none' }} />
        </div>

        <div style={S.avatarLabel}>Elegí un avatar o subí tu foto</div>
        <div style={S.grid}>
          {AVATARS.map((url) => (
            <img key={url} src={url} alt="" onClick={() => chooseAvatar(url)}
              style={{ ...S.gridItem, borderColor: avatar === url ? 'var(--cyan)' : 'transparent',
                boxShadow: avatar === url ? '0 0 10px rgba(53,231,225,0.7)' : 'none' }} />
          ))}
        </div>

        <label style={S.label}>TU NOMBRE</label>
        <input className="neon-box" style={{ '--nc': 'var(--cyan)', ...S.input }}
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te dicen" />

        <label style={S.label}>TU ESTADO</label>
        <input className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.input }}
          value={status} onChange={(e) => setStatus(e.target.value)} maxLength={60}
          placeholder="en la barra 🍺 · llegando…" />

        <button className="neon-box" style={{ '--nc': 'var(--green)', ...S.save }} onClick={save}>
          <span className="neon-text" style={{ '--nc': 'var(--green)' }}>GUARDAR</span>
        </button>

        <div style={S.divider} />

        <button className="neon-box" style={{ '--nc': 'var(--magenta)', ...S.invite }} onClick={invite}>
          <span className="neon-text" style={{ '--nc': 'var(--magenta)' }}>INVITAR GENTE AL GRUPO</span>
        </button>
        <button style={S.leave} onClick={leave}>salir del grupo</button>
      </div>
    </div>
  );
}

const S = {
  root: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  head: { display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top) + 16px) 16px 16px', flexShrink: 0 },
  back: { color: 'var(--ink-dim)', fontSize: 14, fontWeight: 900, fontFamily: 'inherit', background: 'none' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 20px 20px' },
  editBadge: { position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, background: 'var(--cyan)', color: '#04231F', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg)' },
  avatarLabel: { color: 'var(--ink-dim)', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 },
  gridItem: { width: '100%', aspectRatio: '1', borderRadius: 12, objectFit: 'cover', border: '2px solid transparent', cursor: 'pointer' },
  label: { display: 'block', color: 'var(--ink-dim)', fontSize: 12, fontWeight: 900, letterSpacing: 2, marginBottom: 8, marginTop: 18 },
  input: { width: '100%', padding: '14px 16px', color: 'var(--ink)', fontSize: 16, fontWeight: 600, outline: 'none', background: 'rgba(8,6,10,0.5)', fontFamily: 'inherit' },
  save: { width: '100%', padding: 16, fontSize: 15, fontWeight: 900, letterSpacing: 2, marginTop: 28, color: '#fff' },
  divider: { height: 1, background: 'var(--card-border)', margin: '28px 0 20px' },
  invite: { width: '100%', padding: 16, fontSize: 14, fontWeight: 900, letterSpacing: 1, color: '#fff' },
  leave: { display: 'block', width: '100%', margin: '16px auto 0', color: 'var(--ink-dim)', fontSize: 13, fontWeight: 700, background: 'none', textAlign: 'center' },
};
