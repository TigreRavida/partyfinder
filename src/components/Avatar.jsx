// 15 avatares de neón — se asigna uno determinístico según el nombre.
const AVATARS = Array.from({ length: 15 }, (_, i) => `/avatars/av${i + 1}.jpg`);
const COLORS = ['#35E7E1', '#FF3DB8', '#B06BFF', '#FF9D2E', '#4DF7A0', '#4DA8FF'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
export function colorForName(name) {
  return COLORS[hash(name || '?') % COLORS.length];
}
export function defaultAvatar(name) {
  return AVATARS[hash(name || '?') % AVATARS.length];
}

export function Avatar({ name, uri, size = 44 }) {
  const src = uri || defaultAvatar(name);
  const color = COLORS[hash(name || '?') % COLORS.length];
  const letter = (name?.[0] || '?').toUpperCase();
  // si la imagen falla, mostramos inicial+color (nunca roto)
  const onErr = (e) => {
    const el = e.currentTarget;
    el.style.display = 'none';
    if (el.nextSibling) el.nextSibling.style.display = 'flex';
  };
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
      <img src={src} alt={name} onError={onErr}
        style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', background: 'var(--card)', border: '1.5px solid rgba(255,255,255,0.15)', display: 'block' }} />
      <span style={{ display: 'none', position: 'absolute', inset: 0, borderRadius: size / 2, background: color, alignItems: 'center', justifyContent: 'center', color: '#04231F', fontWeight: 900, fontSize: size * 0.42 }}>{letter}</span>
    </span>
  );
}
