const PALETTE = ['#35E7E1', '#FF3DB8', '#9B6BFF', '#FFB020', '#35E8A6', '#5B8CFF'];
export function colorFor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
export function Avatar({ name, uri, size = 44 }) {
  if (uri) return <img src={uri} alt={name} style={{ width: size, height: size, borderRadius: size/2, objectFit: 'cover', background: 'var(--card)' }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size/2, background: colorFor(name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#0A0E1A', fontWeight: 900, fontSize: size * 0.42 }}>{(name[0] ?? '?').toUpperCase()}</span>
    </div>
  );
}
