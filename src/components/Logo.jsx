export function Logo({ size = 130 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--card-border)" strokeWidth="2.5" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--cyan)" strokeWidth="2.5" fill="none"
          strokeDasharray={`${circ*0.75} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ filter: 'drop-shadow(0 0 6px var(--cyan))' }} />
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', fontSize: size * 0.34, fontWeight: 900 }}>
        <span style={{ color: 'var(--cyan)', textShadow: '0 0 12px var(--cyan)' }}>P</span>
        <span style={{ color: 'var(--magenta)', textShadow: '0 0 12px var(--magenta)', marginLeft: -size*0.06 }}>F</span>
      </div>
    </div>
  );
}
