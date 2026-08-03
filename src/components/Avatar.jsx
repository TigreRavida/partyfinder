// 15 avatares de neón — se asigna uno determinístico según el nombre.
const AVATARS = Array.from({ length: 15 }, (_, i) => `/avatars/av${i + 1}.jpg`);

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
// avatar por defecto según el nombre (estable: el mismo nombre → el mismo avatar)
export function defaultAvatar(name) {
  return AVATARS[hash(name || '?') % AVATARS.length];
}

export function Avatar({ name, uri, size = 44 }) {
  const src = uri || defaultAvatar(name);
  return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: size / 2, objectFit: 'cover', background: 'var(--card)', border: '1.5px solid rgba(255,255,255,0.15)' }} />
  );
}
